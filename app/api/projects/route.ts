import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [projectsRes, subsRes] = await Promise.all([
    supabase.from('projects').select('id, title').order('id', { ascending: true }),
    supabase.from('submissions').select('project_id').not('project_id', 'is', null),
  ]);

  if (projectsRes.error) {
    return NextResponse.json({ error: projectsRes.error.message }, { status: 500 });
  }

  const takenIds = Array.from(
    new Set((subsRes.data || []).map((s: { project_id: number }) => s.project_id))
  );

  return NextResponse.json({
    projects: projectsRes.data ?? [],
    takenIds,
  });
}
