export interface FictitiousStoreFixture {
  storeId: string;
  storeName: string;
  sector: "hortifruti";
  marker: "ficticio";
}

export interface FictitiousActorFixture {
  actorId: string;
  displayName: string;
  role: "collaborator" | "lead" | "admin";
  marker: "ficticio";
}

export interface FictitiousProductFixture {
  productId: string;
  productName: string;
  category: "ovos" | "embalado" | "flv-fresco";
  lotCode: string;
  marker: "ficticio";
}

export const fictitiousStore: FictitiousStoreFixture = {
  storeId: "loja-ficticia-001",
  storeName: "Loja Ficticia Jardim das Amostras",
  sector: "hortifruti",
  marker: "ficticio",
};

export const fictitiousLead: FictitiousActorFixture = {
  actorId: "lider-ficticio-001",
  displayName: "Lider Ficticio do Hortifruti",
  role: "lead",
  marker: "ficticio",
};

export const fictitiousProducts: readonly FictitiousProductFixture[] = [
  {
    productId: "produto-ficticio-ovos-001",
    productName: "Ovos Ficticios Granja Exemplo",
    category: "ovos",
    lotCode: "LOTE-FICTICIO-OVOS-001",
    marker: "ficticio",
  },
  {
    productId: "produto-ficticio-maca-001",
    productName: "Maca Ficticia de Teste",
    category: "flv-fresco",
    lotCode: "LOTE-FICTICIO-FLV-001",
    marker: "ficticio",
  },
];

export function assertFixtureIsFictitious(
  fixture: { marker?: string; storeName?: string; displayName?: string; productName?: string },
): void {
  const searchableText = [
    fixture.marker,
    fixture.storeName,
    fixture.displayName,
    fixture.productName,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ")
    .toLowerCase();

  if (!searchableText.includes("ficticio") && !searchableText.includes("ficticia")) {
    throw new Error("Fixture must be explicitly marked as fictitious.");
  }
}
