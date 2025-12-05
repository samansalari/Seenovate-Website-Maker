import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, Zap, Brain } from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";
import { FREE_PROMPT_LIMIT } from "@/lib/schemas";

interface PaywallDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaywallDialog({ isOpen, onClose }: PaywallDialogProps) {
  const handleGetPro = () => {
    IpcClient.getInstance().openExternalUrl(
      "https://www.dyad.sh/pro?utm_source=dyad-app&utm_medium=app&utm_campaign=paywall-dialog",
    );
    onClose();
  };

  const handleAddKey = () => {
    IpcClient.getInstance().openExternalUrl(
      "https://academy.dyad.sh/settings",
    );
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span>Free Trial Limit Reached</span>
              <span className="text-sm font-normal text-muted-foreground">
                You've used all {FREE_PROMPT_LIMIT} free prompts
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <DialogDescription className="sr-only">
          Upgrade to Seenovate Pro for unlimited prompts and premium features
        </DialogDescription>

        <div className="py-4 space-y-4">
          <p className="text-base text-foreground">
            Upgrade to Seenovate Pro for unlimited prompts and access to
            premium features:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <Sparkles className="h-5 w-5 text-indigo-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Leading AI Models</p>
                <p className="text-sm text-muted-foreground">
                  Access GPT-4, Claude, Gemini Pro and more
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <Zap className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Turbo Edits</p>
                <p className="text-sm text-muted-foreground">
                  Generate code 4-10x faster
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <Brain className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Smart Context</p>
                <p className="text-sm text-muted-foreground">
                  Up to 5x cheaper with intelligent context management
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleAddKey} className="sm:order-1">
            I have a Pro key
          </Button>
          <Button
            onClick={handleGetPro}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white sm:order-2"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Seenovate Pro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

