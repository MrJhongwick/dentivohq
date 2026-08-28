import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { auditLogs, createDatabase, fileObjects } from "@dentivohq/db";
import type { AppEnv } from "../types";
import { AppError } from "../errors";
import { requirePermission, type ClinicRole } from "@dentivohq/auth";

const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]); const maxBytes = 10 * 1024 * 1024;
const allowedOwners = new Set(["clinic", "clinic_patient", "appointment"]);
export const filesRoute = new Hono<AppEnv>();

filesRoute.post("/", async (c) => {
  try { requirePermission(c.get("membershipRole") as ClinicRole, "file.manage"); } catch { throw new AppError("AUTHORIZATION_DENIED", "You do not have permission to upload files.", 403); }
  const form = await c.req.formData(); const file = form.get("file"); const ownerType = String(form.get("ownerType") ?? ""); const ownerId = String(form.get("ownerId") ?? "");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size > maxBytes || !allowedOwners.has(ownerType) || !/^[0-9a-f-]{36}$/i.test(ownerId)) throw new AppError("FILE_INVALID", "Upload a JPEG, PNG, or PDF no larger than 10 MB.");
  const clinicId = c.get("clinicId"); const id = crypto.randomUUID(); const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg"; const key = `clinics/${clinicId}/${ownerType}/${ownerId}/${id}.${extension}`;
  await c.env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  const db = createDatabase(c.env.DATABASE_URL); const [record] = await db.insert(fileObjects).values({ id, clinicId, ownerType, ownerId, bucket: "dentivohq-files", objectKey: key, mimeType: file.type, sizeBytes: file.size, createdBy: c.get("user").id }).returning();
  await db.insert(auditLogs).values({ clinicId, actorUserId: c.get("user").id, action: "FILE_UPLOADED", resourceType: "file_object", resourceId: id });
  return c.json({ data: record }, 201);
});

filesRoute.get("/:fileId", async (c) => {
  try { requirePermission(c.get("membershipRole") as ClinicRole, "file.manage"); } catch { throw new AppError("AUTHORIZATION_DENIED", "You do not have permission to view files.", 403); }
  const db = createDatabase(c.env.DATABASE_URL); const [record] = await db.select().from(fileObjects).where(and(eq(fileObjects.id, c.req.param("fileId")), eq(fileObjects.clinicId, c.get("clinicId")))).limit(1); if (!record) throw new AppError("FILE_NOT_FOUND", "File not found.", 404);
  const object = await c.env.FILES.get(record.objectKey); if (!object) throw new AppError("FILE_NOT_FOUND", "File not found.", 404);
  await db.insert(auditLogs).values({ clinicId: c.get("clinicId"), actorUserId: c.get("user").id, action: "FILE_VIEWED", resourceType: "file_object", resourceId: record.id });
  return new Response(object.body, { headers: { "content-type": record.mimeType, "content-disposition": "inline", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
});
