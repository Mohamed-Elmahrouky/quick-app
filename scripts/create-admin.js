const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zksrppafvmlijppsdldo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprc3JwcGFmdm1saWpwcHNkbGRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTEyOTg5NiwiZXhwIjoyMTA2NzA1ODk2fQ.c-DJK3AKG3mmKA-bKcFiVICVhR-v5ZCbDky761OPfjo';

const adminEmail = process.argv[2] || 'admin@quickapp.com';
const adminPassword = process.argv[3] || 'AdminPassword123!';

async function setupAdmin() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Checking / creating admin account: ${adminEmail}...`);

  // Check if user already exists
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    process.exit(1);
  }

  const existingUser = usersData.users.find((u) => u.email === adminEmail);

  if (existingUser) {
    console.log(`User ${adminEmail} already exists (ID: ${existingUser.id}). Updating to ensure admin role...`);
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: adminPassword,
        email_confirm: true,
        app_metadata: { ...existingUser.app_metadata, role: 'admin' },
      }
    );
    if (updateError) {
      console.error('Update failed:', updateError);
      process.exit(1);
    }
    console.log('Admin user updated successfully with admin role!');
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      app_metadata: { role: 'admin' },
    });
    if (createError) {
      console.error('Create failed:', createError);
      process.exit(1);
    }
    console.log('Admin user created successfully!');
    console.log('ID:', created.user.id);
  }

  console.log('--- ADMIN CREDENTIALS ---');
  console.log('Email:', adminEmail);
  console.log('Password:', adminPassword);
  console.log('Role: admin');
  console.log('-------------------------');
}

setupAdmin().catch(console.error);
