export const storeFixture = {
  storeId: "LOJA-FICTICIA-001",
  storeName: "Loja FICTICIA 001",
  sectorName: "Hortifruti EXEMPLO",
  marker: "FICTICIO",
} as const;

export const userFixture = {
  userId: "USUARIO-FICTICIO-001",
  displayName: "Colaborador Exemplo FICTICIO",
  roleName: "COLABORADOR-FICTICIO",
  marker: "FICTICIO",
} as const;

export const productFixture = {
  productId: "PRODUTO-FICTICIO-OVOS-001",
  productName: "Ovos Brancos Exemplo FICTICIO",
  categoryName: "Categoria FICTICIA Ovos",
  marker: "FICTICIO",
} as const;

export const lotFixture = {
  lotId: "LOTE-FICTICIO-ID-001",
  lotCode: "LOTE-FICTICIO-001",
  expiresAt: "DATA-EXEMPLO-2030-01-15",
  locationName: "Camara FICTICIA 01",
  marker: "FICTICIO",
} as const;

export const evidenceFixture = {
  evidenceId: "EVIDENCIA-FICTICIA-001",
  objectKey: "evidencias/ficticias/etiqueta-exemplo.jpg",
  description: "Foto EXEMPLO de etiqueta FICTICIA",
  marker: "FICTICIO",
} as const;

export const allFictitiousFixtures = [
  storeFixture,
  userFixture,
  productFixture,
  lotFixture,
  evidenceFixture,
] as const;
