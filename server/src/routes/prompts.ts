import { Router, Response } from "express";
import { db } from "../db/index.js";
import { prompts } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../auth/index.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware as any);

// List all prompts for the user
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const userPrompts = await db.query.prompts.findMany({
      where: eq(prompts.userId, userId),
      orderBy: [desc(prompts.updatedAt)],
    });

    res.json(userPrompts);
  } catch (error) {
    console.error("Error listing prompts:", error);
    res.status(500).json({ error: "Failed to list prompts" });
  }
});

// Get a single prompt
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const promptId = parseInt(req.params.id);

    const prompt = await db.query.prompts.findFirst({
      where: and(eq(prompts.id, promptId), eq(prompts.userId, userId)),
    });

    if (!prompt) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    res.json(prompt);
  } catch (error) {
    console.error("Error getting prompt:", error);
    res.status(500).json({ error: "Failed to get prompt" });
  }
});

// Create a new prompt
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, description, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const [newPrompt] = await db
      .insert(prompts)
      .values({
        userId,
        title,
        description: description || null,
        content,
      })
      .returning();

    res.json(newPrompt);
  } catch (error) {
    console.error("Error creating prompt:", error);
    res.status(500).json({ error: "Failed to create prompt" });
  }
});

// Update prompt
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const promptId = parseInt(req.params.id);
    const { title, description, content } = req.body;

    // Verify ownership
    const existingPrompt = await db.query.prompts.findFirst({
      where: and(eq(prompts.id, promptId), eq(prompts.userId, userId)),
    });

    if (!existingPrompt) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    const [updatedPrompt] = await db
      .update(prompts)
      .set({
        title: title ?? existingPrompt.title,
        description: description ?? existingPrompt.description,
        content: content ?? existingPrompt.content,
        updatedAt: new Date(),
      })
      .where(eq(prompts.id, promptId))
      .returning();

    res.json(updatedPrompt);
  } catch (error) {
    console.error("Error updating prompt:", error);
    res.status(500).json({ error: "Failed to update prompt" });
  }
});

// Delete prompt
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const promptId = parseInt(req.params.id);

    // Verify ownership
    const existingPrompt = await db.query.prompts.findFirst({
      where: and(eq(prompts.id, promptId), eq(prompts.userId, userId)),
    });

    if (!existingPrompt) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    await db.delete(prompts).where(eq(prompts.id, promptId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting prompt:", error);
    res.status(500).json({ error: "Failed to delete prompt" });
  }
});

export default router;

