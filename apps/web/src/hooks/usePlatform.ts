import { Capacitor } from "@capacitor/core";

export function usePlatform() {
  const platform = Capacitor.getPlatform();
  return {
    isWeb: platform === "web",
    isIOS: platform === "ios",
    isAndroid: platform === "android",
    isNative: Capacitor.isNativePlatform()
  };
}
