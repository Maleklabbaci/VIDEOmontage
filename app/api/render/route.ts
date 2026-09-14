import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const payload = await request.json();
  const jobId = `render_${Date.now().toString(36)}`;

  return NextResponse.json({
    jobId,
    status: 'ready_for_worker',
    message: 'Composition validée. Le worker Remotion/FFmpeg peut prendre ce job.',
    composition: {
      duration: payload.duration ?? 32,
      format: payload.format ?? '1080x1920',
      fps: payload.fps ?? 30,
      codec: payload.codec ?? 'h264',
      captions: payload.captions?.length ?? 0,
    },
  });
}
