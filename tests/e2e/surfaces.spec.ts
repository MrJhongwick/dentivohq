import { expect, test } from "@playwright/test";

test("landing page communicates the product and primary action", async ({ page }) => { await page.goto("/"); await expect(page.getByRole("heading", { name: "A calmer way to run your dental clinic." })).toBeVisible(); await expect(page.getByRole("link", { name: "Start your clinic" }).first()).toBeVisible(); });

test("guest booking updates its appointment summary", async ({ page }) => { await page.goto("/book/"); await page.getByRole("button", { name: "Teeth Cleaning 45 min · $129" }).click(); await page.getByRole("button", { name: "10:30 AM" }).click(); await expect(page.getByText("Teeth Cleaning · 45 min")).toBeVisible(); await expect(page.getByText("10:30 AM", { exact: true }).last()).toBeVisible(); });

test("dashboard filters appointments and keeps selected detail in sync", async ({ page }) => { await page.goto("http://localhost:5173"); const filters = page.getByRole("combobox"); await filters.nth(1).click(); await page.getByRole("option", { name: "Dr. Michael Chen" }).click(); await expect(page.getByRole("row", { name: /Mia Thompson/ })).toBeVisible(); await expect(page.getByRole("heading", { name: "Mia Thompson" })).toBeVisible(); });

test("platform console filters clinics", async ({ page }) => { await page.goto("http://localhost:5174"); await page.getByPlaceholder("Clinic name").fill("Northstar"); await expect(page.getByText("Northstar Dental Studio")).toBeVisible(); await expect(page.getByText("Bright Smiles Clinic")).toBeHidden(); });

test("primary surfaces do not overflow the mobile viewport", async ({ page }, testInfo) => { test.skip(!testInfo.project.name.includes("mobile")); for (const url of ["/", "/book/", "http://localhost:5173"]) { await page.goto(url); const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })); expect(dimensions.scroll).toBe(dimensions.client); } });
