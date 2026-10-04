import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    const titles: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header row
      const cell1 = row.getCell(1).value?.toString().trim();
      const cell2 = row.getCell(2).value?.toString().trim();

      // If column 2 has text, prefer column 2 (as column 1 might be index/number)
      let title = '';
      if (cell2 && cell2.length > 0) {
        title = cell2;
      } else if (cell1 && cell1.length > 0 && isNaN(Number(cell1))) {
        title = cell1;
      }

      if (title) titles.push(title);
    });

    if (titles.length === 0) {
      return NextResponse.json(
        { error: 'No project titles found. Ensure project names are in column A or column B.' },
        { status: 400 }
      );
    }

    const rows = titles.map(title => ({ title }));
    const { data, error } = await supabase.from('projects').insert(rows).select('id');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ added: data?.length ?? 0, message: `Added ${data?.length} project(s) successfully.` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to process file.' }, { status: 500 });
  }
}
