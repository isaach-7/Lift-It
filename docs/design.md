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

## Architecture

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

Exercise media uses stable aspect-ratio containers, responsive sizing, lazy loading below the fold, and useful alternative text. Timers and numeric columns use stable widths and tabular numbers where appropriate. Motion is subtle, primarily uses transform and opacity, and respects reduced-motion preferences.

## Scope boundaries

The calorie tracker, barcode scanning, social features, React Native application, advertising, and AI assistant are not part of workout-tracker v1. Analytics and other optional third-party tools will be considered only after the core workflow is reliable.

## Verification approach

Pure business rules receive unit tests, including rep-range boundary cases and warmup exclusions. Components receive interaction and state tests for important behavior. Integration tests will cover Supabase boundaries with controlled test data. The completed core journey will receive browser-level tests before release. Performance work follows measurement with browser tools and is recorded in `docs/performance.md` once meaningful screens exist.
