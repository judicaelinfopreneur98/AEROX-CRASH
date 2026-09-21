import { PrismaClient } from '@prisma/client';

const TARGET_TENANT = 'tehysvfdgawdlqyvdipk';
const STALE_TENANT = 'zoohunqgsevksam';
const NEW_POOLER_URL = 'postgresql://postgres.tehysvfdgawdlqyvdipk:Judicael1212K@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const NEW_DIRECT_URL = 'postgresql://postgres.tehysvfdgawdlqyvdipk:Judicael1212K@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

function getSanitizedDatabaseUrl(): string {
  let url = process.env.DATABASE_URL || '';

  // If URL contains the stale deleted tenant or is empty, actively override with the new Supabase tenant
  if (!url || url.includes(STALE_TENANT)) {
    console.warn(`[Prisma] Detected stale or missing tenant in DATABASE_URL. Actively overriding with new Supabase tenant (${TARGET_TENANT}).`);
    url = NEW_POOLER_URL;
    process.env.DATABASE_URL = NEW_POOLER_URL;
  }

  // Also sanitize DIRECT_URL and POSTGRES_URL in process.env if present
  if (process.env.DIRECT_URL && process.env.DIRECT_URL.includes(STALE_TENANT)) {
    process.env.DIRECT_URL = NEW_DIRECT_URL;
  }
  if (process.env.POSTGRES_URL && process.env.POSTGRES_URL.includes(STALE_TENANT)) {
    process.env.POSTGRES_URL = NEW_POOLER_URL;
  }

  return url;
}

const activeUrl = getSanitizedDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: activeUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
