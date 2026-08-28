import { describe, expect, it } from "vitest";
import { getSafeAuthError } from "./auth-errors";

describe("getSafeAuthError", () => {
  it("maps known authentication errors to safe copy", () => {
    expect(getSafeAuthError({ code: "INVALID_EMAIL_OR_PASSWORD", message: "database detail" })).toBe("The email or password is incorrect.");
  });

  it("does not expose unknown provider messages", () => {
    expect(getSafeAuthError({ code: "UNKNOWN", message: "sensitive provider detail" })).toBe("We could not complete that request. Please try again.");
  });
});
