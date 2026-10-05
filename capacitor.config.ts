import type { CapacitorConfig } from "@capacitor/cli";

// The UI is a server-rendered web app, so the native shell loads the hosted
// build. Native features come from the Kotlin `FindMyPhone` plugin, which the
// Capacitor bridge exposes to that page. `native-shell/` is only an offline
// fallback page.
const config: CapacitorConfig = {
  appId: "app.findmyphone.guard",
  appName: "FindMyPhone",
  webDir: "native-shell",
  server: {
    url: "https://find-my-phone-unlcok.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: { allowMixedContent: false },
};

export default config;
