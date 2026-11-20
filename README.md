# Nootropic Self-Experiment App

Run honest N-of-1 trials on common over-the-counter nootropics. Pick a goal and a
supplement, let the app lay out an ON/OFF (or A/B) schedule, take a short daily
cognitive test, and get a verdict with an effect estimate and confidence interval
instead of a vibe. Everything stays on your device.

This app is for personal self-experiments. It is not medical advice and does not
recommend taking any supplement.

> **Status:** foundation only. This is the skeleton, data layer, curated
> supplement list, and CI. The cognitive tests, statistics, scheduling, and the
> real screens land in later PRs.

## Running it

Requires Node.js 20 LTS (or newer LTS) and the Expo tooling.

```bash
npm install
npx expo start
```

Then open the project in Expo Go (iOS/Android) or a simulator from the Expo CLI
menu. Useful scripts:

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run typecheck` | `tsc --noEmit` (strict mode)          |
| `npm run lint`      | ESLint                                |
| `npm test`          | Jest unit tests (data layer + seed)   |

## Data model

On-device SQLite (`expo-sqlite`), created and migrated on first launch. Five
tables, mirrored exactly by the TypeScript domain types in `src/db/types.ts`:

- **supplement** — the curated OTC list: `id`, `name`, `type` (`acute` or
  `cumulative`), `evidence_summary`, `evidence_links` (JSON array), `excluded`.
- **experiment** — one trial: `id`, `supplement_id`, `goal`, `primary_metric`,
  `design`, `blinding_mode`, `length_days`, `start_date`, `status`, `sealed_key`.
- **schedule_day** — one row per day of a trial: `experiment_id`, `day_index`,
  `date`, `arm` (`ON`/`OFF`/`A`/`B`), `taken`, `taken_at`.
- **test_session** — one daily test result: `id`, `experiment_id`, `day_index`,
  `started_at`, `device_model`, `pvt_median_ms`, `pvt_lapses`, `nback_accuracy`,
  `nback_dprime`, `focus`, `energy`, `mood`, `sleep_hours`, `caffeine`, `note`,
  `valid`.
- **result** — the computed outcome per metric: `experiment_id`, `metric`,
  `estimate`, `ci_low`, `ci_high`, `effect_size`, `verdict`, `computed_at`.

Schema changes go through the ordered migration runner in `src/db/schema.ts`
(tracked by SQLite's `user_version`), never by editing an existing migration.

## Module layout

```text
app/                  Expo Router routes (one thin file per MVP screen)
src/
  db/                 SQLite data layer — the single place features import from
    driver.ts         Minimal SQLite driver interface
    expoDriver.ts     expo-sqlite adapter (on device)
    schema.ts         Schema + migration runner
    types.ts          Domain model (mirrors the schema)
    repositories.ts   Typed DAOs (insert/query) per table
    seed.ts           Curated ~30-supplement seed list
    index.ts          getDatabase() + public re-exports
    __tests__/        Jest tests + in-memory test driver
  engines/            Reserved: stats, cognitive-test, experiment-design
  screens/            Reserved: real screen implementations
  components/         Shared UI components
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for where later features belong and the
conventions that keep the data layer testable.
