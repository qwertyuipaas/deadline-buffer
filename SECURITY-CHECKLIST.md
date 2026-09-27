# Security Checklist

**Project:** Deadline Buffer + Group Work Splitter  
**Student:** Glen P  
**Deliverable:** Finals Week 2: Documentation Update (`SECURITY-CHECKLIST.md`)  
**Date Completed:** September 27, 2026  

Every item below has been audited and answered with honest, specific evidence in my own words before public repository submission.

---

| # | Security Item / Question | Status (Yes / No / N/A) | Evidence (in my own words) |
|:--:|---|:---:|---|
| **1** | Are all sensitive API keys, secrets, and credentials excluded from version control? | **Yes** | `.env` contains local secrets and is excluded via `.gitignore`; only template placeholders are committed in `.env.example`. |
| **2** | Is the database master password or Supabase Service Role (admin) key kept off the client? | **Yes** | The frontend only uses the public client anon key (`VITE_SUPABASE_ANON_KEY`); the service role secret key is never used in client code. |
| **3** | Is `.env` properly listed in `.gitignore`? | **Yes** | Line 27 of `.gitignore` explicitly lists `.env`, and `git status` verifies the local `.env` file is untracked. |
| **4** | Are user passwords hashed and never stored or transmitted in plain text? | **Yes** | Handled securely by Supabase Auth using salted cryptographic hashing (bcrypt); the frontend never writes raw passwords to database tables. |
| **5** | Is minimum password strength/length enforced during registration? | **Yes** | `SignUp.jsx` enforces a 6-character minimum with client-side strength scoring, and Supabase rejects passwords under 6 characters on the backend. |
| **6** | Is Row Level Security (RLS) enabled on all public PostgreSQL database tables? | **Yes** | `schema.sql` explicitly runs `alter table enable row level security;` on `profiles`, `projects`, `project_members`, and `tasks`. |
| **7** | Are project owners prevented from having their projects read or modified by unauthorized users? | **Yes** | RLS policy `Owners manage their projects` strictly enforces `auth.uid() = owner_id` for all CRUD actions. |
| **8** | Are team member permissions scoped defensively in group projects? | **Yes** | Collaborative RLS policy `Members update assigned task status` permits teammates to change task `status` without letting them overwrite deadlines or hours. |
| **9** | Is the application protected against SQL Injection? | **Yes** | All database interactions use the official `@supabase/supabase-js` query builder with parameterized inputs; no raw SQL string concatenation exists in application code. |
| **10** | Is the application protected against Cross-Site Scripting (XSS)? | **Yes** | React's JSX engine auto-escapes all rendered text strings; `dangerouslySetInnerHTML` is never used anywhere in the codebase. |
| **11** | Is user input validated on both client and database levels? | **Yes** | `profileService.js` validates usernames with regex (`/^[a-zA-Z0-9_-]+$/`), and Postgres enforces constraints (`check (priority in ('low', 'medium', 'high'))`). |
| **12** | Are authentication session tokens (JWTs) managed securely? | **Yes** | Supabase Auth handles JWT storage and automatic token refresh under the hood without manual cookie exposure. |
| **13** | Is encrypted HTTPS / TLS enforced in production? | **Yes** | Netlify hosting enforces HTTPS with auto-renewed Let's Encrypt certificates, and Supabase endpoints communicate over TLS 1.3. |
| **14** | Are payment card details or PCI-regulated financial data stored? | **N/A** | Deadline Buffer is 100% free for students; no payment processor, billing forms, or cardholder data exist in the app. |
| **15** | Are third-party dependencies free from high-severity known vulnerabilities? | **Yes** | Clean dependencies installed via `package.json` with zero critical vulnerability alerts reported. |

---

### Verification Summary

- **Audited by:** Glen P
- **Review Date:** September 27, 2026
- **Status:** All applicable security measures are active and verified in local code and remote PostgreSQL schema.
