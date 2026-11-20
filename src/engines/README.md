# Engines

Reserved for the pure, UI-free computation modules. Later feature PRs add:

- **stats** — effect estimate, confidence interval, effect size, and the verdict
  rule that fills the `result` table.
- **cognitive-test** — scoring for the PVT (reaction-time) and n-back tasks that
  feed a `test_session`.
- **experiment-design** — turning a chosen design, blinding mode, and length into
  the `schedule_day` rows (ON/OFF or A/B arms).

Keep each engine a pure function of its inputs so it stays unit-testable without
the database or a React Native runtime, the same way the data layer is. Engines
read and write through `@/db`, never a raw SQLite handle.
