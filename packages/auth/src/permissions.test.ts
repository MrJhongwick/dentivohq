import { describe, expect, it } from "vitest";
import { can } from "./permissions";

describe("clinic permissions", () => {
  it("allows owners to manage billing", () => expect(can("CLINIC_OWNER", "billing.manage")).toBe(true));
  it("does not allow assistants to manage staff", () => expect(can("DENTAL_ASSISTANT", "staff.update")).toBe(false));
});
