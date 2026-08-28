import { createAuth } from "@dentivohq/auth";
import { createDatabase } from "@dentivohq/db";
import type { Context } from "hono";
import { sendEmail } from "./services";
import type { AppEnv } from "./types";

export function createAppAuth(c: Context<AppEnv>) {
  return createAuth(
    createDatabase(c.env.DATABASE_URL),
    {
      BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
      GOOGLE_CLIENT_ID: c.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: c.env.GOOGLE_CLIENT_SECRET,
      trustedOrigins: [c.env.LANDING_URL, c.env.DASHBOARD_URL, c.env.CONSOLE_URL]
    },
    {
      sendEmail: (message) => sendEmail(c.env.RESEND_API_KEY, c.env.EMAIL_FROM, message),
      waitUntil: (promise) => c.executionCtx.waitUntil(promise)
    }
  );
}
