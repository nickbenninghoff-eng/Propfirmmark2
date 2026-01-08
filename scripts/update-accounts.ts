import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const result = await sql`
    UPDATE trading_accounts
    SET status = 'active'
    WHERE status = 'pending_activation'
    RETURNING account_number
  `;

  console.log(`Updated ${result.length} accounts to active`);
  for (const r of result) {
    console.log(`- ${r.account_number}`);
  }
}

main().catch(console.error);
