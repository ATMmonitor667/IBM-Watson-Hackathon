"use client";

import {
  ClipboardCheck,
  FileText,
  GitBranch,
  History,
  LayoutGrid,
  PanelLeft,
  PanelRight,
  Share2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWorkspace, type PaneKind } from "@/lib/store/workspace";
import { cn } from "@/lib/utils";

/**
 * PaneTabs — Obsidian's tab bar. See STORYVERSE_DESIGN.txt §5.4.
 *
 * The active tab takes the canvas background so it reads as continuous with
 * the pane below it. That "tab merges into the content" detail is the Obsidian
 * signature — do not substitute an underline indicator here.
 */

const KIND_ICONS: Record<PaneKind, LucideIcon> = {
  canvas: LayoutGrid,
  scene: FileText,
  character: Users,
  tree: GitBranch,
  graph: Share2,
  review: ClipboardCheck,
  activity: History,
};

export function PaneTabs() {
  const tabs = useWorkspace((s) => s.tabs);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const setActiveTab = useWorkspace((s) => s.setActiveTab);
  const closeTab = useWorkspace((s) => s.closeTab);
  const leftOpen = useWorkspace((s) => s.leftOpen);
  const rightOpen = useWorkspace((s) => s.rightOpen);
  const toggleLeft = useWorkspace((s) => s.toggleLeft);
  const toggleRight = useWorkspace((s) => s.toggleRight);

  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-sv-edge bg-sv-chrome">
      <div className="flex shrink-0 items-center px-1">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={toggleLeft}
          aria-label={leftOpen ? "Hide sidebar" : "Show sidebar"}
          aria-pressed={leftOpen}
        >
          <PanelLeft />
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Open panes"
        className="flex min-w-0 flex-1 items-stretch overflow-x-auto"
      >
        {tabs.map((tab) => {
          const Icon = KIND_ICONS[tab.kind];
          const active = tab.id === activeTabId;

          return (
            <div
              key={tab.id}
              className={cn(
                "group/tab flex max-w-[200px] shrink-0 items-center gap-1.5 border-r border-sv-edge px-2.5",
                active
                  ? "border-t border-t-sv-accent bg-sv-canvas text-sv-text"
                  : "text-sv-muted hover:bg-sv-raised",
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className="flex min-w-0 items-center gap-1.5 py-1"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate text-ui">{tab.title}</span>
              </button>
              <button
                type="button"
                aria-label={`Close ${tab.title}`}
                onClick={() => closeTab(tab.id)}
                className="shrink-0 rounded-sm p-0.5 text-sv-faint opacity-0 transition-opacity duration-120 hover:bg-sv-raised hover:text-sv-text group-hover/tab:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center px-1">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={toggleRight}
          aria-label={rightOpen ? "Hide canon panel" : "Show canon panel"}
          aria-pressed={rightOpen}
        >
          <PanelRight />
        </Button>
      </div>
    </div>
  );
}
