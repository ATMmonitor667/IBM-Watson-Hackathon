-- =============================================================================
-- Storyverse — Demo Seed Data
-- File: supabase/seed.sql
--
-- Inserts the "Flooded City" demo project with the canonical scenes and one
-- alternate branch.  Designed to be idempotent: running it twice will not
-- duplicate rows.
--
-- Usage (after running the migration):
--   supabase db reset        — applies migrations then seed
--   -- OR paste into Supabase SQL editor and run manually
--
-- NOTE: Replace 'SEED_USER_ID' with a real auth.users.id before running in a
-- hosted project, OR create the user first via the Supabase Auth dashboard
-- and paste their UUID below.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Config — set these two values before running
-- ---------------------------------------------------------------------------
do $$
declare
  v_owner_id    uuid := '00000000-0000-0000-0000-000000000001';  -- replace with real user id
  v_project_id  uuid := 'a1b2c3d4-0001-0000-0000-000000000001';
  v_canon_id    uuid := 'a1b2c3d4-0002-0000-0000-000000000001';
  v_alt_id      uuid := 'a1b2c3d4-0003-0000-0000-000000000001';

  -- canon scene ids
  v_s1  uuid := 'a1b2c3d4-0101-0000-0000-000000000001';
  v_s2  uuid := 'a1b2c3d4-0102-0000-0000-000000000001';
  v_s3  uuid := 'a1b2c3d4-0103-0000-0000-000000000001';
  v_s4  uuid := 'a1b2c3d4-0104-0000-0000-000000000001';
  v_s5  uuid := 'a1b2c3d4-0105-0000-0000-000000000001';

  -- alternate branch scene ids
  v_s6  uuid := 'a1b2c3d4-0106-0000-0000-000000000001';
  v_s7  uuid := 'a1b2c3d4-0107-0000-0000-000000000001';
