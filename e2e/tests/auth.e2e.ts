import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

test('connexion avec de mauvais identifiants affiche une erreur', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill('mauvais-mot-de-passe');
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await expect(page.getByRole('alert')).toContainText(/incorrect/i);
  await expect(page).toHaveURL(/\/login/);
});

test('connexion réussie mène au tableau de bord', async ({ page }) => {
  await login(page);
  await expect(page).not.toHaveURL(/\/login/);
});

test('une route protégée redirige vers /login sans session', async ({ page }) => {
  await page.goto('/clients');
  await expect(page).toHaveURL(/\/login/);
});
