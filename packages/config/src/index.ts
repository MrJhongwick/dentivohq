import { z } from "zod";

export const PRODUCT_NAME = "DentivoHQ";
export const DEFAULT_SLOT_INTERVAL_MINUTES = 15;

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().min(3),
  LANDING_URL: z.string().url(),
  DASHBOARD_URL: z.string().url(),
  CONSOLE_URL: z.string().url(),
  API_URL: z.string().url().optional(),
  R2_BUCKET_NAME: z.string().min(1),
  BOOKING_VERIFICATION_SECRET: z.string().min(32)
});

export type AppEnv = z.infer<typeof envSchema>;

export const MVP_PLAN = {
  code: "MVP",
  name: "DentivoHQ MVP",
  entitlements: {
    maxLocations: 3,
    maxDentists: 15,
    maxStaff: 25,
    fileStorageBytes: 1_073_741_824,
    emailReminders: true
  }
} as const;

export type Entitlement = keyof typeof MVP_PLAN.entitlements;

export function assertWithinEntitlement(current: number, entitlement: "maxLocations" | "maxDentists" | "maxStaff") {
  const limit = MVP_PLAN.entitlements[entitlement];
  if (current >= limit) throw new Error(`ENTITLEMENT_${entitlement.toUpperCase()}_EXCEEDED`);
}
