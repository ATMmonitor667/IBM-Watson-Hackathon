"use client";

import { ImageIcon } from "lucide-react";

import { BranchChip, StateChip } from "@/components/story/state-chip";
import { RelativeTime } from "@/components/ui/relative-time";
import { Box, BoxBody, BoxHeader } from "@/components/ui/box";
import { FindingCard } from "@/components/review/finding-card";
import { sceneLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/store/workspace";
import {
  useActiveBranch,
  useWorkspaceData,
} from "@/lib/store/workspace-data";
import type { SceneWithVersion } from "@/lib/types/schemas";

/**
 * One scene in full — the pane behind a scene tab. See STORYVERSE_DESIGN.txt §5.13.
 *
 * The structured fields come first and the prose second, which is the reverse
 * of how a script reads but the right order here: `props_used` and
 * `characters_present` are what the continuity engine reasons over, so they
 * are what a reviewer needs to check.
 */
export function SceneDetail({ sceneId }: { sceneId: string }) {
  const { characters, memberNames, reviews, scenesByBranch } =
    useWorkspaceData();
  const activeBranch = useActiveBranch();
  const openTab = useWorkspace((s) => s.openTab);
  const selectScene = useWorkspace((s) => s.selectScene);

  const allScenes = Object.values(scenesByBranch).flat();
  const scene = allScenes.find((s) => s.id === sceneId);

  if (!scene) {
    return (
      <div className="p-6">
        <p className="text-body text-sv-muted">
          This scene is no longer in the story.
        </p>
      </div>
    );
  }

  const sceneTitles = Object.fromEntries(allScenes.map((s) => [s.id, s.title]));
  const characterNames = Object.fromEntries(
    characters.map((c) => [c.id, c.name]),
  );
  const branch =
    Object.entries(scenesByBranch).find(([, list]) =>
      list.some((s) => s.id === sceneId),
    )?.[0] ?? activeBranch.id;

  const findings = (reviews[branch]?.findings ?? []).filter(
    (f) => f.affected_scene_id === sceneId,
  );

  function openScene(id: string) {
    const title = sceneTitles[id];
    if (!title) return;
    selectScene(id);
    openTab({ id, title, kind: "scene" });
  }

  return (
    <article className="mx-auto max-w-3xl space-y-4 p-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-meta text-sv-muted">
            {sceneLabel(scene.title)}
          </span>
          <BranchChip
            name={
              scene.branch_id === activeBranch.id ? activeBranch.name : branch
            }
            canon={activeBranch.is_canon && scene.branch_id === activeBranch.id}
          />
          {findings.length > 0 ? <StateChip state="conflict" /> : null}
        </div>
        <h1 className="text-page font-semibold text-sv-text">{scene.title}</h1>
      </header>

      <div className="overflow-hidden rounded-lg border border-sv-edge bg-sv-inset">
        {scene.version.panel_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={scene.version.panel_image_url}
            alt={`Panel for ${scene.title}`}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-sv-faint">
            <ImageIcon className="size-6" aria-hidden="true" />
            <span className="text-meta">No panel yet</span>
          </div>
        )}
      </div>

      <StructuredFields scene={scene} characterNames={characterNames} />

      <Box>
        <BoxHeader>Action</BoxHeader>
        <BoxBody>
          <p className="text-body leading-6 text-sv-text">
            {scene.version.action}
          </p>
        </BoxBody>
      </Box>

      <Box>
        <BoxHeader>Dialogue</BoxHeader>
        <BoxBody>
          <p className="whitespace-pre-line font-mono text-ui leading-6 text-sv-text">
            {scene.version.dialogue}
          </p>
        </BoxBody>
      </Box>

      <Box>
        <BoxHeader>Story purpose</BoxHeader>
        <BoxBody>
          <p className="text-body leading-6 text-sv-muted">
            {scene.version.story_purpose}
          </p>
        </BoxBody>
      </Box>

      {findings.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-title font-medium text-sv-text">
            Continuity review
          </h2>
          {findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              sceneTitles={sceneTitles}
              onOpenScene={openScene}
            />
          ))}
        </section>
      ) : null}

      <footer className="flex items-center gap-2 border-t border-sv-edge pt-3 text-meta text-sv-muted">
        <span>
          v{scene.version.version_no} by{" "}
          {memberNames[scene.version.author_id] ?? scene.version.author_id}
        </span>
        <RelativeTime
          iso={scene.version.created_at}
          className="ml-auto text-micro text-sv-faint"
        />
      </footer>
    </article>
  );
}

function StructuredFields({
  scene,
  characterNames,
}: {
  scene: SceneWithVersion;
  characterNames: Record<string, string>;
}) {
  const version = scene.version;

  return (
    <Box>
      <BoxHeader>Properties</BoxHeader>
      <BoxBody>
        <dl className="grid gap-2 sm:grid-cols-[9rem_1fr]">
          <Field label="setting" value={version.setting} />
          <Field label="time_of_day" value={version.time_of_day} />
          <Field
            label="characters_present"
            value={
              version.characters_present
                .map((id) => characterNames[id] ?? id)
                .join(", ") || "—"
            }
          />
          <Field label="emotional_beat" value={version.emotional_beat} />
          <dt className="font-mono text-micro leading-6 text-sv-muted">
            props_used
          </dt>
          <dd>
            {version.props_used.length > 0 ? (
              <ul className="flex flex-wrap gap-1">
                {version.props_used.map((prop) => (
                  <li
                    key={prop}
                    className="rounded-sm border border-sv-edge bg-sv-inset px-1.5 py-0.5 font-mono text-micro text-sv-text"
                  >
                    {prop}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-ui text-sv-faint">—</span>
            )}
          </dd>
        </dl>
      </BoxBody>
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-mono text-micro leading-6 text-sv-muted">{label}</dt>
      <dd className="text-ui leading-6 text-sv-text">{value}</dd>
    </>
  );
}
