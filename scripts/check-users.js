const { Client } = require('pg');

async function checkAdmin() {
  const client = new Client({
    connectionString: "postgresql://postgres.zksrppafvmlijppsdldo:IYUSAZ1kiepWXjh0@aws-0-eu-west-2.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query(`
    select id, email, raw_app_meta_data, created_at 
    from auth.users;
  `);
  console.log('Existing users in auth.users:', JSON.stringify(res.rows, null, 2));
  await client.end();
}

checkAdmin().catch(console.error);
