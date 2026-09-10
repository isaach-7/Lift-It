# LiftIt Design

## Purpose

LiftIt is a mobile-first workout tracker intended for real use during gym sessions. Its distinguishing v1 feature is simple, explainable weight progression based on a user-configured rep range. The workout tracker must be complete and polished before work starts on the calorie tracker or other deferred ideas.

## V1 user journey

1. A user registers or signs in.
2. The user creates a workout template and adds ordered exercises.
3. Each template exercise stores a rest timer, lower and upper rep targets, an increment amount, and an auto-increment preference.
4. Starting a workout creates a persistent session and snapshots the template exercise settings.
5. The user enters weight and reps locally, then marks a set complete.
6. A completed set is saved immediately. The row visibly distinguishes editing, saving, saved, and error states.
7. A non-warmup completed set produces the next weight recommendation. The recommendation increases above the upper target, decreases below the lower target, and is unchanged inside the inclusive range.
8. Completing the workout persists its completion time and makes its results available to progress views.
9. The progress view charts the maximum weight recorded for an exercise in each completed session.

## Account foundation milestone

The first milestone uses one email-link form for registration and sign-in. A
successful request asks the user to check their inbox; it does not mean they are
signed in. Resending is an explicit action. Email and errors remain visible after
a failed request. Passwords and social providers are deferred.

Routes are `/login`, `/auth/callback`, and the protected home page `/`. The
Supabase browser client uses the implicit flow with the default confirmation-link
email template. Supabase consumes the callback tokens and persists the session.
The app waits for initialization before displaying private content, handles
invalid or expired callbacks, and replaces the callback URL after completion.
Sign-out applies to the current browser session. A failed sign-out is visible
and does not pretend the user has signed out.

The first migration creates only `profiles(id, created_at)`. The ID references
`auth.users` with cascading deletion. A database trigger creates the profile;
authenticated clients have SELECT access to their own row through RLS and no
write access. The home page reads the email from the auth session and does not
make an unnecessary profile request. Workout tables follow in later milestones.

Local development uses `http://localhost:5173` and an exact allowed redirect of
`http://localhost:5173/auth/callback`. A hosted development Supabase project is
configured separately; public deployment and production email delivery remain
outside this milestone.

## Saved workout milestone

The private home page lists the user's saved workout templates, newest first.
This first template-builder slice supports creating and renaming templates only.
Exercise selection follows with a small built-in library, as selected by the user.
There is no Start workout button until live sessions exist.

A template has a UUID, owner ID, name, and creation time. Names are trimmed,
required, and limited to 120 characters. Duplicate names are allowed. The database
enforces ownership through SELECT, INSERT, and UPDATE RLS policies. Clients have
no DELETE privilege in this slice. An owner index supports listing templates.

The list has distinct loading, empty, loaded, and error states with a retry action.
Create and rename forms retain their text after a failed write and only display
success after Supabase confirms the stored row. Each create draft keeps one UUID
across retries; saving uses an upsert on that ID so retrying a response lost after
commit cannot create a duplicate. Inputs are disabled only while their form saves.
The list is updated from the returned row rather than an extra refetch. Account
changes remount the workout area so one user's data is never shown to another.

## Exercise library milestone

Each saved workout can open an inline exercise picker. The picker loads a curated
system library and the user's existing template selections alongside the workout
list, so it does not issue one request per workout. Users can search by exercise,
equipment, or muscle, filter by broad muscle group, read short performance steps,
and add or remove exercises. The selected list uses insertion order. Reordering
and per-exercise progression settings follow in a later template-builder slice.

The initial library covers chest, shoulders, triceps, biceps, legs, and back. Each
exercise has a broad group, a more specific primary target, secondary targets,
equipment type, local image path, instructions, and an added-weight capability
for applicable bodyweight movements. Names use familiar gym terminology while
removing accidental duplicates and making grip or machine variants explicit.

System exercise definitions are readable but not writable by authenticated
clients. Template selections contain the owner ID and reference the workout and
exercise. Composite database constraints prevent a selection from claiming a
different workout owner and prevent duplicate exercises in one workout. Row Level
Security permits users to read, add, and remove only their own selections.

Adding and removing is confirmed by Supabase before the interface changes. If a
write response fails, the app reloads selections once to determine whether the
write reached the database. Entered search and filter choices remain available,
and an unresolved failure is shown without pretending the selection changed.

Exercise images are copied into the application from the public-domain Free
Exercise DB rather than requested from a third-party host at runtime. Cards use a
fixed aspect ratio, lazy loading, explicit dimensions, useful alternative text,
and a text fallback if an image cannot be displayed.

