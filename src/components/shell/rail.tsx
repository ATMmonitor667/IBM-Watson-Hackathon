"use client";

import {
  ClipboardCheck,
  GitBranch,
  History,
  LayoutGrid,
  Settings,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CANVAS_TAB,
  useWorkspace,
  type PaneKind,
  type Tab,
} from "@/lib/store/workspace";
import { cn } from "@/lib/utils";

/**
 * Rail — Obsidian's ribbon. See STORYVERSE_DESIGN.txt §5.1.
 * 48px is load-bearing: wider and it stops reading as Obsidian.
 *
 * Each button opens (or re-activates) a pane. The highlight is derived from
 * the active tab rather than stored separately, so the rail can never point at
 * a section that is not on screen.
 */

const MODES: { tab: Tab; icon: LucideIcon; also?: PaneKind[] }[] = [
  // A scene detail belongs to the Scenes section, so both highlight it.
  { tab: CANVAS_TAB, icon: LayoutGrid, also: ["scene"] },
  {
    tab: { id: "characters", title: "Cast", kind: "character" },
    icon: Users,
  },
  { tab: { id: "tree", title: "Branch tree", kind: "tree" }, icon: GitBranch },
  { tab: { id: "graph", title: "World graph", kind: "graph" }, icon: Share2 },
  {
    tab: { id: "review", title: "Canon review", kind: "review" },
    icon: ClipboardCheck,
  },
  {
    tab: { id: "activity", title: "Activity", kind: "activity" },
    icon: History,
  },
];

function RailButton({
  label,
  icon: Icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-current={active ? "page" : undefined}
          onClick={onClick}
          className={cn(
            "relative flex size-8 items-center justify-center rounded-md transition-colors duration-120",
            active
              ? "bg-sv-accent-fill text-sv-accent"
              : "text-sv-muted hover:bg-sv-raised hover:text-sv-text",
          )}
        >
          {active ? (
            <span
              aria-hidden="true"
              className="absolute -left-2 h-4 w-0.5 rounded-sm bg-sv-accent"
            />
          ) : null}
          <Icon className="size-[18px]" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Rail() {
  const tabs = useWorkspace((s) => s.tabs);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const openTab = useWorkspace((s) => s.openTab);

  const activeKind = tabs.find((t) => t.id === activeTabId)?.kind;

  return (
    <TooltipProvider delayDuration={120}>
      <nav
        aria-label="Workspace sections"
        className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-sv-edge bg-sv-chrome py-2"
      >
        {MODES.map(({ tab, icon, also }) => (
          <RailButton
            key={tab.id}
            label={tab.title}
            icon={icon}
            active={
              activeKind === tab.kind || (also ?? []).includes(activeKind!)
            }
            onClick={() => openTab(tab)}
          />
        ))}

        <div className="mt-auto">
          <RailButton label="Settings" icon={Settings} />
        </div>
      </nav>
    </TooltipProvider>
  );
}
