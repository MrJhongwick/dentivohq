import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import { appointments, appointmentStatusHistory, auditLogs, createDatabase, services } from "@dentivohq/db";
import { appointmentStatusSchema, createAppointmentSchema, paginationSchema } from "@dentivohq/validation";
import type { AppEnv } from "../types";
import { AppError } from "../errors";
import { canTransition } from "../status";
import { requirePermission, type ClinicRole, type Permission } from "@dentivohq/auth";

export const appointmentsRoute = new Hono<AppEnv>();
function permit(role: string, permission: Permission) { try { requirePermission(role as ClinicRole, permission); } catch { throw new AppError("AUTHORIZATION_DENIED", "You do not have permission to perform this action.", 403); } }

appointmentsRoute.get("/", async (c) => {
  permit(c.get("membershipRole"), "appointment.read");
  const query = paginationSchema.safeParse(c.req.query()); if (!query.success) throw new AppError("VALIDATION_ERROR", "Pagination is invalid.");
  const db = createDatabase(c.env.DATABASE_URL); const clinicId = c.get("clinicId"); const offset = (query.data.page - 1) * query.data.pageSize;
  const filters = [eq(appointments.clinicId, clinicId)];
  const from = c.req.query("from"); const to = c.req.query("to"); if (from) filters.push(gte(appointments.startsAt, new Date(from))); if (to) filters.push(lte(appointments.startsAt, new Date(to)));
  const [rows, totalRows] = await Promise.all([db.select().from(appointments).where(and(...filters)).orderBy(desc(appointments.startsAt)).limit(query.data.pageSize).offset(offset), db.select({ value: count() }).from(appointments).where(and(...filters))]);
  return c.json({ data: rows, meta: { ...query.data, total: totalRows[0]?.value ?? 0 } });
});

appointmentsRoute.post("/", async (c) => {
  permit(c.get("membershipRole"), "appointment.create");
  const input = createAppointmentSchema.safeParse(await c.req.json()); if (!input.success) throw new AppError("VALIDATION_ERROR", "Appointment details are invalid.");
  const db = createDatabase(c.env.DATABASE_URL); const clinicId = c.get("clinicId");
  const [service] = await db.select().from(services).where(and(eq(services.id, input.data.serviceId), eq(services.clinicId, clinicId), eq(services.active, true))).limit(1); if (!service) throw new AppError("SERVICE_NOT_FOUND", "Service not found.", 404);
  const start = new Date(input.data.startsAt); const end = new Date(start.getTime() + service.durationMinutes * 60_000);
  const appointment = await db.transaction(async (tx) => {
    const [created] = await tx.insert(appointments).values({ clinicId, locationId: input.data.locationId, dentistId: input.data.dentistId, serviceId: service.id, clinicPatientId: input.data.patientId, startsAt: start, endsAt: end, status: "CONFIRMED" }).returning(); if (!created) throw new Error("APPOINTMENT_INSERT_FAILED");
    await tx.insert(appointmentStatusHistory).values({ clinicId, appointmentId: created.id, toStatus: "CONFIRMED", changedBy: c.get("user").id });
    await tx.insert(auditLogs).values({ clinicId, actorUserId: c.get("user").id, action: "APPOINTMENT_CREATED", resourceType: "appointment", resourceId: created.id });
    return created;
  });
  return c.json({ data: appointment }, 201);
});

appointmentsRoute.patch("/:appointmentId/status", async (c) => {
  permit(c.get("membershipRole"), "appointment.update");
  const parsed = appointmentStatusSchema.safeParse((await c.req.json() as { status?: unknown }).status); if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Appointment status is invalid.");
  const db = createDatabase(c.env.DATABASE_URL); const clinicId = c.get("clinicId"); const appointmentId = c.req.param("appointmentId");
  const [current] = await db.select().from(appointments).where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, clinicId))).limit(1); if (!current) throw new AppError("APPOINTMENT_NOT_FOUND", "Appointment not found.", 404);
  if (!canTransition(current.status, parsed.data)) throw new AppError("INVALID_STATUS_TRANSITION", `Cannot move an appointment from ${current.status} to ${parsed.data}.`, 409);
  const [updated] = await db.update(appointments).set({ status: parsed.data, updatedAt: new Date() }).where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, clinicId))).returning();
  await db.insert(appointmentStatusHistory).values({ clinicId, appointmentId, fromStatus: current.status, toStatus: parsed.data, changedBy: c.get("user").id });
  await db.insert(auditLogs).values({ clinicId, actorUserId: c.get("user").id, action: `APPOINTMENT_${parsed.data}`, resourceType: "appointment", resourceId: appointmentId });
  return c.json({ data: updated });
});
