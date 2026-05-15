import fs from 'fs';
import path from 'path';

export type UploadedBirthdayWorkbook = {
  fileName: string;
  filePath: string;
};

type UploadedBirthdayWorkbookSelection = {
  fileName: string;
  activatedAt: string;
};

/**
 * In serverless environments (Vercel / AWS Lambda) the project directory is
 * read-only.  Only /tmp is writable, so we redirect storage there.
 * In a packaged Electron app, resources/ is also read-only; USER_DATA_PATH
 * is injected by the Electron main process and points to a writable location.
 */
function isServerless(): boolean {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function getStorageDir(): string {
  if (isServerless()) return path.join('/tmp', 'storage', 'birthday');
  if (process.env.USER_DATA_PATH) return path.join(process.env.USER_DATA_PATH, 'storage', 'birthday');
  return path.join(process.cwd(), 'storage', 'birthday');
}

const UPLOADED_BIRTHDAY_DIR = getStorageDir();
const UPLOADED_BIRTHDAY_SELECTION_FILE = path.join(UPLOADED_BIRTHDAY_DIR, 'selected-workbook.json');
const FORCE_CSV_FLAG_FILE = path.join(UPLOADED_BIRTHDAY_DIR, 'force-csv.flag');

export function getBirthdayUploadDir() {
  return UPLOADED_BIRTHDAY_DIR;
}

function readUploadedBirthdayWorkbookSelection(): UploadedBirthdayWorkbookSelection | null {
  if (!fs.existsSync(UPLOADED_BIRTHDAY_SELECTION_FILE)) {
    return null;
  }

  try {
    const rawSelection = fs.readFileSync(UPLOADED_BIRTHDAY_SELECTION_FILE, 'utf-8');
    const parsedSelection = JSON.parse(rawSelection) as Partial<UploadedBirthdayWorkbookSelection>;

    if (typeof parsedSelection.fileName !== 'string' || !parsedSelection.fileName.trim()) {
      return null;
    }

    return {
      fileName: parsedSelection.fileName,
      activatedAt:
        typeof parsedSelection.activatedAt === 'string' && parsedSelection.activatedAt
          ? parsedSelection.activatedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function clearUploadedBirthdayWorkbookSelection() {
  if (fs.existsSync(UPLOADED_BIRTHDAY_SELECTION_FILE)) {
    fs.unlinkSync(UPLOADED_BIRTHDAY_SELECTION_FILE);
  }
}

export function isCsvModeForced(): boolean {
  return fs.existsSync(FORCE_CSV_FLAG_FILE);
}

export function setSelectedUploadedBirthdayWorkbook(fileName: string) {
  fs.mkdirSync(UPLOADED_BIRTHDAY_DIR, { recursive: true });
  // Remove the force-CSV flag so the new workbook takes effect.
  if (fs.existsSync(FORCE_CSV_FLAG_FILE)) {
    fs.unlinkSync(FORCE_CSV_FLAG_FILE);
  }
  fs.writeFileSync(
    UPLOADED_BIRTHDAY_SELECTION_FILE,
    JSON.stringify(
      {
        fileName,
        activatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

export function buildBirthdayUploadFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const rawBaseName = path.basename(fileName, extension);
  const safeBaseName = rawBaseName.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, ' ');

  return `${safeBaseName || 'birthday-upload'}${extension}`;
}

export function listUploadedBirthdayWorkbooks(): UploadedBirthdayWorkbook[] {
  if (!fs.existsSync(UPLOADED_BIRTHDAY_DIR)) {
    return [];
  }

  return fs
    .readdirSync(UPLOADED_BIRTHDAY_DIR)
    .filter((fileName) => /\.(xls|xlsx)$/i.test(fileName))
    .sort((left, right) => {
      const leftTime = fs.statSync(path.join(UPLOADED_BIRTHDAY_DIR, left)).mtimeMs;
      const rightTime = fs.statSync(path.join(UPLOADED_BIRTHDAY_DIR, right)).mtimeMs;

      return rightTime - leftTime;
    })
    .map((fileName) => ({
      fileName,
      filePath: path.join(UPLOADED_BIRTHDAY_DIR, fileName),
    }));
}

export function getSelectedUploadedBirthdayWorkbook(): UploadedBirthdayWorkbook | null {
  const selectedWorkbook = readUploadedBirthdayWorkbookSelection();
  if (!selectedWorkbook) {
    return null;
  }

  const matchedWorkbook = listUploadedBirthdayWorkbooks().find(
    (workbook) => workbook.fileName === selectedWorkbook.fileName,
  );

  if (!matchedWorkbook) {
    clearUploadedBirthdayWorkbookSelection();
    return null;
  }

  return matchedWorkbook;
}

export function clearUploadedBirthdayWorkbooks() {
  fs.mkdirSync(UPLOADED_BIRTHDAY_DIR, { recursive: true });

  for (const workbook of listUploadedBirthdayWorkbooks()) {
    fs.unlinkSync(workbook.filePath);
  }

  clearUploadedBirthdayWorkbookSelection();

  // Write a flag so the data route skips public/data XLS files and falls
  // back to employees.csv until a new workbook is uploaded.
  fs.writeFileSync(FORCE_CSV_FLAG_FILE, '');
}