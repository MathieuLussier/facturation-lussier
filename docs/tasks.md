# Feuille de route & tâches — facturation-lussier

> Application de facturation **B2B (services)**, fiscalité **Québec (TPS + TVQ)**,
> **multi-utilisateurs**. Stack : Vite+React+Tailwind (`apps/web`), NestJS (`apps/api`),
> Prisma+PostgreSQL (`packages/db`), types partagés (`packages/core`), UI (`packages/ui`).
>
> **Orchestration (hybride)** : ruflo coordonne (swarm, mémoire `namespace patterns`, hooks
> pre/post-task) ; l'**Agent Claude Code exécute** (lecture + édition réelle des fichiers).
> Pipeline type par jalon : `architect → coder-api → coder-web → tester → reviewer → Lead`.

---

## État actuel

- ✅ **Squelette monorepo** (commit `3a3341f`) — build/lint/type-check/test verts, `/health` câblé.
- 🟡 **Jalon Authentification** — implémenté & testé (102 tests verts, couverture auth ≥ 85 %),
  **en cours de revue** (`reviewer`). Voir consolidation ci-dessous.

---

## Jalon en cours — Authentification (consolidation)

- [x] Schéma Prisma `User` + `RefreshToken` + enum `Role` ; migration `auth` ; seed admin idempotent
- [x] API : `/auth/login|refresh|logout|me`, `/users` (CRUD ADMIN), guards globaux, throttler, helmet
- [x] Refresh JWT rotation + révocation + détection de réutilisation (token haché en base)
- [x] Front : `AuthContext`, silent refresh, `ProtectedRoute`, `LoginPage`, `UsersPage`, `<Input>`
- [x] Tests : unit + e2e (vs DB réelle) + web ; non-régression du bug `jti`
- [x] Correctifs Lead : `jti` anti-collision, cookie `Path=/`
- [x] **Findings `reviewer` appliqués** : C1 (.env.example complété), H1 (COOKIE_SECURE/REFRESH_TTL via
      ConfigService + validation), H2 (`@Public()` sur /health), H3 (mot de passe front min 8), H4
      (source unique `refreshTtlSeconds`), M1 (erreurs TS corrigées → type-check vert)
- [x] **`.env.example` complété** (et `VITE_API_URL` inutilisé retiré — L2)
- [x] `build` + `type-check` + `lint` + `test` (102) **tous verts** ; smoke live OK
- [ ] **Commit** `feat: authentification multi-utilisateurs` (en attente d'accord)
- [ ] Enregistrer les patterns d'auth dans la **mémoire ruflo** (`namespace patterns`)

### Suivi post-revue (MEDIUM/LOW — non bloquant)
- [ ] M2 : rate-limit aussi sur `/auth/refresh`
- [ ] M4 : transaction Prisma autour de `deleteMany`+`create` dans `generateTokenPair`
- [ ] M5 : sortir `toAuthUser` du couplage `UsersService`↔`AuthService`
- [ ] M6 : remplacer `console.log` (main.ts, seed.ts) par le Logger NestJS
- [ ] L1 : `@MaxLength` sur email/name/password des DTOs (bcrypt ≤ 72 o)
- [ ] L3/L4 : documenter idempotence logout / clarifier le retour de `generateTokenPair`

---

## Prochain jalon — Clients (B2B) de bout en bout

Première donnée métier ; pose les patterns CRUD réutilisés ensuite.

- [ ] **architect** : modèle Prisma `Client` (raison sociale, courriel, téléphone, adresse, NEQ,
      contact, notes, champs d'audit `createdById`), DTO/types dans `packages/core`, contrat REST,
      règles de validation.
- [ ] **coder-api** : `ClientsModule` NestJS (CRUD, `class-validator`, Swagger, pagination, recherche),
      réservé aux utilisateurs authentifiés ; migration.
- [ ] **coder-web** : pages liste (tri/recherche/pagination) + formulaire création/édition + suppression,
      client API typé, routes protégées.
- [ ] **tester** : unit (service/validation) + e2e (CRUD vs DB) + web ; ≥ 80 %.
- [ ] **reviewer** : qualité + sécurité (autorisation, validation, fuite de données) → **commit**.

---

## Jalon — Coordonnées de l'entreprise émettrice (Issuer / Paramètres)

Nécessaire pour l'en-tête de facture et les numéros de taxe.

- [ ] Modèle `IssuerProfile` (nom légal, adresse, courriel/téléphone, **numéros TPS & TVQ**, logo optionnel)
- [ ] API + UI de paramètres (édition réservée ADMIN), singleton ou multi-profils
- [ ] Tests + revue → commit

---

## Jalon — Factures (cœur) + Taxes TPS/TVQ

- [ ] Modèles `Invoice` (numéro séquentiel, dates émission/échéance, statut, client, sous-total, taxes,
      total), `InvoiceLine` (description service, quantité/heures, prix unitaire, montant), enum
      `InvoiceStatus` (BROUILLON, ENVOYÉE, PAYÉE, ANNULÉE, EN_RETARD)
- [ ] **Calcul des taxes** : TPS 5 % + TVQ 9,975 % (logique pure et testée dans `packages/core`,
      arrondis au cent, attention à l'ordre de calcul québécois)
- [ ] Numérotation des factures (format configurable, séquence sans trou)
- [ ] API : CRUD facture + transitions de statut ; UI : liste, détail, création avec lignes dynamiques
- [ ] Tests (incl. cas limites de taxes/arrondis) + revue → commit

---

## Jalon — Export PDF des factures

- [ ] Choisir l'approche (gabarit HTML→PDF côté serveur, ex. `@react-pdf/renderer` ou Puppeteer ;
      évaluer via Context7/registres avant d'implémenter)
- [ ] Gabarit FR : en-tête émetteur + numéros TPS/TVQ, client, lignes, totaux, mentions légales QC
- [ ] Endpoint de téléchargement + bouton UI ; tests de rendu
- [ ] Revue → commit

---

## Backlog (souhaité plus tard, non priorisé)

- [ ] Devis / soumissions convertibles en factures
- [ ] Factures récurrentes / abonnements
- [ ] Paiements en ligne (Stripe) + suivi de statut de paiement
- [ ] Rappels / relances automatiques
- [ ] Rôles plus fins / portail client
- [ ] Tableau de bord (CA, impayés, échéances)

---

## Dette / points ouverts

- [ ] `.env.example` doit toujours documenter chaque nouvelle variable d'env (sécurité/onboarding)
- [ ] Confirmer la stratégie cookie en **production** (HTTPS → `COOKIE_SECURE=true` ; same-domain ou
      `SameSite=None; Secure`)
- [ ] CI : ajouter un pipeline (build/lint/type-check/test) avant de multiplier les jalons
