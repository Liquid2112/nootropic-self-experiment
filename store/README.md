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
- **Domain**: not bought yet. When it is, set `LINK_DOMAIN` in
  `src/config/domain.ts` (everything else derives from it) and follow
  "Domain setup" below.

## Domain setup (about 20 minutes)

1. **Buy the domain on Cloudflare** (dash.cloudflare.com > Domain
   Registration > Register). Cloudflare sells at cost and the email step below
   is then automatic. `.app` domains are HTTPS-only, which Vercel handles.
2. **Point it at the landing page.** In Vercel, open the landing project >
   Settings > Domains > add the domain. Vercel shows the DNS records to add;
   add them in Cloudflare > DNS with the proxy turned **off** (grey cloud), or
   Vercel can't issue the certificate.
3. **Create support@ with Cloudflare Email Routing.** Cloudflare > the domain >
   Email > Email Routing > Get started. Add the custom address `support`,
   set the destination to your personal inbox, then click the verification
   link Cloudflare emails you. Let it add the MX and SPF records it offers.
   Send a test email to support@ and check it arrives. This only receives; to
   reply *as* support@ later, add an SMTP sender (e.g. Gmail "Send mail as"
   with a transactional mail service).
4. **Tell Claude the domain.** Then: `LINK_DOMAIN` changes if it's not
   placebo.app, the privacy policy gets the support email and a `/privacy`
   page on the landing site, a `/support` page goes up, and
   `store.config.json` gets `privacyPolicyUrl` and `supportUrl`.
5. **After the Apple Developer account exists**: put the Team ID into
   `landing/.well-known/apple-app-site-association` (see landing/README.md).

## Screenshots still to redo after the no-blinding redesign

Blinding was dropped on 2026-11-26. Frame 03 now uses the progress screen, but
two raw captures still show the old UI: `welcome.png` ("Blinded, like a real
trial") and `verdict.png` (the "Unblinded" card). Re-capture all raws once the
redesign is on main, then re-render. Don't upload 01 or 02 before that.

## Regenerating the screenshots

Raw captures come from the app's web build with seeded demo data, then get
framed with headlines.

```sh
npm ci
# active run (home, reaction test, health, library, setup, welcome)
node scripts/screenshots.mjs /tmp/raw/active --size=440x956 --scale=3 \
  --routes=/,/reaction-test,/welcome,/dictionary,/health,/experiment-setup
# finished run, for the verdict
node scripts/screenshots.mjs /tmp/raw/done --no-build --scenario=completed \
  --size=440x956 --scale=3 --routes=/verdict
# copy the PNGs you want into store/screenshots/raw/, then
node store/screenshots/render.mjs
```

Headlines live in `store/screenshots/frames.html`. Order matters: the first
three show in search results, so they carry the hook (does your stack work?),
the payoff (a verdict) and the differentiator (randomized on/off days).

Only the 6.9" size is needed: App Store Connect scales it down for smaller
iPhones. iPad isn't needed because 1.0 is iPhone-only (`supportsTablet: false`).
