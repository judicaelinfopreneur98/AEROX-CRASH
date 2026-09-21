// Simulate stale Vercel env variable
process.env.DATABASE_URL = "postgresql://postgres.zoohunqgsevksameruls:OldSecret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
process.env.DIRECT_URL = "postgresql://postgres.zoohunqgsevksameruls:OldSecret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";

import { prisma } from '../lib/prisma';

async function testOverride() {
  console.log('Testing stale tenant override in lib/prisma.ts...');
  const userCount = await prisma.user.count();
  console.log(`Successfully connected despite stale env! User count: ${userCount}`);
  await prisma.$disconnect();
}

testOverride().catch((err) => {
  console.error('Override test failed:', err);
  process.exit(1);
});
