# LiftIt Repository Instructions

## Source of truth

- Read `Overall plan, subject to change.md` before changing product scope or data behavior.
- Read `Browser-Aware Web Design for LiftIt.md` before changing frontend architecture, rendering, loading states, data fetching, images, or animation.
- Keep the workout tracker as the v1 focus. The calorie tracker, social features, mobile app, and AI assistant are deferred.

## Engineering rules

- Use React and TypeScript for the frontend, Vite for local development and builds, Vercel for hosting, and Supabase for Postgres, authentication, storage, and server-side Edge Functions.
- Prefer plain, understandable React and CSS over new dependencies or speculative abstractions.
- Use CSS Grid, Flexbox, media queries, and other CSS primitives for layout. Do not use JavaScript DOM measurements for normal responsive layout.
- Design mobile first. Keep loading states, set rows, timers, buttons, images, and charts dimensionally stable.
- Keep progression business logic separate from React presentation and cover its boundary behavior with unit tests.
- Keep user input responsive. Persist completed sets intentionally, expose saving and error states, and never imply an unsuccessful save succeeded.
- Fetch only needed database columns and avoid unnecessary sequential requests.
- Keep optional services outside the critical workout path.
- Add memoization, code splitting, virtualization, or other optimizations only when measurement justifies them.
- Use only ASCII characters in repository-authored text and source files.

## Workflow

- Update `docs/design.md` before implementing a material behavior that is not already documented.
- Add a short ADR under `docs/adr/` for non-trivial architecture decisions.
- Append meaningful milestones and engineering decisions to `docs/progress.md`.
- Use small Conventional Commits such as `docs:`, `chore:`, `feat:`, `fix:`, `test:`, and `refactor:`.
- Prefer feature branches and pull requests linked to GitHub Issues for product work.
- Comments should explain non-obvious reasons, not narrate what the code does.
- Run `npm run check` before committing.

## Quality bar

- Implement and test loading, loaded, empty, and error states for data-driven UI.
- Preserve user-entered workout data through recoverable save failures.
- Respect reduced-motion preferences and use transform and opacity for normal motion.
- Give images explicit dimensions or stable aspect ratios and useful alternative text.
- Keep the core workout experience functional when optional third-party services fail.
