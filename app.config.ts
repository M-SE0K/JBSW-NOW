import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "jb-sw-integrated-info",
  slug: "jb-sw-integrated-info",
  scheme: "jb-sw-info",
  owner: undefined,
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
  },
  android: {
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
  ],
  extra: {
    router: {
      // origin: "expo",
      origin: "https://localhost:8081",
    },
  },
});


