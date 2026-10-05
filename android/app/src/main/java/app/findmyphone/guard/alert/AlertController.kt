package app.findmyphone.guard.alert

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import app.findmyphone.guard.FmpStore
import app.findmyphone.guard.Notifications

/**
 * Single entry point for starting/stopping the alert. Android 12+ may refuse to
 * start a foreground service from the background; in that case we post a
 * high-priority full-screen notification whose activity starts the service.
 */
object AlertController {
    fun start(ctx: Context, source: String, secure: Boolean) {
        val i = Intent(ctx, AlertService::class.java)
            .setAction(AlertService.ACTION_START)
            .putExtra("source", source).putExtra("secure", secure)
        try {
            ContextCompat.startForegroundService(ctx, i)
        } catch (e: Exception) {
            // ForegroundServiceStartNotAllowedException (API 31+) or IllegalStateException
            postFallback(ctx, source, secure)
        }
    }

    fun stop(ctx: Context, reason: String = "manual") {
        ctx.startService(Intent(ctx, AlertService::class.java).setAction(AlertService.ACTION_STOP).putExtra("reason", reason))
    }

    fun canUseFullScreenIntent(ctx: Context): Boolean =
        if (Build.VERSION.SDK_INT >= 34) ctx.getSystemService(NotificationManager::class.java).canUseFullScreenIntent() else true

    private fun postFallback(ctx: Context, source: String, secure: Boolean) {
        Notifications.ensureChannels(ctx)
        val act = Intent(ctx, AlertActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            .putExtra(AlertActivity.EXTRA_START, true).putExtra("source", source).putExtra("secure", secure)
        val pi = PendingIntent.getActivity(ctx, 2, act, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val b = NotificationCompat.Builder(ctx, Notifications.CH_ALERT)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Find my phone requested")
            .setContentText("Tap to start the alarm.")
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setContentIntent(pi).setAutoCancel(true)
        if (canUseFullScreenIntent(ctx)) b.setFullScreenIntent(pi, true)
        try { NotificationManagerCompat.from(ctx).notify(Notifications.ID_ALERT, b.build()) } catch (_: SecurityException) {}
        FmpStore.addEvent(ctx, source, "activated", secure, "Background start blocked by Android — showed full-screen/heads-up prompt instead.")
    }
}
