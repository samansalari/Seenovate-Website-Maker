import { Router, Response } from "express";
import { db } from "../db/index.js";
import { apps, chats, messages } from "../db/schema.js";
import { eq, desc, and, like } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../auth/index.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware as any);

// Get all chats for an app
router.get("/app/:appId", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appId = parseInt(req.params.appId);

    // Verify app ownership
    const app = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }

    const appChats = await db.query.chats.findMany({
      where: eq(chats.appId, appId),
      orderBy: [desc(chats.createdAt)],
    });

    res.json(appChats);
  } catch (error) {
    console.error("Error listing chats:", error);
    res.status(500).json({ error: "Failed to list chats" });
  }
});

// Search chats
router.get("/app/:appId/search", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appId = parseInt(req.params.appId);
    const query = req.query.q as string || "";

    // Verify app ownership
    const app = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }

    const results = await db.query.chats.findMany({
      where: and(
        eq(chats.appId, appId),
        like(chats.title, `%${query}%`)
      ),
      orderBy: [desc(chats.createdAt)],
      limit: 20,
    });

    res.json(results);
  } catch (error) {
    console.error("Error searching chats:", error);
    res.status(500).json({ error: "Failed to search chats" });
  }
});

// Get a single chat with messages
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const chatId = parseInt(req.params.id);

    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      with: {
        app: true,
        messages: {
          orderBy: [messages.createdAt],
        },
      },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Verify ownership through app
    if (chat.app.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(chat);
  } catch (error) {
    console.error("Error getting chat:", error);
    res.status(500).json({ error: "Failed to get chat" });
  }
});

// Create a new chat
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { appId, title } = req.body;

    if (!appId) {
      return res.status(400).json({ error: "appId is required" });
    }

    // Verify app ownership
    const app = await db.query.apps.findFirst({
      where: and(eq(apps.id, appId), eq(apps.userId, userId)),
    });

    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }

    const [newChat] = await db
      .insert(chats)
      .values({
        appId,
        title: title || "New Chat",
      })
      .returning();

    res.json(newChat);
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ error: "Failed to create chat" });
  }
});

// Update chat
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const chatId = parseInt(req.params.id);
    const { title } = req.body;

    // Get chat and verify ownership
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      with: { app: true },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (chat.app.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [updatedChat] = await db
      .update(chats)
      .set({ title })
      .where(eq(chats.id, chatId))
      .returning();

    res.json(updatedChat);
  } catch (error) {
    console.error("Error updating chat:", error);
    res.status(500).json({ error: "Failed to update chat" });
  }
});

// Delete chat
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const chatId = parseInt(req.params.id);

    // Get chat and verify ownership
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      with: { app: true },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (chat.app.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await db.delete(chats).where(eq(chats.id, chatId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

// Get messages for a chat
router.get("/:id/messages", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const chatId = parseInt(req.params.id);

    // Get chat and verify ownership
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      with: { app: true },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (chat.app.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: [messages.createdAt],
    });

    res.json(chatMessages);
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ error: "Failed to get messages" });
  }
});

// Add a message to a chat
router.post("/:id/messages", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const chatId = parseInt(req.params.id);
    const { role, content } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: "role and content are required" });
    }

    // Get chat and verify ownership
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      with: { app: true },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (chat.app.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        chatId,
        role,
        content,
      })
      .returning();

    res.json(newMessage);
  } catch (error) {
    console.error("Error adding message:", error);
    res.status(500).json({ error: "Failed to add message" });
  }
});

export default router;

