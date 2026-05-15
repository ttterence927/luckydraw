/**
 * Excel Birthday Adapter
 *
 * Reads "GTS Birthday List *.xls" files from a directory and converts them
 * into the Employee format used by the Lucky Draw app.
 *
 * Expected XLS sheet layout
 * ─────────────────────────
 *   Row 0  : Company info header  (Company: | HITACHI RAIL GTS ... | ... | Date: | <date>)
 *   Row 1  : Report info          (Report:  | Birthday List - MMM,YYYY | ...)
 *   Row 2  : Blank
 *   Row 3  : Column headers       (Staff Code | Name | Date of Birth(DD/MM) | ...)
 *   Row 4+ : Data rows            (<code>    | <NAME IN CAPS> | DD/MM | ...)
 *   Last   : Footer               (No. of Record(s) N | ...)
 *
 * When no photo / avatar URL column is present the employee will receive
 * DEFAULT_FACEBOOK_AVATAR as their profile picture.
 */

import path from 'path';
import fs from 'fs';
// xlsx is a CommonJS module — require() avoids webpack's ESM interop warning.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx');

// ---------------------------------------------------------------------------
// Default avatar — shown when the Excel file contains no photo/avatar column.
// This is the classic Facebook-style gray-person silhouette placeholder.
// Replace with your own CDN URL if you prefer a different default.
// ---------------------------------------------------------------------------
export const DEFAULT_FACEBOOK_AVATAR =
  'https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg';

export type ExcelEmployee = {
  id: string;
  staffCode?: string;
  name: string;
  title: string;
  avatar: string;
  birthday: string; // "MM-DD"  e.g. "12-07" for 7th December
};

export type BirthdayWindowInfo = {
  startMonth: number;
  endMonth: number;
  fileName: string;
  sourceCount: number;
  signature: string;
};

// ---------------------------------------------------------------------------
// Column-alias map — extend when new column name variants appear in the wild.
// Keys must match the ExcelEmployee type fields (except `title` which has no
// known column in the birthday report, so it remains empty).
// ---------------------------------------------------------------------------
const COLUMN_ALIASES: Record<string, string[]> = {
  id: ['staff code', 'staff no', 'staff no.', 'employee id', 'emp id', 'id', 'no.', 'no'],
  name: ['name', 'employee name', 'full name', 'staff name'],
  birthday: [
    'date of birth(dd/mm)',
    'date of birth (dd/mm)',
    'date of birth',
    'birthday',
    'dob',
    'birth date',
    'birthdate',
  ],
  avatar: ['photo', 'photo url', 'avatar', 'image', 'picture', 'photo link', 'image url'],
};

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Find the row index that contains the column-header labels. */
function findHeaderRowIndex(rawRows: unknown[][]): number {
  for (let i = 0; i < rawRows.length; i++) {
    const first = String((rawRows[i] as unknown[])[0] ?? '')
      .trim()
      .toLowerCase();
    if (first === 'staff code' || COLUMN_ALIASES.id.includes(first)) return i;
  }
  return -1;
}

/** Map a header row to { fieldName → columnIndex }. */
function buildColumnMap(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((cell, idx) => {
    const normalised = String(cell ?? '')
      .trim()
      .toLowerCase();
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(normalised) && !(field in map)) {
        map[field] = idx;
      }
    }
  });
  return map;
}

function normalizeMonthToken(token: string): number | null {
  const trimmedToken = token.trim();
  if (!trimmedToken) return null;

  const numericYearMonth = trimmedToken.match(/^(\d{4})(\d{2})$/);
  if (numericYearMonth) {
    const month = Number(numericYearMonth[2]);
    return month >= 1 && month <= 12 ? month : null;
  }

  const numericMonth = Number(trimmedToken);
  if (Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
    return numericMonth;
  }

  const monthKey = trimmedToken.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
  return MONTH_NAME_TO_NUMBER[monthKey] ?? null;
}

function extractBirthdayWindowFromLabel(label: string): Pick<BirthdayWindowInfo, 'startMonth' | 'endMonth'> | null {
  const compactLabel = label.trim();
  if (!compactLabel) return null;

  const yearMonthRange = compactLabel.match(/(\d{6})\s*[-~]\s*(\d{6})/i);
  if (yearMonthRange) {
    const startMonth = normalizeMonthToken(yearMonthRange[1]);
    const endMonth = normalizeMonthToken(yearMonthRange[2]);
    if (startMonth !== null && endMonth !== null) {
      return { startMonth, endMonth };
    }
  }

  const monthRange = compactLabel.match(/([A-Za-z]{3,9})\s*[-~]\s*([A-Za-z]{3,9})(?:\s*,\s*\d{2,4})?/i);
  if (monthRange) {
    const startMonth = normalizeMonthToken(monthRange[1]);
    const endMonth = normalizeMonthToken(monthRange[2]);
    if (startMonth !== null && endMonth !== null) {
      return { startMonth, endMonth };
    }
  }

  const singleMonth = compactLabel.match(/(?:birthday\s+list\s*-\s*)?([A-Za-z]{3,9})(?:\s*,\s*\d{2,4})/i);
  if (singleMonth) {
    const month = normalizeMonthToken(singleMonth[1]);
    if (month !== null) {
      return { startMonth: month, endMonth: month };
    }
  }

  return null;
}

