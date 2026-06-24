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
  const android = { ...expo.android };

  if (existsSync(googleServicesPath) || process.env.GOOGLE_SERVICES_FILE !== undefined) {
    android.googleServicesFile = googleServicesFile;
  }

  return {
    ...expo,
    android,
  };
}
