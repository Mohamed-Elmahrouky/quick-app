const ExcelJS = require('exceljs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zksrppafvmlijppsdldo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprc3JwcGFmdm1saWpwcHNkbGRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTEyOTg5NiwiZXhwIjoyMTA2NzA1ODk2fQ.c-DJK3AKG3mmKA-bKcFiVICVhR-v5ZCbDky761OPfjo';

const FILE = process.argv[2] || 'C:/Users/Ahmed/.gemini/antigravity/brain/f767da21-9ad7-425d-b3e7-03094a13ac95/.user_uploaded/media_1791140952889.xlsx';

async function run() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Read the Excel file
  console.log('Reading Excel file:', FILE);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE);

  const ws = workbook.worksheets[0];
  const titles = [];

  ws.eachRow((row, rowNum) => {
    // Try column A first, then B, check both
    const a = row.getCell(1).value?.toString().trim();
    const b = row.getCell(2).value?.toString().trim();
    const val = a || b;
    if (!val) return;
    // Skip header-like rows (if first row looks like a header)
    if (rowNum === 1 && /title|name|project|no|#/i.test(val)) return;
    titles.push(val);
  });

  console.log(`Found ${titles.length} project titles`);
  if (titles.length === 0) {
    console.error('No titles found! Check the Excel file structure.');
    process.exit(1);
  }

  // Show first 5 as preview
  console.log('Preview:', titles.slice(0, 5));

  // 2. Delete ALL existing projects (using service_role bypasses RLS)
  console.log('\nClearing existing projects...');
  const { error: delErr, count } = await supabase
    .from('projects')
    .delete()
    .gte('id', 0);

  if (delErr) console.warn('Delete warning:', delErr.message);
  else console.log('Cleared existing projects.');

  // Reset the serial sequence so IDs start from 1
  const { Client } = require('pg');
  const pg = new Client({
    connectionString: 'postgresql://postgres.zksrppafvmlijppsdldo:IYUSAZ1kiepWXjh0@aws-0-eu-west-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await pg.connect();
  await pg.query("SELECT setval(pg_get_serial_sequence('public.projects', 'id'), 1, false);");
  console.log('Reset ID sequence to 1.');
  await pg.end();

  // 3. Insert in batches of 50
  const rows = titles.map(title => ({ title }));
  const BATCH = 50;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('projects').insert(batch);
    if (error) {
      console.error(`Batch ${i}-${i+BATCH} error:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\rInserted ${inserted}/${rows.length}...`);
    }
  }

  console.log(`\n\nDone! ${inserted} projects imported successfully.`);

  // Verify
  const { data } = await supabase.from('projects').select('id, title').order('id').limit(5);
  console.log('First 5 in DB:', data);
}

run().catch(console.error);
