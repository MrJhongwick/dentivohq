import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { appointments, appointmentStatusHistory, clinicLocations, clinicPatients, clinicSettings, clinics, createDatabase, dentistLocationAssignments, dentistScheduleExceptions, dentistSchedules, dentistServices, dentistTimeOff, dentists, notificationJobs, patientProfiles, services, verifications } from "@dentivohq/db";
import { gte, inArray, lte } from "drizzle-orm";
import { calculateSlots, localDateTimeToUtc, weekdayInZone } from "@dentivohq/utils";
import { bookingConfirmSchema, bookingStartSchema } from "@dentivohq/validation";
import type { AppEnv } from "../types";
import { AppError } from "../errors";
import { decodeToken, encodeToken, hmacHex, sendEmail } from "../services";

type BookingToken = { payload: unknown; nonce: string; expiresAt: number; signature: string };
export const publicBookingRoute = new Hono<AppEnv>();

publicBookingRoute.use("*", async (c, next) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const result = await c.env.PUBLIC_BOOKING_RATE_LIMITER.limit({ key: `${ip}:${c.req.path}` });
  if (!result.success) throw new AppError("RATE_LIMITED", "Too many requests. Please try again shortly.", 429);
  await next();
});

publicBookingRoute.get("/:clinicSlug/catalog", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL); const slug = c.req.param("clinicSlug");
  const [clinic] = await db.select({ id: clinics.id, name: clinics.name, slug: clinics.slug, bookingEnabled: clinicSettings.bookingEnabled }).from(clinics).innerJoin(clinicSettings, eq(clinicSettings.clinicId, clinics.id)).where(and(eq(clinics.slug, slug), eq(clinics.active, true))).limit(1);
  if (!clinic || !clinic.bookingEnabled) throw new AppError("BOOKING_PAGE_NOT_FOUND", "Booking is not available for this clinic.", 404);
  const [locations, serviceRows, dentistRows] = await Promise.all([
    db.select().from(clinicLocations).where(and(eq(clinicLocations.clinicId, clinic.id), eq(clinicLocations.active, true))),
    db.select().from(services).where(and(eq(services.clinicId, clinic.id), eq(services.active, true))),
    db.select().from(dentists).where(and(eq(dentists.clinicId, clinic.id), eq(dentists.active, true)))
  ]);
  return c.json({ data: { clinic, locations, services: serviceRows, dentists: dentistRows } });
});

