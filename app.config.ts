import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "jb-sw-integrated-info",
  slug: "jb-sw-integrated-info",
  scheme: "jb-sw-info",
  owner: "m-se0k",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.jbnu.jbswnow",
  },
  android: {
    package: "com.jbnu.jbswnow",
    adaptiveIcon: {
      backgroundColor: "#ffffff",
    },
  },
  web: {
    bundler: "metro",
    output: "static",
  },
  experiments: {
    typedRoutes: true,
  },
  plugins: [
    ["expo-router"],
    ["expo-notifications"],
    ["expo-secure-store"],
    ["expo-font"],
    ["expo-firebase-core", { ios: { googleServicesFile: "./GoogleService-Info.plist" } }],
  ],
  
  extra: {
    router: {
      // origin: "expo",
      origin: "https://localhost:8081",
    },
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
    },
    eas: {
      projectId: "af95bb91-387a-49fd-9652-513f03fffcc7",
    },
  },
});


