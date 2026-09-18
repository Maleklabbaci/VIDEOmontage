import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_SCRIPT_LENGTH = 4000;
const DEFAULT_ELEVENLABS_VOICE = '21m00Tcm4TlvDq8ikWAM';

type TtsLanguage = 'ar' | 'fr';

function probeDuration(filePath: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    if (!ffmpegPath) return resolve(undefined);
    const child = spawn(ffmpegPath, ['-hide_banner', '-i', filePath]);
    let log = '';
    child.stderr.on('data', (chunk: Buffer) => { log += chunk.toString('utf8'); });
    child.on('close', () => {
      const match = log.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!match) return resolve(undefined);
      const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      resolve(Number.isFinite(seconds) ? Number(seconds.toFixed(2)) : undefined);
    });
    child.on('error', () => resolve(undefined));
  });
}

async function synthesizeElevenLabs(script: string, language: TtsLanguage, apiKey: string): Promise<{ buffer: Buffer; extension: string }> {
  const voiceId = (language === 'ar' ? process.env.DARJA_TTS_VOICE_AR : process.env.DARJA_TTS_VOICE_FR) || DEFAULT_ELEVENLABS_VOICE;
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.45, similarity_boost: 0.8 },
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Voix IA (ElevenLabs) indisponible : ${response.status} ${detail.slice(0, 200)}`);
  }
  return { buffer: Buffer.from(await response.arrayBuffer()), extension: '.mp3' };
}

let kokoroPromise: Promise<any> | null = null;
async function getKokoro() {
  if (!kokoroPromise) {
    kokoroPromise = (async () => {
      const { KokoroTTS } = await import('kokoro-js');
      return await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: 'q8',
        device: 'cpu',
      });
    })().catch((error) => {
      kokoroPromise = null;
      throw error;
    });
  }
  return kokoroPromise;
}

async function synthesizeKokoroFrench(script: string, outputPath: string): Promise<void> {
  const tts = await getKokoro();
  const audio = await tts.generate(script, { voice: process.env.DARJA_TTS_VOICE_FR_LOCAL || 'ff_siwis' });
  await audio.save(outputPath);
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const script = String(input.script ?? '').trim().slice(0, MAX_SCRIPT_LENGTH);
    const language: TtsLanguage = input.language === 'fr' ? 'fr' : 'ar';
    if (script.length < 2) return NextResponse.json({ error: 'Le script à transformer en voix est vide.' }, { status: 400 });

    const storageDir = path.join(process.cwd(), 'storage', 'uploads');
    await mkdir(storageDir, { recursive: true });
    const apiKey = process.env.ELEVENLABS_API_KEY;

    let storageId: string;
    let engine: string;
    const outputPath0 = path.join(storageDir, `${randomUUID()}.wav`);

    if (apiKey) {
      const { buffer, extension } = await synthesizeElevenLabs(script, language, apiKey);
      storageId = `${randomUUID()}${extension}`;
      await writeFile(path.join(storageDir, storageId), buffer);
      engine = 'elevenlabs-multilingual-v2';
    } else if (language === 'fr') {
      storageId = path.basename(outputPath0);
      await synthesizeKokoroFrench(script, path.join(storageDir, storageId));
      engine = 'local-kokoro-82m';
    } else {
      return NextResponse.json({
        error: 'La génération de voix darija/arabe par IA nécessite une clé ELEVENLABS_API_KEY côté serveur.',
        hint: 'Ajoute ELEVENLABS_API_KEY (et éventuellement DARJA_TTS_VOICE_AR) dans les variables d’environnement, ou importe une voix off enregistrée en attendant. Le français peut être généré localement sans clé.',
      }, { status: 422 });
    }

    const finalPath = path.join(storageDir, storageId);
    const duration = await probeDuration(finalPath);

    return NextResponse.json({
      engine,
      storageId,
      url: `/api/assets/${encodeURIComponent(storageId)}`,
      name: `voix-off-ia-${language}${path.extname(storageId)}`,
      duration,
      language,
      warning: engine === 'local-kokoro-82m' ? 'Voix générée localement (qualité correcte, sans clé API).' : null,
    });
  } catch (error) {
    console.error('Voiceover error:', error);
    return NextResponse.json({
      error: error instanceof Error ? `Génération de la voix off impossible : ${error.message}` : 'Génération de la voix off impossible.',
    }, { status: 500 });
  }
}
