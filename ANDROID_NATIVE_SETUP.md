# Add Native Android Notifications

The HTML ZIP already calls this bridge:

```javascript
window.AndroidNotifications.scheduleNotification(jsonPayload)
window.AndroidNotifications.cancelNotification(id)
window.AndroidNotifications.requestPermission()
```

To make screen-off notifications work, add the following native Android pieces to the HTML2APK wrapper.

## 1. AndroidManifest.xml

Add these permissions and receiver inside the application:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

<application ...>
    <receiver
        android:name=".SystemNotificationReceiver"
        android:exported="false" />
</application>
```

## 2. MainActivity.kt bridge

```kotlin
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var notificationBridge: SystemNotificationBridge

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true

        notificationBridge = SystemNotificationBridge(this)
        webView.addJavascriptInterface(notificationBridge, "AndroidNotifications")
        webView.loadUrl("file:///android_asset/index.html")
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, results)
        notificationBridge.permissionResult(requestCode)
    }
}
```

## 3. SystemNotificationBridge.kt

```kotlin
class SystemNotificationBridge(private val activity: Activity) {
    companion object { private const val PERMISSION_REQUEST = 701 }
    private val alarms = activity.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    private val prefs = activity.getSharedPreferences("system_notifications", Context.MODE_PRIVATE)

    init {
        val manager = activity.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(NotificationChannel(
                "system_reminders", "THE SYSTEM reminders", NotificationManager.IMPORTANCE_HIGH
            ))
        }
    }

    @JavascriptInterface
    fun requestPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), PERMISSION_REQUEST)
        }
    }

    fun permissionResult(requestCode: Int) {}

    @JavascriptInterface
    fun scheduleNotification(payload: String) {
        val data = JSONObject(payload)
        val id = data.getString("id")
        val title = data.getString("title")
        val body = data.getString("body")
        val at = data.getLong("at")
        val intent = Intent(activity, SystemNotificationReceiver::class.java).apply {
            putExtra("id", id)
            putExtra("title", title)
            putExtra("body", body)
        }
        val requestCode = id.hashCode()
        val pending = PendingIntent.getBroadcast(
            activity, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        prefs.edit().putInt(id, requestCode).apply()
    }

    @JavascriptInterface
    fun cancelNotification(id: String) {
        val requestCode = prefs.getInt(id, id.hashCode())
        val intent = Intent(activity, SystemNotificationReceiver::class.java)
        val pending = PendingIntent.getBroadcast(
            activity, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarms.cancel(pending)
        pending.cancel()
        prefs.edit().remove(id).apply()
    }
}
```

## 4. SystemNotificationReceiver.kt

```kotlin
class SystemNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notification = NotificationCompat.Builder(context, "system_reminders")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(intent.getStringExtra("title") ?: "THE SYSTEM")
            .setContentText(intent.getStringExtra("body") ?: "System reminder")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        manager.notify((intent.getStringExtra("id") ?: "system").hashCode(), notification)
    }
}
```

## 5. Gradle dependencies

```gradle
dependencies {
    implementation "androidx.appcompat:appcompat:1.7.0"
    implementation "androidx.core:core-ktx:1.13.1"
}
```

## 6. HTML2APK limitation

If HTML2APK only accepts a ZIP and does not provide custom Android source, permissions, or plugin hooks, it cannot install this native bridge. In that case use an APK builder that supports:

- Custom JavaScript interface
- Android permissions
- Kotlin/Java plugins
- AlarmManager or WorkManager

The existing ZIP is already prepared for the bridge. Once the native wrapper exposes `AndroidNotifications`, Setup will change from `BRIDGE REQUIRED IN APK` to `ANDROID BRIDGE READY`.
