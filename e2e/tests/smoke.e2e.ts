import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * Smoke E2E des pages migrées vers useApiResource. Un seul login, puis
 * navigation via le MENU (liens client-side React Router) : pas de rechargement
 * complet → le token reste en mémoire, aucune rotation du refresh token (qui,
 * répétée, finirait par invalider la session). C'est aussi le parcours réel d'un
 * utilisateur.
 */
test('navigation authentifiée : les pages migrées se chargent et fonctionnent', async ({
  page,
}) => {
  await login(page); // atterrit sur le tableau de bord
  const nav = page.getByRole('navigation').first();

  // Factures : changer de filtre recharge la liste (useApiResource) sans erreur.
  await nav.getByRole('link', { name: 'Factures' }).click();
  await expect(page.getByRole('heading', { name: 'Factures' })).toBeVisible();
  await page.getByRole('button', { name: 'Payée' }).click();
  await expect(page.getByRole('heading', { name: 'Factures' })).toBeVisible();

  // Clients : recherche sans résultat.
  await nav.getByRole('link', { name: 'Clients' }).click();
  await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
  await page.locator('#client-search').fill('zzz-inexistant-xyz');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await expect(page.getByText(/Aucun résultat/)).toBeVisible();

  // Produits.
  await nav.getByRole('link', { name: 'Produits' }).click();
  await expect(page.getByRole('heading', { name: 'Produits et services' })).toBeVisible();

  // Entreprise émettrice (IssuerPage).
  await nav.getByRole('link', { name: 'Entreprise' }).click();
  await expect(page.getByRole('heading', { name: 'Entreprise émettrice' })).toBeVisible();

  // Utilisateurs (admin).
  await nav.getByRole('link', { name: 'Utilisateurs' }).click();
  await expect(page.getByRole('heading', { name: 'Utilisateurs', exact: true })).toBeVisible();
  await expect(page.getByText('admin@facturation.local')).toBeVisible();
});
