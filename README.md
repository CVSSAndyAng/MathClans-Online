# MathClans V2.0 — School-Wide Release

V2.0 consolidates the online foundation, adaptive training, real clans, voluntary war rallies, real clan-vs-clan war lobbies and synchronized live battles into the school-wide release build.

## New in V2.0

- School-wide rankings with two tabs:
  - Clan ranking by live clan rating
  - Top Scholars ranking by combined Math ability mastery
- Public player profiles now include optional class and year level.
- Player Google email is moved out of the public `players` document into `privateProfiles/{uid}`. Only the player and authorised admins can read it.
- Existing public email fields are automatically migrated/deleted the next time that player signs in.
- School administration console for authorised admins:
  - player / clan / online / recent-battle overview
  - player account suspension / restoration
  - clan overview
  - moderation reports
- Clan Directory includes a report control for inappropriate clan names or behaviour.
- Suspended accounts receive an access-paused screen with the administrator's reason.
- Presence heartbeat reduced to a lighter 15-second cadence.
- Player leaderboard refresh is throttled to reduce unnecessary Firestore reads.
- Firestore security rules are tightened around player identity, moderation fields, member roles and private email records.
- Realtime Database live-battle writes are limited to battle participants (or the battle creator during initial creation), rather than every authenticated account.
- All V1.9 live battle rules remain: shared 90-second battle, individual mental sums, team averages, disconnect = 0, synchronized result and rating change.

## GitHub upload

Replace these files in the root of `MathClans-Online`:

- `index.html`
- `styles.css`
- `app.js`
- `online.js`
- `clans.js`
- `admin.js` (new)
- `database.rules.json`
- `firestore.rules`
- `README.md`

Keep your already configured `firebase-config.js` and existing `assets/` folder.

## Firebase rule updates

### 1. Firestore
Open **Firebase Console → Firestore → Rules**, replace all rules with `firestore.rules`, then Publish.

### 2. Realtime Database
Open **Firebase Console → Realtime Database → Rules**, replace all rules with `database.rules.json`, then Publish.

## Make yourself an administrator (optional but recommended)

V2.0 does not trust an admin flag stored in the browser. Admin access is based on a Firestore document keyed by the Firebase UID.

1. Sign in to MathClans with your teacher/admin Google account.
2. Firebase Console → Authentication → Users.
3. Copy that account's **User UID**.
4. Firestore → Data → create collection `admins` if it does not already exist.
5. Create a document whose document ID is exactly that UID.
6. Add fields:
   - `active` = `true` (Boolean)
   - `role` = `teacher` (String)
   - `displayName` = your preferred admin name (String)

After refreshing MathClans, the account panel will show **Admin Center**.

Do not put student UIDs into `admins`.

## First V2.0 test

Use at least two student accounts plus one admin account if possible.

1. Student signs in and edits name/avatar/class/year.
2. Confirm Firestore `players/{uid}` contains no email after the player signs in again.
3. Confirm `privateProfiles/{uid}` contains the email and is not readable by another student's client.
4. Check Rank → Clans and Rank → Top Scholars.
5. Run a normal two-clan live battle and verify V1.9 behaviour remains intact.
6. Submit a clan report from Clan Directory.
7. Admin opens Admin Center and resolves the report.
8. Admin suspends a test account; that account should receive the suspended screen.
9. Admin restores it; the account should work again after the Firestore update reaches the client.

## Important deployment note

This build substantially tightens Firebase rules, but live battle result calculation still runs in authenticated browser clients. That is suitable for a supervised school game and beta deployment, but it is not fully cheat-resistant against a technically sophisticated user who deliberately modifies client code. Fully authoritative anti-cheat validation would require trusted server-side execution (for example Cloud Functions / Cloud Run / another server endpoint) and should be added if MathClans is later used for high-stakes competition.
