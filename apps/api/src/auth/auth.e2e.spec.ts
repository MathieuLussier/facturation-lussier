/**
 * Tests e2e pour l'authentification (AppModule + DB reelle).
 *
 * Bootstrap : @nestjs/testing Test.createTestingModule + AppModule
 * - ThrottlerModule est override avec une limite tres haute pour eviter
 *   les interferences entre tests (sauf le test de rate-limit isole).
 * - La ValidationPipe et cookie-parser sont appliques manuellement
 *   car main.ts n'est pas execute.
 *
 * Prerequis : Postgres tourne, migrations appliquees, seed effectue.
 * Variables lues depuis process.env (dotenv injecte par le harness).
 */

import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { CanActivate, ExecutionContext, ValidationPipe, type INestApplication } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest') as (app: unknown) => import('supertest').SuperTest<import('supertest').Test>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as () => import('express').RequestHandler;
import { AppModule } from '../app.module';
import { AuthService } from './auth.service';

/** Guard no-op qui laisse passer toutes les requetes (bypass throttler pour tests). */
class NoopThrottlerGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Constantes issues de l'environnement
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@facturation.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface HttpResponse {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  status: number;
}

function extractCookie(res: HttpResponse, name: string): string | null {
  const setCookieHeader = res.headers['set-cookie'] as string[] | string | undefined;
  if (!setCookieHeader) return null;

  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const cookie of cookies) {
    const [pair] = cookie.split(';');
    const [key, value] = pair.split('=');
    if (key?.trim() === name) return value?.trim() ?? null;
  }
  return null;
}

