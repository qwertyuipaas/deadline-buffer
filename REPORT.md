# Weekly Increment Report

## Week of: September 27, 2026

## What changed this week

- **Official PostgreSQL Profiles Schema (`supabase/schema.sql`):** Added the `public.profiles` table definition to the database schema with a primary key reference to `auth.users`, unique username constraints, and automated timestamps. Configured Row Level Security (RLS) policies so usernames are publicly readable while write access is strictly limited to the account owner.
- **Collaborative Group Permissions & RLS Policies (`supabase/schema.sql`):** Overhauled the Supabase RLS policies to support true multi-user group projects:
  - Added `Members view their projects` allowing teammates linked via `user_id` in `project_members` to view projects they belong to.
  - Added `Members view project roster` allowing teammates to view who else is in their group project.
  - Added `Members view project tasks` so teammates can see all assignments within their project.
- **Teammate Task Status Updates (`supabase/schema.sql`):** Added a dedicated update policy (`Members update assigned task status`) that allows teammates to mark tasks assigned to them as "in progress" or "done" without requiring the project creator's login.
- **Start-By Urgency Triage (`src/pages/ProjectView.jsx`):** Updated the progress header on the project view to dynamically count and highlight assignments that have hit their calculated start-by date today (`🔥 X start today`), alongside existing overdue counters.
- **Comprehensive Project Documentation & Finals Badge:** Finalized the 7-section `README.md` following all documentation guidelines, created `.env.example`, built vector UI screenshots in `docs/screenshots/`, and authored `AI-USAGE.md` for the Finals Badge attribution.

## Why

- Until now, group projects were one-sided: the project creator could assign tasks to teammates by name, but teammates couldn't log in and manage their own work because database policies were owner-only (`projects.owner_id = auth.uid()`). Adding collaborative RLS policies makes group projects genuinely collaborative.
- Storing usernames in an official `profiles` table in Postgres ensures data persistence and enforces username uniqueness at the database level instead of relying on frontend checks.
- When students have 10+ assignments across multiple courses, scanning dates is stressful. Calling out assignments that need to be started *today* in the progress header gives students an immediate, actionable priority list the moment they open a project.
- Clear documentation and setup instructions ensure anyone—including grading instructors and new teammates—can clone the repository and get the app running locally without guesswork.

## What broke or what I got stuck on

- **PostgreSQL RLS infinite recursion:** When writing the policy for teammates to view project members, I initially wrote a query that selected from `project_members` to check membership in `project_members`. Supabase threw `error: infinite recursion detected in policy for relation "project_members"`, crashing all project queries. I had to fix this by aliasing the subquery table (`as pm`) and referencing the foreign key cleanly to break the circular dependency.
- **Restricting member update permissions:** My first teammate update policy allowed members to update any column on tasks assigned to them. During testing, this let an assigned member accidentally change the estimated hours and deadline that the project owner had set. I had to refine the RLS policy and frontend handlers to ensure members only update assignment `status` (`not_started`, `in_progress`, `done`).
- **Mobile button wrapping on narrow screens:** On narrow smartphone screens (under 375px wide), the header action buttons ("Guide", "Copy Summary", "Add to Calendar") and the project title were wrapping awkwardly and causing horizontal scroll. I tightened the button padding, adjusted flex-wrap boundaries, and verified the layout using mobile emulation.

## What is left

- Run final end-to-end verification across multiple test accounts on the deployed Netlify site to ensure the collaborative flow works smoothly from signup to task completion.
- Prepare demo notes and walkthrough talking points for the final project submission and evaluation.
