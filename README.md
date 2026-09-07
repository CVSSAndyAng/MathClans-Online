# MathClans V1.9 — Live Multiplayer Battles

V1.9 upgrades V1.8 into a synchronized cross-clan battle.

## New in V1.9
- shared 90-second clock for both clans
- each accepted player gets their own rapid mental-sum stream
- live Firebase participant scores and accuracy
- team score = average of each deployed player's individual average
- a disconnect/leave after battle starts makes that player's contribution 0
- long-term abilities + formation are capped as a smaller secondary modifier
- synchronized HP and team average on every participant screen
- one shared final winner and rating delta
- clan rating/influence update claimed once per clan
- Firestore battle history record
- deployed players return to online/ready after the result

## Upload to GitHub
Replace `index.html`, `styles.css`, `app.js`, `online.js`, `clans.js`, `database.rules.json`, `firestore.rules`, and `README.md`. Keep your configured `firebase-config.js` and existing `assets/` folder.

## Firebase changes
Publish the supplied `database.rules.json` in Realtime Database > Rules and the supplied `firestore.rules` in Firestore > Rules.

## V1.9 test
Use two clans on separate accounts/devices. Complete the V1.8 challenge/rally, answer on both sides, verify synchronized timer/HP/team averages, disconnect one deployed participant to verify 0 contribution, then confirm every participant sees the same winner and rating delta. Check `battleHistory/{battleId}` in Firestore afterwards.

V1.9 remains a school beta. V2.0 should move authoritative score/rating validation to trusted server-side code before production deployment.
