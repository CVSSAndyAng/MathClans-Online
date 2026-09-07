# MathClans — V1.6 Online Foundation

This is the school-wide online foundation built from the V1.5.4 gameplay beta.

## What V1.6 adds

- Firebase Google sign-in scaffold
- persistent player profile in Cloud Firestore
- player Math levels, confidence and progress can follow the same account across devices
- Realtime Database online / away / offline presence
- automatic progress sync every ~15 seconds while signed in
- safe Local Demo fallback if Firebase has not been configured yet
- school-domain restriction option
- starter Firestore and Realtime Database security rules
- all V1.5.4 gameplay remains available, including 1–10 player battles, iPad support, old-Singapore visuals and the two music tracks

**V1.6 does not yet make the clan roster or battles genuinely multiplayer.** It establishes accounts, cloud persistence and presence first. Real clan membership / 30-member cap / war-ready status is the next online layer.

## 1. Create a Firebase project

1. Go to Firebase Console and create a new project, e.g. `mathclans-schoolwide`.
2. Analytics is optional for this test.
3. In Project Overview, choose **Web app (`</>`)** and register the app.
4. Copy the Firebase web configuration object.

## 2. Configure Authentication

1. Firebase Console → **Build → Authentication**.
2. Click **Get started**.
3. Enable **Google** as a sign-in provider.
4. Select a support email and save.
5. Authentication → **Settings → Authorized domains**.
6. Add your GitHub Pages hostname, e.g. `yourusername.github.io`.

If you later use a custom domain, add that hostname too.

## 3. Create Firestore

1. Firebase Console → **Build → Firestore Database**.
2. Create database.
3. Choose the Singapore / nearby region available to your project if offered.
4. Open **Rules** and replace them with the contents of `firestore.rules` from this package.
5. Publish.

## 4. Create Realtime Database

1. Firebase Console → **Build → Realtime Database**.
2. Create database.
3. Copy the database URL shown by Firebase.
4. Open **Rules** and replace them with the contents of `database.rules.json`.
5. Publish.

## 5. Fill in firebase-config.js

Open `firebase-config.js` and paste the values from your Firebase Web App configuration:

```js
window.MATHCLANS_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  databaseURL: "https://..."
};
```

Optional school-domain check:

```js
window.MATHCLANS_ALLOWED_EMAIL_DOMAIN = "schools.gov.sg";
```

Leave it blank while testing if you are not ready to restrict sign-in.

## 6. Upload to the new GitHub repository

Upload the complete contents of this folder to the new V1.6+ repository:

```text
index.html
styles.css
app.js
online.js
firebase-config.js
firestore.rules
database.rules.json
assets/
  non-battle-music.mp3
  battle-music.mp3
```

Then enable GitHub Pages from the repository settings.

## 7. Test

1. Open the GitHub Pages URL.
2. The top bar should show **Sign In** if Firebase is configured, or **Local Demo** if it is not.
3. Press **Sign In → Sign in with Google**.
4. Train a skill, wait 15–20 seconds, then refresh or open the game on another device using the same Google account.
5. The player's cloud profile should be restored.

## Data model introduced in V1.6

Firestore:

```text
players/{uid}
  uid
  email
  displayName
  avatar
  level
  xp
  crystals
  skills
  training
  clanId
  role
  updatedAt
```

Realtime Database:

```text
presence/{uid}
  state: online | away | offline
  activity
  displayName
  clanId
  lastChanged
```

## Next school-wide layer

V1.7 should convert simulated clan membership into real Firebase clan records with:

- maximum 30 members per clan
- real member list
- exact own-clan online count
- War Ready status
- clan invitations / join requests
- one clan per player
- clan leader/officer permissions
- clan-create and clan-join flow

Do not publish the database in open/test-mode rules for a school-wide deployment. Use the supplied restricted rule templates and tighten them further as clan/battle writes are added.
