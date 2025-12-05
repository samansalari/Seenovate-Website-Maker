import express from "express";
import cors from "cors";
import "dotenv/config";

import { initializeDatabase, closeDatabase } from "./db/index.js";

// Import routes
import authRoutes from "./routes/auth.js";
import appsRoutes from "./routes/apps.js";
import chatsRoutes from "./routes/chats.js";
import streamRoutes from "./routes/stream.js";
import settingsRoutes from "./routes/settings.js";
import promptsRoutes from "./routes/prompts.js";
import filesRoutes from "./routes/files.js";
import { storage } from "./storage/index.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/apps", appsRoutes);
app.use("/api/chats", chatsRoutes);
app.use("/api/stream", streamRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/prompts", promptsRoutes);
app.use("/api/files", filesRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
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
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration error:", error);
    // Don't fail startup on migration errors - tables might already exist
  } finally {
    await pool.end();
  }
}

// Initialize database and start server
async function start() {
  try {
    // Run migrations first
    await runMigrations();
    
    console.log("Initializing database...");
    initializeDatabase();
    
    console.log("Initializing storage...");
    await storage.initialize();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
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

