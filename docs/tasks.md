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
- [x] **Commit** `feat: authentification multi-utilisateurs` (`4f22c52` sur `master`)
- [x] Patterns d'auth enregistrés dans la **mémoire ruflo** (`namespace patterns`)

### Suivi post-revue (MEDIUM/LOW — non bloquant)
- [x] M2 : rate-limit aussi sur `/auth/refresh`
- [x] M4 : transaction Prisma atomique dans `generateTokenPair`
- [x] M6 : `console.log` remplacé (Logger NestJS ; seed n'expose plus l'id)
- [x] L1 : `@MaxLength` sur les DTOs (email/name 255, password 128)
- [ ] M5 : sortir `toAuthUser` du couplage `UsersService`↔`AuthService` (refacto mineure)
- [ ] L3/L4 : documenter idempotence logout / clarifier le retour de `generateTokenPair`

---

## ✅ Jalon livré — Clients (B2B) de bout en bout

Construit en solo (Lead), commits `b4ae097` (backend) + `251fcc0` (frontend).

- [x] Modèle Prisma `Client` (raison sociale, coordonnées, NEQ, contact, notes, audit `createdById`) + migration
- [x] `ClientsModule` NestJS : CRUD + liste paginée + recherche insensible, DTOs validés, protégé (auth)
- [x] Types partagés `@facturation/core` (`Client`, `Create/UpdateClientRequest`, `Paginated<T>`)
- [x] UI : `ClientsPage` (liste paginée, recherche, création/édition, suppression) + route `/clients` + lien accueil
- [x] Tests : 9 unit service + 3 web (114 au total) ; smoke live CRUD OK
- [ ] **Followup** : e2e Clients (CRUD vs DB réelle) ; tri par colonnes

---

## ✅ Jalon livré — Entreprise émettrice (Issuer / Paramètres) — `eced493`

- [x] Modèle `IssuerProfile` (singleton) + migration : coordonnées + **numéros TPS & TVQ**
- [x] API GET /issuer (auth) + PUT /issuer (ADMIN, upsert) + UI page paramètres + 4 tests
- [ ] Followup : logo optionnel

---

## ✅ Jalon livré — Factures + Taxes TPS/TVQ — `3e88b77` + `ecd4ed5`

- [x] Modèles `Invoice` + `InvoiceLine` + enum `InvoiceStatus` (BROUILLON/ENVOYEE/PAYEE/ANNULEE) + migration
- [x] **Calcul des taxes** TPS 5 % + TVQ 9,975 % : `computeInvoiceTotals` pur et testé (cents entiers, arrondis)
- [x] API CRUD + transition de statut (totaux calculés serveur) ; UI liste + détail + formulaire à lignes dynamiques
- [x] Tests (8 core + 7 service + 7 web)
- [ ] Followup : numérotation strictement sans trou (actuellement `autoincrement`), statut EN_RETARD, e2e

---

## ✅ Jalon livré — Export PDF des factures — `b23265f`

- [x] Approche choisie : **pdfkit** côté serveur (pur Node, pas de navigateur headless)
- [x] Gabarit FR : en-tête émetteur + numéros TPS/TVQ, client, lignes, totaux, notes
- [x] GET /invoices/:id/pdf (authentifié) + bouton « Télécharger le PDF » ; 2 tests + smoke live
- [ ] Followup : mentions légales QC complètes, logo

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
