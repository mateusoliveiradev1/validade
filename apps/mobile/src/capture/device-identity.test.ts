import { describe, expect, it } from "vitest";
import { createDeviceInstallId, deviceIdForStore } from "./device-identity";

describe("device identity", () => {
  it("builds a stable contract-safe id scoped by store and install", () => {
    const installId = createDeviceInstallId(() => "Install ABC 123");
    const deviceId = deviceIdForStore("Loja 18 - Staging", installId);

    expect(deviceId).toBe("validade-zero-mobile:loja-18-staging:install-abc-123");
    expect(deviceId.length).toBeLessThanOrEqual(120);
  });

  it("keeps two physical installs in the same store separated", () => {
    const first = deviceIdForStore("loja-18", "install-um");
    const second = deviceIdForStore("loja-18", "install-dois");

    expect(first).not.toBe(second);
    expect(first).toBe("validade-zero-mobile:loja-18:install-um");
    expect(second).toBe("validade-zero-mobile:loja-18:install-dois");
  });

  it("trims long values to the mobile prepare-turn device contract", () => {
    const deviceId = deviceIdForStore("loja-".repeat(20), "install-".repeat(20));

    expect(deviceId.length).toBeLessThanOrEqual(120);
  });
});
