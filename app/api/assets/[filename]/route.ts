import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const mimeByExtension: Record<string, string> = {
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.m4v': 'video/x-m4v',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg',
};

async function serve(request: Request, context: { params: Promise<{ filename: string }> }, headOnly = false) {
  const { filename } = await context.params;
  if (path.basename(filename) !== filename) return NextResponse.json({ error: 'Nom invalide' }, { status: 400 });
  const filePath = path.join(process.cwd(), 'storage', 'uploads', filename);

  try {
    const info = await stat(filePath);
    const range = request.headers.get('range');
    const contentType = mimeByExtension[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
    let start = 0;
    let end = info.size - 1;
    let status = 200;

    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      start = match?.[1] ? Number(match[1]) : 0;
      end = match?.[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
      if (start > end || start >= info.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } });
      status = 206;
    }

    const length = end - start + 1;
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': String(length),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    };
    if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    if (headOnly) return new Response(null, { status, headers });

    const nodeStream = createReadStream(filePath, { start, end });
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    return new Response(webStream, { status, headers });
  } catch {
    return NextResponse.json({ error: 'Média introuvable' }, { status: 404 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  return serve(request, context);
}

export async function HEAD(request: Request, context: { params: Promise<{ filename: string }> }) {
  return serve(request, context, true);
}
