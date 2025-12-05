import { ScrollArea } from "../components/ui/scroll-area";
import { useTerminal } from "../hooks/useTerminal";
import { useEffect, useRef } from "react";

interface TerminalProps {
  appId: number;
  className?: string;
}

export function Terminal({ appId, className }: TerminalProps) {
  const { logs } = useTerminal(appId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className={`flex flex-col rounded-lg border bg-black p-4 text-sm font-mono text-white ${className}`}>
      <div className="mb-2 border-b border-gray-800 pb-2 text-xs text-gray-400">
        Terminal Output
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {logs.map((log, i) => (
            <div key={i} className={log.isError ? "text-red-400" : "text-gray-300"}>
              <span className="mr-2 text-gray-600">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              {log.message}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}

