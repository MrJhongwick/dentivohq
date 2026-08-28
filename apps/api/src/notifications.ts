import { and, eq, lte } from "drizzle-orm";
import { createDatabase, notificationDeliveries, notificationJobs } from "@dentivohq/db";
import type { Bindings } from "./types";
import { sendEmail } from "./services";

export async function processNotifications(env: Bindings) {
  const db = createDatabase(env.DATABASE_URL); const due = await db.select().from(notificationJobs).where(and(eq(notificationJobs.status, "PENDING"), lte(notificationJobs.scheduledAt, new Date()))).limit(50);
  for (const job of due) {
    const claimed = await db.update(notificationJobs).set({ status: "PROCESSING", attempts: job.attempts + 1, updatedAt: new Date() }).where(and(eq(notificationJobs.id, job.id), eq(notificationJobs.status, "PENDING"))).returning(); if (!claimed.length) continue;
    try {
      const response = await sendEmail(env.RESEND_API_KEY, env.EMAIL_FROM, { to: job.recipient, subject: "DentivoHQ appointment update", text: "Your dental appointment has been updated. Contact the clinic if you need assistance." });
      await db.transaction(async (tx) => { await tx.update(notificationJobs).set({ status: "DELIVERED", updatedAt: new Date() }).where(eq(notificationJobs.id, job.id)); await tx.insert(notificationDeliveries).values({ clinicId: job.clinicId, jobId: job.id, provider: "RESEND", providerMessageId: response?.id, deliveredAt: new Date() }); });
    } catch (error) { await db.update(notificationJobs).set({ status: job.attempts >= 4 ? "FAILED" : "PENDING", lastError: error instanceof Error ? error.message.slice(0, 300) : "unknown", scheduledAt: new Date(Date.now() + 5 * 60_000), updatedAt: new Date() }).where(eq(notificationJobs.id, job.id)); }
  }
}
