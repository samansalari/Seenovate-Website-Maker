import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import { initializeDatabase, closeDatabase } from "./db/index.js";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from "./routes/auth.js";
import appsRoutes from "./routes/apps.js";
import chatsRoutes from "./routes/chats.js";
import streamRoutes from "./routes/stream.js";
import settingsRoutes from "./routes/settings.js";
import promptsRoutes from "./routes/prompts.js";
import filesRoutes from "./routes/files.js";
import previewRoutes from "./routes/preview.js";
import processRoutes from "./routes/process.js";
import { storage } from "./storage/index.js";
import { setupWebSocket } from "./services/socket_manager.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Track initialization state
let isReady = false;
let initError: string | null = null;

// Health check endpoint - responds immediately even during init
app.get("/health", (req, res) => {
  res.json({ 
    status: isReady ? "ok" : "initializing", 
    ready: isReady,
    error: initError,
    timestamp: new Date().toISOString() 
  });
});

// Serve static frontend files in production
const publicPath = path.join(__dirname, "..", "public");
app.use(express.static(publicPath));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/apps", appsRoutes);
app.use("/api/chats", chatsRoutes);
app.use("/api/stream", streamRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/prompts", promptsRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/process", processRoutes);

// Preview route (handled by http-proxy-middleware)
app.use("/preview", previewRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// SPA fallback - serve index.html for client-side routing
// This must be after all API routes but catches non-API routes
app.use((req, res, next) => {
  // If it's an API route that wasn't found, return 404 JSON
  if (req.path.startsWith("/api/") || req.path.startsWith("/preview/")) {
    return res.status(404).json({ error: "Not found" });
  }
  
  // For all other routes, serve the frontend index.html
  const indexPath = path.join(__dirname, "..", "public", "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If index.html doesn't exist (dev mode), show API info
      res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dyad API Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container { text-align: center; padding: 2rem; max-width: 600px; }
    h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
      background: linear-gradient(90deg, #e94560, #ff6b6b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .status {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: #10b981;
      border-radius: 20px;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚡ Dyad API</h1>
    <div class="status">✓ API Ready</div>
    <p>Backend API server is running.</p>
    <p>Frontend not bundled. Run with Docker to include the frontend.</p>
  </div>
</body>
</html>
      `);
    }
  });
});

// Run migrations on startup
async function runMigrations() {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("No DATABASE_URL set, skipping migrations");
    return;
  }

  console.log("Running database migrations...");
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  try {
    const db = drizzle(pool);
    // Use absolute path to ensure migrations are found regardless of CWD
    const migrationsFolder = path.join(__dirname, "..", "drizzle");
    console.log("Migrations folder:", migrationsFolder);
    await migrate(db, { migrationsFolder });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration error:", error);
    // Don't fail startup on migration errors - tables might already exist
  } finally {
    await pool.end();
  }
}

// Initialize database and storage (runs after server starts)
async function initializeServices() {
  try {
    // Run migrations first
    await runMigrations();
    
    console.log("Initializing database...");
    initializeDatabase();
    
    console.log("Initializing storage...");
    await storage.initialize();
    
    isReady = true;
    console.log("All services initialized successfully");
  } catch (error) {
    console.error("Failed to initialize services:", error);
    initError = error instanceof Error ? error.message : "Unknown error";
    // Don't exit - keep server running for debugging
  }
}

// Start server immediately, then initialize services
async function start() {
  // Start HTTP server first so healthcheck passes
  const server = app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });

  // Setup WebSocket server
  setupWebSocket(server);

  server.on("error", (error) => {
    console.error("Server error:", error);
    process.exit(1);
  });

  // Initialize services in background
  initializeServices();
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await closeDatabase();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await closeDatabase();
  process.exit(0);
});

start();

