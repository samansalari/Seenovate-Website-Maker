import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Welcome, {user?.name || user?.email}!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            You are logged in successfully.
          </p>
          <Button onClick={logout} variant="outline" className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

