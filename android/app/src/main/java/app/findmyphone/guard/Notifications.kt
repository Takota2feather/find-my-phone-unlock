package app.findmyphone.guard

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object Notifications {
    const val CH_READY = "fmp_ready"
    const val CH_ALERT = "fmp_alert"
    const val ID_READY = 10
    const val ID_ALERT = 11

    fun ensureChannels(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CH_READY, "Ready status", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Shows that FindMyPhone triggers are enabled on this phone."
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CH_ALERT, "Find-my-phone alert", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Shown while the alarm/flashlight is active."
                setSound(null, null) // the alert service plays its own alarm-stream sound
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            },
        )
    }

    fun canPost(ctx: Context) = NotificationManagerCompat.from(ctx).areNotificationsEnabled()

    /** Visible, dismissible notice. Never hidden. */
    fun postReady(ctx: Context) {
        ensureChannels(ctx)
        if (!canPost(ctx)) return
        val n = NotificationCompat.Builder(ctx, CH_READY)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("FindMyPhone is ready")
            .setContentText("Owner-enabled triggers are on. Open the app to change them.")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
        try { NotificationManagerCompat.from(ctx).notify(ID_READY, n) } catch (_: SecurityException) {}
    }
}
