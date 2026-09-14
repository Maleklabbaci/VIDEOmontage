import { NextResponse } from 'next/server';
import { renderVideo, type RenderPayload } from '@/lib/render-video';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const payload = await request.json() as RenderPayload;
    const video = await renderVideo(payload);
    const safeName = (payload.projectName ?? 'darja-video').normalize('NFKD').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'darja-video';
    return new Response(new Uint8Array(video), {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(video.length),
        'Content-Disposition': `attachment; filename="${safeName}.mp4"`,
        'Cache-Control': 'no-store',
        'X-Render-Engine': 'ffmpeg-self-hosted',
      },
    });
  } catch (error) {
    console.error('Render failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Échec du rendu' }, { status: 500 });
  }
}
