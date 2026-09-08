# LiftIt

LiftIt is a mobile-first workout tracker with simple, explainable weight progression. The workout tracker is the complete v1 focus; calorie tracking, social features, a native application, and an AI assistant are deferred.

The repository currently contains a verified development foundation. Product features and the Supabase database have not been implemented yet.

## Technology

- React 19 and TypeScript 6
- Vite 8 for local development and production builds
- React Router for client-side navigation
- Supabase for Postgres, authentication, storage, and future Edge Functions
- Plain mobile-first CSS
- Vitest and Testing Library for automated tests
- Oxlint and Prettier for static checks and formatting
- Vercel for deployment
- GitHub Actions for continuous integration

The reasons for these choices are recorded in [ADR 0001](docs/adr/0001-frontend-and-backend-stack.md).

## Requirements

- Node.js 24.x
- npm 11.x
- fnm is recommended for selecting the repository's pinned Node version

From the repository root, run:

```bash
fnm use
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`. Changes under `src/` update in the browser during development.

The starter page runs without Supabase credentials. When database work begins, copy `.env.example` to `.env.local` and add the public values from the Supabase project settings:

```bash
cp .env.example .env.local
```

Never put a Supabase service-role key or another secret in a variable beginning with `VITE_`. Vite includes those values in browser code.

## Commands

| Command                | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Start the Vite development server                      |
| `npm run test`         | Run tests in interactive watch mode                    |
| `npm run test:run`     | Run the test suite once                                |
| `npm run lint`         | Check source files with Oxlint                         |
| `npm run lint:fix`     | Apply safe automatic lint fixes                        |
| `npm run format`       | Format supported repository files                      |
| `npm run format:check` | Verify formatting without changing files               |
| `npm run typecheck`    | Run strict TypeScript checks                           |
| `npm run build`        | Type-check and create the production build in `dist/`  |
| `npm run preview`      | Serve the production build locally                     |
| `npm run check`        | Run linting, formatting, tests, and a production build |

Run `npm run check` before every commit. GitHub Actions runs the same command for pull requests and pushes to `main`.

## Repository structure

```text
docs/                    Product design, progress log, and architecture decisions
public/                  Files copied directly into the production build
src/lib/                 Service boundaries such as the Supabase client
src/pages/               Route-level React components
src/styles/              Global CSS and future shared visual foundations
src/test/                Shared automated-test setup
.github/workflows/       Continuous integration configuration
```

`src/main.tsx` starts React and provides browser routing. `src/App.tsx` maps URLs to page components. `src/lib/supabase.ts` creates the browser client only when a feature asks for it, so missing credentials cannot block the basic interface.

## Project workflow

1. Create a focused GitHub Issue for a unit of work.
2. Create a feature branch from `main`.
3. Update the design document or add an ADR before material new behavior when needed.
4. Implement the smallest complete behavior and its tests.
5. Run `npm run check`.
6. Commit with a focused Conventional Commit message.
7. Open a pull request that explains what changed and why.
8. Add meaningful decisions and milestones to `docs/progress.md`.

Read [the product design](docs/design.md), [the project plan](Overall%20plan,%20subject%20to%20change.md), and [the browser-aware design guide](Browser-Aware%20Web%20Design%20for%20LiftIt.md) before implementing product features.
