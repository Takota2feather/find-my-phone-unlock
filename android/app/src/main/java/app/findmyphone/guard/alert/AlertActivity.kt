package app.findmyphone.guard.alert

import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/** Full-screen stop screen, shown over the lock screen when Android allows it. */
class AlertActivity : AppCompatActivity() {
    companion object { const val EXTRA_START = "start" }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true) }
        else @Suppress("DEPRECATION") window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
        )
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        maybeStart(intent)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0B0D10")); setPadding(64, 64, 64, 64)
        }
        root.addView(TextView(this).apply {
            text = "This phone is ringing because its owner asked to find it."
            setTextColor(Color.WHITE); textSize = 20f; gravity = Gravity.CENTER
        })
        root.addView(Button(this).apply {
            text = "I found it — stop"; textSize = 20f
            setOnClickListener { AlertController.stop(this@AlertActivity, "manual"); finish() }
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 220).apply { topMargin = 64 })
        setContentView(root)
    }

    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); maybeStart(intent) }

    /** Fallback path: the activity is in the foreground, so starting the FGS is allowed. */
    private fun maybeStart(i: Intent?) {
        if (i?.getBooleanExtra(EXTRA_START, false) != true || AlertService.active) return
        ContextCompat.startForegroundService(this, Intent(this, AlertService::class.java)
            .setAction(AlertService.ACTION_START)
            .putExtra("source", i.getStringExtra("source") ?: "sms")
            .putExtra("secure", i.getBooleanExtra("secure", false)))
    }
}
