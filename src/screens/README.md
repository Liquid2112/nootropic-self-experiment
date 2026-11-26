# Screens

Reserved for the real screen implementations. The route files in `app/` (Expo
Router, file-based) stay thin: each imports and renders the matching component
from here once it is built. Today the routes render a shared placeholder (see
`src/components/ScreenPlaceholder.tsx`).

Planned screens (one per `app/` route):

| Route (`app/`)        | Screen                     |
| --------------------- | -------------------------- |
| `welcome`             | Welcome / Disclaimer       |
| `goal-picker`         | Goal + Supplement picker   |
| `experiment-setup`    | Experiment setup           |
| `index`               | Today (home)               |
| `daily-test`          | Daily test (picked battery) |
| `progress`            | Progress charts            |
| `verdict`             | Verdict                    |
| `evidence-card`       | Evidence card              |
