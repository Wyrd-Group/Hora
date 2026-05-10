import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Hora — mobile-first finance-themed strategy game.
 *
 * Configured for portrait-locked mobile gameplay (per docs/GAME_DESIGN.md).
 * The Hora gold-to-coral warm palette replaces AEGIS's deep-navy intelligence-
 * platform aesthetic — see docs/VISUAL_DIRECTION.md for the rationale.
 *
 * The directory is still apps/hora/ pre-rename; the appId and appName
 * already reflect Hora. The rename to apps/hora/ is scheduled as the
 * very first PR after this scaffold.
 */
const config: CapacitorConfig = {
  appId: 'com.quadratic.hora',
  appName: 'Hora',
  webDir: 'dist',
  server: {
    // In dev, point to Vite dev server for hot reload
    // Comment out for production builds
    // url: 'http://localhost:5173',
    // cleartext: true,
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#FFB820', // Hora gold — splash + status-bar tint
    scheme: 'Hora',
  },
  android: {
    backgroundColor: '#FFB820',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500, // tighter than AEGIS — Hora is "tap-to-play", waste no time
      launchAutoHide: true,
      backgroundColor: '#FFB820',
      showSpinner: false,
      launchFadeOutDuration: 350,
      // Mobile-game players expect the splash to feel snappy, not cinematic.
      // No spinner — the Hora hourglass sigil animates instead (handled by
      // the splash image bundle).
    },
    StatusBar: {
      style: 'LIGHT', // white icons over the warm gold background
      backgroundColor: '#FFB820',
      // Portrait-only — keep the status bar managed by us, never let it
      // overlap the gold counter on the top bar.
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    Haptics: {
      // No options — using @capacitor/haptics with default settings.
      // Hora's design requires haptic feedback on every meaningful tap.
      // See docs/VISUAL_DIRECTION.md § Sound design + Animation language.
    },
  },
  // Portrait-only on iOS. Android's orientation is set in
  // android/app/src/main/AndroidManifest.xml — Hora locks every Activity
  // to android:screenOrientation="portrait". Tablets render the same
  // portrait column centred on a wider gold-to-coral backdrop.
};

export default config;
