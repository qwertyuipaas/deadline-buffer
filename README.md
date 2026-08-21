# Deadline Buffer + Group Work Splitter

A responsive web app that turns deadlines into realistic start-by dates, for solo
tasks and group projects alike.

## What's built so far
- Public landing page explaining the product, with a live example of the buffer bar
- Email/password auth (sign up, sign in, sign out)
- Dashboard listing your projects, each with a live progress bar (tasks done / total)
- Create a **solo** or **group** project
- Add tasks with deadline, estimated hours, and priority -> app calculates a
  recommended **start-by date**
- **Buffer bar** on every task: a to-scale visual of the buffer time left vs. the
  work window, so status is readable at a glance
- Project-level progress summary: % done, tasks overdue, tasks due within 7 days
- Filter tasks by status/member and sort by start-by date, deadline, priority, or name
- For group projects: add members with weekly available hours, assign tasks to them
- **Smart assignment suggestion**: the "assign to" dropdown highlights whichever
  member currently has the lightest workload
- Mark tasks not started / in progress / done, delete tasks
- Styled confirm dialogs and toast notifications in place of browser popups

## Tech stack
- React 18 + Vite
- Tailwind CSS v4
- React Router v6
- Supabase (Postgres database + auth)

---

## 1. Set up Supabase (first time)

1. Go to supabase.com and sign up (free tier is enough).
2. Click **New Project**. Pick any name/region, set a database password (save it
   somewhere), and wait ~1-2 minutes for it to finish provisioning.
3. In your new project, go to **SQL Editor** (left sidebar) -> **New query**.
4. Open `supabase/schema.sql` from this project, copy all of it, paste it into the
   SQL editor, and click **Run**. This creates the `projects`, `project_members`,
   and `tasks` tables, plus security rules so users can only see their own data.
5. Go to **Project Settings** (gear icon) -> **API**. You'll need two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

## 2. Connect the app to your Supabase project

1. In this project folder, copy `.env.example` to a new file named `.env`:
   ```
   cp .env.example .env
   ```
2. Open `.env` and paste in your Project URL and anon key from step 1.5 above:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Save the file. **Never commit `.env` to git** -- it's already in `.gitignore`.

## 3. Run the app locally

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Sign up with any email
and password to create your first account, then create a project.

> Note: by default, Supabase requires email confirmation before sign-in works.
> For development, you can turn this off in **Authentication -> Providers -> Email
> -> "Confirm email"** (toggle off) so you don't need to check your inbox every
> time you test with a new account.

## 4. Deploy (when ready)

Push this to GitHub, then connect the repo to **Vercel** or **Netlify** (same flow
you used for the church website). Add the same two environment variables
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the hosting platform's project
settings -- this is important, since `.env` never gets uploaded to GitHub.

---

## Project structure

```
src/
  lib/
    supabaseClient.js   - Supabase connection
    dateCalc.js         - start-by-date calculation logic (the "Deadline Buffer" engine)
  context/
    AuthContext.jsx     - tracks logged-in user across the app
    ToastContext.jsx    - toast notification system (replaces window.alert)
  components/
    ProtectedRoute.jsx  - redirects to /login if not signed in
    Modal.jsx           - base modal
    ConfirmDialog.jsx   - styled confirm dialog (replaces window.confirm)
    BufferBar.jsx        - the signature buffer/work-window visual, used on task cards
                          and the landing page
    Logo.jsx             - wordmark
    LoadingSkeleton.jsx
  pages/
    Landing.jsx          - public marketing page
    Login.jsx
    Dashboard.jsx        - project list with per-project progress
    NewProject.jsx
    ProjectView.jsx      - task list, filters/sort, add task, add member, assign tasks
supabase/
  schema.sql            - run this in Supabase's SQL Editor (unchanged from v1)
```

## Where to go next
- Let teammates log in with their own accounts and see tasks assigned to them
  (right now, only the project owner can view/edit -- good enough for a first
  working version, but worth revisiting for true multi-user group projects)
- Notifications/reminders when a start-by date is approaching
- Calendar/timeline view of all start-by dates across a project
