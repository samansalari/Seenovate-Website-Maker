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
import {
  createFileTools,
  initializeProject,
  isProjectInitialized,
} from "../services/ai_tools.js";
import { storage } from "../storage/index.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware as any);

// Active streams for cancellation
const activeStreams = new Map<string, AbortController>();

// Get provider client based on settings
function getModelClient(providerId: string, modelApiName: string) {
  switch (providerId) {
    case "anthropic":
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY not configured");
      }
      return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(modelApiName);
    case "google":
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error("GOOGLE_API_KEY not configured");
      }
      return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY })(modelApiName);
    case "openai":
    default:
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY not configured");
      }
      return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelApiName);
  }
}

// System prompt for the AI to generate and write files
const SYSTEM_PROMPT = `You are an expert web developer AI assistant that helps users build web applications.

IMPORTANT: You MUST use the provided tools to create and modify files. Do NOT just show code in your response - actually write the files using the writeFile tool.

When the user asks you to build something:
1. Use the writeFile tool to create/update the necessary files
2. Create complete, working code - not just snippets
3. Always update package.json if you add new dependencies
4. For React apps, put components in the src/ folder
5. Make sure the app is immediately runnable with "npm run dev"

Project Structure Guidelines:
- For React projects: Use Vite + React setup
- Main entry: src/main.jsx
- Components: src/App.jsx and other files in src/
- Styles: src/index.css or component-specific CSS
- Public assets: public/ folder

When modifying existing files:
1. First use readFile to see the current content
2. Then use writeFile with the complete updated content

Always respond with:
1. A brief explanation of what you're building
2. Use tools to write the actual files
3. A summary of what was created/changed

Remember: The user's app runs with "npm run dev" and uses Vite for development. Make sure all code is production-ready and follows best practices.`;

// Stream chat response using SSE with AI tools
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

    // Get app path for file operations
    const appPath = storage.getUserAppPath(userId, chat.app.id);

    // Initialize project if this is the first message or project doesn't exist
    const projectExists = await isProjectInitialized(appPath);
    if (!projectExists) {
      console.log(`[Stream] Initializing project for app ${chat.app.id}`);
      res.write(`data: ${JSON.stringify({ type: "status", message: "Initializing project..." })}\n\n`);
      
      try {
        await initializeProject(appPath, "vite-react");
        res.write(`data: ${JSON.stringify({ type: "status", message: "Project initialized!" })}\n\n`);
      } catch (initError: any) {
        console.error("[Stream] Project initialization error:", initError);
        res.write(`data: ${JSON.stringify({ type: "error", error: "Failed to initialize project: " + initError.message })}\n\n`);
        res.end();
        return;
      }
    }

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
      res.write(`data: ${JSON.stringify({ type: "message", message: userMessage })}\n\n`);
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

    // Create file tools for AI
    const toolContext = { userId, appId: chat.app.id, appPath };
    const fileTools = createFileTools(toolContext);

    try {
      const model = getModelClient(providerId, modelApiName);

      const result = streamText({
        model,
        messages: messageHistory,
        abortSignal: abortController.signal,
        system: SYSTEM_PROMPT,
        tools: fileTools,
        maxSteps: 10, // Allow multiple tool calls
        onStepFinish: async ({ stepType, toolCalls, toolResults }) => {
          // Notify client about tool usage
          if (stepType === "tool-result" && toolResults) {
            for (const result of toolResults) {
              if (result.result && typeof result.result === "object") {
                const toolResult = result.result as { success?: boolean; path?: string; message?: string };
                if (toolResult.success && toolResult.path) {
                  res.write(`data: ${JSON.stringify({ 
                    type: "fileUpdate", 
                    path: toolResult.path,
                    message: toolResult.message || `Updated ${toolResult.path}`
                  })}\n\n`);
                }
              }
            }
          }
        },
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
