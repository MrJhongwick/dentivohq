import { describe, expect, it } from "vitest";
import { canTransition } from "./status";
describe("appointment transitions", () => {
  it("allows check-in after confirmation", () => expect(canTransition("CONFIRMED", "CHECKED_IN")).toBe(true));
  it("keeps completed appointments terminal", () => expect(canTransition("COMPLETED", "CANCELLED")).toBe(false));
});
