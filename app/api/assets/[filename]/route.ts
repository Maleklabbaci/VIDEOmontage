import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const mimeByExtension: Record<string, string> = {
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.m4v': 'video/x-m4v',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg',
};

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  if (path.basename(filename) !== filename) return NextResponse.json({ error: 'Nom invalide' }, { status: 400 });
  const filePath = path.join(process.cwd(), 'storage', 'uploads', filename);

  try {
    const info = await stat(filePath);
    const range = request.headers.get('range');
    const contentType = mimeByExtension[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';

    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      const start = match?.[1] ? Number(match[1]) : 0;
      const end = match?.[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
      if (start > end || start >= info.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } });
      const data = (await readFile(filePath)).subarray(start, end + 1);
      return new Response(data, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(data.length),
          'Content-Range': `bytes ${start}-${end}/${info.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    const data = await readFile(filePath);
    return new Response(data, { headers: { 'Content-Type': contentType, 'Content-Length': String(info.size), 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600' } });
  } catch {
    return NextResponse.json({ error: 'Média introuvable' }, { status: 404 });
  }
}
