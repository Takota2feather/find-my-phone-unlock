package app.findmyphone.guard.alert

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import app.findmyphone.guard.EventBus
import app.findmyphone.guard.FmpStore
import app.findmyphone.guard.Notifications

/** Visible foreground service that rings (alarm stream) and drives the torch. */
class AlertService : Service() {
    companion object {
        const val ACTION_START = "app.findmyphone.guard.START_ALERT"
        const val ACTION_STOP = "app.findmyphone.guard.STOP_ALERT"
        @Volatile var active = false; private set
        @Volatile var currentSource: String? = null; private set

        fun torchAvailable(ctx: Context): Boolean = findTorch(ctx) != null
        fun findTorch(ctx: Context): String? = try {
            val cm = ctx.getSystemService(CameraManager::class.java)
            cm.cameraIdList.firstOrNull {
                val ch = cm.getCameraCharacteristics(it)
                ch.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true &&
                    ch.get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_BACK
            }
        } catch (_: Exception) { null }
    }

    private val main = Handler(Looper.getMainLooper())
    private var player: MediaPlayer? = null
    private var focus: AudioFocusRequest? = null
    private var savedAlarmVol: Int? = null
    private var torchId: String? = null
    private var torchOn = false
    private var wake: PowerManager.WakeLock? = null
    private var startedAt = 0L
    private var secure = false
    private var unlockReceiver: BroadcastReceiver? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> { finish(intent.getStringExtra("reason") ?: "manual"); return START_NOT_STICKY }
            ACTION_START -> begin(intent.getStringExtra("source") ?: "manual", intent.getBooleanExtra("secure", false))
            else -> stopSelf()
        }
        return START_NOT_STICKY // never self-restart: an alert must not come back on its own
    }

    private fun begin(source: String, secure: Boolean) {
        val type = if (Build.VERSION.SDK_INT >= 29) ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else 0
        ServiceCompat.startForeground(this, Notifications.ID_ALERT, buildNotification(), type)
        if (active) return
        val cfg = FmpStore.config(this)
        active = true; currentSource = source; this.secure = secure; startedAt = System.currentTimeMillis()
        wake = getSystemService(PowerManager::class.java)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "fmp:alert").apply { acquire(cfg.maxDurationSec * 1000L + 5000) }
        if (cfg.alarmEnabled) startAlarm(cfg.volume, cfg.rampUp, cfg.maxVolumeOverride)
        if (cfg.flashEnabled) startTorch(cfg.flashMode, cfg.blinkMs)
        if (cfg.stopOnUnlock) registerUnlock()
        main.postDelayed({ finish("timeout") }, cfg.maxDurationSec * 1000L)
        EventBus.emitAlert(true, source)
    }

    private fun buildNotification(): Notification {
        Notifications.ensureChannels(this)
        val stop = PendingIntent.getBroadcast(this, 1, Intent(this, StopAlertReceiver::class.java), PendingIntent.FLAG_IMMUTABLE)
        val full = PendingIntent.getActivity(
            this, 3, Intent(this, AlertActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val b = NotificationCompat.Builder(this, Notifications.CH_ALERT)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("FindMyPhone alert is active")
            .setContentText("Unlock the phone or tap Stop.")
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true).setContentIntent(full)
            .addAction(android.R.drawable.ic_media_pause, "Stop", stop)
        if (AlertController.canUseFullScreenIntent(this)) b.setFullScreenIntent(full, true)
        return b.build()
    }

    // ---- Alarm ----
    private fun startAlarm(volume: Int, ramp: Boolean, override: Boolean) {
        val am = getSystemService(AudioManager::class.java)
        val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
        if (Build.VERSION.SDK_INT >= 26) {
            focus = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE).setAudioAttributes(attrs).build()
            am.requestAudioFocus(focus!!)
        }
        if (override) {
            savedAlarmVol = am.getStreamVolume(AudioManager.STREAM_ALARM)
            val max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            try { am.setStreamVolume(AudioManager.STREAM_ALARM, (max * volume / 100).coerceAtLeast(1), 0) } catch (_: SecurityException) {}
        }
        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        try {
            player = MediaPlayer().apply {
                setAudioAttributes(attrs); setDataSource(this@AlertService, uri); isLooping = true; prepare()
            }
            val target = volume / 100f
            if (ramp) {
                var v = 0.15f
                player?.setVolume(v, v); player?.start()
                val step = object : Runnable { override fun run() {
                    if (!active) return
                    v = (v + 0.1f).coerceAtMost(target); player?.setVolume(v, v)
                    if (v < target) main.postDelayed(this, 1000)
                } }
                main.postDelayed(step, 1000)
            } else { player?.setVolume(target, target); player?.start() }
        } catch (_: Exception) { /* no ringtone available on this device; torch may still run */ }
    }

    // ---- Torch ----
    private val SOS = longArrayOf(200, 200, 200, 200, 200, 600, 600, 200, 600, 200, 600, 600, 200, 200, 200, 200, 200, 1400)
    private fun startTorch(mode: String, blinkMs: Long) {
        torchId = findTorch(this) ?: return
        when (mode) {
            "steady" -> setTorch(true)
            "sos" -> { var i = 0; val r = object : Runnable { override fun run() {
                if (!active) return; setTorch(i % 2 == 0); main.postDelayed(this, SOS[i % SOS.size]); i++ } }; main.post(r) }
            else -> { val r = object : Runnable { override fun run() {
                if (!active) return; setTorch(!torchOn); main.postDelayed(this, blinkMs) } }; main.post(r) }
        }
    }
    private fun setTorch(on: Boolean) {
        val id = torchId ?: return
        try { getSystemService(CameraManager::class.java).setTorchMode(id, on); torchOn = on }
        catch (_: Exception) { torchId = null } // camera in use by another app
    }

    // ---- Unlock detection ----
    private fun registerUnlock() {
        unlockReceiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, i: Intent) { if (i.action == Intent.ACTION_USER_PRESENT) finish("unlock") }
        }
        ContextCompat.registerReceiver(this, unlockReceiver, IntentFilter(Intent.ACTION_USER_PRESENT), ContextCompat.RECEIVER_NOT_EXPORTED)
    }

    private fun finish(reason: String) {
        if (active) {
            val label = mapOf("manual" to "Stopped manually", "unlock" to "Stopped: phone unlocked", "timeout" to "Stopped: time limit reached")[reason] ?: "Stopped"
            FmpStore.addEvent(this, currentSource ?: "manual", "stopped", secure, label, System.currentTimeMillis() - startedAt)
        }
        active = false; currentSource = null
        main.removeCallbacksAndMessages(null)
        player?.run { try { stop() } catch (_: Exception) {}; release() }; player = null
        val am = getSystemService(AudioManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) focus?.let { am.abandonAudioFocusRequest(it) }
        savedAlarmVol?.let { try { am.setStreamVolume(AudioManager.STREAM_ALARM, it, 0) } catch (_: SecurityException) {} }
        savedAlarmVol = null
        if (torchOn) setTorch(false)
        unlockReceiver?.let { try { unregisterReceiver(it) } catch (_: Exception) {} }; unlockReceiver = null
        wake?.let { if (it.isHeld) it.release() }; wake = null
        EventBus.emitAlert(false, null)
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() { if (active) finish("manual"); super.onDestroy() }
}

class StopAlertReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = AlertController.stop(context, "manual")
}
