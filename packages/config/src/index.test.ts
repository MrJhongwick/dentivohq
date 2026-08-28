import { describe, expect, it } from "vitest";
import { assertWithinEntitlement } from "./index";

describe("entitlements", () => {
  it("allows capacity below the configured limit", () => expect(() => assertWithinEntitlement(2, "maxLocations")).not.toThrow());
  it("rejects capacity at the configured limit", () => expect(() => assertWithinEntitlement(3, "maxLocations")).toThrow(/ENTITLEMENT/));
});
