# ADR 0007: Canonical weight units and partial workout completion

## Status

Accepted

## Context

Users need to log in kilograms or pounds without mixing stored units or changing
historical values. They also need to end a real workout when planned sets were
skipped, without those rows becoming zero-value performed sets.

## Decision

Store all workout and body-weight values in kilograms. Add a profile-level
`preferred_weight_unit` constrained to `kg` or `lb`. Convert at frontend input and
display boundaries through one TypeScript module, and continue sending kilograms
to existing workout persistence functions.

Allow `finish_workout` to complete a session with any number of performed sets,
including zero. A frontend confirmation is required when incomplete rows remain.
Rows without `completed_at` keep null performance values and existing progress
queries continue to include only completed rows.

## Consequences

- Historical data needs no rewrite or destructive migration.
- Switching units does not mutate stored values or repeatedly convert database
  records.
- Partially completed sessions count as workouts, while progress reflects only
  work that was actually performed.
- The UI must distinguish a confirmed incomplete finish from an unresolved save
  failure.
