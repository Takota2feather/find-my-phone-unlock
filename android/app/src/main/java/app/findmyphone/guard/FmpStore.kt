package app.findmyphone.guard

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.UUID
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/**
 * App-private config mirror synced from the web UI. The SMS challenge password is
 * NEVER stored in plain text here: only a salted PBKDF2 hash. Event records never
 * contain message bodies, passwords or full phone numbers.
 */
object FmpStore {
    private const val PREFS = "fmp_native"

    data class Config(
        val deviceName: String,
        val ownerAcknowledged: Boolean,
        val smsEnabled: Boolean,
        val phrase: String,
        val contextAware: Boolean,
        val secureMode: Boolean,
        val hasPassword: Boolean,
        val challengeReply: String,
        val timeoutSec: Int,
        val maxAttempts: Int,
        val alarmEnabled: Boolean,
        val volume: Int,
        val rampUp: Boolean,
        val maxVolumeOverride: Boolean,
        val flashEnabled: Boolean,
        val flashMode: String,
        val blinkMs: Long,
        val stopOnUnlock: Boolean,
        val maxDurationSec: Int,
    )

    private fun p(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun saveConfig(c: Context, cfg: JSONObject) {
        val device = cfg.optJSONObject("device") ?: JSONObject()
        val setup = cfg.optJSONObject("setup")?.optJSONObject("steps") ?: JSONObject()
        val sms = cfg.optJSONObject("sms") ?: JSONObject()
        val alert = cfg.optJSONObject("alert") ?: JSONObject()
        val e = p(c).edit()
        e.putString("deviceName", device.optString("name", "My phone").take(40))
        e.putBoolean("owner", setup.optBoolean("ownerAcknowledged", false))
        e.putBoolean("smsEnabled", sms.optBoolean("enabled", false))
        e.putString("phrase", sms.optString("phrase", "find my phone").take(48))
        e.putBoolean("contextAware", sms.optBoolean("contextAware", false))
        e.putBoolean("secureMode", sms.optBoolean("secureMode", false))
        e.putString("challengeReply", sms.optString("challengeReply", "Password?").take(40))
        e.putInt("timeoutSec", sms.optInt("timeoutSec", 120).coerceIn(30, 600))
        e.putInt("maxAttempts", sms.optInt("maxAttempts", 3).coerceIn(1, 5))
        val pw = sms.optString("password", "")
        if (pw.length >= 6 && !verifyPassword(c, pw)) {
            val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
            e.putString("pwSalt", salt.toHex()).putString("pwHash", pbkdf2(pw, salt).toHex())
        } else if (pw.isEmpty()) {
            e.remove("pwSalt").remove("pwHash")
        }
        e.putBoolean("alarmEnabled", alert.optBoolean("alarmEnabled", true))
        e.putInt("volume", alert.optInt("volume", 90).coerceIn(0, 100))
        e.putBoolean("rampUp", alert.optBoolean("rampUp", true))
        e.putBoolean("maxVolumeOverride", alert.optBoolean("maxVolumeOverride", false))
        e.putBoolean("flashEnabled", alert.optBoolean("flashlightEnabled", true))
        e.putString("flashMode", alert.optString("flashMode", "blink"))
        e.putLong("blinkMs", alert.optLong("blinkIntervalMs", 500).coerceIn(150, 2000))
        e.putBoolean("stopOnUnlock", alert.optBoolean("stopOnUnlock", true))
        e.putInt("maxDurationSec", alert.optInt("maxDurationSec", 120).coerceIn(15, 600))
        e.apply()
    }

    fun config(c: Context): Config {
        val s = p(c)
        return Config(
            deviceName = s.getString("deviceName", "My phone")!!,
            ownerAcknowledged = s.getBoolean("owner", false),
            smsEnabled = s.getBoolean("smsEnabled", false),
            phrase = s.getString("phrase", "find my phone")!!,
            contextAware = s.getBoolean("contextAware", false),
            secureMode = s.getBoolean("secureMode", false),
            hasPassword = s.contains("pwHash"),
            challengeReply = s.getString("challengeReply", "Password?")!!,
            timeoutSec = s.getInt("timeoutSec", 120),
            maxAttempts = s.getInt("maxAttempts", 3),
            alarmEnabled = s.getBoolean("alarmEnabled", true),
            volume = s.getInt("volume", 90),
            rampUp = s.getBoolean("rampUp", true),
            maxVolumeOverride = s.getBoolean("maxVolumeOverride", false),
            flashEnabled = s.getBoolean("flashEnabled", true),
            flashMode = s.getString("flashMode", "blink")!!,
            blinkMs = s.getLong("blinkMs", 500),
            stopOnUnlock = s.getBoolean("stopOnUnlock", true),
            maxDurationSec = s.getInt("maxDurationSec", 120),
        )
    }

    fun verifyPassword(c: Context, candidate: String): Boolean {
        val s = p(c)
        val salt = s.getString("pwSalt", null)?.fromHex() ?: return false
        val hash = s.getString("pwHash", null)?.fromHex() ?: return false
        return MessageDigest.isEqual(hash, pbkdf2(candidate, salt))
    }

    // ---- Challenges (keyed by a hash of the sender, never the raw number) ----
    fun getChallenge(c: Context, key: String): Pair<Long, Int>? {
        val raw = p(c).getString("ch_$key", null) ?: return null
        val (exp, att) = raw.split(":").let { it[0].toLong() to it[1].toInt() }
        return exp to att
    }
    fun setChallenge(c: Context, key: String, expiresAt: Long, attempts: Int) =
        p(c).edit().putString("ch_$key", "$expiresAt:$attempts").apply()
    fun clearChallenge(c: Context, key: String) = p(c).edit().remove("ch_$key").apply()

    fun lockedUntil(c: Context, key: String) = p(c).getLong("lock_$key", 0)
    fun lock(c: Context, key: String, until: Long) = p(c).edit().putLong("lock_$key", until).apply()
    fun lastTrigger(c: Context, key: String) = p(c).getLong("last_$key", 0)
    fun markTrigger(c: Context, key: String) = p(c).edit().putLong("last_$key", System.currentTimeMillis()).apply()

    /** Sliding-window cap on outgoing challenge SMS to prevent abuse / cost. */
    fun allowChallengeSend(c: Context, perHour: Int = 5): Boolean {
        val now = System.currentTimeMillis()
        val arr = JSONArray(p(c).getString("sends", "[]"))
        val recent = (0 until arr.length()).map { arr.getLong(it) }.filter { now - it < 3_600_000 }
        if (recent.size >= perHour) return false
        p(c).edit().putString("sends", JSONArray(recent + now).toString()).apply()
        return true
    }

    // ---- Events queued for the web UI history ----
    fun addEvent(c: Context, source: String, result: String, secure: Boolean, detail: String, durationMs: Long? = null) {
        val arr = JSONArray(p(c).getString("events", "[]"))
        val ev = JSONObject()
            .put("id", UUID.randomUUID().toString())
            .put("timestamp", java.time.Instant.now().toString().takeIf { android.os.Build.VERSION.SDK_INT >= 26 } ?: System.currentTimeMillis().toString())
            .put("source", source).put("result", result)
            .put("secureChallenge", secure).put("detail", detail.take(160))
        if (durationMs != null) ev.put("durationMs", durationMs)
        arr.put(ev)
        val trimmed = JSONArray()
        val start = maxOf(0, arr.length() - 200)
        for (i in start until arr.length()) trimmed.put(arr.get(i))
        p(c).edit().putString("events", trimmed.toString()).apply()
        EventBus.emitEvent(ev)
    }

    fun drainEvents(c: Context): JSONArray {
        val arr = JSONArray(p(c).getString("events", "[]"))
        p(c).edit().putString("events", "[]").apply()
        return arr
    }

    fun sha256(s: String): String = MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).toHex()

    private fun pbkdf2(pw: String, salt: ByteArray): ByteArray =
        SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            .generateSecret(PBEKeySpec(pw.toCharArray(), salt, 20_000, 256)).encoded

    private fun ByteArray.toHex() = joinToString("") { "%02x".format(it) }
    private fun String.fromHex() = chunked(2).map { it.toInt(16).toByte() }.toByteArray()
}

/** In-process hook so the Capacitor plugin can forward native events to the open UI. */
object EventBus {
    @Volatile var onEvent: ((JSONObject) -> Unit)? = null
    @Volatile var onAlertState: ((Boolean, String?) -> Unit)? = null
    fun emitEvent(e: JSONObject) = onEvent?.invoke(e)
    fun emitAlert(active: Boolean, source: String?) = onAlertState?.invoke(active, source)
}
