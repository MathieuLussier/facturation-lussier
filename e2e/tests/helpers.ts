import { type Page, expect } from '@playwright/test';

export const ADMIN_EMAIL = process.env.E2E_EMAIL ?? 'admin@facturation.local';
export const ADMIN_PASSWORD = process.env.E2E_PASSWORD ?? 'Admin1234!';

/** Se connecte via le formulaire et attend d'être authentifié (hors /login). */
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('navigation').first()).toBeVisible();
}
