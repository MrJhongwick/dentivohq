import type { AuthUser } from "@dentivohq/types";

export type RateLimiter = { limit(input: { key: string }): Promise<{ success: boolean }> };
export type Bindings = {
  DATABASE_URL: string; BETTER_AUTH_SECRET: string; BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string; RESEND_API_KEY?: string;
  EMAIL_FROM: string; LANDING_URL: string; DASHBOARD_URL: string; CONSOLE_URL: string;
  BOOKING_VERIFICATION_SECRET: string; FILES: R2Bucket; PUBLIC_BOOKING_RATE_LIMITER: RateLimiter;
};
export type Variables = { user: AuthUser; clinicId: string; membershipRole: string };
export type AppEnv = { Bindings: Bindings; Variables: Variables };
