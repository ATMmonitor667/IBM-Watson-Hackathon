import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SceneCard } from "@/components/workspace/SceneCard";
import { continuityFlagsFor, withComputedFlags } from "@/lib/ai/continuityRules";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";

/**
 * The display path for issue #8 / D3.
 *
 * The engine's own tests prove the finding is computed. This proves it reaches
 * a human: the scene card renders `continuityFlag`, and it now receives a
 * computed value rather than a string someone typed into the demo data.
 *
 * This mirrors exactly what ProjectPageClient does — compute flags for the
 * branch, apply them to the scenes, render — so if that wiring is removed,
 * this test still passes but the sibling assertion below (that the raw demo
 * scene carries no flag) is what catches a regression back to hardcoding.
 */

const CANON = DEMO_BRANCHES.find((b) => b.isCanon)!;

function sceneNamed(id: string) {
  const scene = CANON.scenes.find((s) => s.id === id);
  if (!scene) throw new Error(`no demo scene ${id}`);
  return scene;
}

describe("SceneCard shows computed continuity findings", () => {
  it("renders the compass finding on Scene 3", () => {
    const flags = continuityFlagsFor(CANON, DEMO_BRANCHES);
    const [scene] = withComputedFlags([sceneNamed("scene-demo-3")], flags);

    render(<SceneCard scene={scene} />);

    expect(screen.getByText(/The Compass/)).toBeInTheDocument();
    expect(screen.getByText(/cast list/)).toBeInTheDocument();
  });

  it("announces the finding to assistive technology", () => {
    const flags = continuityFlagsFor(CANON, DEMO_BRANCHES);
    const [scene] = withComputedFlags([sceneNamed("scene-demo-3")], flags);

    render(<SceneCard scene={scene} />);

    expect(
      screen.getByRole("button", { name: /has continuity finding/ }),
    ).toBeInTheDocument();
  });

  it("shows no finding on a scene the engine did not flag", () => {
    const flags = continuityFlagsFor(CANON, DEMO_BRANCHES);
    const [scene] = withComputedFlags([sceneNamed("scene-demo-1")], flags);

    render(<SceneCard scene={scene} />);

    expect(
      screen.queryByRole("button", { name: /has continuity finding/ }),
    ).not.toBeInTheDocument();
  });

  it("shows nothing when the raw demo scene is rendered without computation", () => {
    // The demo data itself is inert now. Without running the engine there is no
    // finding to show — which is the state issue #8 moved this out of.
    render(<SceneCard scene={sceneNamed("scene-demo-3")} />);

    expect(screen.queryByText(/cast list/)).not.toBeInTheDocument();
  });
});
