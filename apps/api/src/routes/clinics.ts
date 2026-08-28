import { and, count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requirePermission, type ClinicRole, type Permission } from "@dentivohq/auth";
import { auditLogs, clinicLocations, clinicMembers, clinics, clinicSettings, createDatabase, subscriptions } from "@dentivohq/db";
import { createClinicSchema, createLocationSchema } from "@dentivohq/validation";
import { assertWithinEntitlement } from "@dentivohq/config";
import { slugify } from "@dentivohq/utils";
import type { AppEnv } from "../types";
import { AppError } from "../errors";

export const clinicsRoute = new Hono<AppEnv>();

clinicsRoute.get("/", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL); const user = c.get("user");
  const rows = await db.select({ id: clinics.id, name: clinics.name, slug: clinics.slug, role: clinicMembers.role }).from(clinicMembers).innerJoin(clinics, eq(clinics.id, clinicMembers.clinicId)).where(and(eq(clinicMembers.userId, user.id), eq(clinicMembers.status, "ACTIVE")));
  return c.json({ data: rows });
});

clinicsRoute.post("/", async (c) => {
  const input = createClinicSchema.safeParse(await c.req.json()); if (!input.success) throw new AppError("VALIDATION_ERROR", "Clinic details are invalid.");
  const db = createDatabase(c.env.DATABASE_URL); const user = c.get("user");
  const baseSlug = slugify(input.data.name); const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
  const result = await db.transaction(async (tx) => {
    const [clinic] = await tx.insert(clinics).values({ name: input.data.name, slug }).returning(); if (!clinic) throw new Error("CLINIC_INSERT_FAILED");
    await tx.insert(clinicMembers).values({ clinicId: clinic.id, userId: user.id, role: "CLINIC_OWNER", status: "ACTIVE" });
    await tx.insert(clinicSettings).values({ clinicId: clinic.id });
    await tx.insert(subscriptions).values({ clinicId: clinic.id, planCode: "MVP", status: "ACTIVE" });
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId: user.id, action: "CLINIC_CREATED", resourceType: "clinic", resourceId: clinic.id });
    return clinic;
  });
  return c.json({ data: result }, 201);
});

function permit(role: string, permission: Permission) { try { requirePermission(role as ClinicRole, permission); } catch { throw new AppError("AUTHORIZATION_DENIED", "You do not have permission to perform this action.", 403); } }

clinicsRoute.post("/:clinicId/locations", async (c) => {
  permit(c.get("membershipRole"), "clinic.settings.update");
  const input = createLocationSchema.safeParse(await c.req.json()); if (!input.success) throw new AppError("VALIDATION_ERROR", "Location details are invalid.");
  const db = createDatabase(c.env.DATABASE_URL); const clinicId = c.get("clinicId");
  const [total] = await db.select({ value: count() }).from(clinicLocations).where(eq(clinicLocations.clinicId, clinicId));
  try { assertWithinEntitlement(total?.value ?? 0, "maxLocations"); } catch { throw new AppError("PLAN_LIMIT_REACHED", "The clinic has reached its location limit.", 409); }
  const [location] = await db.insert(clinicLocations).values({ clinicId, ...input.data }).returning();
  await db.insert(auditLogs).values({ clinicId, actorUserId: c.get("user").id, action: "CLINIC_LOCATION_CREATED", resourceType: "clinic_location", resourceId: location?.id });
  return c.json({ data: location }, 201);
});
