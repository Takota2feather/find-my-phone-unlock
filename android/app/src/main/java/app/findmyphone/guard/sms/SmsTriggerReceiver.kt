package app.findmyphone.guard.sms

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import app.findmyphone.guard.FmpStore
import app.findmyphone.guard.alert.AlertController

/**
 * Reads the SMS_RECEIVED broadcast (we are NOT the default SMS app, so we can't
 * block/delete messages — the text stays in the user's inbox). Messages that don't
 * match are dropped without being stored or logged.
 */
class SmsTriggerReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val cfg = FmpStore.config(ctx)
        if (!cfg.smsEnabled || !cfg.ownerAcknowledged) return
        val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        val sender = parts.firstOrNull()?.originatingAddress ?: return
        val body = parts.joinToString("") { it.messageBody ?: "" }
        if (body.length > 300) return

        val key = FmpStore.sha256(sender.filter { it.isDigit() || it == '+' })
        val masked = "sender ••" + sender.filter { it.isDigit() }.takeLast(2)
        val now = System.currentTimeMillis()

        if (FmpStore.lockedUntil(ctx, key) > now) return // locked out after failed attempts

        // 1) Pending password challenge from this sender?
        FmpStore.getChallenge(ctx, key)?.let { (expiresAt, attempts) ->
            if (now > expiresAt) {
                FmpStore.clearChallenge(ctx, key)
                FmpStore.addEvent(ctx, "sms", "expired", true, "Password challenge expired ($masked).")
            } else if (FmpStore.verifyPassword(ctx, body.trim())) {
                FmpStore.clearChallenge(ctx, key)
                FmpStore.markTrigger(ctx, key)
                FmpStore.addEvent(ctx, "sms", "activated", true, "Correct password from $masked.")
                AlertController.start(ctx, "sms", secure = true)
                return
            } else {
                val next = attempts + 1
                if (next >= cfg.maxAttempts) {
                    FmpStore.clearChallenge(ctx, key)
                    FmpStore.lock(ctx, key, now + 15 * 60_000)
                    FmpStore.addEvent(ctx, "sms", "rejected", true, "Too many wrong passwords — $masked locked for 15 min.")
                } else {
                    FmpStore.setChallenge(ctx, key, expiresAt, next)
                    FmpStore.addEvent(ctx, "sms", "rejected", true, "Wrong password from $masked (attempt $next/${cfg.maxAttempts}).")
                }
                return
            }
        }

        // 2) New trigger request
        val m = SmsMatcher.match(body, cfg.phrase, cfg.contextAware)
        if (!m.actionable) {
            if (SmsMatcher.normalize(body).contains(SmsMatcher.normalize(cfg.phrase))) {
                FmpStore.addEvent(ctx, "sms", "ignored", false, "Blocked: ${m.reason}")
            }
            return
        }
        if (now - FmpStore.lastTrigger(ctx, key) < 60_000) return // one trigger per sender per minute

        if (cfg.secureMode) {
            if (!cfg.hasPassword) {
                FmpStore.addEvent(ctx, "sms", "ignored", true, "Blocked: secure mode is on but no password is set.")
                return
            }
            val isShortCode = sender.any { it.isLetter() } || sender.count { it.isDigit() } < 7
            val canSend = ContextCompat.checkSelfPermission(ctx, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED
            if (isShortCode || !canSend || !FmpStore.allowChallengeSend(ctx)) {
                FmpStore.addEvent(ctx, "sms", "ignored", true, "Blocked: challenge reply not allowed (short code, no SEND_SMS, or rate limit).")
                return
            }
            sms(ctx).sendTextMessage(sender, null, cfg.challengeReply.ifBlank { "Password?" }, null, null)
            FmpStore.setChallenge(ctx, key, now + cfg.timeoutSec * 1000L, 0)
            FmpStore.addEvent(ctx, "sms", "challenge_sent", true, "Challenge sent to $masked.")
            return
        }

        FmpStore.markTrigger(ctx, key)
        FmpStore.addEvent(ctx, "sms", "activated", false, "Phrase matched from $masked.")
        AlertController.start(ctx, "sms", secure = false)
    }

    @Suppress("DEPRECATION")
    private fun sms(ctx: Context): SmsManager =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) ctx.getSystemService(SmsManager::class.java) else SmsManager.getDefault()
}
