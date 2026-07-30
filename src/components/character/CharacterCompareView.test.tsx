import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CharacterCompareView } from "@/components/character/CharacterCompareView";
import { useCharacterStore } from "@/store/characterStore";
import type { Character } from "@/types/character";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

const character: Character = {
  id: "char-kael",
  projectId: "demo-1",
  name: "Kael",
  role: "Explorer",
  description: "Kael carries a compass on a short chain.",
  visualTraits: ["Patched pressure suit", "Scar through left brow"],
  versions: [
    {
      id: "char-kael-v1",
      imageUrl: "/demo/wren-v1.svg",
      description: "Kael in a patched pressure suit.",
      visualTraits: ["Patched pressure suit", "Scar through left brow"],
      source: "original",
      createdAt: "2026-07-24T10:30:00.000Z",
    },
  ],
  lockedVersionId: "char-kael-v1",
  createdAt: "2026-07-24T10:30:00.000Z",
  updatedAt: "2026-07-24T10:30:00.000Z",
};

const proposal = {
  characterId: character.id,
  proposedDescription: "Kael now wears an empty compass holster.",
  proposedGenerationInstruction:
    "Show Kael with an empty belt holster and no compass.",
  changeRationale: "The compass was lost in canon.",
  requiresApproval: true,
};

beforeEach(() => {
  vi.restoreAllMocks();
  useCharacterStore.setState({
    characters: [character],
    isLoading: false,
    error: null,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(proposal), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function generateProposal() {
  render(<CharacterCompareView character={character} />);
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("Refinement direction"),
    "Show the cost of losing the compass.",
  );
  await user.click(
    screen.getByRole("button", { name: "Generate proposal" }),
  );
  await screen.findByLabelText("AI refinement proposal");
  return user;
}

describe("CharacterCompareView refinement review", () => {
  it("shows a proposal without writing a character version", async () => {
    const user = await generateProposal();

    expect(screen.getByText(proposal.proposedDescription)).toBeInTheDocument();
    expect(screen.getByText("Not applied")).toBeInTheDocument();
    expect(
      useCharacterStore.getState().getCharacter(character.id)?.versions,
    ).toHaveLength(1);

    const request = vi.mocked(fetch).mock.calls[0];
    const options = request[1] as RequestInit;
    const body = JSON.parse(String(options.body));
    expect(body).toMatchObject({
      characterId: character.id,
      refinementPrompt: "Show the cost of losing the compass.",
    });
    expect(body.canonFacts).toEqual([]);
    expect(body.characterSummary).toContain("Patched pressure suit");

    await user.click(screen.getByRole("button", { name: "Reject proposal" }));

    expect(
      screen.queryByLabelText("AI refinement proposal"),
    ).not.toBeInTheDocument();
    expect(
      useCharacterStore.getState().getCharacter(character.id)?.versions,
    ).toHaveLength(1);
  });

  it("writes a new version only after explicit approval", async () => {
    const user = await generateProposal();

    await user.click(screen.getByRole("button", { name: "Approve proposal" }));

    await waitFor(() => {
      expect(
        useCharacterStore.getState().getCharacter(character.id)?.versions,
      ).toHaveLength(2);
    });

    const updated = useCharacterStore.getState().getCharacter(character.id);
    const approvedVersion = updated?.versions.at(-1);
    expect(approvedVersion).toMatchObject({
      description: proposal.proposedDescription,
      generationInstruction: proposal.proposedGenerationInstruction,
      source: "ai-refined",
    });
    expect(updated?.lockedVersionId).toBe("char-kael-v1");
    expect(
      screen.queryByLabelText("AI refinement proposal"),
    ).not.toBeInTheDocument();
  });
});
