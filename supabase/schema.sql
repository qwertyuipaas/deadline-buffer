-- Deadline Buffer + Group Work Splitter
-- Run this in your Supabase project's SQL Editor (Supabase Dashboard > SQL Editor > New query)

-- ============================================================
-- 1. PROJECTS
-- A project can be "solo" (just the owner) or "group" (has members)
-- ============================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text, -- optional short description of the project
  type text not null check (type in ('solo', 'group')),
  created_at timestamptz default now()
);

-- ============================================================
-- 2. PROJECT MEMBERS
-- People who belong to a group project (owner is auto-added as a member too)
-- ============================================================
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null, -- lets you add teammates before they sign up, if needed
  hours_per_week numeric not null default 10, -- how many hours/week this member can give
  created_at timestamptz default now()
);

-- ============================================================
-- 3. TASKS
-- Belongs to a project. May be assigned to a member (group) or left unassigned (solo).
-- start_by_date is calculated app-side and stored so it's easy to query/sort.
-- ============================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  assigned_member_id uuid references public.project_members(id) on delete set null,
  name text not null,
  deadline date not null,
  estimated_hours numeric not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  start_by_date date, -- computed: deadline minus buffer based on hours + priority
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  created_at timestamptz default now(),
  updated_at timestamptz default now() -- set by trigger below so sorts by "last changed" work
);

-- Auto-update updated_at on tasks whenever a row is updated
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Users can only see/edit projects they own or are a member of.
-- ============================================================
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;

-- Projects: owner can do everything with their own projects
create policy "Owners manage their projects"
  on public.projects for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Project members: visible/editable by the project owner
create policy "Owners manage project members"
  on public.project_members for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_members.project_id
      and projects.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = project_members.project_id
      and projects.owner_id = auth.uid()
    )
  );

-- Tasks: visible/editable by the project owner
create policy "Owners manage tasks"
  on public.tasks for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = tasks.project_id
      and projects.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = tasks.project_id
      and projects.owner_id = auth.uid()
    )
  );

-- ============================================================
-- MIGRATIONS — run these if you already have existing tables
-- (safe to run multiple times thanks to "if not exists" / "or replace")
-- ============================================================
alter table public.projects add column if not exists description text;
alter table public.tasks add column if not exists updated_at timestamptz default now();