## Application structure

The frontend is a React single-page application written in TypeScript and built by Vite. Vercel serves the static build and rewrites application routes to `index.html`. React owns application state and interaction. CSS owns responsive layout.

Supabase provides Postgres, authentication, storage, and Edge Functions. The browser uses the public Supabase URL and publishable or anonymous key. Secrets and privileged service-role keys must never be exposed through Vite environment variables. Row Level Security is required before user-owned tables are used by a deployed client.

Core business rules live outside visual components in small TypeScript modules. Trusted multi-record operations or operations requiring secrets may move to Supabase Edge Functions when their need is demonstrated. Optional integrations must not block workout logging.

## Data model

The initial database model contains:

- `profiles`: user profile details such as height and optional date of birth.
- `weight_logs`: body-weight history for a user.
- `exercises`: system and user-created exercise definitions, instructions, equipment type, and image reference.
- `workout_templates`: named user-owned workout templates.
- `workout_template_exercises`: ordered exercises plus rest and progression settings.
- `workout_sessions`: in-progress, completed, or abandoned workout instances.
- `session_exercises`: ordered session exercises with snapshotted settings.
- `sets`: numbered warmup, standard, or failure sets with weight, reps, and completion time.
- `exercise_progression`: the current next-weight value for each user and exercise.

Exact SQL types, constraints, indexes, and Row Level Security policies will be specified before the first migration. User-owned tables must be isolated by the authenticated user ID. Template changes must never alter an already-started session.

## Frontend behavior

Data-driven screens explicitly support loading, loaded, empty, and error states. Skeletons reserve roughly the same dimensions as final content. Authentication has an intentional checking state so signed-in users do not see the login page flash.

Workout inputs update local state immediately and do not write on every keystroke. Completing a set begins persistence without freezing unrelated controls. Failed writes retain the entered value where practical and offer a retry path. A future offline synchronization system is outside v1.

Completed set controls are reversible while a workout remains active. Reopening a
set clears its performed values transactionally in Supabase, restores those values
to the local editable draft, and recomputes the equipment-specific progression
from the latest remaining completed set. A failed or unconfirmed undo keeps the
row visibly completed instead of implying that the database changed.

Exercise media uses stable aspect-ratio containers, responsive sizing, lazy loading below the fold, and useful alternative text. Timers and numeric columns use stable widths and tabular numbers where appropriate. Motion is subtle, primarily uses transform and opacity, and respects reduced-motion preferences.

## Workout experience redesign

Live set rows use direct weight and rep entry rather than numeric pickers. Input
state remains text while a user edits so empty values and decimal intermediates
such as `82.` are valid editing states. Reps are validated separately as whole
numbers when a set is completed. Weight is validated as a non-negative decimal
at the same intentional save point. Completing a set is the only action that
persists its performance values.

Workout weight is stored canonically in kilograms. Profiles store a preferred
display unit of `kg` or `lb`; the logger, routine editor, progress summaries and
body-weight history convert only at their display and input boundaries. Unit
changes never rewrite stored set or history values. One shared conversion module
owns the conversion constant, parsing and display rounding.

Planned, entered and completed set states remain distinct. Finishing with every
set complete needs no warning. Finishing with incomplete rows opens an accessible
confirmation dialog that reports the remaining count. Confirming completes the
session even when no set was performed; incomplete rows retain null performance
values and are excluded from exercise progress calculations. An unresolved set
save still blocks completion because persistence has not been confirmed.

The active workout is a compact training log: weight precedes reps for fast
keyboard entry, Enter on reps completes the row, completion is a large touch
target, and a newly added set copies the preceding row's useful values locally.
The session elapsed clock is isolated from the exercise list so its one-second
updates do not rerender the logger.

Authentication uses a responsive split composition with one strength-training
image on desktop and a compact branded treatment on small screens. The active
workout remains image-free. LiftIt uses a small progression mark beside the
wordmark in navigation, authentication and the favicon.

## Scope boundaries

The calorie tracker, barcode scanning, social features, React Native application, advertising, and AI assistant are not part of workout-tracker v1. Analytics and other optional third-party tools will be considered only after the core workflow is reliable.

## Search, security and delivery

LiftIt v1 is an authenticated application without a public content or marketing
page. All routes therefore send `noindex, nofollow`, and `robots.txt` blocks
crawling until a useful public landing page and production canonical origin
exist. Page titles and descriptions still follow the active route for clear
browser history and future public-page reuse. A sitemap, canonical URLs,
structured data, Search Console and analytics are release work for public pages;
the app does not publish guessed URLs or load optional tracking scripts early.

