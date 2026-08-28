export const permissions = [
  "appointment.read", "appointment.create", "appointment.update", "appointment.cancel",
  "patient.read", "patient.create", "patient.update", "billing.read", "billing.manage",
  "staff.invite", "staff.update", "clinic.settings.update", "dentist.manage", "service.manage", "schedule.manage", "file.manage", "audit.read"
] as const;

export type Permission = (typeof permissions)[number];
export type ClinicRole = "CLINIC_OWNER" | "CLINIC_ADMIN" | "RECEPTIONIST" | "DENTIST" | "DENTAL_ASSISTANT";

const all = new Set<Permission>(permissions);
const rolePermissions: Record<ClinicRole, ReadonlySet<Permission>> = {
  CLINIC_OWNER: all,
  CLINIC_ADMIN: all,
  RECEPTIONIST: new Set(["appointment.read", "appointment.create", "appointment.update", "appointment.cancel", "patient.read", "patient.create", "patient.update", "dentist.manage", "service.manage", "schedule.manage", "file.manage"]),
  DENTIST: new Set(["appointment.read", "appointment.update", "patient.read", "patient.update", "file.manage"]),
  DENTAL_ASSISTANT: new Set(["appointment.read", "appointment.update", "patient.read", "file.manage"])
};

export function can(role: ClinicRole, permission: Permission) {
  return rolePermissions[role].has(permission);
}

export function requirePermission(role: ClinicRole, permission: Permission) {
  if (!can(role, permission)) throw new Error("AUTHORIZATION_DENIED");
}