publicBookingRoute.get("/:clinicSlug/availability", async (c) => {
  const { dentistId, locationId, serviceId, date } = c.req.query(); if (!dentistId || !locationId || !serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new AppError("VALIDATION_ERROR", "Availability parameters are invalid.");
  const db = createDatabase(c.env.DATABASE_URL); const [context] = await db.select({ clinicId: clinics.id, timezone: clinicLocations.timezone, duration: services.durationMinutes, interval: clinicSettings.slotIntervalMinutes }).from(clinics).innerJoin(clinicSettings, eq(clinicSettings.clinicId, clinics.id)).innerJoin(clinicLocations, and(eq(clinicLocations.clinicId, clinics.id), eq(clinicLocations.id, locationId))).innerJoin(services, and(eq(services.clinicId, clinics.id), eq(services.id, serviceId))).where(and(eq(clinics.slug, c.req.param("clinicSlug")), eq(clinicSettings.bookingEnabled, true))).limit(1); if (!context) throw new AppError("BOOKING_OPTION_INVALID", "The selected booking option is unavailable.", 404);
  const weekday = weekdayInZone(date!, context.timezone); const schedules = await db.select().from(dentistSchedules).where(and(eq(dentistSchedules.clinicId, context.clinicId), eq(dentistSchedules.dentistId, dentistId), eq(dentistSchedules.locationId, locationId), eq(dentistSchedules.weekday, weekday), eq(dentistSchedules.active, true)));
  const dayStart = localDateTimeToUtc(date!, 0, context.timezone); const dayEnd = localDateTimeToUtc(date!, 1440, context.timezone);
  const [booked, timeOff, exceptions] = await Promise.all([
    db.select({ start: appointments.startsAt, end: appointments.endsAt }).from(appointments).where(and(eq(appointments.clinicId, context.clinicId), eq(appointments.dentistId, dentistId), inArray(appointments.status, ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"]), gte(appointments.startsAt, dayStart), lte(appointments.startsAt, dayEnd))),
    db.select({ start: dentistTimeOff.startsAt, end: dentistTimeOff.endsAt }).from(dentistTimeOff).where(and(eq(dentistTimeOff.clinicId, context.clinicId), eq(dentistTimeOff.dentistId, dentistId), lte(dentistTimeOff.startsAt, dayEnd), gte(dentistTimeOff.endsAt, dayStart))),
    db.select({ start: dentistScheduleExceptions.startsAt, end: dentistScheduleExceptions.endsAt, available: dentistScheduleExceptions.available }).from(dentistScheduleExceptions).where(and(eq(dentistScheduleExceptions.clinicId, context.clinicId), eq(dentistScheduleExceptions.dentistId, dentistId), lte(dentistScheduleExceptions.startsAt, dayEnd), gte(dentistScheduleExceptions.endsAt, dayStart)))
  ]);
  const unavailable = [...booked, ...timeOff, ...exceptions.filter((item) => !item.available)]; const slots = schedules.flatMap((schedule) => calculateSlots({ window: { start: localDateTimeToUtc(date!, schedule.startMinute, context.timezone), end: localDateTimeToUtc(date!, schedule.endMinute, context.timezone) }, durationMinutes: context.duration, intervalMinutes: context.interval, unavailable }));
  return c.json({ data: slots.map((slot) => ({ startsAt: slot.start.toISOString(), endsAt: slot.end.toISOString() })) });
});

publicBookingRoute.post("/verify", async (c) => {
  const input = bookingStartSchema.safeParse(await c.req.json()); if (!input.success) throw new AppError("VALIDATION_ERROR", "Booking details are invalid.");
  const db = createDatabase(c.env.DATABASE_URL);
  const [clinic] = await db.select({ id: clinics.id, name: clinics.name }).from(clinics).innerJoin(clinicSettings, eq(clinicSettings.clinicId, clinics.id)).where(and(eq(clinics.slug, input.data.clinicSlug), eq(clinics.active, true), eq(clinicSettings.bookingEnabled, true))).limit(1); if (!clinic) throw new AppError("BOOKING_PAGE_NOT_FOUND", "Booking is not available for this clinic.", 404);
  const [eligible] = await db.select({ serviceId: dentistServices.serviceId }).from(dentistServices).innerJoin(dentistLocationAssignments, and(eq(dentistLocationAssignments.dentistId, dentistServices.dentistId), eq(dentistLocationAssignments.locationId, input.data.locationId))).where(and(eq(dentistServices.clinicId, clinic.id), eq(dentistServices.dentistId, input.data.dentistId), eq(dentistServices.serviceId, input.data.serviceId))).limit(1); if (!eligible) throw new AppError("BOOKING_OPTION_INVALID", "The selected booking option is unavailable.", 409);
  const code = crypto.getRandomValues(new Uint32Array(1))[0]!.toString().slice(-6).padStart(6, "0"); const nonce = crypto.randomUUID(); const expiresAt = Date.now() + 10 * 60_000;
  const payload = { ...input.data, clinicId: clinic.id }; const body = encodeToken({ payload, nonce, expiresAt }); const signature = await hmacHex(c.env.BOOKING_VERIFICATION_SECRET, body); const bookingToken = encodeToken({ body, signature });
  await db.insert(verifications).values({ id: crypto.randomUUID(), identifier: `booking:${nonce}`, value: await hmacHex(c.env.BOOKING_VERIFICATION_SECRET, code), expiresAt: new Date(expiresAt) });
  await sendEmail(c.env.RESEND_API_KEY, c.env.EMAIL_FROM, { to: input.data.patient.email, subject: `Confirm your appointment with ${clinic.name}`, text: `Your DentivoHQ verification code is ${code}. It expires in 10 minutes.` });
  return c.json({ data: { bookingToken, expiresAt: new Date(expiresAt).toISOString() } }, 202);
});

publicBookingRoute.post("/confirm", async (c) => {
  const input = bookingConfirmSchema.safeParse(await c.req.json()); if (!input.success) throw new AppError("VALIDATION_ERROR", "Verification details are invalid.");
  const outer = decodeToken<{ body: string; signature: string }>(input.data.bookingToken); const expectedSignature = await hmacHex(c.env.BOOKING_VERIFICATION_SECRET, outer.body); if (outer.signature !== expectedSignature) throw new AppError("BOOKING_TOKEN_INVALID", "The booking request is invalid.", 401);
  const token = decodeToken<Omit<BookingToken, "signature"> & { payload: ReturnType<typeof bookingStartSchema.parse> & { clinicId: string } }>(outer.body); if (token.expiresAt < Date.now()) throw new AppError("BOOKING_TOKEN_EXPIRED", "The verification code has expired.", 409);
  const db = createDatabase(c.env.DATABASE_URL); const [verification] = await db.select().from(verifications).where(eq(verifications.identifier, `booking:${token.nonce}`)).limit(1); if (!verification || verification.expiresAt < new Date() || verification.value !== await hmacHex(c.env.BOOKING_VERIFICATION_SECRET, input.data.code)) throw new AppError("VERIFICATION_CODE_INVALID", "The verification code is invalid or expired.", 401);
  const [service] = await db.select().from(services).where(and(eq(services.id, token.payload.serviceId), eq(services.clinicId, token.payload.clinicId), eq(services.active, true))).limit(1); if (!service) throw new AppError("SERVICE_NOT_FOUND", "Service not found.", 404);
  const start = new Date(token.payload.startsAt); const end = new Date(start.getTime() + service.durationMinutes * 60_000);
  const appointment = await db.transaction(async (tx) => {
    const [profile] = await tx.insert(patientProfiles).values(token.payload.patient).returning(); if (!profile) throw new Error("PATIENT_INSERT_FAILED");
    const [patient] = await tx.insert(clinicPatients).values({ clinicId: token.payload.clinicId, patientProfileId: profile.id }).returning(); if (!patient) throw new Error("CLINIC_PATIENT_INSERT_FAILED");
    const [created] = await tx.insert(appointments).values({ clinicId: token.payload.clinicId, locationId: token.payload.locationId, dentistId: token.payload.dentistId, serviceId: token.payload.serviceId, clinicPatientId: patient.id, startsAt: start, endsAt: end, status: "CONFIRMED" }).returning(); if (!created) throw new Error("APPOINTMENT_INSERT_FAILED");
    await tx.insert(appointmentStatusHistory).values({ clinicId: token.payload.clinicId, appointmentId: created.id, toStatus: "CONFIRMED" });
    await tx.insert(notificationJobs).values({ clinicId: token.payload.clinicId, appointmentId: created.id, kind: "APPOINTMENT_CONFIRMATION", recipient: token.payload.patient.email, payload: { appointmentId: created.id }, idempotencyKey: `confirmation:${created.id}`, scheduledAt: new Date() });
    await tx.delete(verifications).where(eq(verifications.identifier, `booking:${token.nonce}`)); return created;
  });
  return c.json({ data: { appointmentId: appointment.id, status: appointment.status } }, 201);
});
