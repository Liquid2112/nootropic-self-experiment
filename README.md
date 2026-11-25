# Nootropic Self-Experiment App

Run honest N-of-1 trials on common over-the-counter nootropics. Pick a goal and a
supplement, let the app lay out an ON/OFF (or A/B) schedule, take a short daily
cognitive test, and get a verdict with an effect estimate and confidence interval
instead of a vibe. Everything stays on your device.

This app is for personal self-experiments. It is not medical advice and does not
recommend taking any supplement.

> **Status:** feature-complete MVP, getting ready for the App Store. All eight
> MVP screens, the experiment-design / cognitive-test / stats engines, the 3-day
> baseline, the Pro paywall (RevenueCat, free trial at experiment setup), and the
> free standalone reaction test are in place. See [Shipping](#shipping) for what
> is left.

## Running it

Requires Node.js 20 LTS (or newer LTS) and the Expo tooling.

```bash
npm install
npx expo start
```

Then open the project in Expo Go (iOS/Android) or a simulator from the Expo CLI
menu. Expo Go can't make real purchases; without RevenueCat keys the paywall is
skipped in development builds so the full flow stays testable. To test real
purchases, copy `.env.example` to `.env.local`, add the RevenueCat public keys,
and use a development build (`eas build --profile development` or
`npx expo run:ios`). Useful scripts:

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
  engines/            Cognitive-test engine (PVT + 2-back); stats reserved
  features/
    daily-loop/       Pure Today-view, context, off-window, timer, device,
                      session-assembly logic (UI-free, fully unit-tested)
    notifications/    expo-notifications scheduling (degrades to no-op headless)
  screens/            Reserved: remaining real screen implementations
  ui/                 Local UI kit — tokens, Button, Card, Slider, Scaffold,
                      ProgressRing/streak (imported as @/ui, no hardcoded colors)
  components/         Shared UI components
```

## The daily loop

- **Today (`app/index.tsx`)** — the hub: Day X of N, today's dose instruction,
  Mark taken, Start check-in, and the streak. During a blinded run the arm is
  never revealed; the instruction is phrased as a numbered cup.
- **Daily test (`app/daily-test.tsx`)** — a full-screen ~90-second flow: pre-test
  context (sleep, caffeine, phone/tablet), a PVT timed with the high-resolution
  clock (`performance.now`), a letter 2-back, and three 0–10 sliders plus an
  optional note. Raw trials are scored through the cognitive-test engine; one
  `test_session` row is persisted, with off-window and abandoned/invalid runs
  flagged.
- **Notifications** — a morning dose reminder and a check-in-window reminder,
  scheduled with `expo-notifications`; permission is requested gracefully and
  every call degrades to a no-op where the module is unavailable.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for where later features belong and the
conventions that keep the data layer testable.

## Monetization

- **Free:** the standalone reaction test (`app/reaction-test.tsx`), with a
  personal best and a share button.
- **Pro:** needed to start an experiment. "Confirm & start" on Experiment setup
  opens the paywall (`app/paywall.tsx`) for users without the `pro`
  entitlement. Plans come from RevenueCat's current offering; the free trial is
  set on the store products.

## Shipping

- Builds: `eas.json` has `development`, `preview` and `production` profiles.
- Store assets: `assets/` (icon, Android adaptive icon, splash, favicon).
- Privacy policy: [`docs/privacy-policy.md`](./docs/privacy-policy.md), linked
  from Welcome and the paywall. Use its URL in App Store Connect.
- Still needed before submitting: RevenueCat project + keys, the final bundle
  ID, a contact email in the privacy policy, App Store screenshots, and a pass
  on real devices.

### Health and widget setup once the Apple Developer account exists

Both features are configured in `app.json` and need a dev build (`eas build
--profile development`); Expo Go can't load them. On the Apple side:

- **HealthKit:** enable the HealthKit capability on the App ID
  `com.liquid2112.nootropicexperiment`. EAS adds the entitlement on the next
  build. Read-only access (sleep, resting heart rate, HRV); nothing is written.
- **Widget and Live Activity:** register the App Group
  `group.com.liquid2112.nootropicexperiment` and add it to both the app and the
  widget extension's App IDs. The widget reads its timeline from that group.
- **Android:** Health Connect permissions are in `app.json`. Google Play asks
  for a Health Connect declaration form before release.

When Health is connected and last night's sleep has synced, the daily check-in
skips the sleep question and the verdict adjusts for the measured hours instead.
