# Reflection Journal

## Week of: September 27, 2026

## My goal this week

My primary goal for Finals Week 2 was tackling the hardest technical limitation from Week 1: expanding our database schema and PostgreSQL Row Level Security (RLS) policies so teammates can actually collaborate on group projects instead of having the app restricted solely to the project owner. I also wanted to add visual urgency cues so tasks requiring immediate action ("start today") stand out prominently, and ensure our documentation and reports are 100% complete for the final grading milestone.

## What I did

- **Added PostgreSQL Profiles Table:** Defined the official `public.profiles` table in `supabase/schema.sql` with primary key linkage to `auth.users(id)` and unique username constraints. Configured RLS policies so profile usernames are readable across the platform while user updates are strictly locked to the authenticated user.
- **Implemented Multi-User Collaborative RLS:** Re-architected our Supabase security policies in `supabase/schema.sql` to support team members. Teammates linked to a project through `project_members.user_id` can now query their group projects (`Members view their projects`), view fellow teammates (`Members view project roster`), and read all project tasks (`Members view project tasks`).
- **Scoped Teammate Task Updates:** Wrote a specific update policy (`Members update assigned task status`) that allows teammates to toggle the completion status (`not_started`, `in_progress`, `done`) of tasks assigned to them without granting permission to alter deadlines or estimated hours.
- **Added Start-Today Urgency Indicators:** Enhanced the progress overview in `ProjectView.jsx` to dynamically calculate and highlight assignments that have reached their exact calculated start-by date today (`🔥 X start today`), giving students an instant triage list when opening a project.
- **Finalized Documentation & Reports:** Created the Finals Week 2 Project Increment Report (`REPORT.md`), updated our repository README, verified the `AI-USAGE.md` log, and checked responsive layouts across mobile viewports.

## What blocked me

- **PostgreSQL subquery recursion in RLS:** When writing the read policy for `project_members`, I initially queried `project_members` inside its own `EXISTS` subquery. This caused PostgreSQL to enter an infinite recursion loop, and Supabase threw `error: infinite recursion detected in policy for relation "project_members"`, crashing all project queries. I had to read through PostgreSQL documentation to understand how table aliasing (`as pm`) breaks self-referencing circular loops in security policies.
- **Accidental task detail overwrites by teammates:** In my first version of the teammate update policy, members were able to update any task field, meaning someone could accidentally modify the assignment deadline or estimated hours set by the project creator. I had to refine the RLS policy and update handlers so non-owners can only update task progress status.
- **Narrow screen button wrapping:** On narrow smartphone screens under 375px wide, the action buttons in the project header ("Guide", "Copy Summary", "Add to Calendar") and the project name wrapped into each other and created horizontal page overflow. I had to adjust padding, shrink button gaps, and test with mobile DevTools to ensure clean wrapping on small screens.

## What I learned

- **Row Level Security is much more than a boolean check:** Writing real-world multi-tenant or collaborative authorization in PostgreSQL requires thinking carefully about relationships and subquery performance. Decoupling owner permissions from member permissions prevents circular recursion and keeps database queries fast.
- **Design for defensive permissions:** Teammates should only have permission to edit what they are responsible for (their own task progress), while structural project data (deadlines, member capacities, course descriptions) should remain protected by creator-level permissions.
- **The value of incremental documentation:** Updating documentation, reports, and journals week by week instead of cramming them at the end makes project defense much easier because every technical decision and bug fix is already documented while it's fresh in memory.
