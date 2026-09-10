# ADR 0001: React, Vite, Vercel, and Supabase

- Status: Accepted
- Date: 2026-09-08

## Context

LiftIt is a first substantial portfolio project that should reach real users while remaining understandable and explainable by its author. The project needs a responsive web interface, authentication, relational data, file storage, and a path to trusted server-side logic without maintaining custom infrastructure.

## Decision

Use React with TypeScript for the frontend, Vite for local development and production builds, and Vercel for web hosting. Use Supabase for Postgres, authentication, storage, and Edge Functions.

Use plain CSS for the initial design system. Add focused dependencies only when they solve an existing product need and remain understandable.

## Consequences

- React experience can transfer to a future React Native application.
- Postgres and SQL align with existing experience.
- Managed authentication and infrastructure reduce initial operational work.
- The app depends on Supabase and Vercel service behavior and pricing.
- Database authorization still requires deliberate Row Level Security policies.
- Browser-exposed environment variables may contain public Supabase connection values only, never privileged secrets.
