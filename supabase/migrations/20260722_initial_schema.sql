-- =============================================================================
-- Storyverse — Initial Schema Migration
-- File: supabase/migrations/20260722_initial_schema.sql
--
-- Creates 4 tables: projects, branches, scenes, activity_events
-- Adds Row-Level Security policies for project owner + invited collaborators.
-- Apply via: supabase db push   OR   paste into the Supabase SQL editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- 2. PROJECTS
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid        primary key default gen_random_uuid(),
  title        text        not null check (char_length(title) between 1 and 80),
  description  text        not null default '',
  status       text        not null default 'Draft'
                             check (status in ('In Progress','Draft','Complete','Archived')),
  owner_id     uuid        not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. BRANCHES
-- ---------------------------------------------------------------------------
create table if not exists public.branches (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null references public.projects(id) on delete cascade,
  name            text        not null check (char_length(name) between 1 and 120),
  source_scene_id text,                       -- id of the scene this branch diverges from
  is_canon        boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_branches_updated_at
  before update on public.branches
  for each row execute function public.set_updated_at();

create index if not exists idx_branches_project_id on public.branches(project_id);

-- ---------------------------------------------------------------------------
-- 4. SCENES
-- ---------------------------------------------------------------------------
create table if not exists public.scenes (
  id               uuid        primary key default gen_random_uuid(),
  project_id       uuid        not null references public.projects(id) on delete cascade,
  branch_id        uuid        not null references public.branches(id) on delete cascade,
  scene_number     smallint    not null,
  title            text        not null check (char_length(title) between 1 and 120),
  location         text        not null default '',
  dialogue_excerpt text        not null default '',
  characters       text[]      not null default '{}',
  emotional_beat   text        not null default '',
  review_status    text        not null default 'Draft'
                                 check (review_status in ('Draft','Under Review','Approved','Merged')),
  continuity_flag  text,
  image_url        text,
  contributor_id   uuid        references auth.users(id),
  contributor_name text        not null default 'Unknown',
  revision         smallint    not null default 1,
  status           text        not null default 'draft'
                                 check (status in ('canon','draft','archived')),
  "order"          smallint    not null default 0,
  parent_id        uuid        references public.scenes(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (branch_id, scene_number)
);

create trigger trg_scenes_updated_at
  before update on public.scenes
  for each row execute function public.set_updated_at();

create index if not exists idx_scenes_branch_id    on public.scenes(branch_id);
create index if not exists idx_scenes_project_id   on public.scenes(project_id);

-- ---------------------------------------------------------------------------
-- 5. ACTIVITY_EVENTS
-- ---------------------------------------------------------------------------
create table if not exists public.activity_events (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  user_id     uuid        references auth.users(id),
  type        text        not null check (type in ('merge','branch','scene','info')),
  message     text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_activity_project_id on public.activity_events(project_id);

-- ---------------------------------------------------------------------------
-- 6. PROJECT_MEMBERS  (owner + invited collaborators)
-- ---------------------------------------------------------------------------
create table if not exists public.project_members (
  project_id  uuid  not null references public.projects(id) on delete cascade,
  user_id     uuid  not null references auth.users(id) on delete cascade,
  role        text  not null default 'collaborator'
                      check (role in ('owner','collaborator')),
  primary key (project_id, user_id)
);

create index if not exists idx_project_members_user_id on public.project_members(user_id);

-- ---------------------------------------------------------------------------
-- 7. ROW-LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.projects         enable row level security;
alter table public.branches         enable row level security;
alter table public.scenes           enable row level security;
alter table public.activity_events  enable row level security;
alter table public.project_members  enable row level security;

-- Helper: is the current user a member of a project?
create or replace function public.is_project_member(pid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.project_members
    where project_id = pid
      and user_id    = auth.uid()
  );
$$;

-- Helper: is the current user the owner of a project?
create or replace function public.is_project_owner(pid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.projects
    where id       = pid
      and owner_id = auth.uid()
  );
$$;

-- ----- projects -----
create policy "members can view projects"
  on public.projects for select
  using (public.is_project_member(id) or owner_id = auth.uid());

create policy "owners can insert projects"
  on public.projects for insert
  with check (owner_id = auth.uid());

create policy "owners can update projects"
  on public.projects for update
  using (owner_id = auth.uid());

create policy "owners can delete projects"
  on public.projects for delete
  using (owner_id = auth.uid());

-- ----- project_members -----
create policy "members can view membership"
  on public.project_members for select
  using (user_id = auth.uid() or public.is_project_owner(project_id));

create policy "owners can manage members"
  on public.project_members for all
  using (public.is_project_owner(project_id));

-- ----- branches -----
create policy "members can view branches"
  on public.branches for select
  using (public.is_project_member(project_id) or public.is_project_owner(project_id));

create policy "members can insert branches"
  on public.branches for insert
  with check (public.is_project_member(project_id) or public.is_project_owner(project_id));

create policy "members can update branches"
  on public.branches for update
  using (public.is_project_member(project_id) or public.is_project_owner(project_id));

create policy "owners can delete branches"
  on public.branches for delete
  using (public.is_project_owner(project_id));

-- ----- scenes -----
create policy "members can view scenes"
  on public.scenes for select
  using (public.is_project_member(project_id) or public.is_project_owner(project_id));

create policy "members can insert scenes"
  on public.scenes for insert
  with check (public.is_project_member(project_id) or public.is_project_owner(project_id));

create policy "members can update scenes"
  on public.scenes for update
  using (public.is_project_member(project_id) or public.is_project_owner(project_id));

create policy "owners can delete scenes"
  on public.scenes for delete
  using (public.is_project_owner(project_id));

-- ----- activity_events -----
create policy "members can view activity"
  on public.activity_events for select
  using (public.is_project_member(project_id) or public.is_project_owner(project_id));

create policy "members can insert activity"
  on public.activity_events for insert
  with check (public.is_project_member(project_id) or public.is_project_owner(project_id));

-- Activity events are append-only — no update/delete policies.

-- ---------------------------------------------------------------------------
-- 8. CONVENIENCE VIEW — scenes with branch name
-- ---------------------------------------------------------------------------
create or replace view public.scenes_with_branch as
  select s.*,
         b.name       as branch_name,
         b.is_canon   as branch_is_canon
  from public.scenes s
  join public.branches b on b.id = s.branch_id;
