# Find My Phone Unlock

Build a polished Android-first "Find My Phone" companion app called "FindMyPhone".

Core goal:
Create a control/configuration app for a native Android implementation that can locate a misplaced phone using safe, user-enabled triggers. The web app should be honest about browser limitations: it is the control/dashboard and prototype, while SMS interception, microphone wake-word detection, flashlight control, alarm playback over lock screen, foreground/background services, notification permissions, and device-admin/lock-state integration require a native Android app/service. Do not claim a web browser can perform those native capabilities.

Build these main screens/features:
1. Onboarding/setup explaining that the user installs/enables the Android companion service, grants SMS, microphone, notification, and audio permissions as needed, and can disable any trigger.
2. Dashboard with large "Phone status" card and trigger controls.
3. SMS trigger configuration:
   - Enable/disable SMS trigger.
   - Default trigger phrase "find my phone".
   - Context-aware matching option: detect the phrase in incoming SMS rather than exact-match-only. Explain that matching should be conservative and avoid triggering on messages discussing the phrase unless the implementation explicitly recognizes an actionable request.
   - Optional secure challenge mode. When enabled, an incoming actionable trigger causes the phone to send a reply such as "Password?" and waits for a configurable password response. Only the correct password activates the alarm. Include a timeout/attempt limit setting and a safe default.
   - When secure mode is disabled, the actionable SMS trigger directly activates the configured alert.
4. Voice trigger configuration:
   - User records a custom phrase and uploads/records their own voice sample in the UI as a prototype.
   - Show that a real Android app should use on-device wake-word/speaker verification; do not pretend browser speech recognition can continuously listen while backgrounded.
   - Controls for sensitivity, enabled/disabled, and test phrase.
5. Alert configuration:
   - Alarm sound selection and volume behavior.
   - Flashlight behavior: steady, blink pattern, interval.
   - Combined flashlight + alarm toggle.
   - Stop condition: "stop when phone is unlocked" and optional manual stop action.
   - Clear safety copy: user must be the device owner/authorized user; the app should not silently track people or activate another person's device.
6. Trigger event history showing timestamp, source (SMS/voice/manual), result, and whether secure challenge was used. Provide clear status badges.
7. Native Android implementation guide page with a concrete checklist of APIs/services that the eventual Android companion app will need (SMS receiver/default SMS app limitations, foreground service, notification channel/full-screen alert considerations, audio focus, camera flashlight/torch APIs, microphone permission, wake-word/on-device speaker verification, boot completed re-registration where appropriate, and unlock-state detection). Make it clear which pieces are platform/version-dependent.
8. A prominent "Test alert" button that only simulates the behavior in the web UI, with an animation and sound preview, never implying it controls the real phone.

Design:
- Dark, premium utility/security aesthetic, but friendly and easy to understand.
- Mobile responsive, excellent on Android-sized screens.
- Use accessible cards, switches, tabs, and clear status badges.
- Avoid unnecessary visual clutter.
- Add a setup progress indicator.
- Include a simulated live device panel with flashlight state and alarm state.
- Provide concise inline explanations for permissions and limitations.

Technical:
- Use TypeScript, Tailwind, shadcn/ui.
- Create clean reusable components.
- Persist configuration and event history using local storage for the prototype, with a structure that can later map to Supabase.
- Add a native-integration abstraction/service interface so the UI is ready for a future Android bridge, but make the current web implementation a simulation.
- Include robust validation for password settings and recording state.
- Do not implement covert surveillance, remote control of third-party devices, or stealth persistence.
- Make the product copy explicit that activation is owner-controlled and user-authorized.
- Include an "Android implementation notes" section documenting the browser/native boundary and the exact pieces that need a native Android companion.

Also include a polished landing/hero state on first load and a working settings flow. Make the UI feel like a real shippable product rather than a wireframe.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://find-my-phone-unlcok.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/776bc41c-f835-4c9c-8796-99cfb5fef299).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
