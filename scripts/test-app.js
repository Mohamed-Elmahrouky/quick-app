const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zksrppafvmlijppsdldo.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprc3JwcGFmdm1saWpwcHNkbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMjk4OTYsImV4cCI6MjEwNjcwNTg5Nn0.ygKRepPvY9njNlPLU22dN0FlLNy0RmiTprLo6GbcMZs';

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE SECURITY & DATABASE TESTS ---');

  // Test 1: Anon client (public user) attempting to SELECT directly from Supabase
  console.log('\n[Test 1] Testing RLS: Public anon SELECT restriction...');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: anonReadData, error: anonReadError } = await anonClient
    .from('submissions')
    .select('*');

  if (anonReadData && anonReadData.length > 0) {
    console.error('FAIL: Anon user was able to read data!');
    process.exit(1);
  } else {
    console.log('PASS: Anon user CANNOT read submissions! (Returned empty array or RLS blocked: ', anonReadData, ')');
  }

  // Test 2: Anon client inserting a test submission
  console.log('\n[Test 2] Testing RLS: Public anon INSERT permission...');
  const testAcademicNum = '202499001';
  const testProject = 'Solar Powered Smart Irrigation System';
  const testStudent = 'Mariam Farouk';

  const { error: insertError } = await anonClient
    .from('submissions')
    .insert([
      {
        full_name: testStudent,
        academic_number: testAcademicNum,
        project_name: testProject,
      },
    ]);

  if (insertError) {
    console.error('FAIL on anon insert:', insertError);
    process.exit(1);
  } else {
    console.log('PASS: Public anon inserted successfully!');
  }

  // Test 3: Duplicate insertion restriction
  console.log('\n[Test 3] Testing Duplicate Project Prevention...');
  const { data: dupData, error: dupError } = await anonClient
    .from('submissions')
    .insert([
      {
        full_name: testStudent,
        academic_number: testAcademicNum,
        project_name: testProject,
      },
    ]);

  if (dupError && dupError.code === '23505') {
    console.log('PASS: Duplicate submission was correctly rejected by database constraint (code 23505)!');
  } else {
    console.error('FAIL: Duplicate was not rejected as expected:', dupError);
    process.exit(1);
  }

  // Test 4: Admin authentication & Admin SELECT permission
  console.log('\n[Test 4] Testing Admin login and reading submissions...');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: authData, error: authError } = await adminClient.auth.signInWithPassword({
    email: 'admin@quickapp.com',
    password: 'AdminPassword123!',
  });

  if (authError || !authData.user) {
    console.error('FAIL: Admin login failed:', authError);
    process.exit(1);
  }
  console.log('PASS: Admin logged in successfully! Role:', authData.user.app_metadata?.role);

  // Now SELECT using authenticated admin client
  const { data: adminReadData, error: adminReadError } = await adminClient
    .from('submissions')
    .select('*');

  if (adminReadError) {
    console.error('FAIL: Admin could not read submissions:', adminReadError);
    process.exit(1);
  }

  console.log(`PASS: Admin successfully read ${adminReadData.length} submission(s)!`);
  console.log('Sample record:', {
    student: adminReadData[0]?.full_name,
    academicNumber: adminReadData[0]?.academic_number,
    project: adminReadData[0]?.project_name,
  });

  console.log('\n>>> ALL DATABASE, RLS & AUTH TESTS PASSED CLEANLY! <<<');
}

runTests().catch(console.error);
