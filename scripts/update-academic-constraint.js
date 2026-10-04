const { Client } = require('pg');

async function updateConstraint() {
  const client = new Client({
    connectionString: 'postgresql://postgres.zksrppafvmlijppsdldo:IYUSAZ1kiepWXjh0@aws-0-eu-west-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Postgres.');

  await client.query(`
    ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_academic_number_check;
    ALTER TABLE public.submissions ADD CONSTRAINT submissions_academic_number_check CHECK (academic_number ~ '^[0-9]{10}$');
  `);

  console.log('Updated academic_number constraint to exactly 10 digits successfully!');
  await client.end();
}

updateConstraint().catch(err => {
  console.error('Error updating constraint:', err);
  process.exit(1);
});
