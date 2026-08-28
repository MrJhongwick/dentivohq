import { describe, expect, it } from "vitest";
import { getTestInstance } from "better-auth/test";
import { createAuthOptions, type AuthEmailMessage, type AuthEnv } from "./index";

const env: AuthEnv = {
  BETTER_AUTH_SECRET: "test-secret-that-is-at-least-thirty-two-characters",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: undefined,
  GOOGLE_CLIENT_SECRET: undefined,
  trustedOrigins: ["http://localhost:3000"]
};

function linkFrom(message: AuthEmailMessage) {
  const link = message.text.match(/https?:\/\/\S+/)?.[0];
  if (!link) throw new Error("Auth email did not contain a link.");
  return link;
}

describe("Better Auth lifecycle", () => {
  it("requires verification, creates a session, and invalidates it on logout", async () => {
    const emails: AuthEmailMessage[] = [];
    const instance = await getTestInstance(createAuthOptions(env, {
      sendEmail: async (message) => { emails.push(message); }
    }), { disableTestUser: true });

    const credentials = { name: "Auth Tester", email: "auth-tester@example.test", password: "correct-horse-battery-staple" };
    const signUp = await instance.client.signUp.email({ ...credentials, callbackURL: "/dashboard" });

    expect(signUp.error).toBeNull();
    expect(emails).toHaveLength(1);
    expect(emails[0]?.subject).toBe("Verify your DentivoHQ email");

    const unverifiedSignIn = await instance.client.signIn.email({ email: credentials.email, password: credentials.password });
    expect(unverifiedSignIn.error?.code).toBe("EMAIL_NOT_VERIFIED");

    const verification = await instance.customFetchImpl(linkFrom(emails[0]!), { redirect: "manual" });
    expect(verification.status).toBe(302);

    const { headers } = await instance.signInWithUser(credentials.email, credentials.password);
    const session = await instance.auth.api.getSession({ headers });
    expect(session?.user.email).toBe(credentials.email);

    await instance.auth.api.signOut({ headers });
    await expect(instance.auth.api.getSession({ headers })).resolves.toBeNull();
  });

  it("delivers and completes a password reset while revoking active sessions", async () => {
    const emails: AuthEmailMessage[] = [];
    const instance = await getTestInstance(createAuthOptions(env, {
      sendEmail: async (message) => { emails.push(message); }
    }), { disableTestUser: true });

    const credentials = { name: "Reset Tester", email: "reset-tester@example.test", password: "correct-horse-battery-staple" };
    await instance.client.signUp.email({ ...credentials, callbackURL: "/dashboard" });
    await instance.customFetchImpl(linkFrom(emails[0]!), { redirect: "manual" });
    emails.length = 0;

    const activeSession = await instance.signInWithUser(credentials.email, credentials.password);
    const resetRequest = await instance.client.requestPasswordReset({
      email: credentials.email,
      redirectTo: "http://localhost:3000/reset-password"
    });

    expect(resetRequest.error).toBeNull();
    expect(emails.at(-1)?.subject).toBe("Reset your DentivoHQ password");

    const resetRedirect = await instance.customFetchImpl(linkFrom(emails.at(-1)!), { redirect: "manual" });
    const location = resetRedirect.headers.get("location");
    const token = location ? new URL(location).searchParams.get("token") : null;
    expect(token).toBeTruthy();

    const reset = await instance.client.resetPassword({ newPassword: "new-correct-horse-battery-staple", token: token! });
    expect(reset.error).toBeNull();
    await expect(instance.auth.api.getSession({ headers: activeSession.headers })).resolves.toBeNull();

    const signIn = await instance.client.signIn.email({ email: credentials.email, password: "new-correct-horse-battery-staple" });
    expect(signIn.error).toBeNull();
  });

  it("enables Google only when both credentials are configured", () => {
    const dependencies = { sendEmail: async () => undefined };
    expect(createAuthOptions(env, dependencies).socialProviders).toBeUndefined();
    expect(createAuthOptions({ ...env, GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: "secret" }, dependencies).socialProviders)
      .toEqual({ google: { clientId: "client", clientSecret: "secret" } });
  });
});
