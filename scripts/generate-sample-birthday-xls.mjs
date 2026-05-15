/**
 * generate-sample-birthday-xls.mjs
 *
 * Creates  public/data/GTS Birthday List 202603 - 202606.xls
 * with fake employee records (birthdays in Mar – Jun) that mirror
 * the exact layout of the real GTS Birthday List files.
 *
 * Run:  node scripts/generate-sample-birthday-xls.mjs
 */

import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', 'public', 'data', 'GTS Birthday List 202603 - 202606.xls');

// ---------------------------------------------------------------------------
// Fake employees  (Staff Code | Name | Date of Birth DD/MM)
// Names intentionally differ from the real file to avoid confusion.
// ---------------------------------------------------------------------------
const employees = [
  // March birthdays
  ['2001', 'CHAN WAI KIT PETER',           '15/03'],
  ['2003', 'WONG SIU YEE LINDA',           '22/03'],
  ['2007', 'LEUNG HON MING SIMON',         '07/03'],
  ['2011', 'CHEUNG PUI YAN GRACE',         '29/03'],
  ['2014', 'TSE KWOK HUNG MICHAEL',        '03/03'],

  // April birthdays
  ['2015', 'LAM YEE WAN TERESA',           '12/04'],
  ['2020', 'CHENG CHI KEUNG WILSON',       '28/04'],
  ['2025', 'YIP SZE MAN FIONA',            '05/04'],
  ['2030', 'KWOK WING HO SAMUEL',          '19/04'],

  // May birthdays
  ['2031', 'HO WAI LEUNG MARCUS',          '19/05'],
  ['2038', 'NG PUI YEE CATHERINE',         '30/05'],
  ['2045', 'TSANG KA FAI VICTOR',          '11/05'],
  ['2048', 'LI SIU TUNG RAYMOND',          '06/05'],
  ['2051', 'CHOW MEI PING HELEN',          '24/05'],

  // June birthdays
  ['2052', 'KWONG MEI LING HELEN',         '03/06'],
  ['2059', 'HUI TIN SANG RAYMOND',         '24/06'],
  ['2067', 'CHOW KA YEE SOPHIA',           '18/06'],
  ['2073', 'AU YEUNG SIU FAI ERIC',        '09/06'],
  ['2081', 'PANG HOI SHAN JESSICA',        '27/06'],
  ['2088', 'MAN WAI KWONG DEREK',          '14/06'],
];

// ---------------------------------------------------------------------------
// Build sheet rows to match the real file layout exactly
// ---------------------------------------------------------------------------
const today = new Date();
const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${String(today.getFullYear()).slice(-2)}`;

const sheetData = [
  // Row 0 – company header
  ['Company:', 'HITACHI RAIL GTS HONG KONG LIMITED', '', '', '', '', 'Date:', dateStr],

  // Row 1 – report title
  ['Report:', 'Birthday List - Mar~Jun,2026', '', '', '', '', '', ''],

  // Row 2 – blank
  ['', '', '', '', '', '', '', ''],

  // Row 3 – column headers
  ['Staff Code', 'Name', 'Date of Birth(DD/MM)', '', '', '', '', ''],

  // Rows 4+ – data
  ...employees.map(([code, name, dob]) => [code, name, dob, '', '', '', '', '']),

  // Footer
  [`No. of Record(s) ${employees.length}`, '', '', '', '', '', '', ''],
];

// ---------------------------------------------------------------------------
// Write to file
// ---------------------------------------------------------------------------
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(sheetData);
XLSX.utils.book_append_sheet(wb, ws, 'Birthday List');
XLSX.writeFile(wb, OUTPUT);

console.log(`Created: ${OUTPUT}`);
console.log(`Records : ${employees.length} employees (Mar – Jun 2026)`);
