import type { Context } from "hono";
import type { AppEnv } from "./types";

export class AppError extends Error {
  constructor(public code: string, message: string, public status: 400 | 401 | 403 | 404 | 409 | 429 | 500 = 400) { super(message); }
}

export function errorResponse(error: unknown, c: Context<AppEnv>) {
  if (error instanceof AppError) return c.json({ error: { code: error.code, message: error.message } }, error.status);
  const pgCode = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (pgCode === "23P01") return c.json({ error: { code: "APPOINTMENT_CONFLICT", message: "That appointment time is no longer available." } }, 409);
  console.error(JSON.stringify({ level: "error", event: "request_failed", error: error instanceof Error ? error.message : "unknown" }));
  return c.json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } }, 500);
}
