import { describe, expect, it } from "vitest";
import { bookingStartSchema } from "./index";

describe("public booking validation", () => {
  it("does not accept malformed email addresses", () => expect(bookingStartSchema.safeParse({}).success).toBe(false));
});
