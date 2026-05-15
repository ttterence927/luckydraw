import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  buildBirthdayUploadFileName,
  clearUploadedBirthdayWorkbooks,
  getBirthdayUploadDir,
  setSelectedUploadedBirthdayWorkbook,
} from '@/lib/birthday-upload-store';
import { detectBirthdayWindowFromExcelFile, parseBirthdayXlsFile } from '@/lib/excel-birthday-adapter';

const TRANSIENT_FILE_LOCK_ERROR_CODES = new Set(['EBUSY', 'EPERM', 'EACCES']);

function isTransientFileLockError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as NodeJS.ErrnoException).code === 'string' &&
      TRANSIENT_FILE_LOCK_ERROR_CODES.has((error as NodeJS.ErrnoException).code as string)
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeFileWithRetry(filePath: string, content: Buffer, maxAttempts = 6) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      fs.writeFileSync(filePath, content);
      return;
    } catch (error) {
      lastError = error;
      if (!isTransientFileLockError(error) || attempt === maxAttempts) {
        throw error;
      }

      // Exponential backoff for short-lived locks from AV/indexing/preview tools.
      await delay(60 * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;

    if (!file || !filename) {
      return NextResponse.json({ error: "Missing file or filename" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (filename === 'birthday_excel') {
      const extension = path.extname(file.name).toLowerCase();
      if (!['.xls', '.xlsx'].includes(extension)) {
        return NextResponse.json({ error: 'Birthday upload must be an .xls or .xlsx file' }, { status: 400 });
      }

      const uploadDir = getBirthdayUploadDir();
      const storedFileName = buildBirthdayUploadFileName(file.name);
      const tempFilePath = path.join(uploadDir, `.${Date.now()}-${storedFileName}.tmp`);
      const finalFilePath = path.join(uploadDir, storedFileName);

      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(tempFilePath, buffer);

      const uploadedEmployees = parseBirthdayXlsFile(tempFilePath);
      if (uploadedEmployees.length === 0) {
        fs.unlinkSync(tempFilePath);
        return NextResponse.json({ error: 'Birthday workbook did not contain any employee rows' }, { status: 400 });
      }

      const detectedBirthdayWindow = detectBirthdayWindowFromExcelFile(tempFilePath, storedFileName);

      clearUploadedBirthdayWorkbooks();
      fs.renameSync(tempFilePath, finalFilePath);
      setSelectedUploadedBirthdayWorkbook(storedFileName);

      return NextResponse.json({
        success: true,
        fileName: storedFileName,
        birthdayWindow: detectedBirthdayWindow,
      });
    }
    
    // In serverless environments, the project dir is read-only; write to /tmp.
    // In a packaged Electron app, resources/ is also read-only; write to userData.
    const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const publicDir = isServerless
      ? path.join('/tmp', 'public')
      : process.env.USER_DATA_PATH
      ? path.join(process.env.USER_DATA_PATH, 'public')
      : path.join(process.cwd(), 'public');
    // Keep uploads inside /public while allowing subfolders like backgrounds/.
    const normalized = path.posix.normalize(filename.replace(/\\/g, '/').replace(/^\/+/, ''));
    if (!normalized || normalized.startsWith('..') || path.posix.isAbsolute(normalized)) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const safeRelativePath = normalized
      .split('/')
      .map((segment) => segment.replace(/[^a-zA-Z0-9_\-\.]/g, ''))
      .filter(Boolean)
      .join('/');

    if (!safeRelativePath) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    if (safeRelativePath === 'employees.csv') {
      return NextResponse.json({ error: 'employees.csv upload is no longer supported' }, { status: 400 });
    }

    const savePath = path.join(publicDir, safeRelativePath);
    const relativeToPublic = path.relative(publicDir, savePath);
    if (relativeToPublic.startsWith('..') || path.isAbsolute(relativeToPublic)) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    fs.mkdirSync(path.dirname(savePath), { recursive: true });

    await writeFileWithRetry(savePath, buffer);

    return NextResponse.json({ success: true, path: `/${safeRelativePath}` });
  } catch (error) {
    console.error('Upload error:', error);

    if (isTransientFileLockError(error)) {
      return NextResponse.json(
        { error: 'Upload failed because the destination file is currently in use. Close any app using it and try again.' },
        { status: 423 }
      );
    }

    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    clearUploadedBirthdayWorkbooks();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear upload error:', error);
    return NextResponse.json({ error: 'Failed to clear employee data' }, { status: 500 });
  }
}
