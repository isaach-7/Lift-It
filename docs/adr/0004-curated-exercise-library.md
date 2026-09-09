# ADR 0004: Curated system exercise library

## Status

Accepted on 2026-09-09.

## Context

Workout templates need stable exercise identities, useful muscle targeting, and
images without making the workout path depend on a third-party API. Generic APIs
often omit specialist machines, use inconsistent names, or have unclear image
rights. Keeping every definition only in frontend code would also make database
relationships and future progress history fragile.

## Decision

Store the curated exercise definitions in the Supabase `exercises` table and seed
them through a versioned migration. System rows have a null creator and are
read-only to browser clients. Store workout selections in
`workout_template_exercises`, keyed by workout and exercise, with the authenticated
owner repeated and protected by a composite foreign key and Row Level Security.

Use LiftIt-authored names, target-muscle metadata, equipment labels, and concise
instructions. Copy the matching demonstration images from the Unlicense-licensed
Free Exercise DB into `public/exercise-images` so the application does not depend
on GitHub or another media service while a user is building or running a workout.

The frontend loads workouts, library entries, and existing selections in parallel.
It keeps add and remove operations pessimistic: a selection changes only after the
database confirms it. A failed response triggers one read-back reconciliation to
handle the case where the write succeeded but its response was lost.

## Consequences

- Exercise IDs and historical references remain stable across application builds.
- The core selector remains usable when optional external services are unavailable.
- Image files increase the deployment size, but the first catalogue is small and
  images load lazily in dimensionally stable containers.
- New system exercises or metadata corrections require a migration and matching
  local asset rather than an API update.
- A later custom-exercise feature can use `created_by` without changing the system
  row model.
