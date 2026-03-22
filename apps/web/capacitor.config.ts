import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lubna.app",
  appName: "Lubna",
  webDir: "dist",
  server: {
    androidScheme: "https"
  },
  plugins: {
    SpeechRecognition: {},
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    CapacitorCookies: {
      enabled: true
    }
  }
};

export default config;