function readBirthdayWindowFromWorkbook(filePath: string): Pick<BirthdayWindowInfo, 'startMonth' | 'endMonth'> | null {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    for (const row of rawRows.slice(0, 4)) {
      for (const cell of row) {
        const extractedWindow = extractBirthdayWindowFromLabel(String(cell ?? ''));
        if (extractedWindow) {
          return extractedWindow;
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? ` (${error.message})` : '';
    console.warn(`[excel-birthday-adapter] Could not inspect birthday window for: ${filePath}${message}`);
  }

  return null;
}

/**
 * Parse a birthday value into "MM-DD" format.
 * Handles:
 *   - "DD/MM"        → "MM-DD"
 *   - "DD/MM/YYYY"   → "MM-DD"
 *   - "YYYY-MM-DD"   → "MM-DD"
 *   - Excel date serial numbers
 */
function parseBirthdayValue(raw: unknown): string {
  // Excel numeric date serial
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw);
    return `${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }

  const s = String(raw ?? '').trim();

  // DD/MM
  const ddmm = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (ddmm) {
    return `${ddmm[2].padStart(2, '0')}-${ddmm[1].padStart(2, '0')}`;
  }

  // DD/MM/YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
  }

  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return `${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }

  // MM-DD already
  const mmdd = s.match(/^(\d{1,2})-(\d{1,2})$/);
  if (mmdd) {
    return `${mmdd[1].padStart(2, '0')}-${mmdd[2].padStart(2, '0')}`;
  }

  return s; // return as-is if unrecognised
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function listBirthdayExcelFiles(dataDir: string): string[] {
  if (!fs.existsSync(dataDir)) return [];

  return fs
    .readdirSync(dataDir)
    .filter((file) => /^GTS Birthday List .+\.(xls|xlsx)$/i.test(file))
    .sort();
}

export function detectBirthdayWindowFromExcelFile(filePath: string, fileName = path.basename(filePath)): BirthdayWindowInfo | null {
  const extractedWindow = extractBirthdayWindowFromLabel(fileName) ?? readBirthdayWindowFromWorkbook(filePath);

  if (!extractedWindow) return null;

  return {
    ...extractedWindow,
    fileName,
    sourceCount: 1,
    signature: fileName,
  };
}

export function detectBirthdayWindowFromExcelDirectory(dataDir: string): BirthdayWindowInfo | null {
  const excelFiles = listBirthdayExcelFiles(dataDir);
  if (excelFiles.length === 0) return null;

  const detectedWindows = excelFiles
    .map((fileName) => {
      return detectBirthdayWindowFromExcelFile(path.join(dataDir, fileName), fileName);
    })
    .filter((windowInfo): windowInfo is BirthdayWindowInfo => windowInfo !== null);

  if (detectedWindows.length === 0) return null;

  return {
    startMonth: detectedWindows[0].startMonth,
    endMonth: detectedWindows[detectedWindows.length - 1].endMonth,
    fileName: detectedWindows[detectedWindows.length - 1].fileName,
    sourceCount: detectedWindows.length,
    signature: excelFiles.join('|'),
  };
}

/**
 * Parse a single "GTS Birthday List *.xls[x]" workbook file.
 * Returns an array of ExcelEmployee objects.
 */
export function parseBirthdayXlsFile(filePath: string): ExcelEmployee[] {
  let workbook: import('xlsx').WorkBook;
  try {
    const fileBuffer = fs.readFileSync(filePath);
    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  } catch (error) {
    const message = error instanceof Error ? ` (${error.message})` : '';
    console.warn(`[excel-birthday-adapter] Could not read file: ${filePath}${message}`);
    return [];
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
  });

  const headerIdx = findHeaderRowIndex(rawRows);
  if (headerIdx === -1) {
    console.warn(`[excel-birthday-adapter] No header row found in: ${filePath}`);
    return [];
  }

  const colMap = buildColumnMap(rawRows[headerIdx]);
  const idCol = colMap.id ?? 0;
  const nameCol = colMap.name ?? 1;
  const birthdayCol = colMap.birthday ?? 2;
  const avatarCol = colMap.avatar; // may be undefined

  const employees: ExcelEmployee[] = [];

  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i] as unknown[];
    const staffCode = String(row[idCol] ?? '').trim();

    // Stop at footer lines (e.g. "No. of Record(s) ...")
    if (!staffCode || /^no\.?\s+of\s+record/i.test(staffCode)) break;

    const name = String(row[nameCol] ?? '').trim();
    if (!name) continue;

    const rawAvatar = avatarCol !== undefined ? String(row[avatarCol] ?? '').trim() : '';
    const avatar = rawAvatar || DEFAULT_FACEBOOK_AVATAR;

    employees.push({
      id: staffCode,
      staffCode,
      name,
      title: '',
      avatar,
      birthday: parseBirthdayValue(row[birthdayCol]),
    });
  }

  return employees;
}

/**
 * Scan *dataDir* for every file matching /^GTS Birthday List .+\.(xls|xlsx)$/i,
 * parse each one, and return a deduplicated merged list of employees.
 *
 * Files are sorted alphabetically before processing, which keeps them in
 * chronological order given the "YYYYMM - YYYYMM" naming convention.
 * When the same Staff Code appears in multiple files the later file wins.
 */
export function scanBirthdayExcelDirectory(dataDir: string): ExcelEmployee[] {
  const xlsFiles = listBirthdayExcelFiles(dataDir);

  if (xlsFiles.length === 0) return [];

  const seen = new Map<string, ExcelEmployee>();

  for (const file of xlsFiles) {
    const employees = parseBirthdayXlsFile(path.join(dataDir, file));
    for (const emp of employees) {
      seen.set(emp.id, emp); // later file's record for the same Staff Code wins
    }
  }

  return Array.from(seen.values());
}
