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
