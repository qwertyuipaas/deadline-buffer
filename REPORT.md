# Weekly Increment Report

## Week of: September 27, 2026

## What changed this week

- Added the `profiles` table to `supabase/schema.sql` so user accounts have a real username tied to their Supabase auth ID, along with unique checks and RLS policies so people can look up teammates by username.
- Updated the Supabase RLS policies so teammates can actually collaborate on group projects. Previously, only the project creator could see anything. Now, users in `project_members` can view their projects, see the other teammates, and view all tasks in the project.
- Added a specific RLS update policy for teammates: they can now toggle their own assigned tasks between "not started", "in progress", and "done", but they can't accidentally change the deadline or the hours that the creator set.
- Added a "Start Today" counter in the project header on `ProjectView.jsx` (shows a flame icon and the count of tasks that reached their calculated start date today) so students immediately know what is urgent when they log in.
- Completed the project documentation (`README.md`, `.env.example`, vector UI screenshots in `docs/screenshots/`, and `AI-USAGE.md` with our effort breakdown).

## Why

- Before this week, group projects were basically read-only for anyone other than the person who created the project. If Alex created a project and assigned Jamie a task, Jamie couldn't even see the project when logging in because the old RLS rule only allowed `owner_id = auth.uid()`. Making these collaborative policies was necessary so group members can actually use the app together.
- Having a real `profiles` table in Postgres ensures usernames are unique at the database level and don't just exist in frontend state.
- Students with a bunch of assignments across different classes get overwhelmed looking at long lists of dates. Having a quick indicator that calls out tasks that need to be started *today* gives an instant priority list right when you open the page.
- Clear setup steps and documentation make sure anyone cloning the repo (or grading it) can run it locally with their own Supabase keys without hitting missing env errors.

## What broke or what I got stuck on

- I ran into an infinite recursion error in PostgreSQL when writing the RLS policy for `project_members`. I had written a query that checked `project_members` inside a policy on `project_members`, which caused Supabase to crash with `error: infinite recursion detected in policy for relation "project_members"`. I had to learn how to alias the table (`as pm`) to break the circular dependency.
- In my first draft of the task update policy, members were able to edit any column on their tasks. When testing with two browser windows, I noticed an assigned member could accidentally change the deadline or the estimated hours that the creator had specified. I had to tighten both the RLS policy and the React handlers so members can only update the task `status`.
- On narrow phone screens (under 375px), the header buttons ("Guide", "Copy Summary", "Add to Calendar") were wrapping awkwardly and pushing the title off-center. I had to tweak the flex-wrap settings and button padding so the header fits properly on mobile.

## What is left

- Run final tests across multiple accounts on the deployed site to make sure the invite and task update flow works smoothly from start to finish.
- Prepare demo notes and talking points for the final submission.
