import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SceneCard } from "@/components/story/scene-card";
import { CHARACTERS, SCENES_WITH_VERSIONS } from "@/lib/demo/fixtures";

const CHARACTER_NAMES = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c.name]),
);

function scene(id: string) {
  const found = SCENES_WITH_VERSIONS.find((s) => s.id === id);
  if (!found) throw new Error(`no fixture scene ${id}`);
  return found;
}

/** Plan §10, test 6 — the card is the most-seen component in the demo. */
describe("SceneCard", () => {
  it("renders the scene's structured fields", () => {
    render(
      <SceneCard
        scene={scene("scene-wf-s4")}
        authorName="Omit"
        characterNames={CHARACTER_NAMES}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /Reading the compass in the dark/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/lower ward channel/)).toBeInTheDocument();
    expect(screen.getByText("brass compass")).toBeInTheDocument();
    expect(screen.getByText("rope")).toBeInTheDocument();
    expect(screen.getByText("Omit")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
  });

  it("resolves character ids to names in the summary line", () => {
    render(
      <SceneCard
        scene={scene("scene-main-s3")}
        characterNames={CHARACTER_NAMES}
      />,
    );
    expect(screen.getByText(/2 characters/)).toBeInTheDocument();
  });

  it("flags a conflicted scene visibly", () => {
    render(<SceneCard scene={scene("scene-wf-s4")} variant="conflicted" />);
    expect(screen.getByText("Contradiction")).toBeInTheDocument();
  });

  it("does not flag an ordinary scene", () => {
    render(<SceneCard scene={scene("scene-main-s1")} />);
    expect(screen.queryByText("Contradiction")).not.toBeInTheDocument();
  });

  it("exposes the version timestamp as a machine-readable datetime", () => {
    render(<SceneCard scene={scene("scene-main-s1")} />);
    const time = document.querySelector("time");
    expect(time).toHaveAttribute("datetime", "2026-07-24T11:00:00.000Z");
  });
});
