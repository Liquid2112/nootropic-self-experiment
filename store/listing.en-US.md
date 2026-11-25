# App Store listing (en-US)

Paste-ready copy for App Store Connect. Character counts are checked against
Apple's limits. The same text is in `store.config.json` for `eas metadata:push`.

## Name (30 max)

**Placebo: Supplement Tracker** (27)

Why: the name field carries the most search weight. "Placebo" alone ranks for
nothing anyone searches. "Supplement tracker" is the highest-volume phrase in
our niche that honestly describes the app (you log a daily dose and check-in).

Alternates if Apple or a trademark clash forces a change:
- Placebo: Does It Work? (23)
- Placebo: Nootropic Tester (26)

## Subtitle (30 max)

**Blind-test your nootropics** (26)

Words in the name and subtitle are indexed, so neither the subtitle nor the
keyword field repeats "placebo", "supplement", "tracker", "blind", "test" or
"nootropics".

## Keywords (100 max, comma separated, no spaces)

```
focus,memory,brain,reaction,time,caffeine,theanine,creatine,stack,experiment,biohacking,mood,sleep
```
(98)

Notes:
- "reaction" + "time" combine into "reaction time" (Apple joins words across
  fields), which also catches the free reaction test.
- "theanine", "caffeine", "creatine" are the three most common things people
  will test first and are searched on their own.
- No competitor or brand names (Guideline 2.3.7), and no "peptide": the app
  doesn't track peptides and the library treats them as gray-market, so it
  would read as keyword stuffing.
- This is judgment, not measured search volume (we have no ASO tool yet). After
  two weeks live, check Search Ads impression share or an ASO tool and swap the
  weakest two words.

## Promotional text (170 max, editable any time without review)

> Stop guessing. Run a blinded 3 to 4 week experiment on the supplement you already take, and get a real verdict from your own reaction-time and memory data. (155)

Launch-week alternate (use it once Shubh's on-camera reveal is out):

> Shubh blind-tested his own stack for 3 weeks. One thing worked. One did nothing. Run the same experiment on yours. (115)

## Description (4000 max)

```
Does your supplement actually do anything? Placebo finds out, on you.

Most of what you take was chosen from a TikTok, a forum thread or a friend's stack. Placebo runs a small, blinded experiment on one supplement and tells you if it moved your numbers, did nothing, or made things worse.

HOW IT WORKS
• Pick one goal and one supplement you already have.
• Placebo builds a randomized schedule: some days you take it, some days you don't.
• Blind it if you can: fill two identical cups, one real and one placebo, and let the app (or a friend holding the key) track which is which. Your expectations can't sway the result if you don't know.
• Each day, a 90-second check-in: a reaction-time test, a quick memory task and three sliders.
• After 3 to 4 weeks, your verdict unlocks: measurable improvement, no meaningful effect, measured worse, or not enough data yet. With the range, in plain units.

BUILT SO YOU FINISH
• A countdown to your verdict date from day one.
• Daily quests, streaks and badges.
• A home-screen widget and a Live Activity for today's check-in.
• Results stay sealed until the end, so no early peeking spoils the answer.

APPLE HEALTH
Connect Apple Health and Placebo reads your sleep, resting heart rate and heart rate variability, then compares each night to the dose the day before. Read-only: Placebo never writes to Health, and Health data never leaves your phone.

THE LIBRARY
Plain-English profiles of more than 100 popular nootropics and supplements: what they claim, what the research actually shows, safety notes, and links to the studies.

FREE REACTION TEST
Not ready to run an experiment? The reaction test is free, no sign-up.

PRIVATE BY DESIGN
No account. Your experiment data, scores and Health data stay on your device. We can't see them.

PLACEBO PRO
Running an experiment needs Placebo Pro, with a free trial for new subscribers. Choose yearly or monthly. Payment is charged to your Apple ID when you confirm after the trial. Your subscription renews automatically unless you turn off auto-renew at least 24 hours before the end of the current period, and your account is charged for renewal within 24 hours before the end of the period. Manage or cancel in your App Store account settings. Placebo reminds you 2 days before a trial ends.

Placebo is a personal measurement tool, not a medical device. It does not diagnose, treat or prevent any condition, and it doesn't tell you what to take. Talk to a doctor before starting any supplement, especially if you take prescription medication, are pregnant, or have a health condition.

Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: PRIVACY_POLICY_URL
```

Before pasting: replace `PRIVACY_POLICY_URL` (see store/README.md). If the
store products end up with no free trial, delete "with a free trial for new
subscribers" and the trial sentences.

## What's New (version 1.0)

```
The first version of Placebo. Pick a supplement, blind it, and get a real verdict in 3 to 4 weeks.
```

## Categories

- Primary: **Health & Fitness** (HealthKit apps fit here, and it's where
  supplement and habit apps get browsed)
- Secondary: **Lifestyle**

Not Medical: it draws stricter review (1.4.1) and the app makes no medical claims.

## In-app purchases (subscription group "Placebo Pro")

Display names and descriptions Apple shows on the purchase sheet and in
subscription settings. Prices per the business plan.

| Reference name | Product ID (suggested) | Duration | Price | Trial | Display name | Description (55 max) |
|---|---|---|---|---|---|---|
| Pro Yearly | `placebo_pro_yearly` | 1 year | $39.99 | 7 days | Placebo Pro Yearly | Run unlimited blinded experiments. |
| Pro Monthly | `placebo_pro_monthly` | 1 month | $9.99 | 7 days | Placebo Pro Monthly | Run unlimited blinded experiments. |

Each subscription needs a review screenshot of the purchase screen:
`docs/screenshots/paywall.png` works (780x1688).

Note: the RevenueCat offering must attach these products to the `pro`
entitlement. The exit offer (`exit_offer` offering) needs its own product or a
promotional offer; leave it out of the first submission so review sees one
clean paywall.
