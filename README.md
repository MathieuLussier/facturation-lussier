# Facturation Lussier

Application de facturation **B2B** pour le Québec (TPS 5 % + TVQ 9,975 %),
multi-utilisateurs. Monorepo npm workspaces + Turbo.

| Workspace | Rôle |
|-----------|------|
| `apps/api` | API NestJS + Prisma/PostgreSQL |
| `apps/web` | Frontend Vite + React 19 + Tailwind 4 |
| `desktop` | Coquille Electron (charge l'app web + numérisation WIA/eSCL) |
| `packages/core` | Logique métier partagée (calcul TPS/TVQ, types) |
| `packages/db` | Schéma Prisma, migrations, seed |
| `packages/ui` | Composants React + thème Tailwind partagés |
| `packages/config` | Configs TypeScript partagées |

## Prérequis

- **Node 24** (voir `.nvmrc`)
- **Docker** (pour PostgreSQL en local)

## Démarrage

```bash
# 1. Dépendances
npm install

# 2. Variables d'environnement (copier puis compléter)
cp .env.example .env
#    Requis : JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, DATABASE_URL,
#             ADMIN_EMAIL, ADMIN_PASSWORD. En production : NODE_ENV=production.

# 3. PostgreSQL
docker compose up -d

# 4. Base : migrations + utilisateur admin
npm run db:migrate
npm run -w @facturation/db db:seed

# 5. Lancer l'API (:4001) et le web (:4000)
npm run dev
```

> ⚠️ `npm run db:migrate` (prisma migrate dev) peut réinitialiser la base de dev ;
> relancer `db:seed` ensuite (sinon le login admin échoue).

L'app est servie sur http://localhost:4000 (le web proxifie `/api` vers `:4001`).

## Scripts

```bash
npm run build         # build tous les workspaces (turbo)
npm run lint          # eslint
npm run type-check    # tsc --noEmit
npm test              # tests unitaires + intégration (turbo)
npm run test:local:reset # reset DB locale + seed + tests
npm run test:e2e      # tests E2E Playwright (app + DB requises — voir e2e/)
npm run format        # prettier --write
```

## Tests

- **Unitaires / intégration** : `npm test` (Jest côté API, Vitest côté web/core/ui).
  Les tests e2e de l'API (`auth.e2e.spec.ts`) tournent contre un vrai PostgreSQL —
  lancer avec l'environnement chargé, ex. `npx dotenv-cli -e .env -- npm test`.
- **Local reproductible** : `npm run test:local:reset` vérifie PostgreSQL local,
  réinitialise explicitement la base, applique les migrations, seed l'admin, puis
  lance `npm test`. Par défaut : `127.0.0.1:55432/facturation`, user
  `facturation`. Overrides explicites : `LOCAL_TEST_DATABASE_URL`,
  `LOCAL_TEST_ADMIN_EMAIL`, `LOCAL_TEST_ADMIN_PASSWORD`,
  `LOCAL_TEST_JWT_ACCESS_SECRET`, `LOCAL_TEST_JWT_REFRESH_SECRET`.
- **E2E navigateur** : `npm run test:e2e` (Playwright, Chromium embarqué). Requiert
  l'app démarrée + DB seedée ; identifiants via `E2E_EMAIL` / `E2E_PASSWORD`.

La **CI** (`.github/workflows/ci.yml`) exécute build + lint + type-check + tests +
e2e contre un PostgreSQL de service.

## Déploiement (aperçu)

- API : `npm run build` puis `node apps/api/dist/main.js` (définir `NODE_ENV=production`,
  les secrets JWT, `DATABASE_URL`, `COOKIE_SECURE=true`, `WEB_ORIGIN`).
- Migrations en production : `npm run -w @facturation/db db:deploy` (prisma migrate deploy).
- Web : `npm run -w @facturation/web build` → servir `apps/web/dist` derrière un reverse
  proxy qui route `/api` vers l'API.
- Desktop : `npm --prefix desktop run build:win` (voir `desktop/README`).
