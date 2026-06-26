import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = dirname(fileURLToPath(import.meta.url));
const appJson = JSON.parse(readFileSync(join(configDirectory, "app.json"), "utf8"));

export default function appConfig() {
  const expo = appJson.expo;
  const googleServicesFile = process.env.GOOGLE_SERVICES_FILE ?? "./google-services.json";
  const googleServicesPath = isAbsolute(googleServicesFile)
    ? googleServicesFile
    : join(configDirectory, googleServicesFile);
  const buildProfile = process.env.EAS_BUILD_PROFILE;
  const android = { ...expo.android };

  if (existsSync(googleServicesPath)) {
    android.googleServicesFile = googleServicesFile;
  } else if (process.env.GOOGLE_SERVICES_FILE !== undefined) {
    throw new Error(
      [
        "GOOGLE_SERVICES_FILE points to a missing file.",
        `Checked ${googleServicesPath}.`,
        "Point it to the Firebase Android google-services.json before running the build.",
      ].join(" "),
    );
  } else if (buildProfile === "staging" || buildProfile === "pilot") {
    throw new Error(
      [
        "Android push is required for this EAS profile.",
        `Place Firebase google-services.json at ${join(configDirectory, "google-services.json")}`,
        "or set GOOGLE_SERVICES_FILE to an existing file before running the build.",
      ].join(" "),
    );
  }

  return {
    ...expo,
    android,
  };
}
