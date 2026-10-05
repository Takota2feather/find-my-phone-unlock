package app.findmyphone.guard.plugin

import android.Manifest
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import app.findmyphone.guard.EventBus
import app.findmyphone.guard.FmpStore
import app.findmyphone.guard.Notifications
import app.findmyphone.guard.alert.AlertController
import app.findmyphone.guard.alert.AlertService
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "FindMyPhone",
    permissions = [
        Permission(alias = "sms", strings = [Manifest.permission.RECEIVE_SMS, Manifest.permission.SEND_SMS]),
        Permission(alias = "microphone", strings = [Manifest.permission.RECORD_AUDIO]),
        Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS]),
    ],
)
class FindMyPhonePlugin : Plugin() {
    override fun load() {
        EventBus.onEvent = { e -> notifyListeners("event", JSObject.fromJSONObject(e)) }
        EventBus.onAlertState = { a, s -> notifyListeners("alertState", JSObject().put("active", a).put("source", s)) }
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val ctx = context
        val pm = ctx.packageManager
        val nm = ctx.getSystemService(NotificationManager::class.java)
        val power = ctx.getSystemService(PowerManager::class.java)
        val notif = if (Build.VERSION.SDK_INT >= 33) getPermissionState("notifications").toString()
            else if (Notifications.canPost(ctx)) "granted" else "denied"
        call.resolve(JSObject()
            .put("sdkInt", Build.VERSION.SDK_INT)
            .put("model", "${Build.MANUFACTURER} ${Build.MODEL}")
            .put("sms", if (pm.hasSystemFeature(PackageManager.FEATURE_TELEPHONY_MESSAGING) || pm.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)) getPermissionState("sms").toString() else "unsupported")
            .put("microphone", getPermissionState("microphone").toString())
            .put("notifications", notif)
            .put("fullScreenIntent", if (AlertController.canUseFullScreenIntent(ctx)) "granted" else "denied")
            .put("dndAccess", if (nm.isNotificationPolicyAccessGranted) "granted" else "denied")
            .put("batteryUnrestricted", if (power.isIgnoringBatteryOptimizations(ctx.packageName)) "granted" else "denied")
            .put("torch", if (AlertService.torchAvailable(ctx)) "granted" else "unsupported")
            .put("backgroundVoice", "unsupported")
            .put("alertActive", AlertService.active))
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        val alias = call.getString("name") ?: return call.reject("name required")
        if (alias == "notifications" && Build.VERSION.SDK_INT < 33) return getStatus(call)
        requestPermissionForAlias(alias, call, "permCallback")
    }

    @PermissionCallback
    private fun permCallback(call: PluginCall) = getStatus(call)

    @PluginMethod
    fun openSettings(call: PluginCall) {
        val pkg = Uri.parse("package:${context.packageName}")
        val i = when (call.getString("target")) {
            "notifications" -> Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            "fullScreenIntent" -> if (Build.VERSION.SDK_INT >= 34) Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkg) else Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)
            "dnd" -> Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
            "battery" -> Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
            else -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)
        }.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { context.startActivity(i); call.resolve() } catch (e: Exception) { call.reject("Settings screen unavailable on this device") }
    }

    @PluginMethod
    fun syncConfig(call: PluginCall) {
        val cfg = call.getObject("config") ?: return call.reject("config required")
        FmpStore.saveConfig(context, cfg)
        val c = FmpStore.config(context)
        if (c.smsEnabled && c.ownerAcknowledged) Notifications.postReady(context)
        call.resolve()
    }

    @PluginMethod
    fun startAlert(call: PluginCall) {
        val source = call.getString("source") ?: "manual"
        FmpStore.addEvent(context, source, "activated", false, call.getString("detail") ?: "Started from the app.")
        AlertController.start(context, source, false)
        call.resolve()
    }

    @PluginMethod
    fun stopAlert(call: PluginCall) { AlertController.stop(context, call.getString("reason") ?: "manual"); call.resolve() }

    @PluginMethod
    fun drainEvents(call: PluginCall) {
        call.resolve(JSObject().put("events", JSArray(FmpStore.drainEvents(context).toString())))
    }
}
