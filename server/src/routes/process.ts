import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../auth/index.js";
import { processManager } from "../services/process_manager.js";
import { db } from "../db/index.js";
import { apps } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

const router = Router();

// All routes require authentication
router.use(authMiddleware as any);

// Start app process
router.post("/:appId/start", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appId = parseInt(req.params.appId);

    // Verify ownership
    const app = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }

    const port = await processManager.startApp(userId, appId);
    res.json({ success: true, port, previewUrl: `/preview/${appId}` });
  } catch (error: any) {
    console.error("Error starting app:", error);
    res.status(500).json({ error: error.message || "Failed to start app" });
  }
});

// Stop app process
router.post("/:appId/stop", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appId = parseInt(req.params.appId);

    // Verify ownership
    const app = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }

    const stopped = processManager.stopApp(appId);
    res.json({ success: true, stopped });
  } catch (error: any) {
    console.error("Error stopping app:", error);
    res.status(500).json({ error: error.message || "Failed to stop app" });
  }
});

// Get app status
router.get("/:appId/status", async (req: AuthRequest, res: Response) => {
  const appId = parseInt(req.params.appId);
  const port = processManager.getAppPort(appId);
  res.json({ 
    running: !!port, 
    port, 
    previewUrl: port ? `/preview/${appId}` : null 
  });
});

export default router;

