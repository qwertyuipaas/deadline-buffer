# Reflection Journal

## Week of: September 20, 2026

## My goal this week

My main goal this week was to make the task entry flow faster on the project view, build out the workload balancing logic for group projects so members don't get assigned more work than their weekly availability, and add practical export tools (calendar `.ics` and Discord/WhatsApp markdown summaries) so students don't feel locked into keeping our app open constantly. I also wanted to make sure my database stays active and my project documentation is fully updated for Finals Week 1.

## What I did

- Replaced the old static task form with a slide-in drawer (`TaskDrawer.jsx`) that opens up when you click add task or press the `N` key on your keyboard. Inside the drawer, I added a live preview box that recalculates the recommended start-by date on the fly as you change the deadline, hours, or priority.
- Built the workload balancing calculations in `groupUtils.js` (`getMemberWorkloadHours`, `getMemberStats`, `getSuggestedMemberOrder`). These sum up each teammate's incomplete task hours and compare them to their weekly availability (`hours_per_week`).
- Created `MemberWorkloadBar.jsx` to show a color-coded capacity meter for each member (teal when they have room, yellow when near their limit, and red with a warning icon when overloaded). I also updated the task assignment radio list to highlight whoever currently has the most free hours.
- Wrote `exportProjectToIcs` in `exportUtils.js` to create standard `.ics` files with calculated start-by dates and work blocks so students can import their schedule directly into Google Calendar or Apple Calendar.
- Wrote `formatProjectSummary` to turn the task list into an emoji-formatted markdown checklist that users can copy and paste into Discord or WhatsApp group chats.
- Set up a GitHub Actions workflow (`.github/workflows/keep-supabase-alive.yml`) that pings the Supabase database three times a week so the free-tier database doesn't get paused while grading is ongoing.
- Updated the `README.md` to cover all 7 sections from the documentation guide, wrote `AI-USAGE.md`, added `.env.example`, made SVG screenshots in `docs/screenshots/`, and filled out `REPORT.md`.

## What blocked me

- I ran into an annoying timezone bug when formatting dates. I was initially using `new Date().toISOString().split('T')[0]`, which converts to UTC. Because I'm in UTC+8, dates in the evening shifted backward by one day, making Monday deadlines look like Sunday. I wasted time trying millisecond math before realizing I just needed a clean `toLocalIsoDate()` helper that reads `getFullYear()`, `getMonth() + 1`, and `getDate()` from the local clock.
- The login page was working fine on my laptop but showing a completely blank screen when I tested on my phone. Because there was no error shown, I thought it was a CSS issue at first. Once I connected Chrome remote debugging to my phone, I saw `ReferenceError: useEffect is not defined`. I had forgotten to import `useEffect` in `Login.jsx`, and my laptop browser had just cached an older version.
- On the landing page, the typewriter effect in the hero was making the entire page below jump up and down every time it erased a word. I had to set a fixed minimum height (`min-h-[1.2em]`) and insert a zero-width space (`\u200B`) so the line height wouldn't collapse when the text cleared.
- I struggled with Supabase Row Level Security when trying to let teammates see tasks. My first attempt at an `EXISTS` subquery caused circular dependencies between `projects` and `project_members`, so I had to leave it scoped to project creators for now while I research how to write non-recursive policies.

## What I learned

- `toISOString()` is fine for backend timestamps, but you should never use it for day-level calendar dates in frontend forms because UTC conversion creates off-by-one errors depending on where the user is located.
- Testing on a real mobile device is critical. Desktop DevTools can simulate screen dimensions, but it won't catch browser-specific JavaScript crashes or caching discrepancies.
- Having a live preview in the UI makes a huge difference for user experience. When users see the start-by date move forward or backward in real time as they type in hours, they intuitively grasp how the buffer works without having to read instructions.
