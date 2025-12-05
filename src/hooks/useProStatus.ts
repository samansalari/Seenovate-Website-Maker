import { useCallback } from "react";
import { useSettings } from "./useSettings";
import {
  isDyadProEnabled,
  hasDyadProKey,
  canSendPrompt,
  getRemainingFreePrompts,
  FREE_PROMPT_LIMIT,
} from "@/lib/schemas";

export interface ProStatus {
  /** Whether the user has Pro enabled and configured */
  isPro: boolean;
  /** Whether the user has a Pro key configured (even if not enabled) */
  hasProKey: boolean;
  /** Whether the user can send a prompt (Pro or within free limit) */
  canSendPrompt: boolean;
  /** Number of remaining free prompts (Infinity for Pro users) */
  remainingPrompts: number;
  /** Number of prompts used in the free tier */
  usedPrompts: number;
  /** Maximum free prompts allowed */
  freePromptLimit: number;
  /** Increment the used prompt count (for free tier users) */
  incrementPromptCount: () => Promise<void>;
}

/**
 * Hook to check Pro status and manage free tier usage
 */
export function useProStatus(): ProStatus {
  const { settings, updateSettings } = useSettings();

  const isPro = settings ? isDyadProEnabled(settings) : false;
  const hasProKey = settings ? hasDyadProKey(settings) : false;
  const canSend = settings ? canSendPrompt(settings) : true;
  const remainingPrompts = settings ? getRemainingFreePrompts(settings) : FREE_PROMPT_LIMIT;
  const usedPrompts = settings?.freePromptCount ?? 0;

  const incrementPromptCount = useCallback(async () => {
    if (!settings) return;
    
    // Pro users don't need to track usage
    if (isDyadProEnabled(settings)) return;

    const currentCount = settings.freePromptCount ?? 0;
    await updateSettings({
      freePromptCount: currentCount + 1,
    });
  }, [settings, updateSettings]);

  return {
    isPro,
    hasProKey,
    canSendPrompt: canSend,
    remainingPrompts,
    usedPrompts,
    freePromptLimit: FREE_PROMPT_LIMIT,
    incrementPromptCount,
  };
}

