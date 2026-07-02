import { describe, expect, it } from "vitest";
import { readMobileBuildInfo } from "./build-info";

describe("mobile build info", () => {
  it("prefers native Android build metadata and compares it to the approved staging artifact", () => {
    const info = readMobileBuildInfo({
      application: {
        applicationId: "com.validadezero.app",
        nativeApplicationVersion: "0.12.0",
        nativeBuildVersion: "138",
      },
      constants: {
        default: {
          expoConfig: {
            version: "0.0.0",
            android: { package: "com.validadezero.dev", versionCode: 1 },
            extra: {
              EXPO_PUBLIC_API_URL: "https://api.ficticia.invalid",
              VALIDADE_ZERO_APP_ENV: "staging",
              VALIDADE_ZERO_APPROVED_ARTIFACT_LABEL: "uat15-sync-debug-apk-138",
              VALIDADE_ZERO_APPROVED_APP_VERSION: "0.12.0",
              VALIDADE_ZERO_APPROVED_BUILD: "138",
              VALIDADE_ZERO_BUILD_REF: "uat14-public",
            },
          },
        },
      },
    });

    expect(info).toMatchObject({
      appVersion: "0.12.0",
      appBuild: "138",
      environment: "staging",
      apiTarget: "https://api.ficticia.invalid",
      packageId: "com.validadezero.app",
      approvedArtifactLabel: "uat15-sync-debug-apk-138",
      approvedAppVersion: "0.12.0",
      approvedBuild: "138",
      buildRef: "uat14-public",
      buildCompatibility: "atual",
    });
  });

  it("falls back to Expo config when native metadata is unavailable", () => {
    const info = readMobileBuildInfo({
      application: {},
      constants: {
        expoConfig: {
          version: "0.12.0",
          android: { package: "com.validadezero.app", versionCode: 164 },
          extra: {},
        },
      },
    });

    expect(info).toMatchObject({
      appVersion: "0.12.0",
      appBuild: "164",
      packageId: "com.validadezero.app",
      buildCompatibility: "atual",
    });
  });

  it("marks old, future, and unknown builds without leaking raw build URLs", () => {
    const longRef = "abcdef1234567890abcdef1234567890abcdef12";
    const oldBuild = readMobileBuildInfo({
      application: {
        nativeApplicationVersion: "0.11.0",
        nativeBuildVersion: "110",
      },
      constants: { expoConfig: { extra: {} } },
    });
    const futureBuild = readMobileBuildInfo({
      application: {
        nativeApplicationVersion: "0.13.0",
        nativeBuildVersion: "133",
      },
      constants: { expoConfig: { extra: {} } },
    });
    const unknownBuild = readMobileBuildInfo({
      application: {},
      constants: {
        expoConfig: {
          extra: {
            VALIDADE_ZERO_APPROVED_ARTIFACT_LABEL:
              "https://expo.dev/artifacts/ficticio?token=segredo",
            VALIDADE_ZERO_BUILD_REF: longRef,
          },
        },
      },
    });

    expect(oldBuild.buildCompatibility).toBe("desatualizado");
    expect(futureBuild.buildCompatibility).toBe("incompativel");
    expect(unknownBuild.buildCompatibility).toBe("desconhecido");
    expect(unknownBuild.approvedArtifactLabel).toBe("uat34-init-central-refresh-apk-164");
    expect(unknownBuild.approvedBuild).toBe("164");
    expect(unknownBuild.buildRef).not.toBe(longRef);
    expect(unknownBuild.buildRef).toMatch(/^abcdef123\.\.\./);
    expect(JSON.stringify(unknownBuild)).not.toMatch(/token|segredo|expo\.dev|abcdef1234567890/i);
  });
});
