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

## 2026-09-09: Saved workout names (issue #4)

- The user confirmed the real email-link sign-in worked. Independent browser
  refresh verification remains pending access to that signed-in browser session.
- Recorded LiftIt-branded authentication emails for before public release in #3.
- Confirmed a small built-in exercise library will follow saved workout names.
- Replaced the private welcome placeholder with a saved workout list, create form,
  and rename forms. Added explicit loading, empty, error, retry, and saving states.
- Kept one UUID per create draft across retries and used a single-row upsert to
  avoid duplicate templates when a successful response is lost. Documented in ADR 0003.
- Applied the workout_templates migration to hosted Supabase with owner-based RLS,
  name constraints, owner/date indexing, and no client delete permission.
- Local and hosted SQL assertions passed for create, retry without duplication,
  rename, name validation, ownership-transfer denial, cross-user read/write/upsert
  isolation, and anonymous/client-delete privileges. Test data was rolled back.
- The full check passed with 25 UI tests plus lint, formatting, TypeScript, and
  production build. No new application dependencies were introduced.
- Full signed-in browser verification of the new template forms remains pending;
  available in-app sessions are signed out and Safari automation permission is absent.

## 2026-09-09: Curated exercise library

- Added 73 system exercises across chest, shoulders, triceps, biceps, legs, and
  back, including explicit selectorized, plate-loaded, grip, and weighted
  bodyweight variants where they affect logging.
- Added primary and secondary muscle targets, equipment labels, weighted-option
  metadata, and three concise performance steps for every exercise.
- Selected and copied 73 demonstration images from the public-domain Free
  Exercise DB. Images are served locally, lazy loaded in stable 3:2 containers,
  and have text fallbacks and useful alternative text.
- Added a mobile-first inline picker with search across names, muscles, and
  equipment; broad muscle filters; expandable instructions; and confirmed add
  and remove actions.
- Loaded workouts, the exercise library, and all template selections in parallel
  rather than issuing one selection request per workout.
- Added read-back reconciliation after uncertain add or remove responses so the
  interface reflects confirmed database state without duplicating exercises.
- Added the `exercises` and `workout_template_exercises` migration with stable
  IDs, ownership constraints, RLS, read-only system rows, insertion order, and
  future rest and progression setting columns. The migration is not yet applied
  to the hosted development project.
- Added SQL isolation assertions and UI/unit coverage for loading, filtering,
  instructions, weighted options, confirmed saves, and recoverable failures.
- Verified the picker visually at a true 375px viewport and at 1200px. Both had
  no horizontal page overflow; the desktop picker used three columns and browser
  logs contained no errors or warnings.

## 2026-09-09: Password and workout flow implementation started

- Accepted password authentication, optional measurements, distinct weekly gym days,
  both themes, complete sessions and follow-on equipment previews.
- Updated design before implementation; added ADRs 0005 and 0006.
- Preserved existing uncommitted exercise-library work on a new feature branch.
- GitHub CLI authentication failed; remote issue and PR operations are pending.

## 2026-09-09: Password and workout flow implemented (issue #6)

- Implemented password registration, verification resend, login and recovery.
  Recovery routing precedes profile redirects; existing account IDs remain intact.
- Added atomic onboarding and weight history, profile editing, and device-local
  System/Light/Dark themes with flat surfaces and compact responsive navigation.
- Added dedicated template routes, ordered exercises, planned sets and explicit
  optional targets. Drafts survive save errors and warn before navigation.
- Added transactional session snapshots, one active session per user, completed
  set persistence, idempotent retries, local recovery drafts, timestamp rest timers,
  finish/abandon, and equipment-specific trusted progression.
- Added distinct local gym days, exact goal encouragement, recent sessions and
  12-week exercise records with accessible tables. Reps-only and added-weight
  bodyweight modes have separate snapshot/comparison keys.
- Added custom equipment increments/lists, a user-confirmed Matrix main-plate
  preset, and a Life Fitness reference without inventing unverified stack labels.
  Six original generic models rotate through an accessible slider. The optional
  2.68 kB viewer loads on request and has a stable static fallback.
- Applied migrations 002 and 003 manually to the hosted development project.
  The first 003 attempt accidentally included the preceding library script;
  that transaction rolled back. The exact corrected 003 then succeeded.
