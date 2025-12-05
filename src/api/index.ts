/**
 * Unified client that works in both Electron and web environments
 */

export { ApiClient, isElectron } from "./api_client";
export type { ApiClientConfig, ChatStreamCallbacks } from "./api_client";

import { ApiClient, isElectron } from "./api_client";

// Token storage for web mode
const TOKEN_KEY = "dyad_auth_token";

export function getStoredToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// Initialize API client for web mode
export function initializeWebClient(onAuthError?: () => void): ApiClient {
  return ApiClient.initialize({
    baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
    getToken: getStoredToken,
    onAuthError: () => {
      clearStoredToken();
      onAuthError?.();
    },
  });
}

// Get the appropriate client based on environment
export function getClient() {
  if (isElectron()) {
    // In Electron, use IpcClient
    const { IpcClient } = require("../ipc/ipc_client");
    return IpcClient.getInstance();
  } else {
    // In web, use ApiClient
    return ApiClient.getInstance();
  }
}

