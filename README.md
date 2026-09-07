# MathClans V1.7.1 — Rally + Training Quality Patch

This patch builds on V1.7 and adds the gameplay fixes requested during testing.

## Included in V1.7.1
- Fixes clan members appearing OFFLINE by allowing authenticated roster reads of Realtime Database presence and War Ready state.
- Presence heartbeat shortened to 10 seconds and visibility changes update presence immediately.
- Worked MCQ choices are visually balanced so the correct answer is not simply the choice with the most steps.
- Wrong choices continue to represent common mistakes such as sign/inverse-operation errors, formula/substitution errors and incomplete simplification; short choices are expanded into comparable worked reasoning.
- First successful login shows a How to Play guide. A persistent How to Play button is available in the top bar.
- Last member leaving a clan deletes the clan automatically (existing V1.7 behavior retained).
- Leaders/officers can call a consensual Rally for War for selected members.
- Rally maximum wait is 20 seconds; Accept/Reject responses update live and the rally closes early when everyone responds.
- Only accepted members deploy. No response by the deadline is treated as not joining.
- During a battle, a selected participant detected as disconnected is assigned 0 for simulated teammate scoring and remains part of the team denominator.

## Upload to GitHub
Replace: `index.html`, `styles.css`, `app.js`, `online.js`, `clans.js`, `database.rules.json`, and `README.md`.
Keep your existing configured `firebase-config.js`.
Keep the `assets/` folder.

## Firebase rule change required
Publish the included `database.rules.json` in Firebase Realtime Database Rules. Firestore rules are unchanged from V1.7.

## Important V1.7.1 limitation
Clan membership, presence and rally invitations are real Firebase data. The actual opponent battle simulation is still the V1.7 client-side battle model; fully synchronized multi-device live battles remain a later milestone.
