/**
 * HTTP API Client for web deployment
 * This replaces IpcClient when running in web mode (not Electron)
 */

import type { ChatSummary, UserSettings, AppSearchResult, ChatSearchResult } from "../lib/schemas";
import type {
  App,
  Chat,
  Message,
  ListAppsResponse,
  CreateAppParams,
  CreateAppResult,
  ChatResponseEnd,
} from "../ipc/ipc_types";
import { io, Socket } from "socket.io-client";

// In production, use relative URLs (same origin). In development, use localhost.
const isProduction = typeof window !== "undefined" && window.location.hostname !== "localhost";
const API_BASE = import.meta.env.VITE_API_URL || (isProduction ? "/api" : "http://localhost:3001/api");
const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace("/api", "") 
  : (isProduction ? window.location.origin : "http://localhost:3001");

export interface ApiClientConfig {
  baseUrl?: string;
  getToken: () => string | null;
  onAuthError?: () => void;
}

export interface ChatStreamCallbacks {
  onUpdate: (messages: Message[]) => void;
  onEnd: (response: ChatResponseEnd) => void;
  onError: (error: string) => void;
}

export interface TerminalLog {
  appId: number;
  message: string;
  isError: boolean;
  timestamp: string;
}

export class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;
  private getToken: () => string | null;
  private onAuthError?: () => void;
  private chatStreams: Map<number, ChatStreamCallbacks>;
  private socket: Socket | null = null;
  private terminalListeners: Map<number, (log: TerminalLog) => void> = new Map();

  private constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl || API_BASE;
    this.getToken = config.getToken;
    this.onAuthError = config.onAuthError;
    this.chatStreams = new Map();
    this.initSocket();
  }

  private initSocket() {
    this.socket = io(SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    this.socket.on("terminal:log", (log: TerminalLog) => {
      const listener = this.terminalListeners.get(log.appId);
      if (listener) {
        listener(log);
      }
    });
  }

  public static initialize(config: ApiClientConfig): ApiClient {
    ApiClient.instance = new ApiClient(config);
    return ApiClient.instance;
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      throw new Error("ApiClient not initialized. Call ApiClient.initialize() first.");
    }
    return ApiClient.instance;
  }

  public static isInitialized(): boolean {
    return !!ApiClient.instance;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.onAuthError?.();
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || "Request failed");
    }

    return response.json();
  }

  // ... (Existing methods remain unchanged) ...

  // Auth methods
  public async register(email: string, password: string, name?: string): Promise<{ user: any; token: string }> {
    return this.fetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  }

  public async login(email: string, password: string): Promise<{ user: any; token: string }> {
    return this.fetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  public async getMe(): Promise<{ id: number; email: string; name: string | null }> {
    return this.fetch("/auth/me");
  }

  // Apps methods
  public async listApps(): Promise<ListAppsResponse> {
    return this.fetch("/apps");
  }

  public async getApp(appId: number): Promise<App> {
    return this.fetch(`/apps/${appId}`);
  }

  public async createApp(params: CreateAppParams): Promise<CreateAppResult> {
    return this.fetch("/apps", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  public async updateApp(appId: number, updates: Partial<App>): Promise<App> {
    return this.fetch(`/apps/${appId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  public async deleteApp(appId: number): Promise<void> {
    await this.fetch(`/apps/${appId}`, { method: "DELETE" });
  }

  public async searchApps(query: string): Promise<AppSearchResult[]> {
    return this.fetch(`/apps/search?q=${encodeURIComponent(query)}`);
  }

  public async addAppToFavorite(appId: number): Promise<{ isFavorite: boolean }> {
    return this.fetch(`/apps/${appId}/favorite`, { method: "POST" });
  }

  // Chats methods
  public async getChats(appId: number): Promise<ChatSummary[]> {
    return this.fetch(`/chats/app/${appId}`);
  }

  public async getChat(chatId: number): Promise<Chat> {
    return this.fetch(`/chats/${chatId}`);
  }

  public async createChat(appId: number, title?: string): Promise<Chat> {
    return this.fetch("/chats", {
      method: "POST",
      body: JSON.stringify({ appId, title }),
    });
  }

  public async updateChat(chatId: number, title: string): Promise<Chat> {
    return this.fetch(`/chats/${chatId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  }

  public async deleteChat(chatId: number): Promise<void> {
    await this.fetch(`/chats/${chatId}`, { method: "DELETE" });
  }

  public async searchChats(appId: number, query: string): Promise<ChatSearchResult[]> {
    return this.fetch(`/chats/app/${appId}/search?q=${encodeURIComponent(query)}`);
  }

  public async getMessages(chatId: number): Promise<Message[]> {
    return this.fetch(`/chats/${chatId}/messages`);
  }

  public async addMessage(chatId: number, role: "user" | "assistant", content: string): Promise<Message> {
    return this.fetch(`/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ role, content }),
    });
  }

  // Streaming chat
  public streamMessage(
    prompt: string,
    options: {
      chatId: number;
      redo?: boolean;
      onUpdate: (messages: Message[]) => void;
      onEnd: (response: ChatResponseEnd) => void;
      onError: (error: string) => void;
    }
  ): void {
    const { chatId, redo, onUpdate, onEnd, onError } = options;
    
    this.chatStreams.set(chatId, { onUpdate, onEnd, onError });

    const token = this.getToken();
    
    fetch(`${this.baseUrl}/stream/${chatId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ prompt, redo }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Stream failed" }));
          onError(error.error || "Stream failed");
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          onError("No response body");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        const currentMessages: Message[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                
                switch (data.type) {
                  case "message":
                    currentMessages.push(data.message);
                    onUpdate([...currentMessages]);
                    break;
                  case "chunk":
                    if (currentMessages.length > 0) {
                      const lastMsg = currentMessages[currentMessages.length - 1];
                      if (lastMsg.role === "assistant") {
                        lastMsg.content = data.fullContent;
                      } else {
                        currentMessages.push({
                          id: -1,
                          chatId,
                          role: "assistant",
                          content: data.fullContent,
                          createdAt: new Date(),
                        } as Message);
                      }
                    } else {
                      currentMessages.push({
                        id: -1,
                        chatId,
                        role: "assistant",
                        content: data.fullContent,
                        createdAt: new Date(),
                      } as Message);
                    }
                    onUpdate([...currentMessages]);
                    break;
                  case "end":
                    onEnd({
                      chatId,
                      success: true,
                    } as ChatResponseEnd);
                    break;
                  case "error":
                    onError(data.error);
                    break;
                }
              } catch (e) {
                console.error("Failed to parse SSE data:", e);
              }
            }
          }
        }
      })
      .catch((error) => {
        onError(error.message || "Stream failed");
      })
      .finally(() => {
        this.chatStreams.delete(chatId);
      });
  }

  public cancelStream(chatId: number): void {
    this.chatStreams.delete(chatId);
  }

  // Settings methods
  public async getSettings(): Promise<UserSettings> {
    return this.fetch("/settings");
  }

  public async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.fetch("/settings", {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  public async getProviders(): Promise<{ providers: any[] }> {
    return this.fetch("/settings/providers");
  }

  // Settings methods
  public async getUserSettings(): Promise<UserSettings> {
    return this.fetch("/settings");
  }

  public async updateUserSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    return this.fetch("/settings", {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  // Prompts methods
  public async listPrompts(): Promise<any[]> {
    return this.fetch("/prompts");
  }

  public async getPrompt(promptId: number): Promise<any> {
    return this.fetch(`/prompts/${promptId}`);
  }

  public async createPrompt(data: { title: string; description?: string; content: string }): Promise<any> {
    return this.fetch("/prompts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async updatePrompt(promptId: number, data: { title?: string; description?: string; content?: string }): Promise<any> {
    return this.fetch(`/prompts/${promptId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  public async deletePrompt(promptId: number): Promise<void> {
    await this.fetch(`/prompts/${promptId}`, { method: "DELETE" });
  }

  // File methods
  public async readAppFile(appId: number, filePath: string): Promise<string> {
    const response = await this.fetch<{ content: string }>(`/files/app/${appId}/${filePath}`);
    return response.content;
  }

  public async writeAppFile(appId: number, filePath: string, content: string): Promise<void> {
    await this.fetch(`/files/app/${appId}/${filePath}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  }

  public async deleteAppFile(appId: number, filePath: string): Promise<void> {
    await this.fetch(`/files/app/${appId}/${filePath}`, { method: "DELETE" });
  }

  public async listAppFiles(appId: number, recursive = false): Promise<{ files: any[] }> {
    return this.fetch(`/files/app/${appId}?recursive=${recursive}`);
  }

  // Process Management & Logs
  public async startApp(appId: number): Promise<{ port: number; previewUrl: string }> {
    return this.fetch(`/process/${appId}/start`, { method: "POST" });
  }

  public async stopApp(appId: number): Promise<{ stopped: boolean }> {
    return this.fetch(`/process/${appId}/stop`, { method: "POST" });
  }

  public async getAppStatus(appId: number): Promise<{ running: boolean; port?: number; previewUrl?: string }> {
    return this.fetch(`/process/${appId}/status`);
  }

  public subscribeToLogs(appId: number, callback: (log: TerminalLog) => void) {
    this.terminalListeners.set(appId, callback);
    this.socket?.emit("join-app", appId);
  }

  public unsubscribeFromLogs(appId: number) {
    this.terminalListeners.delete(appId);
    this.socket?.emit("leave-app", appId);
  }
}

// Helper to detect if running in Electron or web
export function isElectron(): boolean {
  return typeof window !== "undefined" && !!(window as any).electron;
}
