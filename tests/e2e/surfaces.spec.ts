import { expect, test, type Page } from "@playwright/test";

const dashboardUrl = "http://localhost:5173";
const apiUrl = "http://localhost:8787";

async function mockDashboardAuth(page: Page, authenticated = false, googleEnabled = false) {
  await page.route(`${apiUrl}/api/auth/get-session`, (route) => route.fulfill({ json: authenticated ? { session: { id: "session-1", userId: "user-1", expiresAt: new Date(Date.now() + 60_000).toISOString() }, user: { id: "user-1", name: "Ana Cruz", email: "ana@example.com", emailVerified: true } } : null }));
  await page.route(`${apiUrl}/api/v1/auth/config`, (route) => route.fulfill({ json: { data: { googleEnabled } } }));
}

test("landing page communicates the product and primary action", async ({ page }) => { await page.goto("/"); await expect(page.getByRole("heading", { name: "A calmer way to run your dental clinic." })).toBeVisible(); await expect(page.getByRole("link", { name: "Start your clinic" }).first()).toBeVisible(); });

test("guest booking updates its appointment summary", async ({ page }) => { await page.goto("/book/"); await page.getByRole("button", { name: "Teeth Cleaning 45 min · $129" }).click(); await page.getByRole("button", { name: "10:30 AM" }).click(); await expect(page.getByText("Teeth Cleaning · 45 min")).toBeVisible(); await expect(page.getByText("10:30 AM", { exact: true }).last()).toBeVisible(); });

test("dashboard registration leads to email verification", async ({ page }) => {
  await mockDashboardAuth(page);
  await page.route(`${apiUrl}/api/auth/sign-up/email`, (route) => route.fulfill({ json: { user: { id: "user-1", name: "Ana Cruz", email: "ana@example.com", emailVerified: false }, token: null } }));
  await page.goto(`${dashboardUrl}/register`);
  await page.getByLabel("Full name").fill("Ana Cruz");
  await page.getByLabel("Email address").fill("ana@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("We sent a verification link to your email address.")).toBeVisible();
});

test("dashboard can resend email verification", async ({ page }) => {
  await mockDashboardAuth(page);
  await page.route(`${apiUrl}/api/auth/send-verification-email`, (route) => route.fulfill({ json: { status: true } }));
  await page.goto(`${dashboardUrl}/verify-email?email=ana@example.com`);
  await page.getByRole("button", { name: "Send verification link" }).click();
  await expect(page.getByText("We sent a new verification link if the address is eligible.")).toBeVisible();
});

test("dashboard signs in with email and password", async ({ page }) => {
  await mockDashboardAuth(page);
  await page.route(`${apiUrl}/api/auth/sign-in/email`, (route) => route.fulfill({ json: { user: { id: "user-1", name: "Ana Cruz", email: "ana@example.com", emailVerified: true }, token: "session-token", redirect: false } }));
  await page.goto(`${dashboardUrl}/login`);
  await page.getByLabel("Email address").fill("ana@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${dashboardUrl}/`);
});

test("dashboard requests and completes a password reset", async ({ page }) => {
  await mockDashboardAuth(page);
  await page.route(`${apiUrl}/api/auth/request-password-reset`, (route) => route.fulfill({ json: { status: true, message: "ok" } }));
  await page.goto(`${dashboardUrl}/forgot-password`);
  await page.getByLabel("Email address").fill("ana@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("We sent password reset instructions if an account exists for that address.")).toBeVisible();
  await page.route(`${apiUrl}/api/auth/reset-password`, (route) => route.fulfill({ json: { status: true } }));
  await page.goto(`${dashboardUrl}/reset-password?token=reset-token`);
  await page.getByLabel("Password", { exact: true }).fill("newpassword123");
  await page.getByLabel("Confirm new password").fill("newpassword123");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("You can now sign in with your new password.")).toBeVisible();
});

test("dashboard shows Google entry only when configured", async ({ page }) => {
  await mockDashboardAuth(page, false, true);
  let googleRequested = false;
  await page.route(`${apiUrl}/api/auth/sign-in/social`, (route) => { googleRequested = true; return route.fulfill({ json: { url: null, redirect: false } }); });
  await page.goto(`${dashboardUrl}/login`);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect.poll(() => googleRequested).toBe(true);
});

test("dashboard filters appointments and logs out", async ({ page }) => {
  await mockDashboardAuth(page, true);
  await page.route(`${apiUrl}/api/auth/sign-out`, (route) => route.fulfill({ json: { success: true } }));
  await page.goto(dashboardUrl);
  const filters = page.getByRole("combobox");
  await filters.nth(1).click();
  await page.getByRole("option", { name: "Dr. Michael Chen" }).click();
  await expect(page.getByRole("row", { name: /Mia Thompson/ })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(`${dashboardUrl}/login`);
});

test("platform console filters clinics", async ({ page }) => { await page.goto("http://localhost:5174"); await page.getByPlaceholder("Clinic name").fill("Northstar"); await expect(page.getByText("Northstar Dental Studio")).toBeVisible(); await expect(page.getByText("Bright Smiles Clinic")).toBeHidden(); });

test("primary surfaces do not overflow the mobile viewport", async ({ page }, testInfo) => { test.skip(!testInfo.project.name.includes("mobile")); await mockDashboardAuth(page); for (const url of ["/", "/book/", `${dashboardUrl}/login`]) { await page.goto(url); const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })); expect(dimensions.scroll).toBe(dimensions.client); } });
