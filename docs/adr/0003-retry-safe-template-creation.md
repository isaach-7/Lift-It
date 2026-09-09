# ADR 0003: Retry-safe workout template creation

## Status

Accepted, 2026-09-09.

## Decision

Generate a UUID in the browser for each new template draft and retain it until a
save is confirmed. Save with a Supabase upsert on the primary key, protected by
owner RLS policies. Only send id, user_id, and name; creation time is database-owned.

## Reason

A request can commit successfully even when its response is lost. Retrying with
the same ID updates that one template instead of inserting a second copy. This
single-row operation does not require an Edge Function. Inputs remain available
after a recoverable failure; the UI merges the confirmed row into the list.

## Limits

Unsaved drafts are kept in component state, not persisted across a page reload.
Concurrent template renames use the last successful write. Multi-device editing
conflict resolution remains outside this small milestone.
