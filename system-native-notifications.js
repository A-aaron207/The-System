// SYSTEM NATIVE NOTIFICATIONS — Android bridge adapter
// The APK wrapper must expose one of these methods through its native bridge.

const SYSTEM_NATIVE_NOTIFICATIONS = {
  bridgeNames: ['AndroidNotifications', 'Android', 'NativeNotifications'],

  getBridge() {
    for (const name of this.bridgeNames) {
      if (window[name]) return window[name];
    }
    return null;
  },

  isAvailable() {
    const bridge = this.getBridge();
    return !!(bridge && (typeof bridge.schedule === 'function' || typeof bridge.scheduleNotification === 'function'));
  },

  schedule({ id, title, body, at, repeatMinutes = 0 }) {
    const bridge = this.getBridge();
    if (!bridge) return false;
    const payload = JSON.stringify({
      id: String(id),
      title: String(title),
      body: String(body),
      at: Number(at),
      repeatMinutes: Number(repeatMinutes || 0),
    });
    try {
      if (typeof bridge.scheduleNotification === 'function') bridge.scheduleNotification(payload);
      else bridge.schedule(payload);
      return true;
    } catch (error) {
      console.error('[SYSTEM NATIVE NOTIFICATIONS] Schedule failed:', error);
      return false;
    }
  },

  cancel(id) {
    const bridge = this.getBridge();
    if (!bridge) return false;
    try {
      if (typeof bridge.cancelNotification === 'function') bridge.cancelNotification(String(id));
      else if (typeof bridge.cancel === 'function') bridge.cancel(String(id));
      else return false;
      return true;
    } catch (error) {
      console.error('[SYSTEM NATIVE NOTIFICATIONS] Cancel failed:', error);
      return false;
    }
  },

  requestPermission() {
    const bridge = this.getBridge();
    try {
      if (bridge && typeof bridge.requestPermission === 'function') {
        bridge.requestPermission();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[SYSTEM NATIVE NOTIFICATIONS] Permission request failed:', error);
      return false;
    }
  },

  test() {
    return this.schedule({
      id: `system-test-${Date.now()}`,
      title: 'THE SYSTEM',
      body: 'Native notifications are connected.',
      at: Date.now() + 5000,
    });
  },
};

window.SYSTEM_NATIVE_NOTIFICATIONS = SYSTEM_NATIVE_NOTIFICATIONS;
