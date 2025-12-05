import { Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "../auth/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen w-full flex-col">
      <Outlet />
    </div>
  );
}

