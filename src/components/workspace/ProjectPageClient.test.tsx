import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectPageClient } from "@/components/workspace/ProjectPageClient";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import type { Branch, Project, Scene } from "@/types/workspace";

const { fetchBranches, fetchScenes } = vi.hoisted(() => ({
  fetchBranches: vi.fn(),
  fetchScenes: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ source: "test-client" }),
}));

vi.mock("@/lib/supabase/db", () => ({
  fetchBranches,
  fetchScenes,
}));

vi.mock("@/components/workspace/BranchTree", () => ({
  BranchTree: ({ branches }: { branches: Branch[] }) => (
    <div data-testid="branch-tree">
      {branches
        .map(
          (currentBranch) =>
            `${currentBranch.name}:${currentBranch.isCanon}:` +
            currentBranch.scenes
              .map((currentScene) => `${currentScene.title}:${currentScene.reviewStatus}`)
              .join("|"),
        )
        .join(",")}
    </div>
  ),
}));

vi.mock("@/components/workspace/SceneCanvas", () => ({
  SceneCanvas: ({ scenes }: { scenes: Scene[] }) => (
    <div data-testid="scene-canvas">
      {scenes.map((scene) => scene.title).join(",")}
    </div>
  ),
}));

vi.mock("@/components/workspace/ProjectHeader", () => ({
  ProjectHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock("@/components/workspace/LoadingSkeletons", () => ({
  WorkspacePageSkeleton: () => <div>Loading workspace</div>,
}));

vi.mock("@/components/workspace/StateViews", () => ({
  ErrorState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock("@/components/workspace/BranchPanels", () => ({
  SceneDetailPanel: () => null,
  CreateBranchPanel: () => null,
  CreateScenePanel: () => null,
  MergePreviewPanel: ({
    onMergeBranch,
  }: {
    onMergeBranch: (
      branchId: string,
      selectedSceneIds: string[],
    ) => Promise<void>;
  }) => (
    <button
      type="button"
      onClick={() => onMergeBranch("branch-tunnel", ["scene-alt-2a"])}
    >
      Merge selected demo scene
    </button>
  ),
}));

const project: Project = {
  id: "project-1",
  title: "Live Project",
  description: "Loaded from Supabase",
  status: "In Progress",
  ownerId: "user-1",
  collaborators: [],
  branches: [],
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};

const branch: Branch = {
  id: "branch-1",
  projectId: project.id,
  name: "Live Branch",
  sourceSceneId: "",
  scenes: [],
  isCanon: true,
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};

const scene: Scene = {
  id: "scene-1",
  projectId: project.id,
  sceneNumber: 1,
  title: "Live Scene",
  location: "Flooded Market",
  dialogueExcerpt: "The compass is still glowing.",
  characters: ["Wren"],
  emotionalBeat: "Resolve",
  reviewStatus: "Draft",
  contributor: { id: "user-1", displayName: "Rahat" },
  revision: 1,
  status: "draft",
  order: 0,
  parentId: null,
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchBranches.mockResolvedValue([branch]);
  fetchScenes.mockResolvedValue([scene]);
  useProjectStore.setState({
    projects: [project],
    isLoading: false,
    error: null,
    dataSource: "supabase",
    mockReason: null,
    loadProjects: vi.fn().mockResolvedValue(undefined),
  });
  useUiStore.setState({
    openPanelId: null,
    mergeBranchId: null,
  });
});

describe("ProjectPageClient workspace loading", () => {
  it("loads branches and scenes for a live Supabase project", async () => {
    render(<ProjectPageClient id={project.id} />);

    expect(screen.getByText("Loading workspace")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("branch-tree")).toHaveTextContent("Live Branch");
      expect(screen.getByTestId("scene-canvas")).toHaveTextContent("Live Scene");
    });

    expect(fetchBranches).toHaveBeenCalledWith(
      expect.objectContaining({ source: "test-client" }),
      project.id,
    );
    expect(fetchScenes).toHaveBeenCalledWith(
      expect.objectContaining({ source: "test-client" }),
      project.id,
    );
  });

  it("shows a workspace error instead of silently using demo data", async () => {
    fetchBranches.mockRejectedValue(new Error("branches query denied"));

    render(<ProjectPageClient id={project.id} />);

    expect(
      await screen.findByText("branches query denied"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("branch-tree")).not.toBeInTheDocument();
  });

  it("keeps the built-in workspace available in explicit demo mode", () => {
    useProjectStore.setState({
      projects: [{ ...project, id: "demo-1", title: "Demo Project" }],
      dataSource: "mock",
      mockReason: "no-credentials",
    });

    render(<ProjectPageClient id="demo-1" />);

    expect(screen.getByTestId("branch-tree")).not.toBeEmptyDOMElement();
    expect(screen.getByTestId("scene-canvas")).not.toBeEmptyDOMElement();
    expect(fetchBranches).not.toHaveBeenCalled();
    expect(fetchScenes).not.toHaveBeenCalled();
  });

  it("applies only selected branch scenes to canon", async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [{ ...project, id: "demo-1", title: "Demo Project" }],
      dataSource: "mock",
      mockReason: "no-credentials",
    });
    useUiStore.setState({
      openPanelId: "merge-preview",
      mergeBranchId: "branch-tunnel",
    });

    render(<ProjectPageClient id="demo-1" />);

    await user.click(
      screen.getByRole("button", { name: "Merge selected demo scene" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("scene-canvas")).toHaveTextContent(
        "The Hidden Tunnel",
      );
    });
    expect(screen.getByTestId("scene-canvas")).toHaveTextContent(
      "Below the Archive",
    );
    expect(screen.getByTestId("branch-tree")).toHaveTextContent(
      "The Tunnel Route:false:The Hidden Tunnel:Merged|The Drowned Engine Room:Draft",
    );
  });
});
