package app.findmyphone.guard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * The SMS receiver is manifest-registered and works after reboot without any
 * service. On boot we only re-post the visible "ready" notice — no hidden
 * service, and no microphone service (Android 15 forbids that from BOOT_COMPLETED).
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val cfg = FmpStore.config(ctx)
        if (cfg.smsEnabled && cfg.ownerAcknowledged) Notifications.postReady(ctx)
    }
}
