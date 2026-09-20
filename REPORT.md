# Weekly Increment Report

## Week of: September 20, 2026

## What changed this week

- **Interactive Task Drawer & Quick Capture (`src/components/TaskDrawer.jsx`, `src/pages/ProjectView.jsx`):**
  - Built a slide-in side drawer panel for adding tasks that traps focus, handles <kbd>Escape</kbd> to close, and locks body scrolling.
  - Added a global keyboard shortcut (<kbd>N</kbd>) across the project view to immediately open the task drawer.
  - Implemented a live start-by date preview card inside the task form that dynamically recalculates as the user inputs deadline, hours, and priority before submitting.
- **Teammate Workload Balancing & Auto-Assign Suggestions (`src/lib/groupUtils.js`, `src/components/MemberWorkloadBar.jsx`):**
  - Created workload calculation logic (`getMemberWorkloadHours` and `getMemberStats`) that aggregates active, non-completed task hours for each member against their weekly availability (`hours_per_week`).
  - Added smart suggestion ordering (`getSuggestedMemberOrder`): the assignment list automatically sorts teammates with the most available capacity first and badges the optimal suggestion.
  - Built a visual workload meter component (`MemberWorkloadBar`) with color-coded thresholds (teal = safe, amber = approaching capacity, red + warning icon = overloaded).
- **Calendar Export & Chat Summary Hub (`src/lib/exportUtils.js`):**
  - Implemented `.ics` file generation (`exportProjectToIcs`) conforming to RFC 5545 specifications, allowing students to import their project assignments and calculated start-by dates directly into Google Calendar, Apple Calendar, and Outlook.
  - Added one-click Markdown summary copying (`formatProjectSummary`) formatted with status emojis for pasting updates directly into Discord, Slack, or WhatsApp study group chats.
- **Local Timezone Correction (`src/lib/dateCalc.js`):**
  - Replaced native `toISOString()` date slicing with a custom `toLocalIsoDate()` helper to eliminate UTC offset bugs where dates shifted back by one day for timezones ahead of UTC.
- **Database Maintenance Workflow (`.github/workflows/keep-supabase-alive.yml`):**
  - Added an automated GitHub Actions scheduled cron job that pings the Supabase REST endpoint three times a week to prevent the free-tier database from pausing due to inactivity.
- **Academic Milestone Documentation Pages (`public/journal/`, `public/design-system/`, `public/wireframes/`):**
  - Added and deployed the M7A1 Midterm Reflection Journal (`/journal/`), M6A3 Design System documentation (`/design-system/`), and M6A2 Wireframes (`/wireframes/`).

## Why

- **Lowering friction for habit building:** The core purpose of Deadline Buffer is turning stressful deadlines into calm start-by dates. If adding a task takes too many clicks or feels clunky, students revert to last-minute cramming. The <kbd>N</kbd> shortcut, drawer UI, and real-time buffer preview make task entry fast and informative.
- **Fair workload distribution in group projects:** In group coursework, assigning tasks equally by count often causes burnout because teammates have different course loads. Balancing assignments by declared weekly availability (`hours_per_week`) and visually flagging overload ensures work is distributed realistically.
- **Bridging the app into existing student workflows:** Students already manage their schedules using Google Calendar, Apple Calendar, and group chats. Providing `.ics` export and instant chat-friendly markdown summaries means Deadline Buffer integrates into their daily routine instead of being another isolated tool.
- **Preventing demo/testing downtime:** Free-tier Supabase projects pause after a period of dormancy. The GitHub Actions keep-alive workflow guarantees the database remains active for evaluations and daily testing.

## What broke or what I got stuck on

- **Timezone date shifts:** Using `new Date().toISOString().split('T')[0]` created an off-by-one bug where start-by dates and deadlines displayed as yesterday when accessed in timezones ahead of UTC (such as Asia and Europe). Solving this required writing a dedicated `toLocalIsoDate()` helper using `getFullYear()`, `getMonth()`, and `getDate()` to ensure all date calculations strictly match the user's local clock.
- **Mobile login white-screen crash:** Testing on mobile revealed a silent crash on the login screen. Inspecting browser console logs revealed a `ReferenceError: useEffect is not defined` and an uninitialized `loading` state variable. Desktop had cached an earlier build, masking the bug until remote mobile testing. Adding the proper React hook imports and initializing loading state resolved the issue.
- **Cumulative Layout Shift (CLS) on the hero headline:** The landing page typewriter animation was dynamically resizing the header container whenever phrases of different lengths were typed or deleted, causing the entire landing page below to jump erratically. I fixed this by locking the animated text container to a fixed minimum height and prepending a zero-width space (`\u200B`) to maintain baseline alignment.
- **Row Level Security (RLS) for multi-user group access:** Current Supabase RLS policies are strictly owner-centric (`projects.owner_id = auth.uid()`). When attempting to let invited teammates log in and view their assigned tasks, Supabase blocked access because policies only checked project ownership. Constructing clean, non-recursive PostgreSQL RLS policies that permit access based on `project_members.user_id` without causing recursion or security leaks has been the trickiest backend challenge.

## What is left

- **Multi-user teammate authentication:** Update the Supabase PostgreSQL RLS policies and schema so invited members can authenticate with their own accounts and view/update only the group projects they belong to.
- **Official profiles table migration:** Formally add the `profiles` table schema and RLS policies into `supabase/schema.sql` (to store usernames and study preferences) rather than relying on client-side fallback handling.
- **Approaching start-by date notifications:** Implement email reminders or browser notifications when a task hits the "Start today" or "Critical" urgency threshold.
- **Project calendar / timeline view:** Build a visual Gantt or semester-wide calendar grid displaying all active start-by buffer windows side by side.
