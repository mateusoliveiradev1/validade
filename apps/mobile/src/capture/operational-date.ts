const OPERATIONAL_TIME_ZONE = "America/Sao_Paulo";

export function operationalDateKey(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: OPERATIONAL_TIME_ZONE,
  }).formatToParts(value);
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";

  return `${year}-${month}-${day}`;
}

export function dateOnlyUtcMillis(value: string): number {
  const [year = "1970", month = "01", day = "01"] = value.split("-");

  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

export function dateKeyFromUtcMillis(value: number): string {
  const date = new Date(value);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}
