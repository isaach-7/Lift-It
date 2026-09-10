# ADR 0008: Reversible set completion

## Status

Accepted

## Decision

A completed set can be reopened while its workout is active. Completion and
reopening are both explicit Supabase transactions. The reopened values return to
the browser's user-scoped recovery draft so they can be corrected and saved again.

The undo transaction also reconstructs the equipment-specific progression from
the latest remaining completed set that affected progression. The client only
shows the row as editable after Supabase confirms the undo. Full offline batching
until workout completion remains outside v1.

## Consequences

- Accidental completion is correctable without sacrificing per-set durability.
- Refreshing or locking the device still preserves every confirmed completed set.
- Reopening an earlier set cannot leave progression pointing at its removed result.
- An unavailable network leaves the confirmed completed row intact and offers retry.
