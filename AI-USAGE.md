# AI Usage & Attribution Log (M8A9: Full-Stack JavaScript and AI Badge)

**Student:** Glen P  
**Project:** Deadline Buffer (Academic Project & Buffer Management System)  
**Repository:** [https://github.com/qwertyuipaas/deadline-buffer](https://github.com/qwertyuipaas/deadline-buffer)  
**Course Deliverable:** M8A9: Builds Full-Stack JavaScript and AI (Badge)  
**Evaluation Threshold:** ≥20% Human-Authored Code (≤80% Vibe Coded) | **Current Human Work:** ~75%  

---

## Overview & Authorship Statement

As software engineering embraces generative AI, real developer competence is defined by **driving the AI rather than being driven by it**, critically auditing generated output, catching architectural flaws, and writing substantial original code. 

For **DeadlineBuffer**, approximately **25% of the total project effort utilized AI assistance** (ChatGPT & Claude) as an interactive reference for syntax, formula brainstorming, and debugging edge cases. The remaining **~75% is human-authored code** designed, written, and verified by Glen P. At least 40% of the core Node, React, and PostgreSQL logic was authored completely by hand.

---

## Section 1: How I Used AI (35 Points)

Each entry represents a specific architectural or implementation workflow where AI was leveraged as a pair-programmer, accompanied by the corresponding commit hash in the project repository.

### 1. Brainstorming Priority Buffer Weighting Multipliers (`src/lib/dateCalc.js`)
- **What I prompted for:** I asked AI to propose realistic workload multipliers for academic project planning based on task priority (low, medium, high) and a standard student baseline of 2 focused study hours per weekday.
- **AI Output:** AI suggested priority scaling coefficients: Low (1.1×), Medium (1.3×), and High (1.6×) applied against base estimated hours.
- **My Implementation:** I took these baseline coefficients, integrated them into our client-side date calculation pipeline, and built the clamp and buffer date normalization functions around them.
- **Commit Link:** [Commit 7d4a86d](https://github.com/qwertyuipaas/deadline-buffer/commit/7d4a86dc6bd94278a39c0bf9de6310ca6469c400)

### 2. RFC 5545 iCalendar Specification Syntax (`src/lib/exportUtils.js`)
- **What I prompted for:** Rather than installing a heavy external npm package (like `ical-generator` or `node-ical`) for a simple browser export, I asked AI for the raw RFC 5545 `.ics` MIME structure and field conventions (`BEGIN:VCALENDAR`, `DTSTART`, `DTEND`, `SUMMARY`, `UID`, `DTSTAMP`).
- **AI Output:** AI provided the standard text template and MIME boundary format.
- **My Implementation:** I wrote the serialization logic in vanilla JavaScript, formatted start-by dates and hard deadlines into ISO calendar strings, and handled date escaping to generate client-side `Blob` downloads directly in the browser.
- **Commit Link:** [Commit 999c6cb](https://github.com/qwertyuipaas/deadline-buffer/commit/999c6cb525548f33bf27fff24e3f923302c87e08)

### 3. Tailwind CSS v4 `@theme` Configuration Tokens (`src/index.css`)
- **What I prompted for:** Tailwind CSS v4 transitioned away from `tailwind.config.js` to pure CSS `@theme` directives. I asked AI for the correct CSS-native variable syntax for defining custom palette tokens (`--color-buffer`, `--color-deadline`, `--color-paper`).
- **AI Output:** AI generated an example `@theme` block showing `@theme { --color-buffer: #0d9488; ... }`.
- **My Implementation:** I established our full cohesive color system (teal safety buffer `#0d9488`, coral deadline `#f43f5e`, graphite text, warm paper background `#f8fafc`), configured custom typography, and built responsive utility classes.
- **Commit Link:** [Commit 7d4a86d](https://github.com/qwertyuipaas/deadline-buffer/commit/7d4a86dc6bd94278a39c0bf9de6310ca6469c400)

### 4. Username Format Validation Regex (`src/lib/profileService.js`)
- **What I prompted for:** I needed an efficient regular expression to validate user handles during registration (alphanumeric, underscores, hyphens, length between 3 and 30 characters).
- **AI Output:** AI provided the regex pattern `/^[a-zA-Z0-9_-]{3,30}$/`.
- **My Implementation:** I wrapped this pattern into `validateUsernameFormat()`, paired it with a debounced async Supabase lookup (`checkUsernameAvailability`) to detect collisions in real time, and wired up inline validation UI messages on the signup form.
- **Commit Link:** [Commit 8c92c5a](https://github.com/qwertyuipaas/deadline-buffer/commit/8c92c5a93691422f3349ec6f27cdcb4ce45d1889)

### 5. Slide-In Task Drawer Transition Structure (`src/components/TaskDrawer.jsx`)
- **What I prompted for:** I asked AI for the standard accessible HTML structure and transition class combinations for a right-side slide-over drawer in Tailwind CSS.
- **AI Output:** AI suggested a layout with backdrop `fixed inset-0 bg-ink/20`, drawer container `fixed top-0 right-0 h-full w-full max-w-md`, and `translate-x` transition classes.
- **My Implementation:** I implemented accessibility attributes (`aria-modal="true"`, `role="dialog"`), added the keyboard <kbd>Escape</kbd> listener, body scroll lock (`overflow: hidden`), and auto-focus management when the panel slides open.
- **Commit Link:** [Commit 167b178](https://github.com/qwertyuipaas/deadline-buffer/commit/167b178c55dff9da6c499d2489e5613c59a5067c)

### 6. Automated Supabase Keep-Alive GitHub Action (`.github/workflows/keep-supabase-alive.yml`)
- **What I prompted for:** Supabase free tier projects pause after 7 days of inactivity. I asked AI how to configure a recurring GitHub Actions cron workflow to send an authorized REST ping to prevent project hibernation.
- **AI Output:** AI generated a basic GitHub Actions workflow YAML running `curl` on a cron schedule (`0 0 */3 * *`).
- **My Implementation:** I secured the credentials using GitHub repository secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`), targeted a lightweight health check endpoint against the `projects` table, and added automated step summary logging.
- **Commit Link:** [Commit 694aa08](https://github.com/qwertyuipaas/deadline-buffer/commit/694aa089d425e1015f2fb4d60b44b1dd1efc7394)

---

## Section 2: Where the AI Got It Wrong (25 Points)

Blindly accepting AI-generated code introduces critical bugs. Catching and resolving these failures is what distinguishes real engineering from passive copy-pasting. Below are three significant failures introduced by AI suggestions and how I diagnosed and resolved them.

### Case 1: CSS Transform Stacking Context Displaces Fixed DatePicker Popover
- **The AI Error:**  
  When building our custom calendar date picker inside the slide-in `TaskDrawer`, AI generated a popover component using `position: fixed` and computed coordinates via `getBoundingClientRect()`. However, the AI failed to recognize that because the parent `TaskDrawer` uses CSS `transform: translate-x-0` for its slide animation, **the W3C CSS Transforms specification mandates that transformed ancestors create a brand-new local containing block for `position: fixed` descendants**.  
  As a result, the viewport `left` coordinate (e.g., `1480px`) was interpreted relative to the `448px` drawer, throwing the calendar popover **over 1,000 pixels off-screen to the right** where it was completely invisible.
- **How I Caught & Fixed It:**  
  During live testing, clicking "Pick a deadline" in the task drawer failed to render any calendar. After inspecting the DOM with Chrome DevTools, I found the popover element rendered at $X = 2960\text{px}$. I diagnosed the CSS Transform containing block conflict and resolved it by refactoring `DatePicker.jsx` to use **React Portals (`createPortal(popover, document.body)`)**. This safely mounts the popover directly onto `document.body` outside the transformed hierarchy, ensuring pixel-perfect alignment and preventing clipping from `overflow-y-auto`.
- **Commit Link:** [Commit 00a0fd3](https://github.com/qwertyuipaas/deadline-buffer/commit/00a0fd3f08d12556fc3336383411eed1bc402be3)

### Case 2: Missing `useEffect` Import Crashes Mobile Authentication
- **The AI Error:**  
  During an automated refactor of `src/pages/Login.jsx`, AI cleaned up hook declarations but accidentally stripped out the `useEffect` import from React while leaving an uninitialized `loading` state reference in the component body. In desktop development, browser Hot Module Reloading (HMR) masked the issue by serving cached bundle chunks.
- **How I Caught & Fixed It:**  
  When testing the application on a physical mobile device over local Wi-Fi, the login screen threw an immediate unhandled fatal error: `ReferenceError: useEffect is not defined`, rendering a blank white screen. I connected Chrome Remote Debugging over USB, read the stack trace from the mobile WebView, restored `useEffect` in the React imports, and properly initialized the auth loading state.
- **Commit Link:** [Commit 80f2305](https://github.com/qwertyuipaas/deadline-buffer/commit/80f2305053c90395edb9f4293e65a9239f73bfb6)

### Case 3: Infinite Recursion Loop in PostgreSQL Row Level Security (RLS)
- **The AI Error:**  
  When creating Row Level Security policies for collaborative group projects in Supabase, I asked AI for a policy allowing team members to view all members of a project they belong to. The AI generated a policy with an `EXISTS` subquery querying `project_members` directly inside the `SELECT` policy on `project_members` without table alias scoping:
  ```sql
  -- Flawed AI suggestion:
  CREATE POLICY "Members view teammates" ON project_members
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );
  ```
  PostgreSQL immediately crashed with:  
  `ERROR: 42P17: infinite recursion detected in policy for relation "project_members"`.
- **How I Caught & Fixed It:**  
  Executing project queries in Supabase Studio resulted in HTTP 500 errors. I researched PostgreSQL RLS evaluation semantics, recognized the circular dependency, and rewrote the policies using strict ownership verification on the parent `projects` table (`owner_id = auth.uid()`) and scoped aliasing (`AS pm`) to break the recursive loop.
- **Commit Link:** [Commit 6b8111d](https://github.com/qwertyuipaas/deadline-buffer/commit/6b8111dca645a14ff2fd48139bf9f1f13e6d2dc3)

---

## Section 3: Who Wrote What (30 Points)

The following core modules were authored and engineered **by Glen P**, representing well over 20% of the entire full-stack application (comfortably exceeding the 80% maximum vibe code threshold).

### 1. The Core Buffer Engine & Start-By Date Algorithm (`src/lib/dateCalc.js`)
- **Author:** Glen P (~85% Human-Authored)
- **Explanation:**  
  This is the computational core of DeadlineBuffer. Rather than treating calendar days as 24-hour blocks, I modeled the engine around a realistic daily student capacity ($2.0\text{ hours/day}$). The core function `calculateStartByDate(deadline, hours, priority)` applies priority weighting, computes the required preparation days, and subtracts them from the hard deadline to yield the safe "start-by date".  
  I also created the `getBufferHealth()` algorithm, which evaluates projects on a 0–100% scale based on the ratio of buffer days remaining to total project duration, applying an exponential penalty if tasks become overdue.
- **Commit Link:** [Commit 7d4a86d](https://github.com/qwertyuipaas/deadline-buffer/commit/7d4a86dc6bd94278a39c0bf9de6310ca6469c400)

### 2. PostgreSQL Relational Schema & Tenant Isolation (`supabase/schema.sql`)
- **Author:** Glen P (~80% Human-Authored)
- **Explanation:**  
  I designed the complete relational architecture spanning `profiles`, `projects`, `tasks`, and `project_members`. Foreign keys enforce `ON DELETE CASCADE` so deleting a project cleanly cleans up associated tasks and member records.  
  Crucially, I wrote the Row Level Security (RLS) policies enforcing multi-tenant isolation directly on the database engine. Every query verifies `auth.uid() = user_id`, guaranteeing that even in multi-user deployments, students cannot access or manipulate another student's projects or deadlines.
- **Commit Link:** [Commit 6b8111d](https://github.com/qwertyuipaas/deadline-buffer/commit/6b8111dca645a14ff2fd48139bf9f1f13e6d2dc3)

### 3. Teammate Workload Balancer & Member Suggestion Engine (`src/pages/ProjectView.jsx`, `src/components/MemberWorkloadBar.jsx`)
- **Author:** Glen P (~90% Human-Authored)
- **Explanation:**  
  To solve unfair group project splits, I authored the workload balancing engine. When viewing a group project, the system aggregates all active (non-completed) task hours per member, compares it against their declared weekly availability (`hours_per_week`), and renders color-coded capacity indicators.  
  When adding a new task, the system automatically sorts teammates by available bandwidth and pre-selects the member with the lightest workload, preventing teammate burnout.
- **Commit Link:** [Commit 6b8111d](https://github.com/qwertyuipaas/deadline-buffer/commit/6b8111dca645a14ff2fd48139bf9f1f13e6d2dc3)

### 4. React Portal DatePicker Architecture (`src/components/DatePicker.jsx`)
- **Author:** Glen P (~80% Human-Authored)
- **Explanation:**  
  Rather than relying on generic date pickers or buggy popovers, I engineered the custom calendar component. It includes month/year navigation, dynamic 35-to-42 cell calendar grid generation, day selection constraints (`min` date validation), and keyboard shortcuts.  
  To solve CSS transform clipping issues inside slide-over drawers, I implemented `createPortal(..., document.body)` with dynamic scroll/resize viewport tracking and dual-ref click-outside detection.
- **Commit Link:** [Commit 00a0fd3](https://github.com/qwertyuipaas/deadline-buffer/commit/00a0fd3f08d12556fc3336383411eed1bc402be3)

### 5. Optimistic UI State Synchronization & Task Management (`src/pages/ProjectView.jsx`, `src/hooks/useTaskForm.js`)
- **Author:** Glen P (~85% Human-Authored)
- **Explanation:**  
  To provide an instantaneous, zero-latency user experience, I architected the state updates for task creation, editing, and status toggles. When a user marks a task done or adjusts estimated hours, the UI optimistically recomputes the project progress bar, workload distribution, and buffer health immediately in React state while dispatching Supabase mutations in the background. If a network error occurs, the state rolls back gracefully.
- **Commit Link:** [Commit 999c6cb](https://github.com/qwertyuipaas/deadline-buffer/commit/999c6cb525548f33bf27fff24e3f923302c87e08)

---

## Section 4: Summary Table of Code Authorship

| Module / File | Estimated Human Code | Estimated AI Assistance | Primary Human Contribution |
|---|:---:|:---:|---|
| `src/lib/dateCalc.js` | **85%** | **15%** | Workload capacity math, buffer scoring, date normalization |
| `supabase/schema.sql` | **80%** | **20%** | Relational schema, foreign keys, non-recursive RLS policies |
| `src/pages/ProjectView.jsx` | **85%** | **15%** | Workload balancing, optimistic updates, task triage |
| `src/components/DatePicker.jsx` | **80%** | **20%** | React Portal integration, calendar grid math, outside clicks |
| `src/components/TaskDrawer.jsx` | **80%** | **20%** | Focus management, accessibility, keyboard navigation |
| `src/lib/exportUtils.js` | **85%** | **15%** | Vanilla JS `.ics` serializer, date offset correction |
| **Full Application Average** | **~75% Human** | **~25% AI** | **Comfortably meets the ≥20% human code requirement** |

---

## Verification & Academic Integrity Confirmation

All code in this repository was tested locally, verified across physical mobile and desktop devices, and committed incrementally throughout the semester. AI was used as a productivity amplifier, not a surrogate author.

**Signed:** Glen P  
**Date:** October 4, 2026
