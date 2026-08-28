import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Database } from "@dentivohq/db";
import { accounts, sessions, users, verifications } from "@dentivohq/db";

export * from "./permissions";

export type AuthEnv = {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string | undefined;
  GOOGLE_CLIENT_SECRET: string | undefined;
  trustedOrigins: string[];
  sendEmail: (message: { to: string; subject: string; text: string }) => Promise<unknown>;
};

export function createAuth(db: Database, env: AuthEnv) {
  const socialProviders = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
  } : undefined;

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.trustedOrigins,
    database: drizzleAdapter(db, { provider: "pg", schema: { user: users, session: sessions, account: accounts, verification: verifications } }),
    user: { additionalFields: { platformAdmin: { type: "boolean", fieldName: "platform_admin", input: false, defaultValue: false } } },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await env.sendEmail({ to: user.email, subject: "Reset your DentivoHQ password", text: `Reset your password: ${url}` });
      }
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      sendVerificationEmail: async ({ user, url }) => {
        await env.sendEmail({ to: user.email, subject: "Verify your DentivoHQ email", text: `Verify your email address: ${url}` });
      }
    },
    socialProviders,
    advanced: { useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://") }
  });
}
