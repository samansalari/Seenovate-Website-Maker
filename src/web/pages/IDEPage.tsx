import { useState } from "react";
import { useAtom } from "jotai";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../../components/ui/resizable";
import { ChatPanel } from "../../components/ChatPanel"; // Will need adaptation
import { LivePreview } from "../../components/LivePreview";
import { Terminal } from "../../components/Terminal";
import { selectedAppIdAtom } from "../../atoms/appAtoms";
import { useLoadApps } from "../../hooks/useLoadApps";
import { AppList } from "../../components/AppList"; // Will need adaptation
import { Button } from "../../components/ui/button";
import { PlusIcon } from "lucide-react";
import { CreateAppDialog } from "../../components/CreateAppDialog"; // Will need adaptation

export default function IDEPage() {
  const [selectedAppId] = useAtom(selectedAppIdAtom);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  useLoadApps(); // Preload apps

  return (
    <div className="h-screen w-full bg-background flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b">
          <Button className="w-full" onClick={() => setIsCreateOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" /> New Project
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-2">
          <AppList show />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedAppId ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Chat Panel */}
            <ResizablePanel defaultSize={30} minSize={20}>
              <ChatPanel isPreviewOpen={isPreviewOpen} onTogglePreview={() => setIsPreviewOpen(!isPreviewOpen)} />
            </ResizablePanel>
            
            <ResizableHandle />
            
            {/* Preview & Terminal */}
            <ResizablePanel defaultSize={70}>
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel defaultSize={70}>
                  <LivePreview appId={selectedAppId} className="h-full w-full" />
                </ResizablePanel>
                
                <ResizableHandle />
                
                <ResizablePanel defaultSize={30}>
                  <Terminal appId={selectedAppId} className="h-full w-full border-t" />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a project to start coding
          </div>
        )}
      </div>

      <CreateAppDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} template={undefined} />
    </div>
  );
}