Vercel sends a restrictive Content Security Policy and standard browser security
headers. The policy permits same-origin assets and only Supabase HTTPS and WebSocket
connections. Hashed build assets receive immutable caching. Authentication media
uses explicit dimensions and a compressed WebP source.

Forms validate bounded, typed values in the browser before submission and retain
entries after recoverable errors. Supabase Auth validates account operations, and
Postgres constraints plus authenticated functions validate workout and profile
writes at the trusted boundary. React renders user strings as text; rich HTML is
not accepted or injected, so a client HTML-sanitizer dependency is unnecessary.
There is no custom cross-origin API route in v1; database access uses the Supabase
client, Row Level Security and narrowly granted functions.

## Public alpha delivery

The first hosted release is a link-accessible public alpha on Vercel. It uses the
generated HTTPS production address, remains intentionally excluded from search,
and is initially supported only for the project owner's existing account. A
custom domain and external-user email delivery do not block this alpha.

The existing hosted Supabase project becomes the alpha production database so
the owner's account and workout history remain intact. Before deployment, all
seven repository migrations and all hosted rollback-only SQL suites must be
verified. The browser receives only the Supabase project URL and publishable key;
local environment files and privileged keys remain outside version control.

Vercel preview and production deployments use the same validated source revision.
Supabase keeps exact localhost, preview and production callback and password-reset
paths. The default Supabase email sender is acceptable only for the authorized
owner account. A custom SMTP sender, custom domain, separate development Supabase
project and external-user support are gates for the later private beta.

## Verification approach

Pure business rules receive unit tests, including rep-range boundary cases and warmup exclusions. Components receive interaction and state tests for important behavior. Integration tests will cover Supabase boundaries with controlled test data. The completed core journey will receive browser-level tests before release. Performance work follows measurement with browser tools and is recorded in `docs/performance.md` once meaningful screens exist.

## Password and complete workout milestone (supersedes earlier account slices)

Email/password registration and sign-in replace ordinary magic links. Email
verification remains required; recovery links establish passwords for existing
accounts without changing IDs. Recovery routes take priority over home redirects.
Supabase owns password hashing; application code never persists passwords.

Onboarding requires a preferred name and a weekly goal of 1-7 days. Height in cm
and body weight in kg are optional. Profile and initial weight history save in
one retry-safe transaction. Profiles remain owner-only. Existing accounts complete
onboarding without losing templates. Profile includes measurements and theme choice.

The interface supports System, Light and Dark themes with flat surfaces, restrained
green accents, readable typography and stable mobile-first layouts. Home shows a
personal greeting, weekly encouragement, Start/Resume, Create workout, recent
sessions and a 12-week per-exercise chart. Attendance counts distinct completed
local dates Monday-Sunday. Charts separate equipment configurations and use max
weight per completed session, or reps for unweighted bodyweight exercises.

Templates now contain ordered exercises and planned sets with optional targets.
New exercises begin with one blank standard set, a 90-second rest, 6-10 rep range
and progression disabled. Users configure increments or available weights and a
machine label. Save is atomic. Existing templates without sets remain drafts.

Starting snapshots the template, settings and sets atomically; at most one active
session exists per account. Each logged set and its progression update commit
atomically. Retry IDs prevent duplicate writes. Inputs stay responsive; failures
remain visible and preserve local user/session-scoped recovery drafts. Completion
requires a saved set and no unresolved writes. Abandoned sessions are excluded.
Timers use timestamps. Full offline synchronization remains deferred.

Progression changes strictly outside inclusive rep bounds, excludes warmups and
includes failure sets. Lists use adjacent available weights; increments clamp at
zero. Equipment configurations partition recommendations. Explicit overrides take
priority, then progression, template targets and blank input. A next-set-only
override does not replace the persistent recommendation; use-going-forward does.

Machine presets follow the core flow. Manufacturer/model/stack variants require
verified specifications and user confirmation. Custom values always remain usable.
Six generic, original rotatable previews cover chest/shoulder press, lat pulldown,
row, leg extension and seated leg curl. Previews load only on request and fall back
to static imagery. They do not control or block workout persistence.

Bodyweight exercises default to reps-only tracking. An explicit added-weight
setting is copied into the session and equipment comparison key, keeping weighted
and unweighted records separate even for the same exercise and equipment.
