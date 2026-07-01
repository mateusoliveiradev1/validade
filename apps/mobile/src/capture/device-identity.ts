const DEVICE_ID_PREFIX = "validade-zero-mobile";
const MAX_DEVICE_ID_LENGTH = 120;
const MAX_STORE_SEGMENT_LENGTH = 40;
const MAX_INSTALL_SEGMENT_LENGTH = 56;

export function createDeviceInstallId(createId: () => string): string {
  const normalized = normalizeDeviceIdentitySegment(createId(), MAX_INSTALL_SEGMENT_LENGTH);

  if (normalized.length >= 8) {
    return normalized;
  }

  return `install-${Date.now().toString(36)}`;
}

export function deviceIdForStore(storeId: string, installId: string): string {
  const storeSegment = normalizeDeviceIdentitySegment(storeId, MAX_STORE_SEGMENT_LENGTH) || "loja";
  const installSegment =
    normalizeDeviceIdentitySegment(installId, MAX_INSTALL_SEGMENT_LENGTH) ||
    createDeviceInstallId(() => installId);
  const deviceId = `${DEVICE_ID_PREFIX}:${storeSegment}:${installSegment}`;

  if (deviceId.length <= MAX_DEVICE_ID_LENGTH) {
    return deviceId;
  }

  return `${DEVICE_ID_PREFIX}:${storeSegment}:${installSegment.slice(
    0,
    Math.max(8, MAX_DEVICE_ID_LENGTH - DEVICE_ID_PREFIX.length - storeSegment.length - 2),
  )}`;
}

export function normalizeDeviceIdentitySegment(value: string, maxLength: number): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, maxLength);
}
