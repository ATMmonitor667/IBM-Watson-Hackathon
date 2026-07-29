import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Client-side workspace UI state. See STORYVERSE_DESIGN.txt §2.3.
 *
 * This store holds *interface* state only — what is open, what is selected,
 * how wide a sidebar is. Domain data never lives here; it comes through
 * src/lib/db/queries.ts. Keeping that line clean is what lets the workspace
 * be built against fixtures and swapped to Supabase without touching it.
 */

/**
 * What a centre pane can show. `canvas` is the ordered scene sequence for the
 * active timeline; `scene` is one scene in full. They are separate kinds
 * because they are separate panes, not two views of the same one.
 */
export type PaneKind =
  | "canvas"
  | "scene"
  | "character"
  | "tree"
  | "graph"
  | "review"
  | "activity";

export type Tab = {
  id: string;
  title: string;
  kind: PaneKind;
};

/**
 * The rail's highlight is DERIVED from the active tab's kind rather than
 * stored alongside it. Two sources of truth for "where am I" is how the rail
 * ends up pointing at Characters while a scene is on screen.
 */

/**
 * react-resizable-panels' own layout map (panel id -> size). Stored opaquely
 * and handed straight back to Group's `defaultLayout`, so we never have to
 * care whether the library measures in pixels or percentages.
 */
export type PanelLayout = Record<string, number>;

type WorkspaceState = {
  leftOpen: boolean;
  rightOpen: boolean;
  layout: PanelLayout | null;
  tabs: Tab[];
  activeTabId: string | null;
  /**
   * The timeline the workspace is on. Null means "canon" — resolved against
   * the snapshot by useActiveBranch(), never stored as a concrete id here, so
   * a persisted value from another project can't strand the workspace.
   */
  activeBranchId: string | null;
  selectedSceneId: string | null;
  /** Collapsed/expanded state per explorer section or tree node. */
  expanded: Record<string, boolean>;
  paletteOpen: boolean;

  toggleLeft: () => void;
  toggleRight: () => void;
  setLayout: (layout: PanelLayout) => void;
  openTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setActiveBranch: (id: string) => void;
  selectScene: (id: string) => void;
  toggleExpanded: (key: string) => void;
  setPaletteOpen: (open: boolean) => void;
};

/**
 * The scene canvas is the workspace's home pane, so it is open by default and
 * is what the rail's Scenes button returns to.
 */
export const CANVAS_TAB: Tab = {
  id: "canvas",
  title: "Scene canvas",
  kind: "canvas",
};

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      leftOpen: true,
      rightOpen: true,
      layout: null,
      tabs: [CANVAS_TAB],
      activeTabId: CANVAS_TAB.id,
      activeBranchId: null,
      selectedSceneId: null,
      expanded: { branches: true, characters: true, world: true },
      paletteOpen: false,

      toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
      toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
      setLayout: (layout) => set({ layout }),

      openTab: (tab) =>
        set((s) => ({
          tabs: s.tabs.some((t) => t.id === tab.id) ? s.tabs : [...s.tabs, tab],
          activeTabId: tab.id,
        })),

      closeTab: (id) =>
        set((s) => {
          const tabs = s.tabs.filter((t) => t.id !== id);
          if (s.activeTabId !== id) return { tabs };
          // Activate the neighbour the user was most likely looking at.
          const closedAt = s.tabs.findIndex((t) => t.id === id);
          const next = tabs[closedAt - 1] ?? tabs[0] ?? null;
          return { tabs, activeTabId: next?.id ?? null };
        }),

      setActiveTab: (id) => set({ activeTabId: id }),

      // Switching timelines drops the scene selection rather than carrying a
      // scene id from the other branch across — every branch owns its own
      // scene rows, so the id would resolve to nothing.
      setActiveBranch: (id) =>
        set({ activeBranchId: id, selectedSceneId: null }),

      selectScene: (id) => set({ selectedSceneId: id }),
      toggleExpanded: (key) =>
        set((s) => ({ expanded: { ...s.expanded, [key]: !s.expanded[key] } })),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
    }),
    {
      name: "storyverse-workspace",
      storage: createJSONStorage(() => localStorage),
      // v1 persisted placeholder scene ids ("S3") and v2 predates the canvas
      // pane. Neither holds anything worth migrating, so old open-tab state is
      // reset to the default rather than carried across.
      version: 3,
      migrate: () => ({
        tabs: [CANVAS_TAB],
        activeTabId: CANVAS_TAB.id,
        activeBranchId: null,
        selectedSceneId: null,
      }),
      // The server and the first client render must agree, so rehydration is
      // deferred until after mount (see <WorkspaceHydration />). Without this
      // the persisted sidebar widths cause a hydration mismatch.
      skipHydration: true,
      partialize: (s) => ({
        leftOpen: s.leftOpen,
        rightOpen: s.rightOpen,
        layout: s.layout,
        tabs: s.tabs,
        activeTabId: s.activeTabId,
        activeBranchId: s.activeBranchId,
        selectedSceneId: s.selectedSceneId,
        expanded: s.expanded,
      }),
    },
  ),
);
