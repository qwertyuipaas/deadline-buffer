# AI Usage & Attribution Log

**Student:** Glen P  
**Project:** Deadline Buffer + Group Work Splitter  
**Course Deliverable:** Finals Badge / Documentation Update  
**Date:** September 2026  

---

## 1. Summary of AI Usage & Percentage Breakdown

For this project, my overall **AI usage is approximately 25%**, with **~75% human-authored work**. This easily meets the requirement that AI usage must stay below the 70% limit.

I wrote the core React application, designed the UI and user flows, wrote the database queries, and debugged all issues myself. I used AI (Claude and ChatGPT) mainly as a fast search tool, a syntax reference, and a second opinion when brainstorming math or troubleshooting error messages. I never used AI to generate whole pages or unreviewed blocks of code.

### Estimated Effort & AI Breakdown

| Project Area | Human Effort | AI Assistance | What I Did vs What AI Helped With |
|---|:---:|:---:|---|
| **Architecture & App Flow** | **85%** | **15%** | I planned all pages, routes, data flow, component hierarchy, and database schemas. AI helped review my proposed table schemas. |
| **Frontend Components & UI** | **75%** | **25%** | I built all React pages, drawers, modals, forms, and custom styles. AI gave examples for Tailwind CSS v4 `@theme` syntax and small styling snippets. |
| **Buffer Algorithm & Date Math** | **70%** | **30%** | I designed the buffer logic, buffer health scoring, and overdue penalties. AI helped brainstorm initial multiplier values (1.1x, 1.3x, 1.6x) for priority levels. |
| **PostgreSQL & Row Level Security** | **70%** | **30%** | I set up Supabase tables, foreign keys, and access rules. AI suggested initial RLS query ideas, but I had to fix recursion bugs when the AI policies broke. |
| **Utilities & Export Tools** | **70%** | **30%** | I wrote the export logic and formatting. AI provided standard iCalendar (RFC 5545) header tags and syntax for `.ics` generation. |
| **Documentation & Journals** | **85%** | **15%** | I wrote all reflections, weekly reports, and security checklist answers in my own words based on what I actually built and tested. |
| **TOTAL ESTIMATED** | **~75% Human** | **~25% AI** | **AI usage is well below the 70% maximum threshold.** |

---

## 2. Where and How I Used AI

### A. Brainstorming the Buffer Formula (`src/lib/dateCalc.js`)
- **What I needed:** A simple, reliable way to calculate a "Start-By Date" so students don't wait until the last minute.
- **AI help:** I asked ChatGPT what kind of multipliers make sense for student workloads. It suggested scaling study hours based on priority (low: 1.1x, medium: 1.3x, high: 1.6x) with a baseline of 2 study hours per day.
- **My work:** I took those base multipliers and wrote the actual functions in JavaScript. I also wrote `getBufferHealth` to calculate a 0-100% health score and added overdue penalties when students fall behind schedule.

### B. iCalendar Syntax for Calendar Export (`src/lib/exportUtils.js`)
- **What I needed:** A button that lets students download an `.ics` file to import their assignments and start dates into Google Calendar or Apple Calendar without installing huge npm libraries.
- **AI help:** AI gave me the standard RFC 5545 template (`BEGIN:VCALENDAR`, `BEGIN:VEVENT`, `DTSTART`, `DTEND`, `UID`, `DTSTAMP`).
- **My work:** I wrote the export function in vanilla JavaScript, formatted the dates, and fixed an issue where Google Calendar made all-day events finish a day early by adding +1 day to the end date.

### C. Tailwind CSS v4 Syntax (`src/index.css`)
- **What I needed:** Defining my project color tokens in the newer Tailwind CSS v4 setup.
- **AI help:** I looked up how `@theme` replaces the old `tailwind.config.js` file in v4. AI gave me a quick syntax snippet for defining custom colors inside CSS.
- **My work:** I picked the color palette (teal, coral, slate), set up the font families, wrote custom utilities for the buffer bar, and applied styles across all components.

### D. Username Validation (`src/lib/profileService.js`)
- **What I needed:** A regex rule to make sure usernames only contain allowed characters (letters, numbers, underscores, hyphens) and are between 3 and 30 characters long.
- **AI help:** AI provided the regex pattern `/^[a-zA-Z0-9_-]+$/`.
- **My work:** I wrote the async validation function that checks both the regex format and queries Supabase to verify the username isn't already taken by someone else.

---

## 3. Errors AI Made and How I Fixed Them

Working with AI showed me that blindly accepting generated code causes bugs. Here are four specific bugs caused by AI suggestions that I had to catch and fix myself:

1. **Missing `useEffect` import crashed mobile login:**
   - *The bug:* An AI code refactor for `Login.jsx` accidentally deleted the `useEffect` import from React and left an undeclared `loading` variable. My desktop browser had cached the previous bundle, so it seemed to work, but loading the app on my phone showed a blank white screen with `ReferenceError: useEffect is not defined`.
   - *How I fixed it:* I connected Chrome remote debugging to my phone, saw the error in the console, restored the React hook import, and properly declared the loading state.

2. **Timezone UTC bug shifted dates backward:**
   - *The bug:* AI repeatedly suggested using `new Date().toISOString().split('T')[0]` to format dates. However, `toISOString()` converts local time to UTC. Because I'm in a timezone ahead of UTC (UTC+8), opening the app in the evening caused dates to shift back by one whole day, making start-by dates show up as yesterday.
   - *How I fixed it:* I removed the AI's date helper and wrote a custom `toLocalIsoDate(date)` function that uses local `getFullYear()`, `getMonth() + 1`, and `getDate()`.

3. **Page jumping from typewriter hero component:**
   - *The bug:* AI created a typewriter animation component for the landing page header. As phrases of different lengths were typed and deleted, the text container kept changing height, making the whole page below jitter up and down on smaller screens.
   - *How I fixed it:* I set a minimum height (`min-h-[1.2em]`) on the container, changed it to block layout, and added a zero-width space (`\u200B`) so the baseline wouldn't collapse when the text was completely cleared.

4. **Infinite recursion loop in PostgreSQL RLS:**
   - *The bug:* When I asked AI how to write a Supabase Row Level Security policy so teammates could view other members in a project, it gave me a policy with an `EXISTS` subquery querying `project_members` inside a rule on `project_members`. Supabase crashed with `error: infinite recursion detected in policy for relation "project_members"`.
   - *How I fixed it:* I read the PostgreSQL RLS docs, used table aliasing (`as pm`) to break the circular dependency, and wrote clean, non-recursive policies.

---

## 4. My Verification Workflow

To keep my code clean and maintain academic honesty:
- **I read every line:** I never pasted code without reading and understanding what each line does.
- **Local DevTools testing:** After every change, I tested the feature in my browser with the console and network tabs open.
- **Real device checks:** I tested the site on both my computer and my actual phone to catch mobile layout and runtime bugs early.
- **Git commits:** All commits were made incrementally by me as features were completed and tested.

---

## 5. Statement of Authorship

I confirm that this project was designed, developed, and tested by me (Glen P). AI was used as a learning and productivity assistant (accounting for ~25% of total project effort), well below the 70% threshold. The final architecture, database structure, and application code reflect my own work and understanding.
