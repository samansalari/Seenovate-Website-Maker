import { Router, Response } from "express";
import { db } from "../db/index.js";
import { apps, chats } from "../db/schema.js";
import { eq, desc, and, like } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../auth/index.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const router = Router();

// All routes require authentication
router.use(authMiddleware as any);

// List all apps for the authenticated user
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const userApps = await db.query.apps.findMany({
      where: eq(apps.userId, userId),
      orderBy: [desc(apps.updatedAt)],
      with: {
        chats: {
          orderBy: [desc(chats.createdAt)],
          limit: 1,
        },
      },
    });

    const result = userApps.map((app) => ({
      id: app.id,
      name: app.name,
      path: app.path,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      isFavorite: app.isFavorite,
      githubOrg: app.githubOrg,
      githubRepo: app.githubRepo,
      supabaseProjectId: app.supabaseProjectId,
      neonProjectId: app.neonProjectId,
      vercelProjectId: app.vercelProjectId,
      latestChat: app.chats[0] || null,
    }));

    res.json({ apps: result });
  } catch (error) {
    console.error("Error listing apps:", error);
    res.status(500).json({ error: "Failed to list apps" });
  }
});

// Search apps
router.get("/search", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const query = req.query.q as string || "";

    const results = await db.query.apps.findMany({
      where: and(
        eq(apps.userId, userId),
        like(apps.name, `%${query}%`)
      ),
      orderBy: [desc(apps.updatedAt)],
      limit: 20,
    });

    res.json(results.map((app) => ({
      id: app.id,
      name: app.name,
      path: app.path,
    })));
  } catch (error) {
    console.error("Error searching apps:", error);
    res.status(500).json({ error: "Failed to search apps" });
  }
});

// Get a single app
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appId = parseInt(req.params.id);

    const app = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }

    res.json(app);
  } catch (error) {
    console.error("Error getting app:", error);
    res.status(500).json({ error: "Failed to get app" });
  }
});

// Create a new app
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, prompt, template } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Generate a unique path for the app (in web version, this is virtual)
    const appPath = `apps/${userId}/${uuidv4()}`;

    const [newApp] = await db
      .insert(apps)
      .values({
        userId,
        name,
        path: appPath,
      })
      .returning();

    // Create initial chat for the app
    const [newChat] = await db
      .insert(chats)
      .values({
        appId: newApp.id,
        title: prompt ? prompt.substring(0, 50) : "New Chat",
      })
      .returning();

    res.json({
      app: newApp,
      chat: newChat,
    });
  } catch (error) {
    console.error("Error creating app:", error);
    res.status(500).json({ error: "Failed to create app" });
  }
});

// Update app
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appId = parseInt(req.params.id);
    const updates = req.body;

    // Verify ownership
    const existingApp = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!existingApp) {
      return res.status(404).json({ error: "App not found" });
    }

    const [updatedApp] = await db
      .update(apps)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(apps.id, appId))
      .returning();

    res.json(updatedApp);
  } catch (error) {
    console.error("Error updating app:", error);
    res.status(500).json({ error: "Failed to update app" });
  }
});

// Delete app
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appId = parseInt(req.params.id);

    // Verify ownership
    const existingApp = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!existingApp) {
      return res.status(404).json({ error: "App not found" });
    }

    await db.delete(apps).where(eq(apps.id, appId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting app:", error);
    res.status(500).json({ error: "Failed to delete app" });
  }
});

// Toggle favorite
router.post("/:id/favorite", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appId = parseInt(req.params.id);

    const existingApp = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!existingApp) {
      return res.status(404).json({ error: "App not found" });
    }

    const [updatedApp] = await db
      .update(apps)
      .set({
        isFavorite: !existingApp.isFavorite,
        updatedAt: new Date(),
      })
      .where(eq(apps.id, appId))
      .returning();

    res.json({ isFavorite: updatedApp.isFavorite });
  } catch (error) {
    console.error("Error toggling favorite:", error);
    res.status(500).json({ error: "Failed to toggle favorite" });
  }
});

export default router;

