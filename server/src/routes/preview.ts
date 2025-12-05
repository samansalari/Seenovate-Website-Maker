import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { processManager } from "../services/process_manager.js";
import { db } from "../db/index.js";
import { apps } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../auth/index.js";

const router = Router();

// Proxy requests to running apps
// Route: /preview/:appId/*
router.use("/:appId", async (req, res, next) => {
  const appId = parseInt(req.params.appId);
  
  // Check if app is running
  const port = processManager.getAppPort(appId);

  if (!port) {
    try {
        const app = await db.query.apps.findFirst({
            where: eq(apps.id, appId),
        });
        
        if (!app) {
            return res.status(404).send("App not found");
        }

        // For now, just start it (assuming public read access or handle auth later)
        // NOTE: This is a simplification. Real implementation needs user context.
        // We'll use a separate "start" endpoint for security, and this proxy just fails if not running.
        return res.status(503).send(`
            <html>
                <head><meta http-equiv="refresh" content="2"></head>
                <body>App is not running. Please start it from the editor.</body>
            </html>
        `);
    } catch (e) {
        return res.status(500).send("Error checking app status");
    }
  }

  // Proxy to localhost:port
  return createProxyMiddleware({
    target: `http://localhost:${port}`,
    changeOrigin: true,
    ws: true, // Support websockets (HMR)
    pathRewrite: {
      [`^/preview/${appId}`]: "",
    },
    on: {
      error: (err, req, res) => {
        console.error("Proxy error:", err);
        (res as any).status(502).send("Bad Gateway: Could not connect to app process.");
      },
    },
  })(req, res, next);
});

export default router;
