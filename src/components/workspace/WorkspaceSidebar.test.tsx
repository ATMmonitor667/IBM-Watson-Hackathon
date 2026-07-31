import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceSidebar } from "@/components/workspace/WorkspaceSidebar";

const { loadProjects } = vi.hoisted(() => ({
  loadProjects: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "demo-1" }),
  usePathname: () => "/projects/demo-1",
}));

vi.mock("@/store/projectStore", () => ({
  useProjectStore: () => ({
    projects: [{ id: "demo-1", title: "The Flooded City" }],
    loadProjects,
    isLoading: false,
  }),
}));

vi.mock("@/components/workspace/CreateProjectForm", () => ({
  CreateProjectForm: () => <div>New project form</div>,
}));

describe("WorkspaceSidebar", () => {
  it("links only to real project entry points", () => {
    render(<WorkspaceSidebar />);

    const destinations = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));

    expect(destinations).toEqual(["/", "/projects/demo-1"]);
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Scenes")).not.toBeInTheDocument();
    expect(screen.queryByText("Branches")).not.toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(loadProjects).toHaveBeenCalledOnce();
  });
});
