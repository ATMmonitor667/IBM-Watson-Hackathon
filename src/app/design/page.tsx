import { GitBranch, Plus, Search, Users } from "lucide-react";

import { FindingCard } from "@/components/review/finding-card";
import { FieldDiff } from "@/components/story/field-diff";
import { SceneCard } from "@/components/story/scene-card";
import { BranchChip, StateChip } from "@/components/story/state-chip";
import { Box, BoxBody, BoxFooter, BoxHeader, BoxRow } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CHARACTERS,
  EXPECTED_FINDING,
  SCENES_WITH_VERSIONS,
} from "@/lib/demo/fixtures";

/**
 * The component gallery. Every component in one place, so the team can agree
 * the design is right before four people build on top of it.
 * Specification: STORYVERSE_DESIGN.txt
 *
 * It renders the real fixtures rather than gallery-only mock data. Sample data
 * written twice drifts, and a gallery that disagrees with the app is worse
 * than no gallery.
 */

const SURFACES = [
  ["--sv-canvas", "canvas", "center pane"],
  ["--sv-chrome", "chrome", "rail, sidebars, status bar"],
  ["--sv-box", "box", "content container"],
  ["--sv-box-header", "box-header", "box header row"],
  ["--sv-raised", "raised", "hover, secondary"],
  ["--sv-overlay", "overlay", "dialog, palette"],
  ["--sv-inset", "inset", "inputs, code, evidence"],
];

const LINES = [
  ["--sv-border", "edge", "default separator"],
  ["--sv-border-muted", "edge-muted", "rows inside a box"],
  ["--sv-border-strong", "edge-strong", "input, focused"],
];

const STATES = [
  ["--sv-draft", "draft", "green"],
  ["--sv-review", "review", "yellow"],
  ["--sv-canon", "canon", "purple = merged"],
  ["--sv-conflict", "conflict", "red"],
  ["--sv-abandoned", "abandoned", "gray"],
  ["--sv-link", "link", "blue"],
];

const TYPE = [
  ["text-micro", "11px", "status bar, timestamps, labels"],
  ["text-meta", "12px", "metadata, chips, tree rows"],
  ["text-ui", "13px", "DEFAULT — all chrome"],
  ["text-body", "14px", "content in the center pane"],
  ["text-title", "16px", "pane and box titles"],
  ["text-page", "20px", "page title only"],
];

const scene = (id: string) => {
  const found = SCENES_WITH_VERSIONS.find((s) => s.id === id);
  if (!found) throw new Error(`design gallery: no fixture scene ${id}`);
  return found;
};

const CANON_SCENE = scene("scene-main-s3");
const BRANCH_SCENE = scene("scene-wf-s4");

const CHARACTER_NAMES = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c.name]),
);

const SCENE_TITLES = Object.fromEntries(
  SCENES_WITH_VERSIONS.map((s) => [s.id, s.title]),
);

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-sv-edge pt-8">
      <div>
        <h2 className="text-title font-medium text-sv-text">{title}</h2>
        <p className="text-ui text-sv-muted">{note}</p>
      </div>
      {children}
    </section>
  );
}

