import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { getSelectedUploadedBirthdayWorkbook, isCsvModeForced } from '@/lib/birthday-upload-store';
import { detectBirthdayWindowFromExcelDirectory, detectBirthdayWindowFromExcelFile, listBirthdayExcelFiles, parseBirthdayXlsFile, scanBirthdayExcelDirectory } from '@/lib/excel-birthday-adapter';

export const runtime = 'nodejs';

/**
 * Safely list a directory, returning an empty array when the path does not
 * exist (common in serverless/Vercel where /tmp starts empty).
 */
function safeReaddirSync(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

/**
 * Merge file listings from the build-time public directory and the runtime
 * /tmp overlay so that uploads made in serverless environments are visible.
 */
function mergedPublicFiles(relativePath: string, buildPublicDir: string, runtimePublicDir: string | null): string[] {
  const buildDir = path.join(buildPublicDir, relativePath);
  const runtimeDir = runtimePublicDir ? path.join(runtimePublicDir, relativePath) : null;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const f of safeReaddirSync(buildDir)) {
    if (!seen.has(f)) { seen.add(f); result.push(f); }
  }
  if (runtimeDir) {
    for (const f of safeReaddirSync(runtimeDir)) {
      if (!seen.has(f)) { seen.add(f); result.push(f); }
    }
  }
  return result;
}

/**
 * Read a file, checking the runtime /tmp overlay first (for serverless
 * uploads) then falling back to the build-time public directory.
 */
function readPublicFile(relativePath: string, buildPublicDir: string, runtimePublicDir: string | null): string {
  if (runtimePublicDir) {
    const runtimePath = path.join(runtimePublicDir, relativePath);
    if (fs.existsSync(runtimePath)) {
      return fs.readFileSync(runtimePath, 'utf-8');
    }
  }
  return fs.readFileSync(path.join(buildPublicDir, relativePath), 'utf-8');
}

export async function GET() {
  try {
    const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const buildPublicDir = path.join(process.cwd(), 'public');
    const runtimePublicDir = isServerless
      ? path.join('/tmp', 'public')
      : process.env.USER_DATA_PATH
      ? path.join(process.env.USER_DATA_PATH, 'public')
      : null;

    const files = mergedPublicFiles('', buildPublicDir, runtimePublicDir);
    
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
    const rootBackgrounds = files
      .filter((f) => f.startsWith('background') && imageExtensions.has(path.extname(f).toLowerCase()))
      .map((f) => `/${f}`);

    const folderBackgrounds = mergedPublicFiles('backgrounds', buildPublicDir, runtimePublicDir)
      .filter((f) => imageExtensions.has(path.extname(f).toLowerCase()))
      .map((f) => `/backgrounds/${f}`);

    const backgrounds = [...folderBackgrounds, ...rootBackgrounds];
    
    let employees: any[] = [];
    const modes: Record<string, any[]> = {};
    let employeeSource:
      | { type: 'uploaded-birthday-workbook' | 'public-birthday-workbook' | 'employees-csv'; fileName: string; sourceCount: number }
      | null = null;

    // -----------------------------------------------------------------------
    // Birthday employees come from an explicitly selected uploaded workbook
    // or from checked-in public/data/ files.
    // If neither source is active, the app falls back to employees.csv.
    // -----------------------------------------------------------------------
    const dataDir = path.join(buildPublicDir, 'data');
    const uploadedBirthdayWorkbook = getSelectedUploadedBirthdayWorkbook();
    const csvForced = isCsvModeForced();
    const birthdayXlsFiles = csvForced ? [] : listBirthdayExcelFiles(dataDir);
    let birthdayWindow = null;

    if (uploadedBirthdayWorkbook) {
      employees = parseBirthdayXlsFile(uploadedBirthdayWorkbook.filePath);
      birthdayWindow = detectBirthdayWindowFromExcelFile(
        uploadedBirthdayWorkbook.filePath,
        uploadedBirthdayWorkbook.fileName,
      );
      employeeSource = {
        type: 'uploaded-birthday-workbook',
        fileName: uploadedBirthdayWorkbook.fileName,
        sourceCount: 1,
      };
    } else if (birthdayXlsFiles.length > 0) {
      birthdayWindow = detectBirthdayWindowFromExcelDirectory(dataDir);
      employees = scanBirthdayExcelDirectory(dataDir);
      employeeSource = {
        type: 'public-birthday-workbook',
        fileName: birthdayWindow?.fileName ?? 'public/data',
        sourceCount: birthdayXlsFiles.length,
      };
    }

    for (const file of csvFiles) {
      let fileContent = readPublicFile(file, buildPublicDir, runtimePublicDir);
      // Strip BOM if present
      if (fileContent.charCodeAt(0) === 0xFEFF) {
        fileContent = fileContent.slice(1);
      }
      // Try auto-detect first; if it yields no usable columns, retry with semicolon delimiter
      let result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
      if (
        result.data.length === 0 ||
        (result.data.length > 0 && Object.keys(result.data[0] as any).length <= 1)
      ) {
        result = Papa.parse(fileContent, { header: true, skipEmptyLines: true, delimiter: ';' });
      }
      const parsed = result.data;
      
      if (file === 'employees.csv') {
        // Only use CSV employees when no XLS source was found
        if (employees.length === 0) {
          employees = parsed.map((emp: any, index) => ({
            id: emp.id || emp.staffCode || String(index + 1),
            staffCode: emp.staffCode || '',
            name: emp.name || 'Unknown',
            title: typeof emp.title === 'string' ? emp.title.trim() : '',
            avatar: emp.avatar || `https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png`,
            birthday: emp.birthday || ''
          }));
          employeeSource = {
            type: 'employees-csv',
            fileName: 'employees.csv',
            sourceCount: 1,
          };
        }
      } else {
        const modeName = file.replace('.csv', '');
        const modePrizes: any[] = [];
        parsed.forEach((prize: any, index) => {
          const qty = parseInt(prize.quantity) || 1;
          // Normalize image path: support relative paths in addition to URLs
          let image = (prize.image || '').trim();
          if (image && !image.startsWith('http://') && !image.startsWith('https://') && !image.startsWith('/')) {
            image = '/' + image;
          }
          for (let i = 0; i < qty; i++) {
            modePrizes.push({
              id: `${prize.id || String(index + 1)}_${i}`,
              name: prize.name || 'Mystery Prize',
              image
            });
          }
        });
        modes[modeName] = modePrizes;
      }
    }

    return NextResponse.json({ employees, modes, backgrounds, birthdayWindow, employeeSource });
  } catch (error) {
    console.error('Error reading data files:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
