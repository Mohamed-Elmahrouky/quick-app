const ExcelJS = require('exceljs');

const FILE = 'C:/Users/Ahmed/.gemini/antigravity/brain/f767da21-9ad7-425d-b3e7-03094a13ac95/.user_uploaded/media_1791140952889.xlsx';

async function run() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE);
  const ws = workbook.worksheets[0];
  console.log(`Sheet: "${ws.name}", rows: ${ws.actualRowCount}, cols: ${ws.actualColumnCount}`);
  console.log('\nFirst 5 rows, all columns:');
  let count = 0;
  ws.eachRow((row, rowNum) => {
    if (count++ >= 5) return;
    const cells = [];
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cells.push(`[col${colNum}]: ${JSON.stringify(cell.value)}`);
    });
    console.log(`Row ${rowNum}: ${cells.join(' | ')}`);
  });
}

run().catch(console.error);
