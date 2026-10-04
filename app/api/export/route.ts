import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('submissions')
      .select('full_name, academic_number, project_id, project_name, created_at')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Submissions', { views: [{ state: 'frozen', ySplit: 1 }] });

    ws.columns = [
      { header: '#', key: 'index', width: 6 },
      { header: 'Full Name', key: 'full_name', width: 28 },
      { header: 'Academic Number', key: 'academic_number', width: 18 },
      { header: 'Project #', key: 'project_id', width: 10 },
      { header: 'Project Title', key: 'project_name', width: 40 },
      { header: 'Submitted At', key: 'created_at', width: 22 },
    ];

    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1917' } };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    header.height = 26;

    data?.forEach((item, idx) => {
      const row = ws.addRow({
        index: idx + 1,
        full_name: item.full_name,
        academic_number: item.academic_number,
        project_id: item.project_id,
        project_name: item.project_name,
        created_at: new Date(item.created_at).toLocaleString('en-US'),
      });
      row.height = 20;
      if (idx % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="submissions-${date}.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Export failed.' }, { status: 500 });
  }
}
