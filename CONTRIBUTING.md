# Contributing & architecture

This file tells a later feature PR where its code goes and which conventions keep
the project clean and CI-green. The foundation is deliberately thin; build on it,
don't rework it.

## Where things live

- **`src/db/`** — the only place that talks to SQLite. Import repositories and
  `getDatabase()` from `@/db`. Never open a raw SQLite handle elsewhere, and never
  write SQL outside this folder. To change the schema, append a new migration to
  `MIGRATIONS` in `src/db/schema.ts` (next `version` number) and add the matching
  domain types/repository methods — do not edit an existing migration.
- **`src/engines/`** — pure, UI-free computation. Three engines are planned:
  - **stats** — effect estimate, CI, effect size, verdict → fills `result`.
  - **cognitive-test** — PVT and n-back scoring → feeds `test_session`.
  - **experiment-design** — design + blinding + length → generates `schedule_day`.
  Keep each a pure function of its inputs so it unit-tests without a database or
  a React Native runtime.
- **`src/screens/`** — the real screen implementations. Keep the `app/` route
  files thin: a route imports and renders its screen component from here.
- **`src/components/`** — shared, reusable UI.
- **`app/`** — Expo Router routes. One file per MVP screen; add a route by adding
  a file and registering it in `app/_layout.tsx`.

## Conventions

- **TypeScript strict mode** is on (plus `noUncheckedIndexedAccess`). CI runs
  `tsc --noEmit`; keep it clean.
- **The data layer stays synchronous and driver-agnostic.** Code against the
  `SqlDriver` interface, not `expo-sqlite` directly, so the same logic runs under
  the in-memory test driver. This is why the unit tests need no native module.
- **One test per piece of real logic.** New engines and schema changes ship with
  Jest tests under a `__tests__/` folder next to the code. Tests run in Node via
  ts-jest and must not import React Native or `expo-sqlite`.
- **ESLint** (`npm run lint`) and **Jest** (`npm test`) both gate every PR.

## CI

`.github/workflows/ci.yml` runs on every pull request: typecheck, lint, and Jest.
All must be green before merge. CI pins Node 20 LTS.
