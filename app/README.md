# Election Backend — reference app

The shared codebase for the workshop labs: the ระบบเลือกตั้ง course project, rebuilt small.
Express + TypeScript 7 + Postgres, schema versioned with Liquibase. Tests run on Vitest
(the `jest/*` branches hold the same labs on Jest + TypeScript 6).

## Commands

| Command | What it does |
|---|---|
| `npm run doctor` | Pre-workshop check (tools, DB, migrations, one test per boundary) |
| `npm run dev` | Run the app with reload on http://localhost:3000 (needs `db:up` + `db:migrate`) |
| `npm run db:up` / `db:migrate` | Dev Postgres (port 5432) + migrations **with** dev seed data |
| `npm run db:up:test` / `db:migrate:test` | Test Postgres (port 5433, tmpfs) + migrations **without** seed data |
| `npm run db:reset:test` | Recreate the test database from scratch |
| `npm run test:unit` | `tsc --noEmit`, then the Vitest `unit` project — no I/O, parallel |
| `npm run test:integration` | Starts db-test, runs Liquibase, then the Vitest `integration` project one file at a time |
| `npm run db:up:e2e` / `db:migrate:e2e` | Fresh e2e Postgres (port 5434, recreated every run) + migrations with bootstrap accounts |
| `npm run test:e2e` | Fresh db-e2e + Liquibase + app container, then Playwright API tests |
| `npm run typecheck` | `tsc --noEmit` over src, tests and e2e (Vitest itself never type-checks) |

## Test boundaries in this repo

| Boundary | Where | Tool | Talks to |
|---|---|---|---|
| Unit | `test/unit/` | Vitest | Nothing outside the process — collaborators are test doubles |
| Component | `test/integration/` | Vitest + supertest | The app in-process + real Postgres (`db-test`) |
| End-to-end | `e2e/` | Playwright (`request`) | The app container over HTTP, as a black box |

## Database versioning (Liquibase)

- Changelogs: `db/changelog/changes/NNN-*.sql` (Liquibase *formatted SQL*), included in order by `db.changelog-master.yaml`.
- Never edit a changeset that has already run anywhere — add a new file.
- `context:dev` changesets are demo data for local development only; `context:e2e` changesets bootstrap the admin/commissioner accounts of the e2e environment. Integration tests run with `--contexts=test`, so they see neither.
- Liquibase runs from our own image (`db/Dockerfile`, changelog baked in), so the same command works on laptops and on every CI.

Handy commands (run against the test DB by default):

```bash
docker compose run --rm --build liquibase status
docker compose run --rm liquibase rollback-count --count=1
docker compose run --rm liquibase history
```

## Architecture

```
src/
  app.ts              createApp(deps) — every dependency injected (see AppDeps)
  server.ts           wires real deps: Pool, JwtTokenService, system clock
  auth/               TokenService (JWT), password hashing, auth middleware
  domain/             Thai national id checksum, types
  services/           AccountService, ElectionAdminService — business rules
  repositories/       interface + Pg implementation per aggregate
  routes/
    accountRoutes.ts  register, login, admin role change
    electionRoutes.ts districts, parties, candidates, public results
    voteRoutes.ts     ⚠ legacy: global pool, jwt + process.env inline, new Date()
```

`voteRoutes.ts` is legacy on purpose (Day 2 PM lab). Closing a district's poll and showing
scores after closing are **not implemented** on purpose (Day 2 AM outside-in lab).

## API

| Method | Path | Who |
|---|---|---|
| GET | `/health` | anyone |
| POST | `/auth/register` | anyone |
| POST | `/auth/login` | anyone |
| PATCH | `/admin/users/:id/role` | ADMIN |
| GET | `/districts`, `/parties`, `/parties/:id` | anyone |
| POST | `/parties` | COMMISSIONER |
| POST | `/districts/:id/candidates` | COMMISSIONER |
| GET | `/districts/:id/results` | anyone (scores hidden until the poll closes) |
| GET | `/me/candidates` | logged-in voter |
| PUT | `/me/vote` | VOTER |

## CI

The repo root has three equivalent pipelines, all calling the npm scripts above:
`.github/workflows/ci.yml` (GitHub Actions), `.gitlab-ci.yml` (GitLab, docker-in-docker) and `Jenkinsfile`.
