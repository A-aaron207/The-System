# Firebase Account Registry Setup

1. Create a Firebase project at https://console.firebase.google.com/.
2. The Android project config is already installed from `google-services.json` for package `com.synapse.system`.
3. The Firebase Web App config is now installed in `firebase-config.js`. The Android `google-services.json` remains in the project for the APK wrapper.
4. Enable Authentication > Sign-in method > Email/Password and Google.
5. Create a Firestore database.
6. Publish `firestore.rules` from this folder in the Firebase Console Rules tab.
7. If you register a Web app, update `firebase-config.js` with its config:

```javascript
window.SYSTEM_FIREBASE_CONFIG = {
  apiKey: 'YOUR_PUBLIC_WEB_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

The Firebase Web config is intended for browser apps. Never put a service-account private key here. The downloaded Android file is retained as `google-services.json` for the APK/native wrapper.

The app then provides:

- Email/password registration and sign-in
- Google sign-in with popup and redirect fallback
- Cloud player profiles
- SYSTEM INDEX leaderboard
- Compressed full-data backup sync after quest completion and at sign-in
- Automatic profile sync every five minutes while signed in

The app remains local-only when the config is `null` or when the APK is offline. Browser notifications and service workers still depend on the APK wrapper's WebView capabilities.

## Google sign-in troubleshooting

For the web flow, add the deployed HTTPS domain under Authentication > Settings > Authorized domains. For an APK loaded from `file://`, Firebase web popup/redirect authentication is not a reliable native OAuth flow; use the APK wrapper's native Google Sign-In bridge, or load the app from an HTTPS origin inside a Custom Tab/WebView with the correct authorized domain. The app now displays the specific Firebase error and remedy.

Full data is stored in the owner-only `backups/{uid}` document. Modern browsers use gzip plus base64; older WebViews use compact JSON. The payload is capped below Firestore's 1 MiB document limit. Compression reduces document size, but Firestore reads/writes still count against Spark quotas.

For tamper-resistant competitive scoring, move score calculation into a trusted Cloud Function before opening the leaderboard to high-stakes competition. The included client rules protect profile ownership but cannot prevent a signed-in client from lying about its own score.
