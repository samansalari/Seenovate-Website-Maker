import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, Play, Square, ExternalLink, Terminal as TerminalIcon } from "lucide-react";
import { ApiClient, TerminalLog } from "@/api/api_client";
import { useAuth } from "@/web/src/auth/AuthContext";

interface WebPreviewProps {
  appId: number;
  className?: string;
}

export function WebPreview({ appId, className }: WebPreviewProps) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Check initial status
    checkStatus();

    // Subscribe to logs
    const client = ApiClient.getInstance();
    client.subscribeToLogs(appId, (log) => {
      setLogs((prev) => [...prev, log]);
      // Auto-scroll to bottom
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    });

    return () => {
      client.unsubscribeFromLogs(appId);
    };
  }, [appId]);

  const checkStatus = async () => {
    try {
      const status = await ApiClient.getInstance().getAppStatus(appId);
      setIsRunning(status.running);
      if (status.running && status.previewUrl) {
        setIframeUrl(status.previewUrl);
      }
    } catch (error) {
      console.error("Failed to check app status:", error);
    }
  };

  const startApp = async () => {
    setIsLoading(true);
    setLogs([]); // Clear logs on restart
    try {
      const result = await ApiClient.getInstance().startApp(appId);
      setIframeUrl(result.previewUrl);
      setIsRunning(true);
      setShowTerminal(true); // Show terminal while starting
    } catch (error) {
      console.error("Failed to start app:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopApp = async () => {
    setIsLoading(true);
    try {
      await ApiClient.getInstance().stopApp(appId);
      setIsRunning(false);
      setIframeUrl(null);
    } catch (error) {
      console.error("Failed to stop app:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPreview = () => {
    const currentUrl = iframeUrl;
    setIframeUrl(null);
    setTimeout(() => setIframeUrl(currentUrl), 100);
  };

  return (
    <div className={`flex flex-col h-full border rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-2 bg-muted border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={isRunning ? stopApp : startApp}
            disabled={isLoading}
          >
            {isRunning ? (
              <>
                <Square className="h-4 w-4 mr-2 fill-red-500 text-red-500" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2 fill-green-500 text-green-500" />
                Run
              </>
            )}
          </Button>
          
          {isRunning && (
            <Button variant="ghost" size="sm" onClick={refreshPreview}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant={showTerminal ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setShowTerminal(!showTerminal)}
          >
            <TerminalIcon className="h-4 w-4 mr-2" />
            Terminal
          </Button>
          
          {iframeUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={iframeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        {iframeUrl ? (
          <iframe
            src={iframeUrl}
            className="w-full h-full border-none bg-white"
            title="App Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted/50 text-muted-foreground">
            {isRunning ? "Loading preview..." : "App is stopped"}
          </div>
        )}

        {showTerminal && (
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-black/90 border-t shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-2 bg-muted/10 border-b border-white/10">
              <span className="text-xs text-muted-foreground">Terminal Output</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setShowTerminal(false)}
              >
                <span className="sr-only">Close</span>
                ×
              </Button>
            </div>
            <div 
              ref={terminalRef}
              className="flex-1 overflow-auto p-2 font-mono text-xs text-green-400 whitespace-pre-wrap"
            >
              {logs.map((log, i) => (
                <div key={i} className={log.isError ? "text-red-400" : ""}>
                  <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                </div>
              ))}
              {logs.length === 0 && <div className="text-gray-500 italic">No output...</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

