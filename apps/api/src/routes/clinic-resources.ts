import { and, count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requirePermission, type ClinicRole, type Permission } from "@dentivohq/auth";
import { assertWithinEntitlement } from "@dentivohq/config";
import { auditLogs, clinicInvitations, clinicLocations, clinicMembers, createDatabase, dentistLocationAssignments, dentistSchedules, dentistServices, dentists, services } from "@dentivohq/db";
import { createDentistSchema, createScheduleSchema, createServiceSchema, inviteStaffSchema } from "@dentivohq/validation";
import type { AppEnv } from "../types";
import { AppError } from "../errors";
import { hmacHex, sendEmail } from "../services";

export const clinicResourcesRoute = new Hono<AppEnv>();
function permit(role: string, permission: Permission) { try { requirePermission(role as ClinicRole, permission); } catch { throw new AppError("AUTHORIZATION_DENIED", "You do not have permission to perform this action.", 403); } }

clinicResourcesRoute.get("/locations", async (c) => { const db = createDatabase(c.env.DATABASE_URL); return c.json({ data: await db.select().from(clinicLocations).where(eq(clinicLocations.clinicId, c.get("clinicId"))) }); });
clinicResourcesRoute.get("/services", async (c) => { const db = createDatabase(c.env.DATABASE_URL); return c.json({ data: await db.select().from(services).where(eq(services.clinicId, c.get("clinicId"))) }); });
clinicResourcesRoute.post("/services", async (c) => { permit(c.get("membershipRole"), "service.manage"); const input = createServiceSchema.safeParse(await c.req.json()); if (!input.success) throw new AppError("VALIDATION_ERROR", "Service details are invalid."); const db = createDatabase(c.env.DATABASE_URL); const [created] = await db.insert(services).values({ clinicId: c.get("clinicId"), ...input.data }).returning(); return c.json({ data: created }, 201); });

clinicResourcesRoute.get("/dentists", async (c) => { const db = createDatabase(c.env.DATABASE_URL); return c.json({ data: await db.select().from(dentists).where(eq(dentists.clinicId, c.get("clinicId"))) }); });
clinicResourcesRoute.post("/dentists", async (c) => {
  permit(c.get("membershipRole"), "dentist.manage"); const input = createDentistSchema.safeParse(await c.req.json()); if (!input.success) throw new AppError("VALIDATION_ERROR", "Dentist details are invalid."); const db = createDatabase(c.env.DATABASE_URL); const clinicId = c.get("clinicId"); const [total] = await db.select({ value: count() }).from(dentists).where(eq(dentists.clinicId, clinicId));
  try { assertWithinEntitlement(total?.value ?? 0, "maxDentists"); } catch { throw new AppError("PLAN_LIMIT_REACHED", "The clinic has reached its dentist limit.", 409); }
  const created = await db.transaction(async (tx) => { const [dentist] = await tx.insert(dentists).values({ clinicId, displayName: input.data.displayName, bio: input.data.bio }).returning(); if (!dentist) throw new Error("DENTIST_INSERT_FAILED"); await tx.insert(dentistLocationAssignments).values(input.data.locationIds.map((locationId) => ({ clinicId, dentistId: dentist.id, locationId }))); if (input.data.serviceIds.length) await tx.insert(dentistServices).values(input.data.serviceIds.map((serviceId) => ({ clinicId, dentistId: dentist.id, serviceId }))); await tx.insert(auditLogs).values({ clinicId, actorUserId: c.get("user").id, action: "DENTIST_CREATED", resourceType: "dentist", resourceId: dentist.id }); return dentist; }); return c.json({ data: created }, 201);
});

clinicResourcesRoute.post("/schedules", async (c) => { permit(c.get("membershipRole"), "schedule.manage"); const input = createScheduleSchema.safeParse(await c.req.json()); if (!input.success) throw new AppError("VALIDATION_ERROR", "Schedule details are invalid."); const db = createDatabase(c.env.DATABASE_URL); const [dentist] = await db.select({ id: dentists.id }).from(dentists).where(and(eq(dentists.id, input.data.dentistId), eq(dentists.clinicId, c.get("clinicId")))).limit(1); if (!dentist) throw new AppError("DENTIST_NOT_FOUND", "Dentist not found.", 404); const [created] = await db.insert(dentistSchedules).values({ clinicId: c.get("clinicId"), ...input.data }).returning(); return c.json({ data: created }, 201); });

clinicResourcesRoute.post("/invitations", async (c) => {
  permit(c.get("membershipRole"), "staff.invite"); const input = inviteStaffSchema.safeParse(await c.req.json()); if (!input.success) throw new AppError("VALIDATION_ERROR", "Invitation details are invalid."); const db = createDatabase(c.env.DATABASE_URL); const clinicId = c.get("clinicId"); const [total] = await db.select({ value: count() }).from(clinicMembers).where(and(eq(clinicMembers.clinicId, clinicId), eq(clinicMembers.status, "ACTIVE"))); try { assertWithinEntitlement(total?.value ?? 0, "maxStaff"); } catch { throw new AppError("PLAN_LIMIT_REACHED", "The clinic has reached its staff limit.", 409); }
  const token = crypto.randomUUID() + crypto.randomUUID(); const tokenHash = await hmacHex(c.env.BOOKING_VERIFICATION_SECRET, token); const [invitation] = await db.insert(clinicInvitations).values({ clinicId, email: input.data.email, role: input.data.role, tokenHash, invitedBy: c.get("user").id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000) }).returning(); await sendEmail(c.env.RESEND_API_KEY, c.env.EMAIL_FROM, { to: input.data.email, subject: "You are invited to DentivoHQ", text: `Accept your clinic invitation: ${c.env.DASHBOARD_URL}/accept-invitation?token=${encodeURIComponent(token)}` }); await db.insert(auditLogs).values({ clinicId, actorUserId: c.get("user").id, action: "STAFF_INVITED", resourceType: "clinic_invitation", resourceId: invitation?.id }); return c.json({ data: { id: invitation?.id, email: input.data.email, role: input.data.role } }, 201);
});
