export const DOMAIN_BOUNDARY = {
  packageName: "@validade-zero/domain",
  owns: "pure product, lot, risk, presence, and task-command business rules",
  forbiddenDependencies: ["apps/*", "database clients", "provider SDKs", "UI packages"],
  phaseTwoStatus: "domain-vocabulary-active-no-infrastructure-dependencies",
} as const;

export type DomainBoundary = typeof DOMAIN_BOUNDARY;

export function describeDomainBoundary(): string {
  return [
    `${DOMAIN_BOUNDARY.packageName} owns ${DOMAIN_BOUNDARY.owns}.`,
    "It exposes pure TypeScript vocabulary and rules for future apps to consume.",
    `Forbidden dependencies: ${DOMAIN_BOUNDARY.forbiddenDependencies.join(", ")}.`,
  ].join(" ");
}

export * from "./presence";
export * from "./profiles";
export * from "./risk";
export * from "./alerts";
export * from "./markdown";
export * from "./sync";
export * from "./tasks";
export * from "./types";
