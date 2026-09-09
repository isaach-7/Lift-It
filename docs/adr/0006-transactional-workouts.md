# ADR 0006: Transactional workout persistence

Status: Accepted.

Use narrowly scoped authenticated Postgres functions for multi-row writes.
Functions derive ownership from auth.uid(), validate ownership, use a fixed empty
search path and are executable only by authenticated users. Owned tables have RLS.
Client writes to session and progression tables are denied outside these functions.

Template saves, onboarding, session snapshots and set/progression writes are atomic.
Session row locks serialize set completion and finishing. Stable identifiers make
retries safe, and a partial unique index prevents multiple active sessions. A saved
set is immutable in this milestone, avoiding ambiguous historical recalculation.

An equipment key derived from exercise settings and a user-supplied equipment label
partitions recommendations and progress. Sessions snapshot it. Changing settings
creates a new comparison series rather than mixing incompatible machines.

Postgres functions keep these operations in one transaction without an Edge Function
round trip. Optional future services may use Edge Functions but do not enter the
critical persistence path.
