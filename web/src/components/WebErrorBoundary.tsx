import { ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function WebErrorBoundary({ error }: ErrorComponentProps) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 bg-background">
      <div className="max-w-md w-full bg-card p-6 rounded-lg shadow-lg border">
        <h2 className="text-xl font-bold mb-4 text-foreground">
          Something went wrong
        </h2>

        <p className="text-sm mb-3 text-muted-foreground">
          There was an error loading this page.
        </p>

        {error && (
          <div className="bg-muted p-4 rounded-md mb-6">
            <p className="text-sm mb-1">
              <strong>Error:</strong> {error.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {error.message}
            </p>
          </div>
        )}

        <Button onClick={handleReload} className="w-full">
          Reload Page
        </Button>
      </div>
    </div>
  );
}

