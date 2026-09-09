# MathClans V2.1.4 — Login Account Name Sync

V2.1.4 builds on V2.1.3 and makes each player profile name follow the currently signed-in Google/Firebase account while preserving clan approval, school-safe chat, adaptive training, live multiplayer battles, rankings and administration.

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

---

## V2.1.3 — Clan Membership Approval & School-Safe Chat

### Clan membership
- Students now **Request to Join** instead of joining immediately.
- Only the clan leader can Accept or Reject pending applications.
- After acceptance, the applicant becomes a normal clan member and the clan count is updated.
- **Clan leaders cannot kick/remove existing members.** Existing members may leave only on their own accord.
- Teachers/admins retain moderation authority for exceptional school-safety cases.
- If the leader leaves, leadership still transfers to the longest-serving remaining member. If the final member leaves, the clan is deleted.

### Chat
- New **Main Channel** for all signed-in MathClans players.
- New private **Clan Channel** available only to members of that clan.
- Messages are limited to 240 characters.
- Client-side school-safe language filtering rejects vulgar/inappropriate messages before posting, including common spacing/punctuation/letter-substitution bypass attempts.
- Chat messages can be reported to teachers/admins.
- Admin Center now includes **Mute Chat / Unmute Chat** per player without suspending the whole account.
- Basic 2-second anti-spam send delay is included in the game client.

### Important production note
The V2.1.3 language filter is suitable for the school beta client, but a public/commercial release should move language moderation and rate-limiting to trusted server-side Cloud Functions or another moderation service so modified clients cannot bypass it.


## V2.1.3 hotfix
- Accepted applicants are pushed into the live member roster immediately.
- A signed-in applicant now watches their player membership document, so clan acceptance appears without requiring a page refresh.
- Players can edit or delete only chat messages that they themselves sent.
- Edited chat messages are rechecked by the school-safe language filter and display an `edited` marker.


## V2.1.3 roster/acceptance fix

- Removed the 10 placeholder/demo members from the live War Roster. The roster now starts empty and is populated only from the clan's real Firestore `members` subcollection.
- Fixed the `roleFromSkills is not defined` runtime error that occurred after a leader accepted an applicant.
- After acceptance, the live member snapshot rebuilds the War Roster using the new member's real profile and presence.


## V2.1.3 defender roster selection

The defending clan now mirrors the attacker flow. When a challenge arrives, the defending clan first chooses any 1–10 currently available members, then sends the normal 20-second voluntary rally only to those selected players. The defender does not need to match the attacker's team size. Only members who accept are deployed.


## V2.1.4 — Login account profile-name sync

- The public MathClans player name now automatically follows the display name of the Google/Firebase account used to sign in.
- A stale MathClans name from a different account or earlier local session can no longer override the signed-in account name.
- On sign-in, the canonical account name is synced to `players/{uid}.displayName` and to the player's clan member document when applicable.
- The Profile editor shows the account name as read-only; players may still choose avatar, class and year level.
- Email remains private and is not used as the public name unless the authentication provider supplies no display name; in that rare case, only the email prefix is used as a fallback.
