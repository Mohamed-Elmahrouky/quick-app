import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, title')
    .order('id', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}
