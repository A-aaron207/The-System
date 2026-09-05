# Native Android Notifications

The web app now includes `system-native-notifications.js`, an adapter for an Android WebView JavaScript bridge. The APK wrapper must expose one of these global objects:

- `AndroidNotifications`
- `Android`
- `NativeNotifications`

The bridge must implement:

```text
scheduleNotification(jsonPayload)
cancelNotification(id)
requestPermission()
```

`jsonPayload` contains:

```json
{
  "id": "quest-123",
  "title": "THE SYSTEM · QUEST DUE",
  "body": "Revise algebra",
  "at": 1757167200000,
  "repeatMinutes": 0
}
```

The adapter schedules a five-second test notification from Setup and schedules quest deadline reminders when quests are created.

## Native wrapper requirements

The Android wrapper must:

1. Add `POST_NOTIFICATIONS` permission for Android 13+.
2. Request notification permission at runtime.
3. Create a notification channel with `IMPORTANCE_HIGH`.
4. Use `AlarmManager.setAndAllowWhileIdle()` or WorkManager for screen-off delivery.
5. Persist scheduled IDs across reboot if reminders must survive device restart.
6. Expose the bridge with `webView.addJavascriptInterface(..., "AndroidNotifications")`.
7. Validate and sanitize all bridge input before scheduling.

The ZIP cannot provide the native Android implementation because this workspace contains web assets, not an Android Gradle project. The bridge adapter is safe in browser/local mode and displays `BRIDGE REQUIRED IN APK` until the HTML2APK wrapper exposes these methods.

Do not put WhatsApp tokens, Firebase service-account keys, or other private credentials in the bridge or web bundle.
