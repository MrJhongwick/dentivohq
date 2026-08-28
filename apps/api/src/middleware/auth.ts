import { and, eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { createAuth } from "@dentivohq/auth";
import { clinicMembers, createDatabase } from "@dentivohq/db";
import type { AppEnv } from "../types";
import { AppError } from "../errors";

export const authenticate: MiddlewareHandler<AppEnv> = async (c, next) => {
  const db = createDatabase(c.env.DATABASE_URL);
  const auth = createAuth(db, { BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET, BETTER_AUTH_URL: c.env.BETTER_AUTH_URL, GOOGLE_CLIENT_ID: c.env.GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: c.env.GOOGLE_CLIENT_SECRET, trustedOrigins: [c.env.LANDING_URL, c.env.DASHBOARD_URL, c.env.CONSOLE_URL] });
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new AppError("AUTHENTICATION_REQUIRED", "Sign in to continue.", 401);
  c.set("user", { id: session.user.id, email: session.user.email, name: session.user.name, platformAdmin: Boolean((session.user as { platformAdmin?: boolean }).platformAdmin) });
  await next();
};

export const resolveClinic: MiddlewareHandler<AppEnv> = async (c, next) => {
  const clinicId = c.req.param("clinicId");
  if (!clinicId) throw new AppError("CLINIC_CONTEXT_REQUIRED", "A clinic context is required.", 400);
  const user = c.get("user");
  const db = createDatabase(c.env.DATABASE_URL);
  const [membership] = await db.select().from(clinicMembers).where(and(eq(clinicMembers.clinicId, clinicId), eq(clinicMembers.userId, user.id), eq(clinicMembers.status, "ACTIVE"))).limit(1);
  if (!membership) throw new AppError("CLINIC_ACCESS_DENIED", "You do not have access to this clinic.", 403);
  c.set("clinicId", clinicId); c.set("membershipRole", membership.role);
  await next();
};
