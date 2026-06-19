export const DOMAIN_BOUNDARY = {
  packageName: "@validade-zero/domain",
  owns: "future risk, lot, task, and audit business rules",
  forbiddenDependencies: ["apps/*", "database clients", "provider SDKs", "UI packages"],
  phaseOneStatus: "reserved-boundary-no-business-rules",
} as const;

export type DomainBoundary = typeof DOMAIN_BOUNDARY;

export function describeDomainBoundary(): string {
  return [
    `${DOMAIN_BOUNDARY.packageName} is reserved for ${DOMAIN_BOUNDARY.owns}.`,
    "Phase 1 intentionally avoids product, lot, task, and risk rules.",
    `Forbidden dependencies: ${DOMAIN_BOUNDARY.forbiddenDependencies.join(", ")}.`,
  ].join(" ");
}
