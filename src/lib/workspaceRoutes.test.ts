import { describe, expect, it } from "vitest";

import {
  DEMO_PROJECT_ID,
  parseWorkspaceView,
  workspaceHref,
  workspaceViewHref,
} from "@/lib/workspaceRoutes";

describe("workspaceHref", () => {
  it("points the demo at the canonical workspace", () => {
    expect(workspaceHref(DEMO_PROJECT_ID)).toBe("/projects/demo-1");
  });

  it("keeps real project ids on the canonical route", () => {
    expect(workspaceHref("project 42")).toBe("/projects/project%2042");
  });

  it("maps old shared demo links to the canonical demo", () => {
    expect(workspaceHref("project-drowned-compass")).toBe(
      "/projects/demo-1",
    );
  });

  it("creates deep links for each workspace mode", () => {
    expect(workspaceViewHref("demo-1", "story")).toBe("/projects/demo-1");
    expect(workspaceViewHref("demo-1", "characters")).toBe(
      "/projects/demo-1?view=characters",
    );
    expect(workspaceViewHref("demo-1", "review")).toBe(
      "/projects/demo-1?view=review",
    );
  });

  it("falls back to the story workspace for unknown views", () => {
    expect(parseWorkspaceView("characters")).toBe("characters");
    expect(parseWorkspaceView(["review", "characters"])).toBe("review");
    expect(parseWorkspaceView("unknown")).toBe("story");
    expect(parseWorkspaceView(undefined)).toBe("story");
  });
});
