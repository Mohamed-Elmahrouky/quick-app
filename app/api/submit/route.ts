import { NextResponse } from 'next/server';
import { submissionSchema } from '../../../lib/validation';
import { createClient } from '../../../lib/supabase-server';

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
    const supabase = createClient();

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project number not found.' }, { status: 400 });
    }

    // Insert submission (anon INSERT only, no SELECT back)
    const { error } = await supabase
      .from('submissions')
      .insert([{
        full_name: fullName.trim(),
        academic_number: academicNumber.trim(),
        project_name: project.title,
        project_id: projectId,
      }]);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `Academic number ${academicNumber} already registered project #${projectId}.` },
          { status: 409 }
        );
      }
      console.error('Insert error:', error);
      return NextResponse.json({ error: 'Failed to save. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Registered successfully!',
      submission: {
        full_name: fullName.trim(),
        academic_number: academicNumber.trim(),
        project_id: projectId,
        project_name: project.title,
        created_at: new Date().toISOString(),
      },
    }, { status: 201 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
