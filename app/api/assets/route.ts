import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const allowedExtensions = new Set(['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.jpg', '.jpeg', '.png', '.webp', '.mp3', '.wav', '.m4a', '.aac', '.ogg']);

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Fichier trop volumineux (500 Mo max)' }, { status: 413 });

  const extension = path.extname(file.name).toLowerCase();
  if (!allowedExtensions.has(extension)) return NextResponse.json({ error: 'Format non autorisé' }, { status: 415 });

  const storageId = `${randomUUID()}${extension}`;
  const storageDir = path.join(process.cwd(), 'storage', 'uploads');
  await mkdir(storageDir, { recursive: true });
  await writeFile(path.join(storageDir, storageId), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    storageId,
    url: `/api/assets/${encodeURIComponent(storageId)}`,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  });
}
