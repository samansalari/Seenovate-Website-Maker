import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../auth/AuthContext";
import { ApiClient } from "@/api/api_client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon, Loader2, LogOut, Sparkles } from "lucide-react";

// Inspiration prompts
const INSPIRATION_PROMPTS = [
  { icon: "🛒", label: "E-commerce Store" },
  { icon: "📝", label: "Blog Platform" },
  { icon: "🎯", label: "Landing Page" },
  { icon: "📊", label: "Dashboard" },
  { icon: "📅", label: "Task Manager" },
  { icon: "🎨", label: "Portfolio Site" },
];

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

  // Load user's apps
  useEffect(() => {
    const loadApps = async () => {
      try {
        const client = ApiClient.getInstance();
        const response = await client.listApps();
        setApps(response.apps || []);
      } catch (err) {
        console.error("Failed to load apps:", err);
      } finally {
        setLoadingApps(false);
      }
    };
    loadApps();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = ApiClient.getInstance();
      
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

  const handlePromptClick = (label: string) => {
    setInputValue(`Build me a ${label}`);
  };

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
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">What would you like to build?</h1>
          <p className="text-muted-foreground">
            Describe your app idea and let AI help you build it
          </p>
        </div>

        {/* Prompt Input */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Describe the app you want to build..."
                  className="min-h-[120px] pr-12 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute bottom-3 right-3"
                  disabled={!inputValue.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive mt-2">{error}</p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Inspiration Prompts */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">
            Or try one of these ideas
          </h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {INSPIRATION_PROMPTS.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handlePromptClick(item.label)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-border
                         bg-card hover:bg-accent transition-colors text-sm"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User's Apps */}
        <div>
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
            <div className="grid gap-4 md:grid-cols-2">
              {apps.map((app) => (
                <Card 
                  key={app.id} 
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => navigate({ to: "/app/$appId", params: { appId: String(app.id) } })}
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
    </div>
  );
}
