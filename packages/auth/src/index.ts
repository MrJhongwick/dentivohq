import { betterAuth, type BetterAuthOptions } from "better-auth";
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
};

export type AuthEmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type AuthDependencies = {
  sendEmail(message: AuthEmailMessage): Promise<unknown>;
  waitUntil?(promise: Promise<unknown>): void;
};

export function createAuthOptions(env: AuthEnv, dependencies: AuthDependencies): BetterAuthOptions {
  const socialProviders = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
  } : undefined;

  const deliver = async (message: AuthEmailMessage) => {
    const delivery = dependencies.sendEmail(message);
    if (dependencies.waitUntil) {
      dependencies.waitUntil(delivery);
      return;
    }
    await delivery;
  };

  return {
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.trustedOrigins,
    user: { additionalFields: { platformAdmin: { type: "boolean", fieldName: "platform_admin", input: false, defaultValue: false } } },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => deliver({
        to: user.email,
        subject: "Reset your DentivoHQ password",
        text: `Reset your DentivoHQ password: ${url}\n\nIf you did not request this, you can ignore this message.`
      })
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => deliver({
        to: user.email,
        subject: "Verify your DentivoHQ email",
        text: `Verify your email address to use DentivoHQ: ${url}\n\nIf you did not create this account, you can ignore this message.`
      })
    },
    socialProviders,
    advanced: { useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://") }
  };
}

export function createAuth(db: Database, env: AuthEnv, dependencies: AuthDependencies) {
  return betterAuth({
    ...createAuthOptions(env, dependencies),
    database: drizzleAdapter(db, { provider: "pg", schema: { user: users, session: sessions, account: accounts, verification: verifications } })
  });
}
