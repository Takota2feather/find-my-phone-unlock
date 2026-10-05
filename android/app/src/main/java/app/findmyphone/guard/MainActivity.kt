package app.findmyphone.guard

import android.os.Bundle
import app.findmyphone.guard.plugin.FindMyPhonePlugin
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(FindMyPhonePlugin::class.java)
        super.onCreate(savedInstanceState)
        Notifications.ensureChannels(this)
    }
}
