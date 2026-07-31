import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { fetchBranches, insertBranch } from "@/lib/supabase/db";
import type { Branch } from "@/types/workspace";

type StoredBranch = {
  id: string;
  project_id: string;
  name: string;
  source_scene_id: string | null;
  is_canon: boolean;
  created_at: string;
  updated_at: string;
  scenes: [];
};

function createBranchClient(insertError?: string) {
  const storedBranches: StoredBranch[] = [];
  let insertedPayload: Record<string, unknown> | null = null;

  const client = {
    from(table: string) {
      if (table !== "branches") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        insert(payload: Record<string, unknown>) {
          insertedPayload = payload;
          const row: StoredBranch = {
            id: "1d3b8919-d03e-42cc-bc54-252820ad2782",
            project_id: payload.project_id as string,
            name: payload.name as string,
            source_scene_id: payload.source_scene_id as string | null,
            is_canon: payload.is_canon as boolean,
            created_at: "2026-07-30T14:00:00.000Z",
            updated_at: "2026-07-30T14:00:00.000Z",
            scenes: [],
          };

          if (!insertError) {
            storedBranches.push(row);
          }

          return {
            select() {
              return {
                async single() {
                  return {
                    data: insertError ? null : row,
                    error: insertError ? { message: insertError } : null,
                  };
                },
              };
            },
          };
        },
        select() {
          return {
            eq(_column: string, projectId: string) {
              return {
                async order() {
                  return {
                    data: storedBranches.filter(
                      (branch) => branch.project_id === projectId,
                    ),
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  return {
    client,
    getInsertedPayload: () => insertedPayload,
  };
}

const localBranch: Branch = {
  id: "branch-local-1",
  projectId: "project-1",
  name: "The Rooftop Route",
  sourceSceneId: "scene-2",
  scenes: [],
  isCanon: false,
  createdAt: "2026-07-30T13:59:00.000Z",
  updatedAt: "2026-07-30T13:59:00.000Z",
};

describe("insertBranch", () => {
  it("returns the saved row and remains available on a later reload", async () => {
    const { client, getInsertedPayload } = createBranchClient();

    const savedBranch = await insertBranch(client, localBranch);
    const reloadedBranches = await fetchBranches(client, localBranch.projectId);

    expect(getInsertedPayload()).toEqual({
      project_id: "project-1",
      name: "The Rooftop Route",
      source_scene_id: "scene-2",
      is_canon: false,
    });
    expect(savedBranch).toMatchObject({
      id: "1d3b8919-d03e-42cc-bc54-252820ad2782",
      name: "The Rooftop Route",
      createdAt: "2026-07-30T14:00:00.000Z",
    });
    expect(reloadedBranches).toEqual([savedBranch]);
  });

  it("surfaces database failures to the caller", async () => {
    const { client } = createBranchClient("branch insert denied");

    await expect(insertBranch(client, localBranch)).rejects.toThrow(
      "branch insert denied",
    );
  });
});
