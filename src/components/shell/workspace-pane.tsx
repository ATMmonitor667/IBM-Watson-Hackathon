"use client";

import { GitBranch, LayoutGrid, type LucideIcon } from "lucide-react";

import { ActivityFeed } from "@/components/story/activity-feed";
import { SceneCanvas } from "@/components/story/scene-canvas";
import { SceneDetail } from "@/components/story/scene-detail";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CANVAS_TAB, useWorkspace } from "@/lib/store/workspace";

/**
 * The centre pane. Renders whichever pane the active tab points at.
 *
 * Panes are keyed by tab id, so React keeps each pane's own state (scroll
 * position, expanded rows) while you switch between tabs — that is the whole
 * point of a tabbed workspace, and it is why panes are switched here rather
 * than by routing.
 */
export function WorkspacePane() {
  const tabs = useWorkspace((s) => s.tabs);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const openTab = useWorkspace((s) => s.openTab);

  const tab = tabs.find((t) => t.id === activeTabId);

  if (!tab) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No pane open"
        description="Open the scene canvas, or pick a scene from the story explorer."
        action={
          <Button size="sm" onClick={() => openTab(CANVAS_TAB)}>
            Open scene canvas
          </Button>
        }
      />
    );
  }

  switch (tab.kind) {
    case "canvas":
      return <SceneCanvas key={tab.id} />;
    case "scene":
      return <SceneDetail key={tab.id} sceneId={tab.id} />;
    case "activity":
      return <ActivityFeed key={tab.id} />;
    case "character":
      return (
        <NotBuiltYet
          key={tab.id}
          title="Character Studio"
          description="Reference sheets, version compare, and the explicit lock action. Tracked as R-C3 in STORYVERSE_REMAINING_WORK.txt."
        />
      );
    case "tree":
      return (
        <NotBuiltYet
          key={tab.id}
          icon={GitBranch}
          title="Branch tree"
          description="The timeline graph, with canon on a straight spine and what-ifs branching off it. Tracked as R5."
        />
      );
    case "graph":
      return (
        <NotBuiltYet
          key={tab.id}
          title="World graph"
          description="Characters, props, and locations as a knowledge graph. Extra credit — only after the main journey works end to end."
        />
      );
    case "review":
      return (
        <NotBuiltYet
          key={tab.id}
          title="Canon review"
          description="Findings, the visual diff, and human-approved selective merge. Tracked as R6 and R7."
        />
      );
  }
}

/**
 * An honest placeholder. It names the pane and where the work is tracked
 * instead of pretending to be a loading state — a spinner that never resolves
 * is worse than an empty room with a sign on the door.
 */
function NotBuiltYet({
  icon = LayoutGrid,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <EmptyState
      icon={icon}
      title={`${title} — not built yet`}
      description={description}
      className="h-full"
    />
  );
}
