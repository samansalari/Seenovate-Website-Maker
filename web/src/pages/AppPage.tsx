import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { ApiClient } from "@/api/api_client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  SendIcon, 
  Loader2, 
  ArrowLeft, 
  Play, 
  Square, 
  RefreshCw,
  ExternalLink,
  Code,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface Chat {
  id: number;
  appId: number;
  title: string;
  messages: Message[];
}

interface App {
  id: number;
  name: string;
}

export default function AppPage() {
  const { appId } = useParams({ from: "/app/$appId" });
  const navigate = useNavigate();
  const [app, setApp] = useState<App | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAppRunning, setIsAppRunning] = useState(false);
  const [isStartingApp, setIsStartingApp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "preview">("chat");

  // Load app and chat data
  useEffect(() => {
    const loadData = async () => {
      try {
        const client = ApiClient.getInstance();
        
        // Load app
        const appData = await client.getApp(Number(appId));
        setApp(appData);

        // Load chats for this app
        const chats = await client.getChats(Number(appId));
        
        if (chats.length > 0) {
          // Get the first chat with messages
          const chatData = await client.getChat(chats[0].id);
          setChat(chatData);
          setMessages(chatData.messages || []);
        } else {
          // Create a new chat
          const newChat = await client.createChat(Number(appId));
          setChat(newChat);
          setMessages([]);
        }

        // Check if app is running
        const status = await client.getAppStatus(Number(appId));
        setIsAppRunning(status.running);
        if (status.previewUrl) {
          setPreviewUrl(status.previewUrl);
        }
      } catch (err) {
        console.error("Failed to load app data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming || !chat) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: inputValue,
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsStreaming(true);

    try {
      const client = ApiClient.getInstance();

      // Stream the message
      client.streamMessage(inputValue, {
        chatId: chat.id,
        onUpdate: (updatedMessages) => {
          setMessages([userMessage, ...updatedMessages.filter(m => m.role === "assistant")]);
        },
        onEnd: () => {
          setIsStreaming(false);
          // Reload messages to get the final state
          client.getMessages(chat.id).then(msgs => {
            setMessages(msgs);
          });
        },
        onError: (error) => {
          console.error("Stream error:", error);
          setIsStreaming(false);
        },
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      setIsStreaming(false);
    }
  };

  const handleStartApp = async () => {
    setIsStartingApp(true);
    try {
      const client = ApiClient.getInstance();
      const result = await client.startApp(Number(appId));
      setPreviewUrl(result.previewUrl);
      setIsAppRunning(true);
      setActiveTab("preview");
    } catch (err) {
      console.error("Failed to start app:", err);
    } finally {
      setIsStartingApp(false);
    }
  };

  const handleStopApp = async () => {
    try {
      const client = ApiClient.getInstance();
      await client.stopApp(Number(appId));
      setIsAppRunning(false);
      setPreviewUrl(null);
    } catch (err) {
      console.error("Failed to stop app:", err);
    }
  };

  const handleRefreshPreview = () => {
    if (previewUrl) {
      // Force iframe refresh
      setPreviewUrl(null);
      setTimeout(() => {
        ApiClient.getInstance().getAppStatus(Number(appId)).then(status => {
          if (status.previewUrl) {
            setPreviewUrl(status.previewUrl);
          }
        });
      }, 100);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold">{app?.name || "App"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAppRunning ? (
            <>
              <Button variant="outline" size="sm" onClick={handleRefreshPreview}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleStopApp}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
              {previewUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </a>
                </Button>
              )}
            </>
          ) : (
            <Button onClick={handleStartApp} disabled={isStartingApp}>
              {isStartingApp ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run App
            </Button>
          )}
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden border-b border-border">
        <button
          className={cn(
            "flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors",
            activeTab === "chat" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground"
          )}
          onClick={() => setActiveTab("chat")}
        >
          <MessageSquare className="h-4 w-4 inline mr-2" />
          Chat
        </button>
        <button
          className={cn(
            "flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors",
            activeTab === "preview" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground"
          )}
          onClick={() => setActiveTab("preview")}
        >
          <Code className="h-4 w-4 inline mr-2" />
          Preview
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Panel */}
        <div className={cn(
          "flex flex-col w-full md:w-1/2 border-r border-border",
          activeTab !== "chat" && "hidden md:flex"
        )}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Send a message to start building your app</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="relative">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe what you want to build or change..."
                className="min-h-[80px] pr-12 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isStreaming}
              />
              <Button
                type="button"
                size="icon"
                className="absolute bottom-3 right-3"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isStreaming}
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className={cn(
          "flex-1 flex flex-col bg-muted/30",
          activeTab !== "preview" && "hidden md:flex"
        )}>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              className="flex-1 w-full border-0"
              title="App Preview"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">App not running</p>
                <p className="text-sm">Click "Run App" to see the preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

