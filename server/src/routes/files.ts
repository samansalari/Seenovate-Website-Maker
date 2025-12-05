import { Router, Response } from "express";
import { db } from "../db/index.js";
import { apps } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../auth/index.js";
import { storage } from "../storage/index.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware as any);

// Read a file from an app
router.get("/app/:appId/*", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appId = parseInt(req.params.appId);
    const filePath = req.params[0] || "";

    // Verify app ownership
    const app = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }

    const appPath = storage.getUserAppPath(userId, appId);
    const fullPath = `${appPath}/${filePath}`;

    const exists = await storage.exists(fullPath);
    if (!exists) {
      return res.status(404).json({ error: "File not found" });
    }

    const stat = await storage.stat(fullPath);
    if (stat?.isDirectory) {
      // Return directory listing
      const files = await storage.listFiles(fullPath);
      return res.json({ files });
    }

    // Return file content
    const content = await storage.readFile(fullPath);
    res.json({ content });
  } catch (error) {
    console.error("Error reading file:", error);
    res.status(500).json({ error: "Failed to read file" });
  }
});

// Write a file to an app
router.put("/app/:appId/*", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appId = parseInt(req.params.appId);
    const filePath = req.params[0] || "";
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ error: "Content is required" });
    }

    // Verify app ownership
    const app = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }

    const appPath = storage.getUserAppPath(userId, appId);
    const fullPath = `${appPath}/${filePath}`;

    await storage.writeFile(fullPath, content);

    res.json({ success: true });
  } catch (error) {
    console.error("Error writing file:", error);
    res.status(500).json({ error: "Failed to write file" });
  }
});

// Delete a file from an app
router.delete("/app/:appId/*", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appId = parseInt(req.params.appId);
    const filePath = req.params[0] || "";

    // Verify app ownership
    const app = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }

    const appPath = storage.getUserAppPath(userId, appId);
    const fullPath = `${appPath}/${filePath}`;

    const exists = await storage.exists(fullPath);
    if (!exists) {
      return res.status(404).json({ error: "File not found" });
    }

    const stat = await storage.stat(fullPath);
    if (stat?.isDirectory) {
      await storage.deleteDir(fullPath);
    } else {
      await storage.deleteFile(fullPath);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// List all files in an app directory
router.get("/app/:appId", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appId = parseInt(req.params.appId);
    const recursive = req.query.recursive === "true";

    // Verify app ownership
    const app = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }

    const appPath = storage.getUserAppPath(userId, appId);

    // Ensure app directory exists
    await storage.ensureDir(appPath);

    const files = recursive 
      ? await storage.listFilesRecursive(appPath)
      : await storage.listFiles(appPath);

    res.json({ files });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({ error: "Failed to list files" });
  }
});

export default router;

