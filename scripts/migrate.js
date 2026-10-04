const { Client } = require('pg');

const sql = `
create table if not exists public.submissions (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null check (char_length(full_name) between 2 and 100),
  academic_number text not null check (academic_number ~ '^[0-9]{5,12}$'),
  project_name    text not null check (char_length(project_name) between 2 and 150),
  created_at      timestamptz not null default now()
);

create unique index if not exists submissions_unique_idx
  on public.submissions (academic_number, lower(project_name));

alter table public.submissions enable row level security;

-- Drop existing policies if they exist so we can recreate cleanly
drop policy if exists "public can insert" on public.submissions;
create policy "public can insert"
  on public.submissions for insert
  to anon
  with check (true);

drop policy if exists "authenticated can insert" on public.submissions;
create policy "authenticated can insert"
  on public.submissions for insert
  to authenticated
  with check (true);

drop policy if exists "admins can read" on public.submissions;
create policy "admins can read"
  on public.submissions for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "admins can delete" on public.submissions;
create policy "admins can delete"
  on public.submissions for delete
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
`;

async function testConnection(connectionString, name) {
  console.log(`Trying ${name}...`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log(`Connected successfully to ${name}!`);
    await client.query(sql);
    console.log('Migration executed successfully!');
    const res = await client.query('select count(*) from public.submissions;');
    console.log('Current submissions count:', res.rows[0].count);
    await client.end();
    return true;
  } catch (err) {
    console.error(`Failed ${name}:`, err.message);
    try { await client.end(); } catch (_) {}
    return false;
  }
}

async function run() {
  const configs = [
    {
      name: "Pooler port 6543 (transaction mode)",
      url: "postgresql://postgres.zksrppafvmlijppsdldo:IYUSAZ1kiepWXjh0@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"
    },
    {
      name: "Pooler port 5432 (session mode)",
      url: "postgresql://postgres.zksrppafvmlijppsdldo:IYUSAZ1kiepWXjh0@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"
    },
    {
      name: "Direct port 5432",
      url: "postgresql://postgres:IYUSAZ1kiepWXjh0@db.zksrppafvmlijppsdldo.supabase.co:5432/postgres"
    }
  ];

  for (const cfg of configs) {
    const success = await testConnection(cfg.url, cfg.name);
    if (success) {
      console.log('Database initialized successfully!');
      process.exit(0);
    }
  }
  process.exit(1);
}

run();
