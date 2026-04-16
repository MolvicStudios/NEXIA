import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pro.molvicstudios.nexia',
  appName: 'NEXIA',
  webDir: 'www', // Capacitor 6 no admite '.' — assets se sirven desde www/
  server: {
    // Desarrollo con livereload: descomentar y poner IP local
    // url: 'http://192.168.X.X:8080',
    // cleartext: true,
  },
  android: {
    minWebViewVersion: 72,
    backgroundColor: '#06060F',
    buildOptions: {
      keystorePath: '../nexia-keystores/nexia.keystore',
      keystoreAlias: 'nexia-key',
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#06060F',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1E0878',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
