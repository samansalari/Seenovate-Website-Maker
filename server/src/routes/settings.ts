import { Router, Response, Request } from "express";
import { db } from "../db/index.js";
import { userSettings } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../auth/index.js";

const router = Router();

// Public endpoint - Get available AI providers (no auth required)
// This must be defined BEFORE the auth middleware is applied
router.get("/providers", async (req: Request, res: Response) => {
  // Return list of available providers based on configured API keys
  const providers = [];

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      id: "openai",
      name: "OpenAI",
      models: [
        { apiName: "gpt-4o", displayName: "GPT-4o" },
        { apiName: "gpt-4o-mini", displayName: "GPT-4o Mini" },
        { apiName: "gpt-4-turbo", displayName: "GPT-4 Turbo" },
        { apiName: "gpt-3.5-turbo", displayName: "GPT-3.5 Turbo" },
      ],
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({
      id: "anthropic",
      name: "Anthropic",
      models: [
        { apiName: "claude-sonnet-4-20250514", displayName: "Claude Sonnet 4" },
        { apiName: "claude-3-5-sonnet-20241022", displayName: "Claude 3.5 Sonnet" },
        { apiName: "claude-3-haiku-20240307", displayName: "Claude 3 Haiku" },
      ],
    });
  }

  if (process.env.GOOGLE_API_KEY) {
    providers.push({
      id: "google",
      name: "Google",
      models: [
        { apiName: "gemini-1.5-pro", displayName: "Gemini 1.5 Pro" },
        { apiName: "gemini-1.5-flash", displayName: "Gemini 1.5 Flash" },
      ],
    });
  }

  // Always show at least OpenAI as an option
  if (providers.length === 0) {
    providers.push({
      id: "openai",
      name: "OpenAI",
      models: [
        { apiName: "gpt-4o-mini", displayName: "GPT-4o Mini" },
      ],
      requiresApiKey: true,
    });
  }

  res.json({ providers });
});

// All routes below require authentication
router.use(authMiddleware as any);

// Get user settings
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    let settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    // Create default settings if not exists
    if (!settings) {
      const [newSettings] = await db
        .insert(userSettings)
        .values({ userId })
        .returning();
      settings = newSettings;
    }

    res.json(settings);
  } catch (error) {
    console.error("Error getting settings:", error);
    res.status(500).json({ error: "Failed to get settings" });
  }
});

// Update user settings
router.patch("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const updates = req.body;

    // Ensure settings exist
    let settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (!settings) {
      const [newSettings] = await db
        .insert(userSettings)
        .values({ userId, ...updates })
        .returning();
      return res.json(newSettings);
    }

    // Update settings
    const [updatedSettings] = await db
      .update(userSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId))
      .returning();

    res.json(updatedSettings);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
