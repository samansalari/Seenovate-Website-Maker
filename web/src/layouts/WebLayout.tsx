import { ReactNode } from "react";
import { Toaster } from "sonner";

export function WebLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster richColors />
    </>
  );
}

