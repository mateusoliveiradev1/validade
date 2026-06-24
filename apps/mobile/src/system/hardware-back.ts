declare const require: (moduleName: string) => unknown;

export interface HardwareBackSubscription {
  remove(): void;
}

interface HardwareBackPort {
  BackHandler?: {
    addEventListener(
      eventName: "hardwareBackPress",
      handler: () => boolean,
    ): HardwareBackSubscription;
  };
}

const noopSubscription: HardwareBackSubscription = {
  remove() {
    return;
  },
};

export function addHardwareBackPressListener(
  handler: () => boolean,
): HardwareBackSubscription {
  const moduleLoader = resolveModuleLoader();
  if (moduleLoader === undefined) return noopSubscription;

  try {
    const reactNative = moduleLoader("react-native") as HardwareBackPort;
    return reactNative.BackHandler?.addEventListener("hardwareBackPress", handler) ?? noopSubscription;
  } catch {
    return noopSubscription;
  }
}

function resolveModuleLoader(): ((moduleName: string) => unknown) | undefined {
  const globalRequire = (globalThis as { require?: (moduleName: string) => unknown }).require;
  if (typeof globalRequire === "function") return globalRequire;
  if (typeof require === "function") return require;
  return undefined;
}
