import { BackHandler } from "react-native";

export interface HardwareBackSubscription {
  remove(): void;
}

export function addHardwareBackPressListener(handler: () => boolean): HardwareBackSubscription {
  return BackHandler.addEventListener("hardwareBackPress", handler);
}
