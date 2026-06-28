import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = dirname(fileURLToPath(import.meta.url));
const appJson = JSON.parse(readFileSync(join(configDirectory, "app.json"), "utf8"));

export default function appConfig() {
  const expo = appJson.expo;
  const explicitGoogleServicesFile = (
    process.env.GOOGLE_SERVICES_FILE ?? process.env.GOOGLE_SERVICES_JSON
  )?.trim();
  const localGoogleServicesFile = "./google-services.json";
  const useLocalGoogleServicesFile = process.env.VALIDADE_ZERO_USE_LOCAL_FIREBASE === "1";
  const android = { ...expo.android };
  const extra = {
    ...expo.extra,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? expo.extra?.EXPO_PUBLIC_API_URL,
    VALIDADE_ZERO_APP_ENV:
      process.env.VALIDADE_ZERO_APP_ENV ?? expo.extra?.VALIDADE_ZERO_APP_ENV ?? "staging",
    VALIDADE_ZERO_APPROVED_ARTIFACT_LABEL:
      process.env.VALIDADE_ZERO_APPROVED_ARTIFACT_LABEL ??
      expo.extra?.VALIDADE_ZERO_APPROVED_ARTIFACT_LABEL,
    VALIDADE_ZERO_APPROVED_APP_VERSION:
      process.env.VALIDADE_ZERO_APPROVED_APP_VERSION ??
      expo.extra?.VALIDADE_ZERO_APPROVED_APP_VERSION,
    VALIDADE_ZERO_APPROVED_BUILD:
      process.env.VALIDADE_ZERO_APPROVED_BUILD ?? expo.extra?.VALIDADE_ZERO_APPROVED_BUILD,
    VALIDADE_ZERO_BUILD_REF:
      process.env.VALIDADE_ZERO_BUILD_REF ?? expo.extra?.VALIDADE_ZERO_BUILD_REF,
  };

  if (explicitGoogleServicesFile !== undefined && explicitGoogleServicesFile.length > 0) {
    const googleServicesPath = isAbsolute(explicitGoogleServicesFile)
      ? explicitGoogleServicesFile
      : join(configDirectory, explicitGoogleServicesFile);
    if (!existsSync(googleServicesPath)) {
      throw new Error(
        [
          "GOOGLE_SERVICES_FILE points to a missing file.",
          `Checked ${googleServicesPath}.`,
          "Point it to the Firebase Android google-services.json before running the build.",
        ].join(" "),
      );
    }
    android.googleServicesFile = explicitGoogleServicesFile;
  } else if (
    useLocalGoogleServicesFile &&
    existsSync(join(configDirectory, localGoogleServicesFile))
  ) {
    android.googleServicesFile = localGoogleServicesFile;
  } else if (
    process.env.GOOGLE_SERVICES_FILE !== undefined ||
    process.env.GOOGLE_SERVICES_JSON !== undefined
  ) {
    throw new Error(
      [
        "GOOGLE_SERVICES_FILE is empty.",
        "Unset it for a sync-only APK or point it to an existing Firebase google-services.json.",
      ].join(" "),
    );
  }

  return {
    ...expo,
    android,
    extra,
  };
}
