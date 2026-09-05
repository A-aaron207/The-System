# WhatsApp Notifications

WhatsApp messages cannot be sent safely from the PWA or APK JavaScript. The WhatsApp access token must stay on a server, Cloud Function, or other protected backend.

## Required pieces

1. A Meta Developer app with WhatsApp Cloud API enabled.
2. A verified WhatsApp Business phone number.
3. A permanent or server-held access token.
4. The WhatsApp Phone Number ID and Business Account ID.
5. Approved message templates for proactive notifications. Free-form messages are generally limited to an open customer-service window.
6. User consent and an E.164 phone number such as `+919876543210`.
7. A backend endpoint or Firebase Cloud Function that validates the signed-in Firebase user, checks opt-in, applies rate limits, and calls Meta's Graph API.
8. Firestore fields for `whatsappOptIn`, `whatsappNumber`, and notification preferences.

## Recommended flow

`SYSTEM event -> Firestore/Cloud Function -> Meta WhatsApp Cloud API -> user`

Do not place the Meta token, Phone Number ID secrets, or a direct Graph API call in `index.html`, `system-cloud.js`, or the APK. Anyone can extract them from a client package.

## Current status

Firebase account and leaderboard support is client-enabled, but WhatsApp sending is intentionally not activated until a secure backend and user consent flow exist. The existing in-app notification fallback remains available for APK users.