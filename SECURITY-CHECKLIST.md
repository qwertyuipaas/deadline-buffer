# Security Checklist

**Project:** Deadline Buffer + Group Work Splitter  
**Student:** Glen P  
**Deliverable:** Finals Week 2: Documentation Update (`SECURITY-CHECKLIST.md`)  
**Date Completed:** September 27, 2026  

Every item below has been audited and answered with honest evidence in my own words before making the repository public.

---

| # | Security Item / Question | Status (Yes / No / N/A) | Evidence (in my own words) |
|:--:|---|:---:|---|
| **1** | Are all sensitive API keys, secrets, and credentials excluded from version control? | **Yes** | I put `.env` in `.gitignore` and only commit placeholder keys in `.env.example`. |
| **2** | Is the database master password or Supabase Service Role (admin) key kept off the client? | **Yes** | The client app only uses the public `VITE_SUPABASE_ANON_KEY`. I never put the service-role admin key in frontend code. |
| **3** | Is `.env` properly listed in `.gitignore`? | **Yes** | `.gitignore` includes `.env`, so git status never tracks my actual local keys. |
| **4** | Are user passwords hashed and never stored or transmitted in plain text? | **Yes** | Supabase Auth handles user passwords and hashes them with bcrypt. I never store or touch plain passwords in my database. |
| **5** | Is minimum password strength/length enforced during registration? | **Yes** | `SignUp.jsx` checks password length before submit, and Supabase automatically rejects passwords under 6 characters. |
| **6** | Is Row Level Security (RLS) enabled on all public PostgreSQL database tables? | **Yes** | I ran `enable row level security` on `profiles`, `projects`, `project_members`, and `tasks` in `supabase/schema.sql`. |
| **7** | Are project owners prevented from having their projects read or modified by unauthorized users? | **Yes** | The `Owners manage their projects` RLS policy checks `auth.uid() = owner_id` so strangers cannot read or edit other people's projects. |
| **8** | Are team member permissions scoped defensively in group projects? | **Yes** | The policy `Members update assigned task status` only lets assigned members change the status column, preventing them from overwriting deadlines or hours. |
| **9** | Is the application protected against SQL Injection? | **Yes** | All queries use the official Supabase JS client with parameterization. I do not concatenate raw SQL strings anywhere. |
| **10** | Is the application protected against Cross-Site Scripting (XSS)? | **Yes** | React automatically escapes rendered strings in JSX, and I never use `dangerouslySetInnerHTML` anywhere in my code. |
| **11** | Is user input validated on both client and database levels? | **Yes** | I validate usernames in `profileService.js` using regex, and PostgreSQL enforces check constraints on priority and status. |
| **12** | Are authentication session tokens (JWTs) managed securely? | **Yes** | Supabase manages session JWTs and handles automatic token refreshing under the hood. |
| **13** | Is encrypted HTTPS / TLS enforced in production? | **Yes** | The deployed site enforces HTTPS, and all Supabase API calls use encrypted HTTPS. |
| **14** | Are payment card details or PCI-regulated financial data stored? | **N/A** | N/A — This is a free student project, so we don't process payments or handle any credit card data. |
| **15** | Are third-party dependencies free from high-severity known vulnerabilities? | **Yes** | I checked my `package.json` dependencies with `npm audit` and verified there are no critical vulnerabilities. |

---

### Verification Summary

- **Audited by:** Glen P
- **Review Date:** September 27, 2026
- **Status:** All applicable security measures are active and verified in local code and the Supabase PostgreSQL database.
