import 'reflect-metadata';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Helpers de mock
// ---------------------------------------------------------------------------

function makePrisma() {
  return {
    client: {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((ops: unknown[]) => Promise.resolve(ops)),
    },
  } as unknown as PrismaService;
}

function makeJwt() {
  return {
    sign: jest.fn().mockReturnValue('signed-token'),
    verify: jest.fn(),
  } as unknown as JwtService;
}

function makeConfig(overrides: Record<string, string> = {}) {
  const defaults: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    ACCESS_TTL: '900',
    REFRESH_TTL: '604800',
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => defaults[key] ?? undefined),
  } as unknown as ConfigService;
}

function makeDbUser(overrides = {}) {
  return {
    id: 'user-id-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'ADMIN',
    isActive: true,
    passwordHash: '$2b$12$hashedpassword',
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AuthService — tests unitaires
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrisma>;
  let jwtService: ReturnType<typeof makeJwt>;

  beforeEach(() => {
    prisma = makePrisma();
    jwtService = makeJwt();
    service = new AuthService(prisma, jwtService, makeConfig());
  });

  // -------------------------------------------------------------------------
  // hashPassword
  // -------------------------------------------------------------------------

  describe('hashPassword', () => {
    it('produit un hash bcrypt different du mot de passe original', async () => {
      const hash = await service.hashPassword('monMotDePasse!');
      expect(hash).not.toBe('monMotDePasse!');
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    it('deux appels produisent des hashes distincts (sel aleatoire)', async () => {
      const hash1 = await service.hashPassword('monMotDePasse!');
      const hash2 = await service.hashPassword('monMotDePasse!');
      expect(hash1).not.toBe(hash2);
    });

    it('le hash est verifiable avec bcrypt.compare', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hashPassword(password);
      const valid = await bcrypt.compare(password, hash);
      expect(valid).toBe(true);
    });

    it('un mauvais mot de passe ne passe pas la comparaison', async () => {
      const hash = await service.hashPassword('correct-password');
      const valid = await bcrypt.compare('wrong-password', hash);
      expect(valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // toAuthUser — jamais de passwordHash
  // -------------------------------------------------------------------------

  describe('toAuthUser', () => {
    it('retourne uniquement les champs publics', () => {
      const dbUser = makeDbUser();
      const authUser = service.toAuthUser(dbUser);

      expect(authUser).toEqual({
        id: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        isActive: true,
      });
    });

    it('ne contient JAMAIS le champ passwordHash', () => {
      const dbUser = makeDbUser();
      const authUser = service.toAuthUser(dbUser);
      expect(authUser).not.toHaveProperty('passwordHash');
    });

    it('mappe correctement le role MEMBER', () => {
      const dbUser = makeDbUser({ role: 'MEMBER' });
      const authUser = service.toAuthUser(dbUser);
      expect(authUser.role).toBe('MEMBER');
    });
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------

  describe('login', () => {
    it('retourne des tokens quand les identifiants sont valides', async () => {
      const password = 'ValidPassword123!';
      const hash = await bcrypt.hash(password, 12);
      const dbUser = makeDbUser({ passwordHash: hash });

      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(dbUser);
      (prisma.client.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.client.refreshToken.create as jest.Mock).mockResolvedValue({});
      (jwtService.sign as jest.Mock).mockReturnValue('mock-token');

      const result = await service.login(dbUser.email, password);

      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('refreshToken');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('expiresInSec');
    });

    it("lance UnauthorizedException quand l'utilisateur n'existe pas", async () => {
      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login('inconnu@example.com', 'password123!')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lance UnauthorizedException quand le mot de passe est incorrect', async () => {
      const hash = await bcrypt.hash('correct-password', 12);
      const dbUser = makeDbUser({ passwordHash: hash });

      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

      await expect(service.login(dbUser.email, 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("lance UnauthorizedException quand le compte n'est pas actif", async () => {
      const hash = await bcrypt.hash('password123!', 12);
      const dbUser = makeDbUser({ passwordHash: hash, isActive: false });

      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

      await expect(service.login(dbUser.email, 'password123!')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('utilise un message generique pour ne pas divulguer si le compte existe', async () => {
      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login('x@x.com', 'password123!')).rejects.toThrow(
        'Identifiants invalides',
      );
    });

    it('normalise email en minuscules lors de la recherche', async () => {
      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(null);

      try {
        await service.login('TEST@EXAMPLE.COM', 'password123!');
      } catch {
        // Expected
      }

      expect(prisma.client.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('stocke un tokenHash en base lors de la generation de tokens', async () => {
      const password = 'StrongPassword1!';
      const hash = await bcrypt.hash(password, 12);
      const dbUser = makeDbUser({ passwordHash: hash });

      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(dbUser);
      (prisma.client.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.client.refreshToken.create as jest.Mock).mockResolvedValue({});

      await service.login(dbUser.email, password);

      expect(prisma.client.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: dbUser.id,
            tokenHash: expect.any(String),
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // refresh — rotation du token
  // -------------------------------------------------------------------------

  describe('refresh', () => {
    const makeRefreshPayload = () => ({
      sub: 'user-id-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN',
      isActive: true,
      jti: crypto.randomUUID(),
    });

    it('retourne de nouveaux tokens et revoque ancien token', async () => {
      const rawToken = 'valid-refresh-token';
      const storedToken = {
        id: 'token-db-id',
        userId: 'user-id-123',
        tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600_000),
      };
      const dbUser = makeDbUser();

      (jwtService.verify as jest.Mock).mockReturnValue(makeRefreshPayload());
      (prisma.client.refreshToken.findUnique as jest.Mock).mockResolvedValue(storedToken);
      (prisma.client.refreshToken.update as jest.Mock).mockResolvedValue({});
      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(dbUser);
      (prisma.client.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.client.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await service.refresh(rawToken);

      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('refreshToken');

      // L'ancien token doit etre revoque
      expect(prisma.client.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: storedToken.id },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('lance UnauthorizedException si le JWT est invalide', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lance UnauthorizedException si le token est introuvable en base', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(makeRefreshPayload());
      (prisma.client.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.client.refreshToken.updateMany as jest.Mock).mockResolvedValue({});

      await expect(service.refresh('used-token')).rejects.toThrow(UnauthorizedException);
    });

    it('revoque TOUS les tokens en cas de reutilisation detectee', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(makeRefreshPayload());
      (prisma.client.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.client.refreshToken.updateMany as jest.Mock).mockResolvedValue({});

      try {
        await service.refresh('already-used-token');
      } catch {
        // Expected
      }

      expect(prisma.client.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-id-123', revokedAt: null }),
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('lance UnauthorizedException si le token est revoque', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(makeRefreshPayload());
      (prisma.client.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-db-id',
        userId: 'user-id-123',
        revokedAt: new Date(), // deja revoque
        expiresAt: new Date(Date.now() + 3600_000),
      });

      await expect(service.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lance UnauthorizedException si le token est expire', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(makeRefreshPayload());
      (prisma.client.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-db-id',
        userId: 'user-id-123',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // expire
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lance UnauthorizedException si le compte utilisateur est desactive', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(makeRefreshPayload());
      (prisma.client.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-db-id',
        userId: 'user-id-123',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600_000),
      });
      (prisma.client.refreshToken.update as jest.Mock).mockResolvedValue({});
      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(
        makeDbUser({ isActive: false }),
      );

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------

  describe('logout', () => {
    it('revoque le refresh token en base', async () => {
      (prisma.client.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.logout('my-refresh-token');

      const expectedHash = crypto
        .createHash('sha256')
        .update('my-refresh-token')
        .digest('hex');

      expect(prisma.client.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: expectedHash, revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });

    it('ne lance pas erreur si le token est inexistant', async () => {
      (prisma.client.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(service.logout('inexistant-token')).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // createUser
  // -------------------------------------------------------------------------

  describe('createUser', () => {
    it('cree un utilisateur et retourne AuthUser sans passwordHash', async () => {
      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(null);
      const createdDbUser = makeDbUser();
      (prisma.client.user.create as jest.Mock).mockResolvedValue(createdDbUser);

      const result = await service.createUser({
        email: 'new@example.com',
        name: 'Nouveau',
        password: 'Password123!',
        role: 'MEMBER',
      });

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
    });

    it('lance ConflictException si email existe deja', async () => {
      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(makeDbUser());

      await expect(
        service.createUser({
          email: 'existing@example.com',
          name: 'Dup',
          password: 'Password123!',
          role: 'MEMBER',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('hache le mot de passe avant de creer utilisateur', async () => {
      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.client.user.create as jest.Mock).mockResolvedValue(makeDbUser());

      await service.createUser({
        email: 'new2@example.com',
        name: 'Test',
        password: 'ClearPassword1!',
        role: 'ADMIN',
      });

      const createCall = (prisma.client.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe('ClearPassword1!');
      expect(createCall.data.passwordHash).toMatch(/^\$2b\$/);
    });
  });

  // -------------------------------------------------------------------------
  // Non-regression : jti garantit unicite des refresh tokens (bug collision)
  // -------------------------------------------------------------------------

  describe('non-regression jti — deux tokens generes dans la meme seconde', () => {
    it('deux logins consecutifs produisent des refresh tokens differents', async () => {
      const password = 'StrongPassword1!';
      const hash = await bcrypt.hash(password, 12);
      const dbUser = makeDbUser({ passwordHash: hash });

      (prisma.client.user.findUnique as jest.Mock).mockResolvedValue(dbUser);
      (prisma.client.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.client.refreshToken.create as jest.Mock).mockResolvedValue({});

      // Utilise la vraie implementation de JwtService pour tester le jti
      const realJwt = new JwtService();
      const serviceWithRealJwt = new AuthService(prisma, realJwt, makeConfig());

      const result1 = await serviceWithRealJwt.login(dbUser.email, password);
      const result2 = await serviceWithRealJwt.login(dbUser.email, password);

      // Les refresh tokens doivent etre distincts grace au jti
      expect(result1.refreshToken).not.toBe(result2.refreshToken);
    });
  });
});
