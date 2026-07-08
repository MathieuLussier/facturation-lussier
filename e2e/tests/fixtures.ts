import { test as base, type BrowserContext, type Page } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

type WorkerFixtures = { authedContext: BrowserContext };
type TestFixtures = { authedPage: Page };

/**
 * Contexte authentifié PARTAGÉ par worker : on ne se connecte qu'une fois par
 * worker (le refresh token est à usage unique + rotation ; un login par test
 * saturerait le rate-limit et chaque contexte neuf invaliderait le cookie).
 * Le cookie refresh tourne en place dans le contexte ; les tests d'un même
 * worker s'exécutant en série, il reste valide de page en page.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  authedContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('/login');
      await page.locator('#email').fill(ADMIN_EMAIL);
      await page.locator('#password').fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /Se connecter/i }).click();
      await page.waitForURL((url) => !url.pathname.startsWith('/login'));
      await page.close();
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  authedPage: async ({ authedContext }, use) => {
    const page = await authedContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';
