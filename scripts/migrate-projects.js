const { Client } = require('pg');

const sql = `
create table if not exists public.projects (
  id         serial primary key,
  title      text not null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "public can read projects" on public.projects;
create policy "public can read projects"
  on public.projects for select
  to anon
  using (true);

drop policy if exists "authenticated can read projects" on public.projects;
create policy "authenticated can read projects"
  on public.projects for select
  to authenticated
  using (true);

drop policy if exists "admins can insert projects" on public.projects;
create policy "admins can insert projects"
  on public.projects for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "admins can delete projects" on public.projects;
create policy "admins can delete projects"
  on public.projects for delete
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'submissions'
    and column_name = 'project_id'
  ) then
    alter table public.submissions add column project_id int references public.projects(id);
  end if;
end$$;
`;

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.zksrppafvmlijppsdldo:IYUSAZ1kiepWXjh0@aws-0-eu-west-2.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected!');
  await client.query(sql);
  console.log('Projects table + policies created!');
  const res = await client.query('select count(*) from public.projects;');
  console.log('Current project count:', res.rows[0].count);
  await client.end();
}

run().catch(console.error);
