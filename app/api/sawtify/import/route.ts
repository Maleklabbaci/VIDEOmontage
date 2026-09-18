import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Import de la voix off + du script déjà générés par Sawtify.
// Aucun appel à un moteur TTS ici : on récupère un résultat déjà prêt,
// soit via un lien audio (mode JSON), soit via un fichier poussé directement
// (mode multipart, utile pour un futur webhook Sawtify -> VideoMontage).

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const allowedExtensions = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm']);

type WordTimingInput = { word: string; start: number; end: number; confidence?: number };

function extensionFromContentType(contentType: string | null, fallbackUrl: string) {
  const map: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/mp4': '.m4a',
    'audio/aac': '.aac',
    'audio/ogg': '.ogg',
    'audio/webm': '.webm',
  };
  const clean = contentType?.split(';')[0]?.trim().toLowerCase();
  if (clean && map[clean]) return map[clean];
  try {
    const fromUrl = path.extname(new URL(fallbackUrl).pathname).toLowerCase();
    if (allowedExtensions.has(fromUrl)) return fromUrl;
  } catch {
    // ignore, fallback ci-dessous
  }
  return '.mp3';
}

async function persist(buffer: Buffer, extension: string) {
  const storageId = `${randomUUID()}${extension}`;
  const storageDir = path.join(process.cwd(), 'storage', 'uploads');
  await mkdir(storageDir, { recursive: true });
  await writeFile(path.join(storageDir, storageId), buffer);
  return storageId;
}

function parseWordTimestamps(raw: unknown): WordTimingInput[] {
  let value = raw;
  if (typeof value === 'string') {
    if (!value.trim()) return [];
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .filter((item) => Number.isFinite(Number(item.start)) && Number.isFinite(Number(item.end)))
    .map((item) => ({
      word: String(item.word ?? ''),
      start: Number(item.start),
      end: Number(item.end),
      confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : undefined,
    }));
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const script = String(formData.get('script') ?? '').trim();
      const language = String(formData.get('language') ?? '').trim() || undefined;
      const wordTimestamps = parseWordTimestamps(formData.get('wordTimestamps'));

      if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier audio Sawtify manquant.' }, { status: 400 });
      if (!script) return NextResponse.json({ error: 'Le script Sawtify est requis.' }, { status: 400 });
      if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Fichier audio trop volumineux (200 Mo max).' }, { status: 413 });

      const extension = path.extname(file.name).toLowerCase();
      if (!allowedExtensions.has(extension)) return NextResponse.json({ error: 'Format audio non supporté.' }, { status: 415 });

      const storageId = await persist(Buffer.from(await file.arrayBuffer()), extension);
      return NextResponse.json({
        storageId,
        url: `/api/assets/${encodeURIComponent(storageId)}`,
        name: file.name || 'voix-off-sawtify',
        size: file.size,
        mimeType: file.type,
        script,
        language,
        wordTimestamps,
        source: 'sawtify',
      });
    }

    const input = await request.json();
    const audioUrl = String(input.audioUrl ?? '').trim();
    const script = String(input.script ?? '').trim();
    const language = typeof input.language === 'string' && input.language.trim() ? input.language.trim() : undefined;
    const wordTimestamps = parseWordTimestamps(input.wordTimestamps);

    if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) return NextResponse.json({ error: 'Lien audio Sawtify invalide.' }, { status: 400 });
    if (!script) return NextResponse.json({ error: 'Le script Sawtify est requis.' }, { status: 400 });

    const remote = await fetch(audioUrl);
    if (!remote.ok) return NextResponse.json({ error: `Impossible de récupérer l'audio depuis Sawtify (${remote.status}).` }, { status: 502 });

    const buffer = Buffer.from(await remote.arrayBuffer());
    if (buffer.byteLength > MAX_FILE_SIZE) return NextResponse.json({ error: 'Fichier audio trop volumineux (200 Mo max).' }, { status: 413 });

    const extension = extensionFromContentType(remote.headers.get('content-type'), audioUrl);
    const storageId = await persist(buffer, extension);
    const name = (() => {
      try {
        return path.basename(new URL(audioUrl).pathname) || 'voix-off-sawtify';
      } catch {
        return 'voix-off-sawtify';
      }
    })();

    return NextResponse.json({
      storageId,
      url: `/api/assets/${encodeURIComponent(storageId)}`,
      name,
      size: buffer.byteLength,
      mimeType: remote.headers.get('content-type') ?? undefined,
      script,
      language,
      wordTimestamps,
      source: 'sawtify',
    });
  } catch (error) {
    console.error('Sawtify import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? `Import Sawtify impossible : ${error.message}` : 'Import Sawtify impossible.' },
      { status: 500 },
    );
  }
}
