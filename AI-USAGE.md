# AI Usage & Attribution Log

**Student:** Glen P  
**Project:** Deadline Buffer + Group Work Splitter  
**Course Deliverable:** Finals Badge / Documentation Update  
**Date:** September 2026  

---

## 1. Overview of AI Usage

Throughout the development of **Deadline Buffer**, I utilized AI assistants (principally Claude and ChatGPT) as interactive pair programmers, technical sounding boards, and debugging tutors. AI was never used to generate uninspected bulk code; rather, it was integrated into an iterative workflow where I drafted requirements, evaluated suggested solutions, verified output line by line, and made final architectural decisions.

---

## 2. Specific Areas Where AI Assisted

### A. Core Algorithm Design & Math (`src/lib/dateCalc.js`)
- **Task:** Developing a deterministic formula that turns a hard deadline and estimated study hours into a realistic "Start-By" date.
- **AI Contribution:** Brainstormed multiplier scales for assignment priorities (low: $1.1\times$, medium: $1.3\times$, high: $1.6\times$) assuming an average baseline of 2 focused study hours per day.
- **My Refinement:** I created the compound buffer health formula (`getBufferHealth`) and implemented overdue penalties after testing edge cases where tasks had deadlines on the same day.

### B. Standardized Calendar Export (`src/lib/exportUtils.js`)
- **Task:** Generating iCalendar (`.ics`) files without heavy external third-party dependencies.
- **AI Contribution:** Provided the RFC 5545 specification structure for `VCALENDAR` and `VEVENT` blocks, including required header fields (`DTSTART`, `DTEND`, `UID`, `DTSTAMP`).
- **My Refinement:** Fixed an issue where all-day calendar events were cutting off a day early in Google Calendar due to exclusive end dates by adding `+1` day to the `DTEND` field using local date formatting.

### C. Styling & Design Tokens (`src/index.css`)
- **Task:** Setting up Tailwind CSS v4 `@theme` design tokens.
- **AI Contribution:** Provided syntax examples for migrating custom palette variables from older Tailwind v3 `tailwind.config.js` files to the newer Tailwind v4 `@theme` CSS block.

### D. Input Validation (`src/lib/profileService.js`)
- **Task:** Writing regex to validate usernames (3–30 characters, alphanumeric, underscores, hyphens).
- **AI Contribution:** Suggested regex pattern `/^[a-zA-Z0-9_-]+$/` and debounced input checking logic.

---

## 3. Where AI Made Mistakes & How I Solved Them

Working with AI exposed several real-world pitfalls where blindly trusting generated code broke the application:

1. **The Missing Hook Import Crash (Mobile Login):**
   - *What happened:* An AI refactor of `Login.jsx` silently removed the `useEffect` import from React and left a `loading` state variable undeclared. Desktop Chrome had cached previous scripts, but testing on a real mobile device threw an immediate `ReferenceError: useEffect is not defined`, crashing the entire page to a blank white screen.
   - *How I resolved it:* Connected mobile remote debugging tools, inspected the browser console, traced the error directly to the unimported hook, and restored proper React imports and state declarations.

2. **Timezone UTC Offset Bug:**
   - *What happened:* AI repeatedly suggested using `new Date().toISOString().split('T')[0]` for standardizing dates. However, `toISOString()` always converts local time to UTC. For timezones ahead of UTC (e.g. UTC+8), dates in the evening shifted back by one calendar day, causing start-by dates to calculate as yesterday.
   - *How I resolved it:* Discarded the AI's date handling and wrote a custom `toLocalIsoDate(date)` function that explicitly reads local `getFullYear()`, `getMonth() + 1`, and `getDate()`.

3. **Cumulative Layout Shift (CLS) on Hero Headline:**
   - *What happened:* AI generated a typewriter animation component that changed the inner text of a heading. Because different phrases had varying lengths and caused line breaks on narrower screens, the entire page below the hero jumped up and down repeatedly.
   - *How I resolved it:* Locked the container with a fixed minimum height (`min-h-[1.2em]`), enforced block layout, and inserted a zero-width space (`\u200B`) to prevent the baseline from collapsing when words deleted.

4. **Complex PostgreSQL Row Level Security (RLS) Recursion:**
   - *What happened:* When asked to generate an RLS policy allowing group members to read tasks, AI suggested an `EXISTS` subquery that joined `projects`, `project_members`, and `tasks` in a circle. This triggered recursive policy execution in Supabase and timed out requests.
   - *How I resolved it:* Stepped back to simpler owner-scoped policies while researching proper non-recursive security models in PostgreSQL documentation.

---

## 4. Human Verification Workflow

To uphold academic integrity and code quality, I followed this review protocol for every AI interaction:
1. **Never copy-paste unseen:** Every code snippet was typed or reviewed line by line before saving.
2. **Local browser & console verification:** Every change was immediately tested in local Chrome DevTools with console and network tabs open.
3. **Cross-device testing:** Verified UI components on desktop, tablet, and mobile viewports to ensure responsive integrity.
4. **Git commit ownership:** Every commit message documents what actually changed, why it changed, and what was learned.

---

## 5. Statement of Authorship

I confirm that the architecture, application flow, database schema, design decisions, and final code in this repository represent my own work and technical understanding. AI served as an educational assistant and productivity tool, analogous to consulting technical documentation, Stack Overflow, or a teaching assistant.
