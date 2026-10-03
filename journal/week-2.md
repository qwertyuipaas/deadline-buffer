# Reflection Journal

## Week of: September 27, 2026

## My goal this week

My primary goal for Finals Week 2 was tackling the hardest technical limitation from Week 1: expanding our database schema and PostgreSQL Row Level Security (RLS) policies so teammates can actually collaborate on group projects instead of having the app restricted solely to the project owner. I also wanted to add visual urgency cues so tasks requiring immediate action ("start today") stand out prominently, and ensure our documentation and reports are 100% complete for the final grading milestone.

## What I did

- Added the `profiles` table to `supabase/schema.sql` linked to `auth.users(id)` with a unique constraint on username, plus RLS policies allowing public reads for usernames and private writes for profile owners.
- Reworked the Supabase RLS policies so teammates in `project_members` can query their group projects (`Members view their projects`), view fellow teammates (`Members view project roster`), and read all project tasks (`Members view project tasks`).
- Added a specific update policy (`Members update assigned task status`) that allows teammates to update the completion status (`not_started`, `in_progress`, `done`) on tasks assigned to them, while preventing them from editing deadlines or estimated hours.
- Added a "Start Today" urgency counter in `ProjectView.jsx` (with a flame badge) that counts and highlights any assignments that hit their calculated start-by date today.
- Finalized all documentation deliverables: updated `REPORT.md`, audited `SECURITY-CHECKLIST.md`, updated `README.md`, and documented our human vs AI contribution breakdown in `AI-USAGE.md`.

## What blocked me

- I hit an infinite recursion error in PostgreSQL when writing the read policy for `project_members`. Because my subquery selected from `project_members` inside a rule on `project_members`, PostgreSQL entered a circular loop and Supabase threw `error: infinite recursion detected in policy for relation "project_members"`. I had to read up on PostgreSQL security policies and use table aliasing (`as pm`) to break the circular reference.
- In my first attempt at letting teammates update task status, they could actually edit any field on the task. During testing, I noticed a member could overwrite the task deadline or estimated hours that the creator had set. I had to lock down both the RLS policy and my React update logic so non-owners can only touch the `status` column.
- On smaller phone screens (under 375px), the header buttons ("Guide", "Copy Summary", "Add to Calendar") and the project title were crowding each other and causing horizontal overflow. I adjusted padding, gaps, and flex wrapping so it displays cleanly on mobile.

## What I learned

- Row Level Security in PostgreSQL requires thinking carefully about circular dependencies. When you have many-to-many or join tables like `project_members`, querying the same table in an RLS subquery without aliasing will easily cause recursion loops.
- Defensive permissions are essential in collaborative apps. Group members should only be allowed to update what they are responsible for (their own task progress), while project metadata and deadlines should stay restricted to the project owner.
- Keeping up with documentation and journals each week makes the final wrap-up much easier because you don't have to guess or reconstruct why you made certain architectural decisions or how you fixed past bugs.
