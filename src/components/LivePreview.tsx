import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";
import { ApiClient } from "../api/api_client";
import { toast } from "sonner";

interface LivePreviewProps {
  appId: number;
  className?: string;
}

export function LivePreview({ appId, className }: LivePreviewProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = async () => {
    try {
      const client = ApiClient.getInstance();
      // We need to add this method to ApiClient or fetch directly
      const res = await fetch(`/api/process/${appId}/status`, {
        headers: { Authorization: `Bearer ${client.getToken()}` }
      });
      const data = await res.json();
      setIsRunning(data.running);
    } catch (e) {
      console.error("Failed to check status", e);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [appId]);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const client = ApiClient.getInstance();
      await fetch(`/api/process/${appId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${client.getToken()}` }
      });
      toast.success("Starting app...");
      setTimeout(() => {
        setIsRunning(true);
        setIframeKey(k => k + 1);
      }, 2000);
    } catch (e) {
      toast.error("Failed to start app");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      const client = ApiClient.getInstance();
      await fetch(`/api/process/${appId}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${client.getToken()}` }
      });
      setIsRunning(false);
      toast.success("App stopped");
    } catch (e) {
      toast.error("Failed to stop app");
    }
  };

  return (
    <div className={`flex flex-col overflow-hidden rounded-lg border bg-background ${className}`}>
      <div className="flex items-center justify-between border-b p-2 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isRunning ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm font-medium">Live Preview</span>
        </div>
        <div className="flex gap-2">
          {!isRunning ? (
            <Button size="sm" variant="default" onClick={handleStart} disabled={isLoading}>
              {isLoading ? "Starting..." : "Start App"}
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setIframeKey(k => k + 1)}>
                <ReloadIcon className="mr-2 h-3 w-3" /> Refresh
              </Button>
              <Button size="sm" variant="destructive" onClick={handleStop}>
                Stop
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 bg-white">
        {isRunning ? (
          <iframe
            key={iframeKey}
            src={`/api/preview/${appId}/`}
            className="h-full w-full border-none"
            title="App Preview"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>App is not running</p>
              <Button variant="link" onClick={handleStart}>Click to start</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

