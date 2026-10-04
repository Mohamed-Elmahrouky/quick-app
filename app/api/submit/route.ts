import { NextResponse } from 'next/server';
import { submissionSchema } from '../../../lib/validation';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = submissionSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues?.[0]?.message || 'Invalid input.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { fullName, academicNumber, projectId } = parseResult.data;

    // Use service role for server-side verification and insert
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Check if project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: `Project #${projectId} not found.` }, { status: 404 });
    }

    // 2. Check if project is already claimed
    const { data: existingProject } = await supabase
      .from('submissions')
      .select('id, full_name')
      .eq('project_id', projectId)
      .maybeSingle();

    if (existingProject) {
      return NextResponse.json(
        { error: `Project #${projectId} has already been registered by another student. Please select an available project.` },
        { status: 409 }
      );
    }

    // 3. Check if academic number already submitted
    const { data: existingStudent } = await supabase
      .from('submissions')
      .select('id, project_name')
      .eq('academic_number', academicNumber.trim())
      .maybeSingle();

    if (existingStudent) {
      return NextResponse.json(
        { error: `Academic ID ${academicNumber} has already registered a project ("${existingStudent.project_name}"). Each student can register only once.` },
        { status: 409 }
      );
    }

    // 4. Insert submission
    const submissionRecord = {
      full_name: fullName.trim(),
      academic_number: academicNumber.trim(),
      project_name: project.title,
      project_id: projectId,
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('submissions')
      .insert([submissionRecord]);

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to record registration. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Registration successful!',
      submission: submissionRecord,
    }, { status: 201 });
  } catch (err) {
    console.error('Submit API error:', err);
    return NextResponse.json({ error: 'Unexpected error. Please try again.' }, { status: 500 });
  }
}
