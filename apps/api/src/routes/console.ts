import { count, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { auditLogs, clinicLocations, clinics, createDatabase, subscriptions } from "@dentivohq/db";
import type { AppEnv } from "../types";
import { AppError } from "../errors";

export const consoleRoute = new Hono<AppEnv>();
consoleRoute.use("*", async (c, next) => { if (!c.get("user").platformAdmin) throw new AppError("PLATFORM_ADMIN_REQUIRED", "Platform administrator access is required.", 403); await next(); });
consoleRoute.get("/clinics", async (c) => { const db = createDatabase(c.env.DATABASE_URL); const rows = await db.select({ id: clinics.id, name: clinics.name, slug: clinics.slug, active: clinics.active, planCode: subscriptions.planCode, subscriptionStatus: subscriptions.status, createdAt: clinics.createdAt, locationCount: count(clinicLocations.id) }).from(clinics).leftJoin(subscriptions, eq(subscriptions.clinicId, clinics.id)).leftJoin(clinicLocations, eq(clinicLocations.clinicId, clinics.id)).groupBy(clinics.id, subscriptions.planCode, subscriptions.status).orderBy(desc(clinics.createdAt)).limit(100); return c.json({ data: rows }); });
consoleRoute.get("/audit", async (c) => { const db = createDatabase(c.env.DATABASE_URL); return c.json({ data: await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100) }); });