begin

  -- -------------------------------------------------------------------------
  -- Project
  -- -------------------------------------------------------------------------
  insert into public.projects (id, title, description, status, owner_id, created_at, updated_at)
  values (
    v_project_id,
    'The Flooded City',
    'An explorer navigates a drowned metropolis with only a glowing compass to guide them.',
    'In Progress',
    v_owner_id,
    '2026-07-22T10:00:00Z',
    '2026-07-24T10:00:00Z'
  )
  on conflict (id) do nothing;

  -- Make owner a member too
  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, v_owner_id, 'owner')
  on conflict do nothing;

  -- -------------------------------------------------------------------------
  -- Canon branch
  -- -------------------------------------------------------------------------
  insert into public.branches (id, project_id, name, source_scene_id, is_canon, created_at, updated_at)
  values (
    v_canon_id, v_project_id, 'Canon', null, true,
    '2026-07-20T08:00:00Z', '2026-07-24T16:00:00Z'
  )
  on conflict (id) do nothing;

  -- -------------------------------------------------------------------------
  -- Canon scenes
  -- -------------------------------------------------------------------------
  insert into public.scenes
    (id, project_id, branch_id, scene_number, title, location,
     dialogue_excerpt, characters, emotional_beat,
     review_status, continuity_flag, revision, status, "order", parent_id,
     contributor_name, created_at, updated_at)
  values
    (v_s1, v_project_id, v_canon_id, 1,
     'The Surface Breaks', 'Submerged Central Station',
     '"The water remembers everything," Kael whispered, watching the compass spin. "That''s what makes it dangerous."',
     array['Kael','The Compass'], 'Dread',
     'Approved', null, 4, 'canon', 1, null,
     'Amara Singh', '2026-07-20T08:00:00Z', '2026-07-23T14:30:00Z'),

    (v_s2, v_project_id, v_canon_id, 2,
     'The Market Beneath', 'Flooded Market District',
     'Vendors still called out prices in the old tongue — their voices carried through six feet of green water as though the flood had never come.',
     array['Kael','Mira','The Ferryman'], 'Melancholy',
     'Under Review',
     'The Ferryman is introduced here but has no prior mention — consider a brief setup in Scene 1.',
     2, 'canon', 2, null,
     'Theo Park', '2026-07-21T09:15:00Z', '2026-07-24T10:00:00Z'),

    (v_s3, v_project_id, v_canon_id, 3,
     'The Lighthouse Signal', 'Old Harbour Lighthouse',
     'Mira grabbed his arm. "It''s pointing up. Compasses don''t point up." Kael stared at the needle. "This one does."',
     array['Kael','Mira'], 'Tension',
     'Draft', null, 1, 'draft', 3, null,
     'Amara Singh', '2026-07-22T11:00:00Z', '2026-07-22T11:00:00Z'),

    (v_s4, v_project_id, v_canon_id, 4,
     'Below the Archive', 'Submerged City Archive',
     'The books had not rotted. The ink had not run. Whatever preserved them was not water — and it was not natural.',
     array['Kael','The Archivist'], 'Wonder',
     'Approved',
     'The Archivist speaks of "the old pact" — no prior mention of this pact exists in earlier scenes.',
     3, 'canon', 4, null,
     'Rahat Islam', '2026-07-23T13:45:00Z', '2026-07-24T09:20:00Z'),

    (v_s5, v_project_id, v_canon_id, 5,
     'The Choice at the Gate', 'Northern Flood Gate',
     '"Open the gate and the lower city drowns. Leave it shut and the upper city starves." The Ferryman spread his hands. "That''s the only choice left."',
     array['Kael','Mira','The Ferryman','The Archivist'], 'Despair',
     'Merged', null, 5, 'canon', 5, null,
     'Theo Park', '2026-07-24T07:30:00Z', '2026-07-24T16:00:00Z')
  on conflict (id) do nothing;

  -- -------------------------------------------------------------------------
  -- Alternate branch — "The Tunnel Route"
  -- -------------------------------------------------------------------------
  insert into public.branches (id, project_id, name, source_scene_id, is_canon, created_at, updated_at)
  values (
    v_alt_id, v_project_id, 'The Tunnel Route', v_s2::text, false,
    '2026-07-23T10:00:00Z', '2026-07-23T12:00:00Z'
  )
  on conflict (id) do nothing;

  insert into public.scenes
    (id, project_id, branch_id, scene_number, title, location,
     dialogue_excerpt, characters, emotional_beat,
     review_status, continuity_flag, revision, status, "order", parent_id,
     contributor_name, created_at, updated_at)
  values
    (v_s6, v_project_id, v_alt_id, 6,
     'The Hidden Tunnel', 'Underground Aqueduct',
     '"If the market is too dangerous, we go under it," Kael said, tracing the old map with his finger.',
     array['Kael','Mira'], 'Hope',
     'Under Review',
     'Kael references "the aqueduct map" — this map was never established in any scene.',
     1, 'draft', 1, v_s2,
     'Theo Park', '2026-07-23T10:00:00Z', '2026-07-23T10:00:00Z'),

    (v_s7, v_project_id, v_alt_id, 7,
     'The Drowned Engine Room', 'Old Power Station',
     'The turbines still turned. Nobody had switched them off. Nobody had been able to.',
     array['Kael','Mira','The Archivist'], 'Unease',
     'Draft', null, 1, 'draft', 2, v_s6,
     'Rahat Islam', '2026-07-23T12:00:00Z', '2026-07-23T12:00:00Z')
  on conflict (id) do nothing;

  -- -------------------------------------------------------------------------
  -- Seed activity events
  -- -------------------------------------------------------------------------
  insert into public.activity_events (project_id, user_id, type, message, created_at)
  values
    (v_project_id, v_owner_id, 'info',   'Project "The Flooded City" created',                    '2026-07-22T10:00:00Z'),
    (v_project_id, v_owner_id, 'scene',  'Scene #1 "The Surface Breaks" added to Canon',          '2026-07-22T10:05:00Z'),
    (v_project_id, v_owner_id, 'scene',  'Scene #2 "The Market Beneath" added to Canon',          '2026-07-23T09:15:00Z'),
    (v_project_id, v_owner_id, 'branch', 'Branch "The Tunnel Route" created from Scene #2',       '2026-07-23T10:00:00Z'),
    (v_project_id, v_owner_id, 'scene',  'Scene #6 "The Hidden Tunnel" added to The Tunnel Route','2026-07-23T10:01:00Z'),
    (v_project_id, v_owner_id, 'merge',  'Scene #5 "The Choice at the Gate" merged into Canon',   '2026-07-24T16:00:00Z')
  on conflict do nothing;

end $$;