- Hosted complete_workout_flow.sql passed with rolled-back synthetic accounts:
  onboarding retries, session/template snapshots, cross-user denial, progression
  at 5/6/10/11 reps, warmup/failure/override handling, bodyweight mode separation,
  and duplicate same-day attendance. No test account or health entry remains.
- Confirmed hosted Email signup and verification are enabled, minimum password
  length is 12, and exact localhost callback/update-password redirects are saved.
- Browser checks covered login/register, both themes, home, editor, saved sets,
  profile and optional preview at mobile/desktop widths using explicitly labelled
  synthetic fixtures for private pages. Preview loading and loaded states fit
  375px without page overflow or console errors. These are not real-auth tests.
- npm run check passes: 76 unit/component tests, four local SQL suites, lint,
  formatting, TypeScript and production build. PGlite is a dev-only dependency.
- Measured initial JS decreased from 551.79 kB to 514.64 kB (149.74 kB gzip) with
  route splitting. Vite still reports its 500 kB chunk warning; no Lighthouse or
  real-device performance score is claimed.
- GitHub access works after the earlier environment restriction; issue #6 tracks
  delivery. The implementation is integrated on codex/password-workout-flow,
  stacked on the existing saved-workout branch, rather than five independent
  milestones because routes and the transactional schema are shared.
- Release gates remain: real registration/verification/recovery with an allowed
  email, full real-auth journey, production domain and SMTP credentials, exact
  production redirects, and public release checks. Issue #3 covers branded email.
  No production deployment or PR merge has been performed.

## 2026-09-10: Workout experience redesign

- Documented canonical kilogram storage with a profile-level kg/lb display
  preference and shared conversion boundary.
- Reworked live logging around direct editable cells, separate rep and weight
  validation, keyboard completion, clear planned/entered/completed states and
  copied values for newly added sets.
- Replaced the browser confirmation for incomplete workouts with an accessible
  count-aware dialog and allowed intentionally completed zero-set sessions while
  keeping incomplete rows out of progress data.
- Refined routine construction, LiftIt branding, authentication, dashboard
  hierarchy and mobile controls while retaining the existing green palette.
- Added a purpose-built strength-training authentication image and kept imagery
  outside the active workout path.

## 2026-09-10: Reversible set completion

- Made the completed set control reversible while a workout is active.
- Kept immediate Supabase persistence instead of batching the full workout, so
  refreshes, locked phones and connection loss do not discard confirmed sets.
- Added a transaction that clears a reopened set and reconstructs its equipment
  progression from the latest remaining applicable set.
- Restored reopened reps and weight to the local recovery draft for correction,
  with an explicit retry state when the undo cannot be confirmed.

## 2026-09-10: SEO, form security and delivery audit

- Audited the application against the supplied SEO, JavaScript delivery and form
  security guides and recorded the private-app indexing decision in ADR 0009.
- Added route-specific titles and descriptions while blocking indexing until a
  useful public page and confirmed production origin exist.
- Added restrictive Vercel browser security headers, immutable hashed-asset
  caching and compressed the authentication image from 278 KB JPEG to 102 KB WebP.
- Added bounded email, new-password and profile validation before submission.
  Existing database constraints, authenticated functions and Row Level Security
  continue to revalidate trusted writes without adding a client sanitizer.
- Kept private routes lazy-loaded and split React and Supabase into stable vendor
  chunks. See `docs/performance.md` for measured production bundle sizes.
- Recorded the complete control and release checklist in
  `docs/web-quality-audit.md`.

## 2026-09-10: Public alpha preparation started (issue #8)

- Merged the completed password-account and workout flow through pull request #7
  after its full repository check and GitHub Actions verification passed.
- Closed the completed workout-flow issue and the superseded email-link account
  issue with references to the merged implementation.
- Selected a link-accessible, intentionally unindexed Vercel release as the first
  public alpha, initially supported only for the owner's authorized account.
- Kept the existing hosted Supabase project and its real account data as the alpha
  production database. A separate development project, custom domain and custom
  SMTP remain gates for inviting external beta users.
- Corrected the setup guide to include all seven migrations and the current 106
  frontend tests and five local SQL suites.
- Verified the hosted Supabase schema includes the seven repository migrations,
  including weight-unit preferences, partial workout completion and reopening a
  completed set.
