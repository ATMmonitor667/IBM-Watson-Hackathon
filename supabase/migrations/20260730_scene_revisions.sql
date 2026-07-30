-- Immutable scene history and atomic branch-scene revisioning.

create table if not exists public.scene_revisions (
  id               uuid        primary key default gen_random_uuid(),
  scene_id         uuid        not null references public.scenes(id) on delete cascade,
  project_id       uuid        not null references public.projects(id) on delete cascade,
  branch_id        uuid        not null references public.branches(id) on delete cascade,
  revision         smallint    not null check (revision > 0),
  title            text        not null,
  location         text        not null default '',
  dialogue_excerpt text        not null default '',
  characters       text[]      not null default '{}',
  emotional_beat   text        not null default '',
  contributor_id   uuid        references auth.users(id),
  contributor_name text        not null default 'Unknown',
  created_at       timestamptz not null,

  unique (scene_id, revision)
);

create index if not exists idx_scene_revisions_scene_id
  on public.scene_revisions(scene_id, revision desc);
create index if not exists idx_scene_revisions_project_id
  on public.scene_revisions(project_id);

alter table public.scene_revisions enable row level security;

create policy "members can view scene revisions"
  on public.scene_revisions for select
  using (
    public.is_project_member(project_id)
    or public.is_project_owner(project_id)
  );

create policy "members can insert scene revisions"
  on public.scene_revisions for insert
  with check (
    public.is_project_member(project_id)
    or public.is_project_owner(project_id)
  );

create or replace function public.revise_scene(
  p_scene_id uuid,
  p_expected_revision smallint,
  p_title text,
  p_location text,
  p_dialogue_excerpt text,
  p_characters text[],
  p_emotional_beat text,
  p_contributor_name text
)
returns public.scenes
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_scene public.scenes%rowtype;
  branch_is_canon boolean;
  revised_scene public.scenes%rowtype;
begin
  select s, b.is_canon
    into current_scene, branch_is_canon
    from public.scenes s
    join public.branches b on b.id = s.branch_id
   where s.id = p_scene_id
   for update of s;

  if not found then
    raise exception 'Scene not found';
  end if;

  if branch_is_canon then
    raise exception 'Canon scenes cannot be edited directly';
  end if;

  if current_scene.revision <> p_expected_revision then
    raise exception 'Scene changed since it was opened; reload before editing';
  end if;

  insert into public.scene_revisions (
    scene_id,
    project_id,
    branch_id,
    revision,
    title,
    location,
    dialogue_excerpt,
    characters,
    emotional_beat,
    contributor_id,
    contributor_name,
    created_at
  )
  values (
    current_scene.id,
    current_scene.project_id,
    current_scene.branch_id,
    current_scene.revision,
    current_scene.title,
    current_scene.location,
    current_scene.dialogue_excerpt,
    current_scene.characters,
    current_scene.emotional_beat,
    current_scene.contributor_id,
    current_scene.contributor_name,
    current_scene.updated_at
  );

  update public.scenes
     set title = trim(p_title),
         location = trim(p_location),
         dialogue_excerpt = p_dialogue_excerpt,
         characters = p_characters,
         emotional_beat = p_emotional_beat,
         contributor_id = auth.uid(),
         contributor_name = coalesce(
           nullif(trim(p_contributor_name), ''),
           current_scene.contributor_name
         ),
         revision = current_scene.revision + 1,
         review_status = 'Draft',
         continuity_flag = null
   where id = current_scene.id
   returning * into revised_scene;

  return revised_scene;
end;
$$;

revoke execute on function public.revise_scene(
  uuid,
  smallint,
  text,
  text,
  text,
  text[],
  text,
  text
) from public;

grant execute on function public.revise_scene(
  uuid,
  smallint,
  text,
  text,
  text,
  text[],
  text,
  text
) to authenticated;
