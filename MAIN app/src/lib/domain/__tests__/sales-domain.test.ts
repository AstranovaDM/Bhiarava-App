import { describe, expect, it } from "vitest";
import { salesAccessForRole, canEditSalesOps } from "../project-permissions";

describe("sales permissions", () => {
  it("Founder/Admin full; Finance/Viewer read; Agent limited; Customer denied", () => {
    expect(salesAccessForRole("Founder")).toBe("full");
    expect(salesAccessForRole("Administrator")).toBe("full");
    expect(salesAccessForRole("Finance")).toBe("read");
    expect(salesAccessForRole("Viewer")).toBe("read");
    expect(salesAccessForRole("Agent")).toBe("limited");
    expect(salesAccessForRole("Customer")).toBe("denied");
    expect(canEditSalesOps("Administrator")).toBe(true);
    expect(canEditSalesOps("Finance")).toBe(false);
    expect(canEditSalesOps("Agent")).toBe(false);
  });
});
