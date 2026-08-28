import type { z } from "zod";
import { appointmentStatusSchema } from "@dentivohq/validation";

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
const transitions: Record<AppointmentStatus, ReadonlySet<AppointmentStatus>> = {
  PENDING: new Set(["CONFIRMED", "CANCELLED", "RESCHEDULED"]),
  CONFIRMED: new Set(["CHECKED_IN", "CANCELLED", "RESCHEDULED", "NO_SHOW"]),
  CHECKED_IN: new Set(["IN_PROGRESS", "CANCELLED"]),
  IN_PROGRESS: new Set(["COMPLETED"]),
  COMPLETED: new Set(), CANCELLED: new Set(), NO_SHOW: new Set(), RESCHEDULED: new Set()
};
export function canTransition(from: AppointmentStatus, to: AppointmentStatus) { return transitions[from].has(to); }
