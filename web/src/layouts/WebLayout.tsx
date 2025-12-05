import { ReactNode } from "react";
import { Toaster } from "sonner";

export function WebLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
      <Toaster richColors />
    </div>
  );
}

