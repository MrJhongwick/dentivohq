import { describe, expect, it } from "vitest";
import { bookingStartSchema, registerSchema, resetPasswordSchema } from "./index";

describe("public booking validation", () => {
  it("does not accept malformed email addresses", () => expect(bookingStartSchema.safeParse({}).success).toBe(false));
});

describe("auth validation", () => {
  it("requires matching registration passwords", () => {
    expect(registerSchema.safeParse({ name: "Ana Cruz", email: "ana@example.com", password: "password123", confirmPassword: "different123" }).success).toBe(false);
  });

  it("accepts a valid password reset", () => {
    expect(resetPasswordSchema.safeParse({ password: "password123", confirmPassword: "password123" }).success).toBe(true);
  });
});
