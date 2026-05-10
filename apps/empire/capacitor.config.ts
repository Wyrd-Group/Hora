import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quadratic.aegis',
  appName: 'AEGIS Empire',
  webDir: 'dist',
  server: {
    // In dev, point to Vite dev server for hot reload
    // Comment out for production builds
    // url: 'http://localhost:6969',
    // cleartext: true,
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#060a12',
  },
  android: {
    backgroundColor: '#060a12',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#060a12',
      showSpinner: false,
      launchFadeOutDuration: 500,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#060a12',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
