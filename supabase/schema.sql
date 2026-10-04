-- Deadline Buffer + Group Work Splitter
-- Supabase PostgreSQL Schema & Security Policies

-- Projects table (solo or group)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  type text not null check (type in ('solo', 'group')),
  created_at timestamptz default now()
);

-- Project members (teammates and weekly available hours)
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  hours_per_week numeric not null default 10,
  created_at timestamptz default now()
);

-- Tasks table (assignments with deadline, hours, priority, and calculated start-by date)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  assigned_member_id uuid references public.project_members(id) on delete set null,
  name text not null,
  deadline date not null,
  estimated_hours numeric not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  start_by_date date,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
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

-- User profiles table (links auth accounts to unique usernames)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  updated_at timestamptz default now()
);

-- Row Level Security policies
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;

-- Profiles: anyone can read usernames, users can only update their own profile
create policy "Public profiles are readable"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Projects: creator has full access
create policy "Owners manage their projects"
  on public.projects for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Projects: teammates can view projects they belong to
create policy "Members view their projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.project_members
      where project_members.project_id = projects.id
      and project_members.user_id = auth.uid()
    )
  );

-- Project members: owner can view and manage roster
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

-- Project members: teammates can view the roster of their projects (aliased to prevent recursion)
create policy "Members view project roster"
  on public.project_members for select
  using (
    exists (
      select 1 from public.project_members as pm
      where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
    )
  );

-- Tasks: owner can view and manage all tasks
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

-- Tasks: teammates can view tasks in projects they belong to
create policy "Members view project tasks"
  on public.tasks for select
  using (
    exists (
      select 1 from public.project_members
      where project_members.project_id = tasks.project_id
      and project_members.user_id = auth.uid()
    )
  );

-- Tasks: teammates can update the status of tasks assigned to them
create policy "Members update assigned task status"
  on public.tasks for update
  using (
    exists (
      select 1 from public.project_members
      where project_members.id = tasks.assigned_member_id
      and project_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.project_members
      where project_members.id = tasks.assigned_member_id
      and project_members.user_id = auth.uid()
    )
  );

-- Safe migrations for existing databases
alter table public.projects add column if not exists description text;
alter table public.tasks add column if not exists updated_at timestamptz default now();
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  updated_at timestamptz default now()
);
