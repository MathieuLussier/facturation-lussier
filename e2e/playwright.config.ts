import { defineConfig } from '@playwright/test';
import path from 'node:path';

/**
 * Tests E2E (navigateur réel, Chromium embarqué de Playwright).
 *
 * Prérequis : l'app tourne (web :4000 proxifiant l'API :4001), la DB est
 * migrée + seedée. Identifiants admin via E2E_EMAIL / E2E_PASSWORD.
 *
 *   npm run test:e2e
 *
 * Chaque test se connecte lui-même (le refresh token est à usage unique avec
 * rotation : un état d'auth partagé ne peut pas être réutilisé entre contextes).
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4000';

export default defineConfig({
  testDir: './tests',
  // Exécution SÉRIELLE : le refresh token est à usage unique + rotation ; des
  // contextes/pages concurrents se voleraient le cookie (réutilisation détectée).
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  outputDir: path.join(__dirname, 'test-results'),
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: /.*\.e2e\.ts/,
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
