import { z } from "zod";

export const uuidSchema = z.uuid();
export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) });
export const clinicRoleSchema = z.enum(["CLINIC_OWNER", "CLINIC_ADMIN", "RECEPTIONIST", "DENTIST", "DENTAL_ASSISTANT"]);
export const appointmentStatusSchema = z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"]);
export const createClinicSchema = z.object({ name: z.string().trim().min(2).max(120), timezone: z.string().min(1).default("Asia/Manila") });
export const createLocationSchema = z.object({ name: z.string().trim().min(2).max(120), timezone: z.string().min(1), addressLine1: z.string().trim().min(3).max(200), city: z.string().trim().min(2).max(100) });
export const createServiceSchema = z.object({ name: z.string().trim().min(2).max(120), durationMinutes: z.number().int().min(5).max(480), priceCents: z.number().int().min(0), active: z.boolean().default(true) });
export const createDentistSchema = z.object({ displayName: z.string().trim().min(2).max(160), bio: z.string().trim().max(2000).optional(), locationIds: z.array(uuidSchema).min(1), serviceIds: z.array(uuidSchema).default([]) });
export const inviteStaffSchema = z.object({ email: z.email(), role: clinicRoleSchema });
export const createScheduleSchema = z.object({ dentistId: uuidSchema, locationId: uuidSchema, weekday: z.number().int().min(0).max(6), startMinute: z.number().int().min(0).max(1439), endMinute: z.number().int().min(1).max(1440) }).refine((value) => value.startMinute < value.endMinute, { message: "Schedule end must be after its start." });
export const createAppointmentSchema = z.object({ locationId: uuidSchema, dentistId: uuidSchema, serviceId: uuidSchema, patientId: uuidSchema, startsAt: z.iso.datetime() });
export const createPatientSchema = z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), email: z.email(), phone: z.string().trim().min(7).max(30) });
export const bookingStartSchema = z.object({ clinicSlug: z.string().min(2), locationId: uuidSchema, dentistId: uuidSchema, serviceId: uuidSchema, startsAt: z.iso.datetime(), patient: z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), email: z.email(), phone: z.string().trim().min(7).max(30) }) });
export const bookingConfirmSchema = z.object({ bookingToken: z.string().min(20), code: z.string().regex(/^\d{6}$/) });
const authEmailSchema = z.email("Enter a valid email address.");
const authPasswordSchema = z.string().min(8, "Password must be at least 8 characters.").max(128, "Password must be 128 characters or fewer.");
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120, "Name must be 120 characters or fewer."),
  email: authEmailSchema,
  password: authPasswordSchema,
  confirmPassword: z.string()
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
export const loginSchema = z.object({ email: authEmailSchema, password: z.string().min(1, "Enter your password.") });
export const authEmailActionSchema = z.object({ email: authEmailSchema });
export const resetPasswordSchema = z.object({
  password: authPasswordSchema,
  confirmPassword: z.string()
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
