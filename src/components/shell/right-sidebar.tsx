"use client";

import { Lock } from "lucide-react";

import { ExplorerSection } from "@/components/shell/explorer";
import { FindingCard } from "@/components/review/finding-card";
import { RelativeTime } from "@/components/ui/relative-time";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sceneLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/store/workspace";
import {
  useActiveBranch,
  useSelectedScene,
  useWorkspaceData,
} from "@/lib/store/workspace-data";

/**
 * Canon panel — Obsidian's properties/backlinks sidebar.
 * See STORYVERSE_DESIGN.txt §5.16.
 *
 * Four stacked sections, all scoped to the selected scene and the active
 * timeline: the scene's structured properties, the canon facts those
 * properties touch, any continuity finding against it, and its revision
 * history.
 */
export function RightSidebar() {
  const { canonFacts, branchFacts, reviews, characters, lockedVersions, activity, memberNames } =
    useWorkspaceData();
  const branch = useActiveBranch();
  const scene = useSelectedScene();

  const selectScene = useWorkspace((s) => s.selectScene);
  const openTab = useWorkspace((s) => s.openTab);

  const { scenesByBranch } = useWorkspaceData();
  const sceneTitles = Object.fromEntries(
    Object.values(scenesByBranch)
      .flat()
      .map((s) => [s.id, s.title]),
  );

  const characterNames = Object.fromEntries(
    characters.map((c) => [c.id, c.name]),
  );

  const findings = (reviews[branch.id]?.findings ?? []).filter(
    (f) => !scene || f.affected_scene_id === scene.id,
  );

  // Facts in play: canon facts this scene's props or cast actually touch, plus
  // everything the branch itself established. Showing all of canon here would
  // be noise; showing the intersection is the point of the panel.
  const subjects = new Set([
    ...(scene?.version.props_used ?? []),
    ...(scene?.version.characters_present ?? []).map(
      (id) => characterNames[id] ?? id,
    ),
  ]);
  const factsInPlay = [
    ...canonFacts.filter((f) => subjects.has(f.subject)),
    ...branchFacts.filter((f) => f.branch_id === branch.id),
  ];

  const properties: [string, string][] = scene
    ? [
        ["scene", sceneLabel(scene.title)],
        ["setting", scene.version.setting],
        ["time", scene.version.time_of_day],
        [
          "cast",
          scene.version.characters_present
            .map((id) => characterNames[id] ?? id)
            .join(", ") || "—",
        ],
        ["props", scene.version.props_used.join(", ") || "—"],
        ["beat", scene.version.emotional_beat],
        ["version", `v${scene.version.version_no}`],
      ]
    : [];

  function openScene(sceneId: string) {
    selectScene(sceneId);
    const title = sceneTitles[sceneId];
    if (title) openTab({ id: sceneId, title, kind: "scene" });
  }

  return (
    <div className="flex h-full flex-col bg-sv-chrome">
      <div className="flex h-10 shrink-0 items-center border-b border-sv-edge px-3">
        <span className="truncate text-ui font-medium text-sv-text">Canon</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="py-2">
          <ExplorerSection id="properties" label="Properties">
            {scene ? (
              <dl className="space-y-1 px-3 py-1">
                {properties.map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="w-20 shrink-0 truncate font-mono text-micro leading-5 text-sv-muted">
                      {key}
                    </dt>
                    <dd className="min-w-0 flex-1 text-ui text-sv-text">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="px-3 py-1 text-meta text-sv-faint">
                No scene selected.
              </p>
            )}
          </ExplorerSection>

          <ExplorerSection id="locked" label="Locked designs">
            <ul className="space-y-1 px-3 py-1">
              {characters
                .filter((c) => c.locked_version_id)
                .map((character) => (
                  <li
                    key={character.id}
                    className="flex items-center gap-1.5 text-ui text-sv-text"
                  >
                    <Lock
                      className="size-3 shrink-0 text-sv-canon"
                      aria-hidden="true"
                    />
                    {character.name}
                    <span className="ml-auto font-mono text-micro text-sv-faint">
                      v{lockedVersions[character.id]?.version_no}
                    </span>
                  </li>
                ))}
            </ul>
          </ExplorerSection>

          <ExplorerSection id="facts" label="Canon facts in play">
            {factsInPlay.length > 0 ? (
              <ul className="space-y-1.5 px-3 py-1">
                {factsInPlay.map((fact) => (
                  <li key={fact.id} className="text-ui text-sv-text">
                    {fact.statement}{" "}
                    {fact.established_in_scene_id ? (
                      <button
                        type="button"
                        onClick={() =>
                          openScene(fact.established_in_scene_id!)
                        }
                        className="font-mono text-micro text-sv-link hover:underline"
                      >
                        {sceneLabel(
                          sceneTitles[fact.established_in_scene_id] ??
                            fact.established_in_scene_id,
                        )}
                      </button>
                    ) : null}
                    {fact.status === "branch" ? (
                      <span className="ml-1 font-mono text-micro text-sv-faint">
                        this timeline only
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-1 text-meta text-sv-faint">
                Nothing in this scene touches canon yet.
              </p>
            )}
          </ExplorerSection>

          <ExplorerSection id="continuity" label="Continuity">
            <div className="px-3 py-1">
              {findings.length > 0 ? (
                <div className="space-y-2">
                  {findings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      sceneTitles={sceneTitles}
                      onOpenScene={openScene}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <p className="text-meta text-sv-faint">
                  No contradictions — this scene is consistent with canon.
                </p>
              )}
            </div>
          </ExplorerSection>

          <ExplorerSection id="history" label="Revision history">
            <ul className="space-y-1 px-3 py-1">
              {activity.slice(0, 6).map((event) => (
                <li key={event.id} className="flex gap-2 text-meta">
                  <span className="min-w-0 flex-1 text-sv-muted">
                    <span className="font-medium text-sv-text">
                      {memberNames[event.actor_id] ?? event.actor_id}
                    </span>{" "}
                    {event.summary}
                  </span>
                  <RelativeTime
                    iso={event.created_at}
                    className="shrink-0 text-micro text-sv-faint"
                  />
                </li>
              ))}
            </ul>
          </ExplorerSection>
        </div>
      </ScrollArea>
    </div>
  );
}