function Swatches({ tokens }: { tokens: string[][] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2">
      {tokens.map(([variable, name, use]) => (
        <li
          key={variable}
          className="flex items-center gap-3 rounded-md border border-sv-edge bg-sv-box p-2"
        >
          <span
            aria-hidden="true"
            className="size-8 shrink-0 rounded-md border border-sv-edge"
            style={{ background: `var(${variable})` }}
          />
          <span className="min-w-0">
            <span className="block truncate font-mono text-meta text-sv-text">
              {name}
            </span>
            <span className="block truncate text-micro text-sv-faint">
              {use}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="space-y-1 pb-8">
        <p className="font-mono text-micro uppercase tracking-wider text-sv-faint">
          Storyverse
        </p>
        <h1 className="text-page font-semibold text-sv-text">Design system</h1>
        <p className="max-w-2xl text-body text-sv-muted">
          Obsidian owns the chrome. GitHub owns the content. Purple is the only
          brand colour, and it means accent, canon, and merged all at once.
          Full specification in{" "}
          <span className="font-mono text-sv-text">STORYVERSE_DESIGN.txt</span>.
        </p>
      </header>

      <div className="space-y-8">
        <Section title="Surfaces" note="Neutral-warm near-black, from Obsidian.">
          <Swatches tokens={SURFACES} />
        </Section>

        <Section title="Borders" note="1px everywhere. 2px only for selection.">
          <Swatches tokens={LINES} />
        </Section>

        <Section
          title="State"
          note="GitHub Primer semantics mapped onto story concepts."
        >
          <Swatches tokens={STATES} />
        </Section>

        <Section
          title="Type scale"
          note="Six sizes, no more. 13px chrome is deliberate — Obsidian's chrome is smaller than typical web UI."
        >
          <Box>
            <BoxBody divided>
              {TYPE.map(([token, size, use]) => (
                <BoxRow key={token} className="justify-between">
                  <span className={token}>The drowned stair at dusk</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-micro text-sv-faint">
                      {use}
                    </span>
                    <span className="font-mono text-micro text-sv-muted">
                      {token} · {size}
                    </span>
                  </span>
                </BoxRow>
              ))}
            </BoxBody>
          </Box>
        </Section>

        <Section
          title="Buttons"
          note="32px default, 28px small. No shadows on inline content."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button>
              <Plus />
              New scene
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Discard branch</Button>
            <Button variant="link">Link</Button>
            <Button size="sm">Small</Button>
            <Button size="icon" aria-label="Search">
              <Search />
            </Button>
          </div>
        </Section>

        <Section title="Inputs" note="Inset surface, 13px, 32px tall.">
          <div className="flex max-w-md flex-col gap-2">
            <Input placeholder="Search scenes, characters, props…" />
            <div className="flex items-center gap-2 text-ui text-sv-text">
              <Checkbox id="demo-check" defaultChecked />
              <label htmlFor="demo-check">Include unchanged fields</label>
            </div>
          </div>
        </Section>

        <Section
          title="State chips and branch references"
          note="GitHub's icon and colour semantics at the app's 4px radius. Branch names are monospace because they are identifiers."
        >
          <div className="flex flex-wrap items-center gap-2">
            <StateChip state="draft" />
            <StateChip state="under_review" />
            <StateChip state="approved" />
            <StateChip state="merged" />
            <StateChip state="abandoned" />
            <StateChip state="conflict" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BranchChip name="main" canon />
            <BranchChip name="what-if/save-the-stranger" />
          </div>
        </Section>

        <Section
          title="Box"
          note="GitHub's core container and the base for most content surfaces."
        >
          <Box>
            <BoxHeader
              actions={
                <Button size="sm" variant="ghost">
                  Select all
                </Button>
              }
            >
              <GitBranch className="size-4 text-sv-muted" />3 scenes changed
            </BoxHeader>
            <BoxBody divided>
              <BoxRow interactive>
                <Checkbox defaultChecked />
                <span className="flex-1 text-sv-text">
                  S3 — The choice at the drowned stair
                </span>
                <StateChip state="under_review" label="Changed" />
              </BoxRow>
              <BoxRow interactive>
                <Checkbox />
                <span className="flex-1 text-sv-text">
                  S4 — Reading the compass in the dark
                </span>
                <StateChip state="conflict" />
              </BoxRow>
              <BoxRow interactive>
                <Checkbox defaultChecked />
                <span className="flex-1 text-sv-text">
                  S5 — The stranger&apos;s debt
                </span>
                <StateChip state="draft" label="Added" />
              </BoxRow>
            </BoxBody>
            <BoxFooter>
              <span className="text-meta text-sv-muted">
                2 of 3 selected for merge into canon
              </span>
              <Button size="sm">Merge 2 selected changes</Button>
            </BoxFooter>
          </Box>
        </Section>

        <Section
          title="Scene cards"
          note="A GitHub box at Obsidian density. The most-seen component in the demo."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SceneCard
              scene={CANON_SCENE}
              authorName="Rahat"
              characterNames={CHARACTER_NAMES}
            />
            <SceneCard
              scene={BRANCH_SCENE}
              authorName="Omit"
              characterNames={CHARACTER_NAMES}
              variant="selected"
            />
            <SceneCard
              scene={BRANCH_SCENE}
              authorName="Omit"
              characterNames={CHARACTER_NAMES}
              variant="conflicted"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SceneCard
              scene={scene("scene-wf-s5")}
              authorName="Omit"
              characterNames={CHARACTER_NAMES}
              variant="added"
            />
            <SceneCard
              scene={scene("scene-main-s4")}
              authorName="Rahat"
              characterNames={CHARACTER_NAMES}
              variant="removed"
            />
          </div>
        </Section>

        <Section
          title="Field diff"
          note="GitHub's line-level diff, applied to scene fields. This is the row that carries the compass contradiction — it must never be collapsed."
        >
          <Box>
            <BoxHeader>
              <BranchChip name="main" canon />
              <span className="text-sv-faint">→</span>
              <BranchChip name="what-if/save-the-stranger" />
            </BoxHeader>
            <BoxBody className="space-y-4">
              <FieldDiff
                field="action"
                before={scene("scene-main-s3").version.action}
                after={scene("scene-wf-s3").version.action}
              />
              <FieldDiff
                field="props_used"
                before={JSON.stringify(
                  scene("scene-main-s3").version.props_used,
                )}
                after={JSON.stringify(scene("scene-wf-s3").version.props_used)}
              />
              <FieldDiff
                field="emotional_beat"
                before={scene("scene-main-s3").version.emotional_beat}
                after={scene("scene-wf-s3").version.emotional_beat}
              />
              <p className="text-meta text-sv-faint">3 unchanged fields</p>
            </BoxBody>
          </Box>
        </Section>

        <Section
          title="Continuity finding"
          note="GitHub's review comment, adapted for AI output. The footer label is required on every AI-authored surface."
        >
          <FindingCard
            finding={EXPECTED_FINDING}
            sceneTitles={SCENE_TITLES}
          />
        </Section>

        <Section
          title="Empty and loading"
          note="Never a dead end; always one action."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Box>
              <EmptyState
                icon={Users}
                title="No characters yet"
                description="Upload a sketch or describe a character to start building the cast."
                action={
                  <Button size="sm">
                    <Plus />
                    New character
                  </Button>
                }
              />
            </Box>
            <Box>
              <BoxBody className="space-y-2">
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-3 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-1/3 rounded-md" />
              </BoxBody>
            </Box>
          </div>
        </Section>
      </div>
    </main>
  );
}
