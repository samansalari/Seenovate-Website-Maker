import { Router, Response } from "express";
import { db } from "../db/index.js";
import { apps, chats, messages, userSettings } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../auth/index.js";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// All routes require authentication
router.use(authMiddleware as any);

// Active streams for cancellation
const activeStreams = new Map<string, AbortController>();

// Get provider client based on settings
function getModelClient(providerId: string, modelApiName: string) {
  const apiKey = process.env[`${providerId.toUpperCase()}_API_KEY`] || 
                 process.env.OPENAI_API_KEY;

  switch (providerId) {
    case "anthropic":
      return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(modelApiName);
    case "google":
      return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY })(modelApiName);
    case "openai":
    default:
      return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelApiName);
  }
}

// Stream chat response using SSE
router.post("/:chatId", async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const chatId = parseInt(req.params.chatId);
  const { prompt, redo } = req.body;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    // Verify chat ownership
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
      res.write(`data: ${JSON.stringify({ type: "error", error: "Chat not found" })}\n\n`);
      res.end();
      return;
    }

    if (chat.app.userId !== userId) {
      res.write(`data: ${JSON.stringify({ type: "error", error: "Access denied" })}\n\n`);
      res.end();
      return;
    }

    // Get user settings
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    const providerId = settings?.selectedProviderId || "openai";
    const modelApiName = settings?.selectedModelApiName || "gpt-4o-mini";

    // Save user message if not redo
    if (!redo && prompt) {
      const [userMessage] = await db
        .insert(messages)
        .values({
          chatId,
          role: "user",
          content: prompt,
        })
        .returning();

      // Send user message event
      res.write(`data: ${JSON.stringify({ 
        type: "message", 
        message: userMessage 
      })}\n\n`);
    }

    // Build message history for AI
    const messageHistory = chat.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    if (!redo && prompt) {
      messageHistory.push({ role: "user", content: prompt });
    }

    // Create abort controller for this stream
    const streamId = `${chatId}-${Date.now()}`;
    const abortController = new AbortController();
    activeStreams.set(streamId, abortController);

    // Send stream ID to client
    res.write(`data: ${JSON.stringify({ type: "streamId", streamId })}\n\n`);

    try {
      const model = getModelClient(providerId, modelApiName);
      
      const result = streamText({
        model,
        messages: messageHistory,
        abortSignal: abortController.signal,
        system: `You are a helpful AI assistant for building web applications. 
You help users create, modify, and understand code.
When generating code, use modern best practices and include helpful comments.
Be concise but thorough in your explanations.`,
      });

      let fullResponse = "";
      const requestId = uuidv4();

      for await (const chunk of result.textStream) {
        if (abortController.signal.aborted) {
          break;
        }

        fullResponse += chunk;

        // Send chunk event
        res.write(`data: ${JSON.stringify({ 
          type: "chunk", 
          content: chunk,
          fullContent: fullResponse
        })}\n\n`);
      }

      // Save assistant message
      if (fullResponse && !abortController.signal.aborted) {
        const [assistantMessage] = await db
          .insert(messages)
          .values({
            chatId,
            role: "assistant",
            content: fullResponse,
            requestId,
          })
          .returning();

        // Send end event
        res.write(`data: ${JSON.stringify({ 
          type: "end", 
          message: assistantMessage,
          chatId
        })}\n\n`);
      }

    } catch (streamError: any) {
      if (streamError.name !== "AbortError") {
        console.error("Streaming error:", streamError);
        res.write(`data: ${JSON.stringify({ 
          type: "error", 
          error: streamError.message || "Streaming failed" 
        })}\n\n`);
      }
    } finally {
      activeStreams.delete(streamId);
    }

    res.end();

  } catch (error: any) {
    console.error("Stream setup error:", error);
    res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
    res.end();
  }
});

// Cancel a stream
router.post("/cancel/:streamId", async (req: AuthRequest, res: Response) => {
  const { streamId } = req.params;

  const controller = activeStreams.get(streamId);
  if (controller) {
    controller.abort();
    activeStreams.delete(streamId);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Stream not found" });
  }
});

export default router;

