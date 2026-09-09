# LiftIt Progress Log

## 2026-09-08

- Confirmed the repository is connected to Git and GitHub.
- Installed Node.js 24.20.0 through fnm with npm 11.19.0.
- Reviewed and adopted the project plan and browser-aware frontend guide as repository constraints.
- Documented the v1 journey, architecture, scope boundaries, data model direction, and verification approach before application code was created.
- Accepted React, TypeScript, Vite, Vercel, and Supabase as the initial stack in ADR 0001.
- Created the Vite, React, and TypeScript application foundation with routing, a lazy Supabase client boundary, mobile-first CSS, test tooling, formatting, linting, and GitHub Actions CI.
- Verified the starter with Oxlint, Prettier, Vitest, strict TypeScript compilation, and a Vite production build.

## 2026-09-08: Account foundation (issue #1)

- Chose email magic links for both registration and returning users, with small
  guided implementation steps and a functional mobile-first interface.
- Added an ADR and design details before building account behavior.
- Added a transactional profile migration with an auth-account trigger, existing
  account backfill, RLS for own-profile reads, and no browser write privileges.
- Implemented session checking, restoration, protected home, explicit email-link
  resend, callback failure recovery, local sign-out, and visible error states.
- Added 17 automated UI cases, including a stale-session-read race and StrictMode
  subscription cleanup. Fixed test cleanup so cases do not share rendered pages.
- Verified the migration and rollback SQL assertions in PGlite with a minimal
  Supabase auth schema: profile creation, backfill, two-user isolation, denied
  privileges, and cascade deletion passed. This is not hosted Supabase verification.
- Browser-checked the setup screen, mobile sign-in at 375px, preservation of email
  after a failed request, and an SDK-parsed synthetic expired-link callback.
- Kept the dev server on port 5173 with strict port selection so email redirects
  cannot silently use the wrong origin. Added a step-by-step account setup guide.
- Hosted Supabase setup, applying the migration there, and real delivered-email
  acceptance checks remain pending the user's project configuration.

## 2026-09-09: Hosted account setup

- Created the free personal LiftIt organization and dedicated Ireland-region
  project. The user set the database password and completed project creation.
- Connected the development app using the project URL and publishable key in
  ignored `.env.local`; no privileged key is needed or committed.
- Applied the initial profile migration successfully to hosted Supabase.
- Passed hosted transactional assertions for profile creation, two-user RLS
  isolation, denied anonymous/client-write privileges, and cascading cleanup.
  Synthetic users were rolled back after the checks.
- Set the site URL to `http://localhost:5173` and allowed exactly
  `http://localhost:5173/auth/callback`. Verified email authentication and new
  sign-ups are enabled, with email confirmation required.
- Verified the connected local app displays the sign-in form. Real email-link
  acceptance and session refresh checks are awaiting the user's first sign-in.
