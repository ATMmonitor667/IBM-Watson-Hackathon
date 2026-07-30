import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { fetchBranches, insertScene } from "@/lib/supabase/db";
import type { Scene } from "@/types/workspace";

type StoredScene = {
  id: string;
  project_id: string;
  branch_id: string;
  scene_number: number;
  title: string;
  location: string;
  dialogue_excerpt: string;
  characters: string[];
  emotional_beat: string;
  review_status: string;
  continuity_flag: string | null;
  image_url: string | null;
  contributor_name: string;
  revision: number;
  status: string;
  order: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

function createInMemoryClient() {
  const storedScenes: StoredScene[] = [];
  let insertedPayload: Record<string, unknown> | null = null;

  const client = {
    from(table: string) {
      if (table === "scenes") {
        return {
          insert(payload: Record<string, unknown>) {
            insertedPayload = payload;
            const now = "2026-07-30T12:00:00.000Z";
            const row = {
              ...payload,
              created_at: now,
              updated_at: now,
            } as StoredScene;
            storedScenes.push(row);

            return {
              select() {
                return {
                  async single() {
                    return { data: row, error: null };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "branches") {
        return {
          select() {
            return {
              eq(_column: string, projectId: string) {
                return {
                  async order() {
                    return {
                      data: [
                        {
                          id: "branch-canon",
                          project_id: projectId,
                          name: "Canon",
                          source_scene_id: null,
                          is_canon: true,
                          created_at: "2026-07-30T10:00:00.000Z",
                          updated_at: "2026-07-30T10:00:00.000Z",
                          scenes: storedScenes.filter(
                            (scene) => scene.branch_id === "branch-canon",
                          ),
                        },
                        {
                          id: "branch-alternate",
                          project_id: projectId,
                          name: "Alternate",
                          source_scene_id: null,
                          is_canon: false,
                          created_at: "2026-07-30T11:00:00.000Z",
                          updated_at: "2026-07-30T11:00:00.000Z",
                          scenes: storedScenes.filter(
                            (scene) => scene.branch_id === "branch-alternate",
                          ),
                        },
                      ],
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  return {
    client,
    getInsertedPayload: () => insertedPayload,
  };
}

describe("insertScene", () => {
  it("writes and reads the scene on the explicitly selected branch", async () => {
    const { client, getInsertedPayload } = createInMemoryClient();
    const scene: Omit<Scene, "contributor"> = {
      id: "scene-alternate-1",
      projectId: "project-1",
      sceneNumber: 1,
      title: "The Alternate Choice",
      location: "Drowned Stair",
      dialogueExcerpt: "Wren reached for the stranger.",
      characters: ["Wren", "The Stranger"],
      emotionalBeat: "Resolve",
      reviewStatus: "Draft",
      revision: 1,
      status: "draft",
      order: 0,
      parentId: null,
      createdAt: "2026-07-30T12:00:00.000Z",
      updatedAt: "2026-07-30T12:00:00.000Z",
    };

    await insertScene(client, "branch-alternate", scene, "Rahat");

    expect(getInsertedPayload()).toMatchObject({
      project_id: "project-1",
      branch_id: "branch-alternate",
    });

    const branches = await fetchBranches(client, "project-1");
    expect(branches.find((branch) => branch.id === "branch-canon")?.scenes).toEqual([]);
    expect(
      branches.find((branch) => branch.id === "branch-alternate")?.scenes.map(
        (storedScene) => storedScene.id,
      ),
    ).toEqual(["scene-alternate-1"]);
  });
});
