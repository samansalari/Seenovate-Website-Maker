import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../auth/AuthContext";
import { ApiClient } from "@/api/api_client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowUpIcon,
  RefreshCw,
  Loader2,
  LogOut,
  Sparkles,
  Lock,
  Zap,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Inspiration prompts
const INSPIRATION_PROMPTS = [
  { icon: "🛒", label: "E-commerce Store" },
  { icon: "📝", label: "Blog Platform" },
  { icon: "🎯", label: "Landing Page" },
  { icon: "📊", label: "Dashboard" },
  { icon: "📅", label: "Task Manager" },
  { icon: "🎨", label: "Portfolio Site" },
  { icon: "💬", label: "Chat App" },
  { icon: "📰", label: "Newsletter" },
  { icon: "🎵", label: "Music Player" },
  { icon: "📸", label: "Photo Gallery" },
];

// Free tier limit
const FREE_PROMPT_LIMIT = 10;

// Auto-resize textarea hook
function useAutoResizeTextarea(minHeight: number, maxHeight?: number) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

// Paywall Dialog Component
function PaywallDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const handleGetPro = () => {
    window.open(
      "https://www.dyad.sh/pro?utm_source=web-app&utm_medium=app&utm_campaign=paywall-dialog",
      "_blank"
    );
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span>Free Trial Limit Reached</span>
              <span className="text-sm font-normal text-muted-foreground">
                You've used all {FREE_PROMPT_LIMIT} free prompts
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <DialogDescription className="sr-only">
          Upgrade to Seenovate Pro for unlimited prompts and premium features
        </DialogDescription>

        <div className="py-4 space-y-4">
          <p className="text-base text-foreground">
            Upgrade to Seenovate Pro for unlimited prompts and access to
            premium features:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <Sparkles className="h-5 w-5 text-indigo-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Leading AI Models</p>
                <p className="text-sm text-muted-foreground">
                  Access GPT-4, Claude, Gemini Pro and more
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <Zap className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Turbo Edits</p>
                <p className="text-sm text-muted-foreground">
                  Generate code 4-10x faster
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <Brain className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Smart Context</p>
                <p className="text-sm text-muted-foreground">
                  Up to 5x cheaper with intelligent context management
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="sm:order-1">
            Maybe Later
          </Button>
          <Button
            onClick={handleGetPro}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white sm:order-2"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Seenovate Pro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Action button component
function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
    >
      <span>{icon}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
}

