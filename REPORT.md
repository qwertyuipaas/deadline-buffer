# Weekly Increment Report

## Week of: September 20, 2026

## What changed this week

- Built a slide-in drawer for adding tasks instead of using static page inputs, and added an `N` keyboard shortcut so you can open it quickly anywhere on the project view.
- Added a live "start-by" preview box inside the task form so you can see the calculated start-by date change in real time as you adjust the deadline, estimated hours, or priority.
- Implemented workload balancing for group projects. The app now calculates each member's total active hours against their weekly limit and automatically suggests the person with the lightest workload in the assignment list.
- Built a visual workload progress bar next to each teammate's name that turns yellow when they're getting full and red with an alert icon if they're assigned more hours than their weekly capacity.
- Added an "Add to Calendar" button that generates an `.ics` file so students can import their tasks and calculated start-by dates straight into Google Calendar or Apple Calendar.
- Added a "Copy Summary" button that copies all project tasks, deadlines, and statuses as clean markdown with emojis to easily paste into Discord or WhatsApp study groups.
- Set up a GitHub Actions workflow with a scheduled cron job that regularly pings the Supabase REST API so the database doesn't auto-pause from inactivity.
- Added three static reference pages for class deliverables: `/journal/` for the reflection journal, `/design-system/` for the UI styles and colors, and `/wireframes/` for the initial wireframe layouts.

## Why

- Adding tasks should be fast and low-friction. If setting up an assignment feels tedious, students will just go back to cramming at the last minute. The side drawer, live date preview, and `N` key make entering tasks much smoother.
- In group projects, splitting work equally by number of tasks is usually unfair because one task might take 10 hours while another takes 1. Factoring in each person's actual weekly availability and highlighting who has room prevents team friction and burnout.
- Most students already run their lives out of Google Calendar and group chats. Providing `.ics` export and a clean Discord/WhatsApp summary means they don't have to keep checking another app just to see when they need to start.
- Supabase pauses free projects after a period of dormancy, so the GitHub Action ping keeps the database awake and reliable for grading and testing.

## What broke or what I got stuck on

- **Timezone shifts on dates:** I originally used `new Date().toISOString().split('T')[0]` for date formatting, but `toISOString()` converts everything to UTC first. For anyone in timezones ahead of UTC, this pushed dates back by a whole day, making start-by dates look like they were already overdue. I had to replace it with a helper that extracts the local year, month, and day directly.
- **Login screen crashing on mobile:** The login page threw a `ReferenceError: useEffect is not defined` and stayed completely white on mobile browsers, even though it worked fine on my desktop. I had forgotten to import `useEffect` and missed initializing the loading state in `Login.jsx`. It was an easy fix once I inspected the console via mobile remote debugging, but it reminded me to test on real devices early.
- **Landing page jumping around (layout shift):** The typewriter animation on the landing page kept causing the hero section to resize vertically whenever words of different lengths were typed and erased. I fixed it by giving the container a fixed minimum height and using a zero-width space so the line height doesn't collapse between words.
- **Row Level Security for group members:** Supabase RLS is currently the hardest part for me. Right now, the security policies only let the project creator access tasks (`projects.owner_id = auth.uid()`). When I tried letting teammates see their own assigned tasks, my policies either threw permission errors or resulted in circular dependency issues. Writing clean PostgreSQL RLS policies that check membership across tables without recursion is still tricky.

## What is left

- Update the Supabase RLS policies so invited team members can log into their own accounts and view/update group projects they are part of.
- Add the `profiles` table to `supabase/schema.sql` so usernames and user settings are stored properly in the database instead of relying on client-side fallbacks.
- Add browser or email reminders when a task hits "Start today" so users actually get nudged when their buffer window runs out.
- Do a final responsive pass on mobile and tablet screens to make sure everything looks clean before submitting.
