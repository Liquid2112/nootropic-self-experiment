# App Review: risks and notes

What could get Placebo rejected, what we already do about it, and what still
needs a decision. Guideline numbers refer to the App Review Guidelines.

## Risk summary

| # | Risk | Guideline | Level | Status |
|---|---|---|---|---|
| 1 | Health or efficacy claims about supplements | 1.4.1, 2.3.1 | Medium | Handled in copy, keep it that way |
| 2 | Library profiles of prescription and gray-market compounds | 1.4.3, 1.4.1 | High | Hidden for 1.0 (decided) |
| 3 | Reviewer can't reach the verdict (needs 21+ days) | 2.1 | Medium | Handled by review notes + attachments |
| 4 | Subscription disclosure | 3.1.2 | Low | Paywall already compliant |
| 5 | HealthKit use and disclosure | 2.5.1, 5.1.3 | Low | Handled |
| 6 | Privacy label vs. what the app sends | 5.1.1, 5.1.2 | Low | See privacy-label.md; manifest updated in this PR |
| 7 | Affiliate shopping links in the library | 3.1.1, 3.2.2 | Low | Fine for physical goods |
| 8 | Universal links need a domain we own | 2.1 | Medium | **Domain being bought**; link domain is now one constant |
| 9 | iPad | 2.4.1 | Low | Made iPhone-only in this PR |

### 1. Health and efficacy claims (1.4.1, 2.3.1)

Apple rejects apps that claim to diagnose, treat or measure health in ways
they can't back up, and screenshots or text that overstate what the app does.

What we do:
- Every piece of store copy describes measurement of *your own* numbers
  ("did it move your reaction time"), never that a supplement works.
- The welcome screen has the "Before you start" medical disclaimer, the verdict
  says "Not medical advice. Results apply only to you".
- Description ends with the not-a-medical-device paragraph.

