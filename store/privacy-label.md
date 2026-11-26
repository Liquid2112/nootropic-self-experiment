# App Privacy ("nutrition label")

What to answer in App Store Connect > App Privacy, based on what the code
actually sends today:

- **PostHog** (`src/features/analytics/`): funnel and retention events from a
  small fetch client. Each event carries only the event name, a random install
  ID, the OS, and allowlisted small integers or enum tokens. Personless
  (`$process_person_profile: false`) and GeoIP off. Never scores, Health data,
  supplement, goal, verdict, notes or reactions.
- **RevenueCat** (`react-native-purchases`): an anonymous app user ID and
  purchase history, to check the `pro` entitlement. Also the referral and
  creator codes as subscriber attributes (`src/features/referral/rewards.ts`:
  `referral_code`, `referred_by`, `creator_code`, `$campaign`), used to pay
  creators and, once the rewards server exists, credit referral rewards.
- **Nothing else leaves the device.** Experiment data, test scores, ratings,
  Health data and adverse-event logs live only in the on-device SQLite database.
  Notifications are local. No ads, no ad SDKs, no IDFA, no ATT prompt.

Apple counts data as "collected" only when it's sent off the device, so Health
data and everything in the experiment database is **not collected**.

## Answers

**Do you or your third-party partners collect data from this app?** Yes.

| Data type | Collected | Used for | Linked to user? | Tracking? |
|---|---|---|---|---|
| Usage Data > Product Interaction | Yes (PostHog) | Analytics | No | No |
| Identifiers > Device ID | Yes (PostHog random install ID) | Analytics | No | No |
| Purchases > Purchase History | Yes (RevenueCat) | App Functionality | No | No |
| Other Data > Other Data Types | Yes (referral + creator codes in RevenueCat) | App Functionality, Analytics | No | No |

Everything else: **not collected**. That includes Health & Fitness, Contact
Info, Location, Contacts, User Content, Search History, Browsing History,
Financial Info, Sensitive Info and Diagnostics.

Resulting label on the store page:
- Data Used to Track You: none
- Data Linked to You: none
- Data Not Linked to You: Purchases, Identifiers, Usage Data, Other Data

That's about as clean as a subscription app's label gets, and it's worth
saying in marketing ("no account, your data stays on your phone").

## Judgment calls

- **Install ID as "Device ID".** The ID is random per install, not a hardware
  or advertising ID, so you could argue it isn't one. Declaring it costs
  nothing and removes any chance of a mismatch finding.
- **RevenueCat "not linked".** We never set a custom app user ID or attach
  names or emails, so purchases aren't tied to an identity. If we ever call
  `Purchases.logIn` with an account ID, or set the creator-code attribute in a
  way that identifies the person, change Purchase History to "Linked". Check
  RevenueCat's current App Privacy guide on submission day, since their SDK
  defaults can change between versions.
- **Referral and creator codes.** A typed creator code is first-party
  attribution, not tracking (no data from other companies' apps is combined),
  so no ATT prompt. Gap: the privacy policy's Purchases section doesn't yet say
  these codes go to RevenueCat; this PR adds a sentence.
- **Waitlist emails** are collected by the website (Formspree), not the app, so
  they don't go on the app's label.
- **If we add** crash reporting (e.g. Sentry), push tokens sent to a server,
  accounts, or opt-in community results, this label has to change before that
  build ships.

## Privacy manifest

`app.json` > `ios.privacyManifests.NSPrivacyCollectedDataTypes` now declares
the same four types so the manifest matches the label. RevenueCat ships its
own manifest inside the SDK as well.

## URLs App Store Connect asks for

- Privacy Policy URL (required): host `docs/privacy-policy.md` on the landing
  site (e.g. `/privacy`). The GitHub link in `src/config/links.ts` works but
  looks unfinished to reviewers and users. **Blocked on the contact email.**
- Privacy Choices URL (optional): leave blank.
