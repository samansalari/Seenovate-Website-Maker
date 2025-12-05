import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getStoredToken } from "../api/index";

interface TerminalLog {
  appId: number;
  message: string;
  isError: boolean;
  timestamp: string;
}

export function useTerminal(appId: number) {
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!appId) return;

    const token = getStoredToken();
    if (!token) return;

    const newSocket = io("/", {
      auth: { token },
      query: { appId },
    });

    newSocket.on("connect", () => {
      console.log("Connected to terminal socket");
      newSocket.emit("terminal:join", { appId });
    });

    newSocket.on("terminal:log", (log: TerminalLog) => {
      setLogs((prev) => [...prev, log]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [appId]);

  const clearLogs = () => setLogs([]);

  return { logs, clearLogs, isConnected: socket?.connected };
}

