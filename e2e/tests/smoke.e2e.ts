import { test, expect } from './fixtures';

/**
 * Smoke E2E des pages migrées vers useApiResource : chaque page se charge en
 * état authentifié et ses interactions clés (filtres, recherche) fonctionnent —
 * non-régression de la migration. Auth via le contexte partagé par worker.
 */

test('tableau de bord se charge (authentifié)', async ({ authedPage: page }) => {
  await page.goto('/');
  await expect(page).not.toHaveURL(/login/);
  await expect(page.getByRole('navigation').first()).toBeVisible();
});

test('Factures : la page et les filtres fonctionnent', async ({ authedPage: page }) => {
  await page.goto('/invoices');
  await expect(page.getByRole('heading', { name: 'Factures' })).toBeVisible();
  // Changer de filtre déclenche un rechargement (useApiResource) sans erreur.
  await page.getByRole('button', { name: 'Payée' }).click();
  await expect(page.getByRole('heading', { name: 'Factures' })).toBeVisible();
  await page.getByRole('button', { name: 'Toutes' }).click();
  await expect(page.getByRole('heading', { name: 'Factures' })).toBeVisible();
});

test('Clients : recherche et bascule archivés', async ({ authedPage: page }) => {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();

  await page.locator('#client-search').fill('zzz-inexistant-xyz');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await expect(page.getByText(/Aucun résultat/)).toBeVisible();

  await page.getByRole('checkbox').check();
  await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
});

test('Produits : la page se charge', async ({ authedPage: page }) => {
  await page.goto('/produits');
  await expect(page.getByRole('heading', { name: 'Produits et services' })).toBeVisible();
});

test('Utilisateurs (admin) : la liste charge et affiche l’admin', async ({ authedPage: page }) => {
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Utilisateurs', exact: true })).toBeVisible();
  // La liste (useApiResource) se peuple avec l'admin seedé.
  await expect(page.getByText('admin@facturation.local')).toBeVisible();
});
