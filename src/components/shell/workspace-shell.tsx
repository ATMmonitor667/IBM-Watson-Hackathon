"use client";

import * as React from "react";

import { CommandPalette } from "@/components/shell/command-palette";
import { LeftSidebar } from "@/components/shell/left-sidebar";
import { PaneTabs } from "@/components/shell/pane-tabs";
import { Rail } from "@/components/shell/rail";
import { RightSidebar } from "@/components/shell/right-sidebar";
import { StatusBar } from "@/components/shell/status-bar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useWorkspace } from "@/lib/store/workspace";

/**
 * The Obsidian shell: rail | left sidebar | tabbed centre | right sidebar,
 * with a status bar across the bottom. See STORYVERSE_DESIGN.txt §2.1.
 *
 * Every feature pane is rendered as `children` inside the centre column, so
 * the scene canvas, Character Studio, diff, and branch tree all inherit this
 * chrome without knowing about it.
 */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const leftOpen = useWorkspace((s) => s.leftOpen);
  const rightOpen = useWorkspace((s) => s.rightOpen);
  const layout = useWorkspace((s) => s.layout);
  const setLayout = useWorkspace((s) => s.setLayout);

  // The store is persisted with skipHydration so the server render and the
  // first client render agree. Rehydrate once we are safely on the client.
  React.useEffect(() => {
    void useWorkspace.persist.rehydrate();
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-sv-canvas">
      <div className="flex min-h-0 flex-1">
        <Rail />

        <ResizablePanelGroup
          orientation="horizontal"
          className="min-w-0 flex-1"
          defaultLayout={layout ?? undefined}
          onLayoutChanged={setLayout}
        >
          {leftOpen ? (
            <>
              <ResizablePanel
                id="left"
                defaultSize={260}
                minSize={200}
                maxSize={400}
              >
                <LeftSidebar />
              </ResizablePanel>
              <ResizableHandle />
            </>
          ) : null}

          <ResizablePanel id="centre" minSize={360}>
            <div className="flex h-full min-w-0 flex-col">
              <PaneTabs />
              <main className="min-h-0 flex-1 overflow-auto bg-sv-canvas">
                {children}
              </main>
            </div>
          </ResizablePanel>

          {rightOpen ? (
            <>
              <ResizableHandle />
              <ResizablePanel
                id="right"
                defaultSize={300}
                minSize={240}
                maxSize={420}
              >
                <RightSidebar />
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      </div>

      <StatusBar />
      <CommandPalette />
    </div>
  );
}
