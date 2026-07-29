"use client";

import {
  ClipboardCheck,
  GitBranch,
  GitMerge,
  History,
  LayoutGrid,
  Lock,
  PanelLeft,
  Plus,
  Share2,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CANVAS_TAB, useWorkspace } from "@/lib/store/workspace";
import {
  useActiveBranch,
  useWorkspaceData,
} from "@/lib/store/workspace-data";

/**
 * Command palette — Obsidian's Ctrl/Cmd+K. See STORYVERSE_DESIGN.txt §5.6.
 *
 * Navigation and timeline switching are live. Commands that mutate data are
 * wired to a toast until their feature lands — the palette proves the
 * affordance, and each command gets connected as its step ships.
 */

type Command = {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
  hint?: string;
  run: () => void;
};

export function CommandPalette() {
  const { branches } = useWorkspaceData();
  const activeBranch = useActiveBranch();

  const open = useWorkspace((s) => s.paletteOpen);
  const setOpen = useWorkspace((s) => s.setPaletteOpen);
  const openTab = useWorkspace((s) => s.openTab);
  const toggleLeft = useWorkspace((s) => s.toggleLeft);
  const setActiveBranch = useWorkspace((s) => s.setActiveBranch);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(!useWorkspace.getState().paletteOpen);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  const pending = React.useCallback((what: string) => {
    toast(what, { description: "Not wired up yet — lands with its feature." });
  }, []);

  const commands: Command[] = [
    {
      id: "new-scene",
      label: "New scene",
      icon: Plus,
      group: "Create",
      run: () => pending("New scene"),
    },
    {
      id: "new-branch",
      label: "New branch from this scene",
      icon: GitBranch,
      group: "Create",
      run: () => pending("New branch"),
    },
    {
      id: "lock-character",
      label: "Lock character design",
      icon: Lock,
      group: "Create",
      run: () => pending("Lock character"),
    },
    {
      id: "review",
      label: "Run continuity review",
      icon: ClipboardCheck,
      group: "Review",
      run: () => pending("Continuity review"),
    },
    {
      id: "diff",
      label: "Open branch comparison",
      icon: GitMerge,
      group: "Review",
      run: () => pending("Branch comparison"),
    },
    {
      id: "merge",
      label: "Merge selected changes",
      icon: GitMerge,
      group: "Review",
      run: () => pending("Merge"),
    },
    {
      id: "scenes",
      label: "Open scene canvas",
      icon: LayoutGrid,
      group: "Go to",
      run: () => openTab(CANVAS_TAB),
    },
    {
      id: "tree",
      label: "Open branch tree",
      icon: GitBranch,
      group: "Go to",
      run: () => openTab({ id: "tree", title: "Branch tree", kind: "tree" }),
    },
    {
      id: "graph",
      label: "Open world graph",
      icon: Share2,
      group: "Go to",
      run: () => openTab({ id: "graph", title: "World graph", kind: "graph" }),
    },
    {
      id: "activity",
      label: "Open activity",
      icon: History,
      group: "Go to",
      run: () =>
        openTab({ id: "activity", title: "Activity", kind: "activity" }),
    },
    {
      id: "toggle-sidebar",
      label: "Toggle sidebar",
      icon: PanelLeft,
      group: "View",
      run: toggleLeft,
    },
    // Switching timelines is the demo's pivot — "canon is untouched while the
    // collaborator works" is only convincing if the switch is one keystroke.
    ...branches
      .filter((branch) => branch.id !== activeBranch.id)
      .map((branch) => ({
        id: `switch-${branch.id}`,
        label: `Switch to ${branch.name}`,
        icon: GitBranch,
        group: "Timelines",
        run: () => {
          setActiveBranch(branch.id);
          openTab(CANVAS_TAB);
          toast(`Now on ${branch.name}`, {
            description: branch.is_canon
              ? "This is canon."
              : "Canon is untouched while you work here.",
          });
        },
      })),
  ];

  const groups = Array.from(new Set(commands.map((c) => c.group)));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No matching command.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group} heading={group}>
            {commands
              .filter((command) => command.group === group)
              .map((command) => (
                <CommandItem
                  key={command.id}
                  value={command.label}
                  onSelect={() => {
                    command.run();
                    setOpen(false);
                  }}
                >
                  <command.icon aria-hidden="true" />
                  {command.label}
                </CommandItem>
              ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
