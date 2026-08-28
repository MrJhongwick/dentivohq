import { Resend } from "resend";

export type EmailMessage = { to: string; subject: string; text: string };
export async function sendEmail(apiKey: string | undefined, from: string, message: EmailMessage) {
  if (!apiKey) { console.info(JSON.stringify({ level: "info", event: "email_skipped_in_development", recipientDomain: message.to.split("@")[1] })); return { id: "development" }; }
  const result = await new Resend(apiKey).emails.send({ from, ...message });
  if (result.error) throw new Error(`EMAIL_PROVIDER_ERROR:${result.error.name}`);
  return result.data;
}

export async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function encodeToken(value: object) { return btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
export function decodeToken<T>(value: string): T { return JSON.parse(atob(value.replaceAll("-", "+").replaceAll("_", "/"))) as T; }
