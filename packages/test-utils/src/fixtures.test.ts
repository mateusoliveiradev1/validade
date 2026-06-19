import { describe, expect, it } from "vitest";
import {
  allFictitiousFixtures,
  evidenceFixture,
  lotFixture,
  productFixture,
  storeFixture,
  userFixture,
} from "./fixtures";

const fictitiousMarker = /(FICTICIO|FICTICIA|EXEMPLO)/;

describe("fictitious operational fixtures", () => {
  it("exports store, user, product, lot, and evidence examples", () => {
    expect(storeFixture.storeName).toContain("FICTICIA");
    expect(userFixture.displayName).toContain("Exemplo");
    expect(productFixture.productName).toContain("Exemplo");
    expect(lotFixture.lotCode).toContain("FICTICIO");
    expect(evidenceFixture.objectKey).toContain("ficticias");
  });

  it("marks every operational-looking string as fictitious or example data", () => {
    for (const fixture of allFictitiousFixtures) {
      for (const value of Object.values(fixture)) {
        if (typeof value === "string") {
          expect(value).toMatch(fictitiousMarker);
        }
      }
    }
  });
});