Rules for anything we add later (promo text, What's New, screenshots):
- Never: "boost focus", "improve memory", "proven", "clinically", "doctor
  recommended", percentages of users who improved.
- OK: "find out if", "measure", "your own data", "randomized".
- Never (since 2026-11-26): "blinded", "placebo-controlled", "like a real trial". Runs are open-label.

### 2. Prescription and gray-market compounds in the library (1.4.3)

The library (`src/features/dictionary/content/grayMarket.ts`) profiles
modafinil, armodafinil, racetams, Dihexa, Cerebrolysin, 9-Me-BC, nicotine gum
and similar. The content is education only, with no dosing or sourcing, and
says plainly that most are unapproved and unverified. That is defensible, but
it's the most likely thing a reviewer flags: a health app that lists research
chemicals can read as facilitating drug use, and it also pushes the age rating
up (see age-rating.md).

**Decision (Shubh, 2026-11-25): hidden for 1.0.** `SHOW_UNREGULATED_ENTRIES`
in `src/config/links.ts` is now `false`, so the 29 entries are gone from search,
filters and direct links. Turn it on in a later update, once approved, and
update the age rating answers when you do.

Options that were considered:
- **A. Ship 1.0 without the gray-market section (chosen).** Hide the
  "unregulated" and "prescription" kinds behind a remote or build flag and turn
  them on in 1.1 once the app is approved and has a track record. Zero cost to
  the core loop; the 79 supplements are what people test.
- B. Ship it as is and explain it in the review notes (below). Probably fine,
  but a rejection costs 1 to 3 days at launch.



### 3. Reviewer can't see the verdict (2.1)

The verdict needs 3 baseline days plus 21 run days. Reviewers test for minutes.
We cover it with:
- Review notes that explain the timeline and what each screen does.
- A screen recording attached in App Store Connect (App Review Information >
  Attachment) showing the verdict, made with the completed-run demo data:
  `node scripts/screenshots.mjs <out> --scenario=completed --routes=/verdict`
  gives the still; record the same on a dev build for the video.
- The free reaction test works with no purchase, so the reviewer has something
  real to try immediately.

If this gets bounced anyway, the fix is a "Sample result" button on the
experiment screen that opens the verdict with demo data.

### 4. Subscription disclosure (3.1.2)

The paywall (PR #18) already has everything Apple checks: price as large as
"free", trial length, the date you'll be charged, renewal terms, Restore,
Terms and Privacy links, no toggles or countdown timers. The description has
the standard auto-renew paragraph and both links. The free tier (reaction test)
means the app isn't a bare paywall.

Must-do in App Store Connect: put the Terms of Use (Apple's standard EULA) link
in the description (done) and fill in the Privacy Policy URL field.

### 5. HealthKit (2.5.1, 5.1.3)

- The description names Apple Health and says what is read; the app's Health
  screen says it before asking. Apple requires both.
- Read-only (sleep, resting HR, HRV); `NSHealthUpdateUsageDescription` is off.
- Health data never leaves the device and is not used for analytics or ads.
- Enable the HealthKit capability on the App ID before the first build.

### 6. Privacy

See privacy-label.md. This PR also fills in `NSPrivacyCollectedDataTypes` in
`app.json` so the privacy manifest matches the label.

### 7. Affiliate links

Links to Nootropics Depot / iHerb are for physical goods, so they don't need
in-app purchase. They open in the system browser and carry an affiliate
disclosure. They must never appear on gray-market entries or verdicts (already
enforced in `affiliate.ts`).

### 8. Link domain

Invite and referral links, plus iOS universal links and Android app
links, all come from `LINK_DOMAIN` in `src/config/domain.ts` (through
`app.config.ts`). Shubh is buying the domain (2026-11-25). Until it serves
`landing/.well-known/apple-app-site-association`, every shared link is dead,
and a reviewer who taps "Share my code" sees that. Steps: store/README.md >
Domain setup.

### 9. iPad

`supportsTablet` was `true`, which means App Store Connect requires 13" iPad
screenshots and reviewers test on iPad. This PR sets it to `false` so 1.0 is
iPhone-only (it still runs on iPad in iPhone mode). Turn it back on once we
design for iPad.

## App Review Information (paste into App Store Connect)

Sign-in required: **No**

Contact: Shubh Patel, phone and email to fill in (Apple only uses these to
reach us about the review).

Notes:

```
Placebo helps people check whether a supplement they already take makes a measurable difference for them, using a randomized on/off schedule and a 90-second daily check-in (a reaction-time test, a short memory task and three ratings).

No account or sign-in. All experiment data stays on the device.

To try it quickly:
1. On the welcome screen, tap "Just try the free reaction test". This is free and needs no purchase.
2. Tap "Start my experiment" to see the onboarding quiz, the experiment setup and the subscription screen. Starting an experiment requires Placebo Pro (sandbox account works; the subscription has a free trial).
3. After starting, the Today screen shows the daily dose and check-in.

The verdict screen unlocks only after a 3-day baseline plus a 21 or 28 day run, so it can't be reached during review. We've attached a screen recording of a completed run's verdict.

Apple Health (optional): the app reads sleep, resting heart rate and heart rate variability to compare nights after "on" days with "off" days. It never writes to Health, and Health data never leaves the device.

Safety: "Log a bad reaction" on the Today screen pauses the experiment and shows stop-and-get-help guidance. The app gives no medical advice and does not recommend any supplement or dose.

The Library is an educational reference: what each compound claims and what published research shows, with links to PubMed. It includes no dosing or sourcing information.
```

## Pre-submission checklist

- [ ] Apple Developer account approved; App ID `com.liquid2112.nootropicexperiment` with HealthKit, App Groups (`group.com.liquid2112.nootropicexperiment`), Push Notifications, Associated Domains
- [ ] App Store Connect app record created, name reserved
- [ ] Subscription group + 2 products created, trial set, review screenshot attached
- [ ] RevenueCat project, iOS key in EAS secrets, products attached to `pro`
- [ ] Privacy contact email in docs/privacy-policy.md, policy hosted at a public URL
- [ ] Support URL live (the landing page works)
- [ ] placeboapp.com serving AASA (needs the Apple Team ID), or links switched
- [ ] Privacy label entered (privacy-label.md), age rating questionnaire (age-rating.md)
- [ ] Screenshots uploaded (store/screenshots/en-US, 6.9")
- [ ] Verdict screen recording attached to App Review Information
- [ ] TestFlight build tested on a real iPhone: Health permission, widget, notifications, purchase in sandbox