- Ran all five hosted SQL suites inside rollback-only transactions. Each suite
  passed, and a follow-up check confirmed that no synthetic `example.invalid`
  accounts remained in the hosted project.

## 2026-09-14: Custom domain and email delivery

- Confirmed `lift-it.site` redirects permanently to the canonical
  `https://www.lift-it.site/` origin and both domains have valid Vercel
  configuration and managed TLS certificates.
- Changed the production Supabase Site URL to `https://www.lift-it.site` and
  added the exact production confirmation and recovery redirects without
  removing localhost, generated production, or active preview URLs.
- Confirmed custom Supabase SMTP is enabled with the verified Resend domain and
  the sender `Lift-It <no-reply@lift-it.site>`.
- Sent a real confirmation message to a new launch-check address. Resend recorded
  both Sent and Delivered events with the expected sender and subject.
- Enabled receiving for `lift-it.site`, published the required MX record in
  Vercel DNS, and confirmed Resend reports the domain ready to send and receive
  email. This makes `support@lift-it.site` a working receiving address in the
  Resend inbox for the initial beta support process.

## 2026-09-14: Public alpha preview checks

- Created fresh confirmed accounts through the production Supabase project and
  verified real confirmation delivery through Resend rather than a mocked auth
  session.
- Confirmed the Vercel branch preview accepts its allow-listed callback and that
  the production confirmation link returns to
  `https://www.lift-it.site/auth/callback` before routing to onboarding on the
  canonical origin.
- Saved a new profile with optional measurements omitted, created a workout,
  added Barbell Bench Press with one planned set, and saved the routine.
- Started the workout, persisted a completed set, reloaded the session URL, and
  confirmed the saved set and active session resumed without losing data.
- Finished the workout and confirmed the dashboard showed the completed weekly
  attendance, recent workout, and first exercise-progress record.
- Repeated the profile, routine, live-set, refresh/resume, completion, and
  dashboard-history journey on `https://www.lift-it.site` to smoke-test the
  custom domain against real production data.
- `npm run check` passed with 107 frontend tests, all five local SQL suites,
  lint, formatting, TypeScript, and the production build.

## 2026-09-14: Public alpha deployed

- Marked pull request #9 ready after the fresh preview checks and merged it to
  `main` at `1019dac`.
- Confirmed the post-merge GitHub Actions repository check and Vercel production
  deployment both completed successfully for the merge commit.
- Confirmed `/`, `/login`, `/auth/callback`, and `/update-password` each return
  HTTP 200 from `https://www.lift-it.site`, while the apex domain returns HTTP
  308 to the canonical `www` origin.
- Rechecked the production Content Security Policy, permissions, referrer,
  HSTS, content-type, frame, and alpha `noindex, nofollow` headers.
- Reloaded the authenticated custom-domain session after deployment and
  confirmed the saved profile, completed workout, weekly attendance, recent
  history, and exercise-progress state remained available without console
  warnings or errors.

## 2026-09-14: Searchable public beta defined (issue #11)

- Accepted ADR 0011 with `https://www.lift-it.site` as the canonical origin, a
  public landing page at `/` and the authenticated dashboard at `/app`.
- Kept registration open for a UK-first audience aged 16 or over and retained
  routines, live workout logging and progression as the complete beta scope.
- Required an unticked onboarding acknowledgement before storing workout or body
  information, with a public privacy notice and verified deletion requests sent
  to `support@lift-it.site`.
- Limited indexing to `/`, while keeping private, authentication, recovery,
  privacy and unknown routes `noindex` without blocking their crawl access.
- Assigned Vercel Production to the existing production Supabase project and
  Vercel Preview to the separate LiftIt Development project before further
  migrations are applied.
- Retained Supabase-managed encryption, TLS, RLS and scoped RPC functions. Deferred
  leaked-password detection to a paid plan and made an encrypted export or paid
  backup a durability gate.

## 2026-09-14: Preview database separated

- Created the independent Ireland-region `LiftIt Development` Supabase project
  before adding another migration.
- Scoped Vercel Production browser configuration to the existing production
  project and every Vercel Preview to `LiftIt Development`.
- Stored the browser-visible project URL and publishable key as Vercel Config
  values. No service-role key, database password or SMTP credential entered the
  repository or Vite environment.
- Kept local, generated production and active Preview auth redirects while the
  two hosted projects receive the same reviewed migration history.
