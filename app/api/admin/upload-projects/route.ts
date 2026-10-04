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
      if (rowNumber === 1) return; // skip header
      const val = row.getCell(1).value?.toString().trim();
      if (val) titles.push(val);
    });

    if (titles.length === 0) {
      return NextResponse.json({ error: 'No project titles found in the file. Put titles in column A, row 2 onward.' }, { status: 400 });
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
