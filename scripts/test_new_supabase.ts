import { PrismaClient } from '@prisma/client';

const NEW_POOLER_URL = "postgresql://postgres.tehysvfdgawdlqyvdipk:Judicael1212K@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const NEW_DIRECT_URL = "postgresql://postgres.tehysvfdgawdlqyvdipk:Judicael1212K@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";

async function testConnection(name: string, url: string) {
  console.log(`\n--- Testing ${name} ---`);
  console.log(`URL: ${url.replace(/:[^:]*@/, ':****@')}`);
  
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  });

  try {
    const start = Date.now();
    // Test raw query
    const result: any[] = await client.$queryRaw`SELECT current_database(), current_user, version()`;
    const elapsed = Date.now() - start;
    console.log(`[${name}] Connection SUCCESS in ${elapsed}ms!`);
    console.log(`[${name}] DB: ${result[0]?.current_database}, User: ${result[0]?.current_user}`);
    
    // Inspect tables in public schema
    const tables: any[] = await client.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log(`[${name}] Existing tables in public schema:`, tables.map(t => t.table_name).join(', '));
    
    // Test queries on models
    const userCount = await client.user.count();
    const walletCount = await client.wallet.count();
    const betCount = await client.bet.count();
    const txCount = await client.transaction.count();
    const gameCount = await client.game.count();
    console.log(`[${name}] Counts -> Users: ${userCount}, Wallets: ${walletCount}, Bets: ${betCount}, Transactions: ${txCount}, Games: ${gameCount}`);
  } catch (err: any) {
    console.error(`[${name}] Connection FAILED:`, err.message);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  await testConnection('DATABASE_URL (Pooler 6543)', NEW_POOLER_URL);
  await testConnection('DIRECT_URL (Direct 5432)', NEW_DIRECT_URL);
}

main().catch(console.error);
