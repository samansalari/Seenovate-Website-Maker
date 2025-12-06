/**
 * AI Tools for code generation and file manipulation
 */

import { tool } from "ai";
import { z } from "zod";
import { storage } from "../storage/index.js";
import { getTemplate } from "./project_templates.js";

export interface ToolContext {
  userId: number;
  appId: number;
  appPath: string;
}

/**
 * Create AI tools for file operations
 */
export function createFileTools(context: ToolContext) {
  const { userId, appId, appPath } = context;

  return {
    /**
     * Write or update a file in the project
     */
    writeFile: tool({
      description:
        "Write content to a file in the project. Creates the file if it doesn't exist, or updates it if it does. Use this to create HTML, CSS, JavaScript, JSX, and other files.",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "The file path relative to the project root (e.g., 'src/App.jsx', 'index.html', 'styles.css')"
          ),
        content: z.string().describe("The complete content to write to the file"),
      }),
      execute: async ({ path, content }: { path: string; content: string }) => {
        try {
          const fullPath = `${appPath}/${path}`;
          await storage.writeFile(fullPath, content);
          console.log(`[AI Tool] Wrote file: ${path}`);
          return { success: true, path, message: `Successfully wrote ${path}` };
        } catch (error: any) {
          console.error(`[AI Tool] Error writing file ${path}:`, error);
          return { success: false, path, error: error.message };
        }
      },
    }),

    /**
     * Read a file from the project
     */
    readFile: tool({
      description: "Read the contents of a file in the project",
      inputSchema: z.object({
        path: z.string().describe("The file path relative to the project root"),
      }),
      execute: async ({ path }: { path: string }) => {
        try {
          const fullPath = `${appPath}/${path}`;
          const content = await storage.readFile(fullPath);
          return { success: true, path, content };
        } catch (error: any) {
          return { success: false, path, error: error.message };
        }
      },
    }),

    /**
     * List files in a directory
     */
    listFiles: tool({
      description: "List all files and directories in the project",
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .describe("Directory path relative to project root (default: root)"),
      }),
      execute: async ({ path }: { path?: string }) => {
        try {
          const dirPath = path ? `${appPath}/${path}` : appPath;
          const files = await storage.listFiles(dirPath);
          return {
            success: true,
            files: files.map((f) => ({
              name: f.name,
              isDirectory: f.isDirectory,
            })),
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    }),

    /**
     * Delete a file from the project
     */
    deleteFile: tool({
      description: "Delete a file from the project",
      inputSchema: z.object({
        path: z.string().describe("The file path to delete"),
      }),
      execute: async ({ path }: { path: string }) => {
        try {
          const fullPath = `${appPath}/${path}`;
          await storage.deleteFile(fullPath);
          return { success: true, path, message: `Deleted ${path}` };
        } catch (error: any) {
          return { success: false, path, error: error.message };
        }
      },
    }),
  };
}

/**
 * Initialize a new project with template files
 */
export async function initializeProject(
  appPath: string,
  templateName: string = "vite-react"
): Promise<{ success: boolean; files: string[] }> {
  const template = getTemplate(templateName);
  const createdFiles: string[] = [];

  try {
    // Create all template files
    for (const [filePath, content] of Object.entries(template.files)) {
      const fullPath = `${appPath}/${filePath}`;
      await storage.writeFile(fullPath, content);
      createdFiles.push(filePath);
      console.log(`[Init] Created: ${filePath}`);
    }

    return { success: true, files: createdFiles };
  } catch (error: any) {
    console.error("[Init] Error initializing project:", error);
    throw error;
  }
}

/**
 * Check if a project is initialized (has package.json)
 */
export async function isProjectInitialized(appPath: string): Promise<boolean> {
  return await storage.exists(`${appPath}/package.json`);
}

