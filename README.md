# MathClans V1.8 — Real War Lobby + Deployment

V1.8 builds on V1.7.2. It adds real clan ranking display, real Firebase clan targets, clan-to-clan challenge inboxes, a defending 20-second voluntary rally, and a synchronized deployment countdown before an active battle session.

## New in V1.8
- YOUR CLAN map card shows the current real clan rank.
- Ranking is calculated from Firestore clan ratings.
- War Council lists real online clans rather than only simulated rivals.
- Attacking clan rallies 1–10 members first.
- Target clan receives an incoming challenge.
- Any member of the target clan can answer the challenge and call the defence rally.
- Defenders get the same 20-second Accept/Reject rally.
- Accepted members from both clans are stored in one Firebase active battle session.
- All accepted players enter a 6-second synchronized deployment/march state.
- Battle screen opens automatically for accepted participants when deployment ends.

## Important scope
V1.8 establishes the real war lobby and deployment state. The current battle client still calculates combat locally per side. Fully synchronized cross-clan scoring, shared HP and authoritative result resolution are the V1.9 milestone.

## Upload to GitHub
Replace index.html, styles.css, app.js, clans.js, database.rules.json and README.md. Keep your configured firebase-config.js. online.js can also be uploaded from this package; it is compatible with V1.8.

## Firebase
Publish the new database.rules.json in Realtime Database Rules before testing live clan challenges. Firestore rules remain compatible.
