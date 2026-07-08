import net from 'node:net';
import { spawn } from 'node:child_process';

const DEFAULTS = {
  DATABASE_URL: 'postgresql://facturation:facturation@127.0.0.1:55432/facturation?schema=public',
  ADMIN_EMAIL: 'admin@facturation.local',
  ADMIN_PASSWORD: 'local-admin-password-not-for-prod',
  JWT_ACCESS_SECRET: 'local-test-access-secret-not-for-prod',
  JWT_REFRESH_SECRET: 'local-test-refresh-secret-not-for-prod',
  NODE_ENV: 'test',
  COOKIE_SECURE: 'false',
};

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const isWindows = process.platform === 'win32';

function buildEnv() {
  const parentEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key, value]) => !key.startsWith('=') && value != null),
  );

  return {
    ...parentEnv,
    DATABASE_URL: process.env.LOCAL_TEST_DATABASE_URL ?? DEFAULTS.DATABASE_URL,
    ADMIN_EMAIL: process.env.LOCAL_TEST_ADMIN_EMAIL ?? DEFAULTS.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.LOCAL_TEST_ADMIN_PASSWORD ?? DEFAULTS.ADMIN_PASSWORD,
    JWT_ACCESS_SECRET: process.env.LOCAL_TEST_JWT_ACCESS_SECRET ?? DEFAULTS.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.LOCAL_TEST_JWT_REFRESH_SECRET ?? DEFAULTS.JWT_REFRESH_SECRET,
    NODE_ENV: DEFAULTS.NODE_ENV,
    COOKIE_SECURE: DEFAULTS.COOKIE_SECURE,
  };
}

function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
    throw new Error('LOCAL_TEST_DATABASE_URL must use the postgresql:// protocol.');
  }

  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `Refusing to reset non-local database host "${url.hostname}". Use 127.0.0.1, localhost, or ::1.`,
    );
  }

  if (!url.pathname || url.pathname === '/') {
    throw new Error('LOCAL_TEST_DATABASE_URL must include a database name.');
  }

  const port = Number(url.port || 5432);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid PostgreSQL port "${url.port}".`);
  }

  return { host: url.hostname, port, database: url.pathname.slice(1) };
}

function assertReachable({ host, port }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`PostgreSQL is not reachable at ${host}:${port}.`));
    }, 5_000);

    socket.once('connect', () => {
      clearTimeout(timeout);
      socket.end();
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`PostgreSQL is not reachable at ${host}:${port}: ${error.message}`));
    });
  });
}

function run(label, args, env) {
  console.log(`\n> ${label}`);

  return new Promise((resolve, reject) => {
    const command = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
    const commandArgs = isWindows ? ['/d', '/s', '/c', ['npm', ...args].join(' ')] : args;
    const child = spawn(command, commandArgs, {
      env,
      stdio: 'inherit',
      shell: false,
    });

    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code}.`));
    });
  });
}

async function main() {
  const env = buildEnv();
  const database = parseDatabaseUrl(env.DATABASE_URL);

  console.log(`Local test database: ${database.host}:${database.port}/${database.database}`);
  await assertReachable(database);

  await run(
    'Reset local database and apply Prisma migrations',
    [
      'exec',
      '--',
      'prisma',
      'migrate',
      'reset',
      '--schema',
      'packages/db/prisma/schema.prisma',
      '--force',
      '--skip-seed',
    ],
    env,
  );
  await run('Seed local admin user', ['exec', '--', 'tsx', 'packages/db/prisma/seed.ts'], env);
  await run('Run workspace tests', ['test'], env);
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