async function buildApp(bypassThrottler = false): Promise<{ app: INestApplication; authService: AuthService }> {
  const builder = Test.createTestingModule({
    imports: [AppModule],
  });

  if (bypassThrottler) {
    // Remplace le ThrottlerGuard par un no-op pour eviter les interferences
    builder.overrideGuard(ThrottlerGuard).useClass(NoopThrottlerGuard);
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const authService = moduleRef.get<AuthService>(AuthService);
  return { app, authService };
}

// ---------------------------------------------------------------------------
// Suite principale (throttler bypass)
// ---------------------------------------------------------------------------

describe('Auth e2e', () => {
  let app: INestApplication;
  let authService: AuthService;

  let memberEmail: string;
  const memberPassword = 'MemberPass123!';

  beforeAll(async () => {
    const built = await buildApp(true);
    app = built.app;
    authService = built.authService;

    // Creer un utilisateur MEMBER pour les tests de role
    memberEmail = `e2e-member-${Date.now()}@example.com`;
    await authService.createUser({
      email: memberEmail,
      name: 'Test Member',
      password: memberPassword,
      role: 'MEMBER',
    });
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // POST /auth/login
  // -------------------------------------------------------------------------

  describe('POST /auth/login', () => {
    it('200 + accessToken + cookie refresh httpOnly avec identifiants valides', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('expiresInSec');
      expect(typeof res.body.accessToken).toBe('string');

      const cookieHeader = res.headers['set-cookie'] as string[] | string | undefined;
      expect(cookieHeader).toBeDefined();

      const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader ?? ''];
      const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie?.toLowerCase()).toContain('httponly');
    });

    it('401 message generique avec mauvais mot de passe', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: 'wrong-password' })
        .expect(401);

      expect(res.body.message).toContain('Identifiants invalides');
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('401 avec email inexistant', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'SomePass123!' })
        .expect(401);
    });

    it('400 avec email invalide', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'SomePass123!' })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /auth/me
  // -------------------------------------------------------------------------

  describe('GET /auth/me', () => {
    it('401 sans token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('retourne user sans passwordHash avec Bearer valide', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);

      const { accessToken } = loginRes.body as { accessToken: string };

      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meRes.body).toHaveProperty('id');
      expect(meRes.body).toHaveProperty('email');
      expect(meRes.body).toHaveProperty('role');
      expect(meRes.body).toHaveProperty('isActive');
      expect(meRes.body).not.toHaveProperty('passwordHash');
      expect((meRes.body as { email: string }).email).toBe(ADMIN_EMAIL.toLowerCase());
    });

    it('401 avec token invalide', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /auth/refresh
  // -------------------------------------------------------------------------

  describe('POST /auth/refresh', () => {
    it('200 + nouvel accessToken avec cookie refresh valide', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);

      const refreshCookieValue = extractCookie(loginRes, 'refresh_token');
      expect(refreshCookieValue).not.toBeNull();

      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshCookieValue}`)
        .expect(200);

      expect(refreshRes.body).toHaveProperty('accessToken');
      expect(refreshRes.body).toHaveProperty('expiresInSec');

      // Rotation : un nouveau cookie refresh doit etre emis
      const newCookie = extractCookie(refreshRes, 'refresh_token');
      expect(newCookie).not.toBeNull();
    });

    it('401 sans cookie refresh', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(401);
    });

    it('401 avec token invalide', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=totally-invalid-token')
        .expect(401);
    });

    // ------------------------------------------------------------------
    // Non-regression : refresh IMMEDIAT apres login (bug collision jti)
    //
    // Avant correctif : le refresh token etait signe sans jti.
    // Deux tokens emis dans la meme seconde avaient le meme payload
    // => meme tokenHash => collision @unique => 500.
    // Correctif : jti: crypto.randomUUID() dans generateTokenPair.
    // ------------------------------------------------------------------

    it('non-regression : login PUIS refresh immediat (meme seconde) → 200', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);

      const refreshCookieValue = extractCookie(loginRes, 'refresh_token');
      expect(refreshCookieValue).not.toBeNull();

      // Refresh immediat — ne doit pas produire de collision tokenHash
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshCookieValue}`)
        .expect(200);

      expect(refreshRes.body).toHaveProperty('accessToken');

      // 2e refresh avec le nouveau cookie (rotation) → 200
      const refreshCookie2 = extractCookie(refreshRes, 'refresh_token');
      expect(refreshCookie2).not.toBeNull();

      const refreshRes2 = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshCookie2}`)
        .expect(200);

      expect(refreshRes2.body).toHaveProperty('accessToken');
    });

    it('non-regression : reutilisation du meme refresh token → 401', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);

      const refreshCookieValue = extractCookie(loginRes, 'refresh_token');
      expect(refreshCookieValue).not.toBeNull();

      // Premier refresh : consomme le token, emet un nouveau
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshCookieValue}`)
        .expect(200);

      // Deuxieme refresh avec le MEME token revoque → 401
      const reuseRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshCookieValue}`)
        .expect(401);

      expect(reuseRes.body).toHaveProperty('message');
    });
  });

  // -------------------------------------------------------------------------
  // POST /auth/logout
  // -------------------------------------------------------------------------

  describe('POST /auth/logout', () => {
    it('204 + cookie efface apres logout', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);

      const { accessToken } = loginRes.body as { accessToken: string };
      const refreshCookieValue = extractCookie(loginRes, 'refresh_token');
      expect(refreshCookieValue).not.toBeNull();

      const logoutRes = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', `refresh_token=${refreshCookieValue}`)
        .expect(204);

      // Cookie doit etre efface (max-age=0)
      const cookieHeader = logoutRes.headers['set-cookie'] as string[] | string | undefined;
      if (cookieHeader) {
        const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
        const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
        if (refreshCookie) {
          const parts = refreshCookie.toLowerCase().split(';').map((s) => s.trim());
          const isCleared = parts.some(
            (p) => p === 'max-age=0' || p.startsWith('expires=thu, 01 jan 1970'),
          );
          expect(isCleared).toBe(true);
        }
      }
    });

    it('refresh avec token revoque apres logout → 401', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);

      const { accessToken } = loginRes.body as { accessToken: string };
      const refreshCookieValue = extractCookie(loginRes, 'refresh_token');
      expect(refreshCookieValue).not.toBeNull();

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', `refresh_token=${refreshCookieValue}`)
        .expect(204);

      // Refresh apres logout → 401
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshCookieValue}`)
        .expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET /users — restriction ADMIN
  // -------------------------------------------------------------------------

  describe('GET /users — controle de role', () => {
    it('403 pour un MEMBER sur GET /users', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: memberEmail, password: memberPassword })
        .expect(200);

      const { accessToken } = loginRes.body as { accessToken: string };

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('200 pour un ADMIN sur GET /users', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);

      const { accessToken } = loginRes.body as { accessToken: string };

      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // Aucun utilisateur ne doit contenir de passwordHash
      for (const user of res.body as Record<string, unknown>[]) {
        expect(user).not.toHaveProperty('passwordHash');
      }
    });

    it('401 sur GET /users sans token', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // CRUD /users — ADMIN
  // -------------------------------------------------------------------------

  describe('CRUD /users — ADMIN', () => {
    let adminToken: string;
    let createdUserId: string;
    const crudEmail = `e2e-crud-${Date.now()}@example.com`;

    beforeAll(async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);
      adminToken = (loginRes.body as { accessToken: string }).accessToken;
    });

    it('POST /users → 201 + user sans passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: crudEmail,
          name: 'CRUD Test',
          password: 'CrudPass123!',
          role: 'MEMBER',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect((res.body as { email: string }).email).toBe(crudEmail.toLowerCase());
      expect(res.body).not.toHaveProperty('passwordHash');
      createdUserId = (res.body as { id: string }).id;
    });

    it('GET /users/:id → 200 + user sans passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect((res.body as { id: string }).id).toBe(createdUserId);
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('PATCH /users/:id → 200 + champs mis a jour', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'CRUD Updated' })
        .expect(200);

      expect((res.body as { name: string }).name).toBe('CRUD Updated');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('DELETE /users/:id → 204', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('GET /users/:id → 404 apres suppression', async () => {
      await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('409 sur creation avec email en double', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: ADMIN_EMAIL,
          name: 'Doublon',
          password: 'Password123!',
          role: 'MEMBER',
        })
        .expect(409);
    });
  });
});

// ---------------------------------------------------------------------------
// Suite isolee : Rate-limit (throttler reel, limite 10/min)
// Lance en dernier pour ne pas polluer les autres tests.
// ---------------------------------------------------------------------------

describe('Auth e2e — Rate-limit (isole)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const built = await buildApp(false); // throttler REEL
    app = built.app;
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('429 apres 10 tentatives erronees consecutives sur /auth/login', async () => {
    let got429 = false;

    for (let i = 0; i < 12; i++) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ratelimit-test@example.com', password: 'wrong' });

      if (res.status === 429) {
        got429 = true;
        break;
      }
    }

    expect(got429).toBe(true);
  }, 30_000);
});
