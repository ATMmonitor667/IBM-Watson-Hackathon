import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectPageClient } from "@/components/workspace/ProjectPageClient";
import { useActivityStore } from "@/store/activityStore";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import type { Branch, Project, Scene } from "@/types/workspace";

const {
  fetchBranches,
  fetchScenes,
  fetchSceneRevisions,
  reviseScene,
  insertBranch,
} = vi.hoisted(() => ({
  fetchBranches: vi.fn(),
  fetchScenes: vi.fn(),
  fetchSceneRevisions: vi.fn(),
  reviseScene: vi.fn(),
  insertBranch: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ source: "test-client" }),
}));

vi.mock("@/lib/supabase/db", () => ({
  fetchBranches,
  fetchScenes,
  fetchSceneRevisions,
  reviseScene,
  insertBranch,
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
  SceneDetailPanel: ({
    branches,
    onSceneEdited,
  }: {
    branches: Branch[];
    onSceneEdited: (branchId: string, scene: Scene) => Promise<void>;
  }) => {
    const alternateBranch = branches.find((candidate) => !candidate.isCanon);
    const editableScene = alternateBranch?.scenes[0];
    return alternateBranch && editableScene ? (
      <button
        type="button"
        onClick={() =>
          onSceneEdited(alternateBranch.id, {
            ...editableScene,
            title: "Edited Branch Scene",
            revision: editableScene.revision + 1,
          })
        }
      >
        Save branch revision
      </button>
    ) : null;
  },
  CreateBranchPanel: ({
    onBranchCreated,
  }: {
    onBranchCreated: (branch: Branch) => Promise<Branch>;
  }) => (
    <button
      type="button"
      onClick={() =>
        void onBranchCreated({
          id: "branch-local-test",
          projectId: project.id,
          name: "Local Candidate",
          sourceSceneId: scene.id,
          scenes: [],
          isCanon: false,
          createdAt: "2026-07-30T13:59:00.000Z",
          updatedAt: "2026-07-30T13:59:00.000Z",
        }).catch(() => undefined)
      }
    >
      Create test branch
    </button>
  ),
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

const alternateScene: Scene = {
  ...scene,
  id: "scene-alt-1",
  title: "Alternate Scene",
  status: "draft",
};

const alternateBranch: Branch = {
  ...branch,
  id: "branch-alternate",
  name: "Alternate Branch",
  scenes: [alternateScene],
  isCanon: false,
};

const savedBranch: Branch = {
  id: "1d3b8919-d03e-42cc-bc54-252820ad2782",
  projectId: project.id,
  name: "Saved Database Branch",
  sourceSceneId: scene.id,
  scenes: [],
  isCanon: false,
  createdAt: "2026-07-30T14:00:00.000Z",
  updatedAt: "2026-07-30T14:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchBranches.mockResolvedValue([branch]);
  fetchScenes.mockResolvedValue([scene]);
  fetchSceneRevisions.mockResolvedValue([]);
  reviseScene.mockResolvedValue({
    ...alternateScene,
    title: "Edited Branch Scene",
    revision: 2,
  });
  insertBranch.mockResolvedValue(savedBranch);
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
  useActivityStore.setState({ entries: [] });
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
    expect(fetchSceneRevisions).toHaveBeenCalledWith(
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

  it("adds the Supabase-saved branch and activity after live creation", async () => {
    const user = userEvent.setup();
    useUiStore.setState({ openPanelId: "create-branch" });

    render(<ProjectPageClient id={project.id} />);

    await user.click(
      await screen.findByRole("button", { name: "Create test branch" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("branch-tree")).toHaveTextContent(
        "Saved Database Branch",
      );
    });
    expect(screen.getByTestId("branch-tree")).not.toHaveTextContent(
      "Local Candidate",
    );
    expect(insertBranch).toHaveBeenCalledWith(
      expect.objectContaining({ source: "test-client" }),
      expect.objectContaining({ name: "Local Candidate" }),
    );
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      'Branch "Saved Database Branch" created',
    );
  });

  it("does not mutate branch or activity state when live creation fails", async () => {
    const user = userEvent.setup();
    insertBranch.mockRejectedValue(new Error("branch insert denied"));
    useUiStore.setState({ openPanelId: "create-branch" });

    render(<ProjectPageClient id={project.id} />);

    await user.click(
      await screen.findByRole("button", { name: "Create test branch" }),
    );

    await waitFor(() => {
      expect(insertBranch).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("branch-tree")).not.toHaveTextContent(
      "Local Candidate",
    );
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "No recent activity",
    );
  });

  it("creates a local branch without Supabase in demo mode", async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [{ ...project, id: "demo-1", title: "Demo Project" }],
      dataSource: "mock",
      mockReason: "no-credentials",
    });
    useUiStore.setState({ openPanelId: "create-branch" });

    render(<ProjectPageClient id="demo-1" />);

    await user.click(
      screen.getByRole("button", { name: "Create test branch" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("branch-tree")).toHaveTextContent(
        "Local Candidate",
      );
    });
    expect(insertBranch).not.toHaveBeenCalled();
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      'Branch "Local Candidate" created',
    );
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

  it("persists a new revision for an alternate scene", async () => {
    const user = userEvent.setup();
    fetchBranches.mockResolvedValue([branch, alternateBranch]);
    fetchScenes.mockResolvedValue([scene, alternateScene]);
    useUiStore.setState({
      openPanelId: "scene-detail",
      mergeBranchId: null,
    });

    render(<ProjectPageClient id={project.id} />);

    await user.click(
      await screen.findByRole("button", { name: "Save branch revision" }),
    );

    await waitFor(() => {
      expect(reviseScene).toHaveBeenCalledWith(
        expect.objectContaining({ source: "test-client" }),
        alternateScene.id,
        1,
        expect.objectContaining({ title: "Edited Branch Scene" }),
        alternateScene.contributor.displayName,
      );
    });
    expect(screen.getByTestId("scene-canvas")).toHaveTextContent(
      "Edited Branch Scene",
    );
    expect(scene.title).toBe("Live Scene");
  });
});