interface App {
  id: number;
  name: string;
  createdAt: string;
}

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pro status state
  const [isPro, setIsPro] = useState(false);
  const [freePromptCount, setFreePromptCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  // Random prompts state
  const [randomPrompts, setRandomPrompts] = useState<typeof INSPIRATION_PROMPTS>([]);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea(60, 200);

  // Get random prompts
  const getRandomPrompts = useCallback(() => {
    const shuffled = [...INSPIRATION_PROMPTS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, []);

  // Initialize random prompts
  useEffect(() => {
    setRandomPrompts(getRandomPrompts());
  }, [getRandomPrompts]);

  // Load user's apps and settings
  useEffect(() => {
    const loadData = async () => {
      try {
        const client = ApiClient.getInstance();
        const response = await client.listApps();
        setApps(response.apps || []);

        // Load settings for Pro status
        try {
          const settings = await client.getUserSettings();
          const hasProKey = !!settings?.providerSettings?.auto?.apiKey?.value;
          setIsPro(hasProKey && settings?.enableDyadPro === true);
          setFreePromptCount(settings?.freePromptCount ?? 0);
        } catch (err) {
          console.error("Failed to load settings:", err);
        }
      } catch (err) {
        console.error("Failed to load apps:", err);
      } finally {
        setLoadingApps(false);
      }
    };
    loadData();
  }, []);

  const remainingPrompts = Math.max(0, FREE_PROMPT_LIMIT - freePromptCount);
  const canSendPrompt = isPro || remainingPrompts > 0;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Check paywall
    if (!canSendPrompt) {
      setShowPaywall(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = ApiClient.getInstance();

      // Increment prompt count for free users
      if (!isPro) {
        try {
          await client.updateUserSettings({
            freePromptCount: freePromptCount + 1,
          });
          setFreePromptCount(freePromptCount + 1);
        } catch (err) {
          console.error("Failed to update prompt count:", err);
        }
      }

      // Create a new app
      const result = await client.createApp({
        name: `App ${Date.now()}`,
      });

      // Create a chat and send the prompt
      const chat = await client.createChat(result.app.id);

      // Start streaming the message
      client.streamMessage(inputValue, {
        chatId: chat.id,
        onUpdate: (messages) => {
          console.log("Stream update:", messages);
        },
        onEnd: () => {
          console.log("Stream ended");
        },
        onError: (error) => {
          console.error("Stream error:", error);
        },
      });

      // Navigate to the app page immediately
      navigate({ to: "/app/$appId", params: { appId: String(result.app.id) } });
    } catch (err: any) {
      console.error("Failed to create app:", err);
      setError(err.message || "Failed to create app");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute top-0 left-0 w-full h-full border-8 border-muted rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-8 border-t-primary rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">
            Building your app
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            We're setting up your app with AI magic.
            <br />
            This might take a moment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Seenovate</span>
          </div>
          <div className="flex items-center gap-4">
            {isPro && (
              <span className="text-xs px-2 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full">
                Pro
              </span>
            )}
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 space-y-8 pt-12">
        <h1 className="text-4xl font-bold text-foreground text-center">
          What can I help you ship?
        </h1>

        <div className="w-full">
          {/* Chat Input */}
          <div className="relative bg-(--background-lighter) rounded-xl border border-border">
            <div className="overflow-y-auto">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask Seenovate to build something amazing..."
                className={cn(
                  "w-full px-4 py-3",
                  "resize-none",
                  "bg-transparent",
                  "border-none",
                  "text-foreground text-sm",
                  "focus:outline-none",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "placeholder:text-muted-foreground placeholder:text-sm",
                  "min-h-[60px]"
                )}
                style={{ overflow: "hidden" }}
              />
            </div>

            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                {/* Placeholder for file attachment */}
              </div>
              <div className="flex items-center gap-2">
                {/* Show remaining prompts for free tier users */}
                {!isPro && (
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded-md",
                      remainingPrompts > 3
                        ? "text-muted-foreground bg-secondary/50"
                        : remainingPrompts > 0
                          ? "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30"
                          : "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
                    )}
                  >
                    {remainingPrompts > 0
                      ? `${remainingPrompts} free prompt${remainingPrompts !== 1 ? "s" : ""} left`
                      : "No free prompts left"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={!inputValue.trim()}
                  className={cn(
                    "px-1.5 py-1.5 rounded-lg text-sm transition-colors border border-border hover:bg-accent flex items-center justify-between gap-1",
                    inputValue.trim()
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <ArrowUpIcon
                    className={cn(
                      "w-4 h-4",
                      inputValue.trim()
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  />
                  <span className="sr-only">Send</span>
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive mt-2">{error}</p>}

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            {randomPrompts.map((item, index) => (
              <ActionButton
                key={index}
                icon={item.icon}
                label={item.label}
                onClick={() => setInputValue(`Build me a ${item.label}`)}
              />
            ))}
            <button
              type="button"
              onClick={() => setRandomPrompts(getRandomPrompts())}
              className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
              title="Get more ideas"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Pro Banner for non-Pro users */}
          {!isPro && (
            <div
              className="mt-6 w-full py-3 rounded-lg bg-gradient-to-br from-indigo-50 via-indigo-100 to-sky-100 dark:from-indigo-900/30 dark:via-indigo-800/30 dark:to-indigo-900/30 flex items-center justify-center relative overflow-hidden ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]"
              onClick={() =>
                window.open(
                  "https://www.dyad.sh/pro?utm_source=web-app&utm_medium=app&utm_campaign=in-app-banner",
                  "_blank"
                )
              }
            >
              <div className="text-center flex items-center gap-3">
                <span className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
                  Get unlimited prompts with Pro
                </span>
                <Button size="sm" variant="secondary">
                  Upgrade
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* User's Apps */}
        <div className="w-full mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Apps</h2>
          </div>

          {loadingApps ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : apps.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No apps yet. Create your first one above!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {apps.map((app) => (
                <Card
                  key={app.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() =>
                    navigate({
                      to: "/app/$appId",
                      params: { appId: String(app.id) },
                    })
                  }
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{app.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Paywall Dialog */}
      <PaywallDialog isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}
