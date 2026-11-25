# App Store submission kit

Everything needed to submit Placebo to the App Store the day the Apple
Developer account is approved.

| File | What it is |
|---|---|
| [listing.en-US.md](listing.en-US.md) | Name, subtitle, keywords, promo text, description, What's New, categories, subscription products |
| [app-review.md](app-review.md) | Rejection risks, App Review notes to paste, pre-submission checklist |
| [privacy-label.md](privacy-label.md) | App Privacy answers, matched to what the code sends |
| [age-rating.md](age-rating.md) | Age rating questionnaire answers (18+) |
| [screenshots/en-US/](screenshots/en-US/) | 7 App Store screenshots, 1320x2868 (iPhone 6.9") |
| [../store.config.json](../store.config.json) | The listing text in EAS Metadata format |

## Submission day, in order

1. Create the App ID and App Store Connect record (see the checklist at the
   bottom of app-review.md).
2. Push the listing text: `npx eas-cli metadata:push` (uses
   `store.config.json`; run `npx eas-cli metadata:lint` first). Or paste from
   listing.en-US.md by hand.
3. In App Store Connect, by hand (not covered by store.config.json):
   App Privacy (privacy-label.md), age rating (age-rating.md), App Review
   contact + notes + verdict recording (app-review.md), subscriptions
   (listing.en-US.md), screenshots.
4. `eas build -p ios --profile production` then `eas submit -p ios`.

## Still open

- **Privacy contact email**: docs/privacy-policy.md still says
  `CONTACT_EMAIL_TBD`. Once it's in, host the policy on the landing site and put
  that URL in `store.config.json` (`privacyPolicyUrl`), `src/config/links.ts`,
  and the description's last line.
- **Support URL** (required): the landing page, once it has a public address.
  Add it as `supportUrl` in `store.config.json`.
- **placebo.app**: see app-review.md #8.
- **Gray-market library section**: see app-review.md #2.

## Regenerating the screenshots

Raw captures come from the app's web build with seeded demo data, then get
framed with headlines.

```sh
npm ci
# active run (home, reaction test, health, library, setup, welcome)
node scripts/screenshots.mjs /tmp/raw/active --size=440x956 --scale=3 \
  --routes=/,/reaction-test,/welcome,/dictionary,/health,/experiment-setup
# finished blinded run, for the verdict
node scripts/screenshots.mjs /tmp/raw/done --no-build --scenario=completed \
  --size=440x956 --scale=3 --routes=/verdict
# copy the PNGs you want into store/screenshots/raw/, then
node store/screenshots/render.mjs
```

Headlines live in `store/screenshots/frames.html`. Order matters: the first
three show in search results, so they carry the hook (does your stack work?),
the payoff (a verdict) and the differentiator (blinded).

Only the 6.9" size is needed: App Store Connect scales it down for smaller
iPhones. iPad isn't needed because 1.0 is iPhone-only (`supportsTablet: false`).
