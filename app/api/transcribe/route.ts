import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MODEL_ID = process.env.DARJA_WHISPER_MODEL || 'onnx-community/whisper-tiny_timestamped';
const MAX_AUDIO_BYTES = 16000 * 4 * 10 * 60;

type WhisperChunk = { text?: string; timestamp?: [number | null, number | null] };
type Transcriber = (audio: Float32Array, options: Record<string, unknown>) => Promise<{ text?: string; chunks?: WhisperChunk[] }>;
type WordTiming = { word: string; start: number; end: number; confidence: number };

let transcriberPromise: Promise<Transcriber> | null = null;

async function getTranscriber(): Promise<Transcriber> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const transformers = await import('@huggingface/transformers');
      transformers.env.cacheDir = process.env.DARJA_WHISPER_CACHE || path.join(process.cwd(), '.cache', 'whisper');
      transformers.env.allowLocalModels = true;
      transformers.env.allowRemoteModels = true;
      return await transformers.pipeline('automatic-speech-recognition', MODEL_ID, {
        device: 'cpu',
        dtype: 'q4',
      }) as unknown as Transcriber;
    })().catch((error) => {
      transcriberPromise = null;
      throw error;
    });
  }
  return transcriberPromise;
}

function decodeAudio(inputPath: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('FFmpeg local indisponible.'));
    const child = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-i', inputPath, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1']);
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    let size = 0;
    child.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_AUDIO_BYTES) {
        child.kill('SIGKILL');
        return;
      }
      chunks.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (size > MAX_AUDIO_BYTES) return reject(new Error('La voix off dépasse la limite de 10 minutes.'));
      if (code !== 0) return reject(new Error(Buffer.concat(errors).toString('utf8') || 'Décodage audio impossible.'));
      const pcm = Buffer.concat(chunks);
      const copy = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength);
      resolve(new Float32Array(copy));
    });
  });
}

function normalizeWords(chunks: WhisperChunk[], fallbackDuration: number): WordTiming[] {
  let cursor = 0;
  return chunks.flatMap((chunk, index) => {
    const word = String(chunk.text ?? '').trim();
    if (!word) return [];
    const rawStart = Number(chunk.timestamp?.[0]);
    const rawEnd = Number(chunk.timestamp?.[1]);
    const unclampedStart = Number.isFinite(rawStart) ? Math.max(cursor, rawStart) : cursor;
    const start = Math.min(Math.max(0, fallbackDuration - .04), unclampedStart);
    const endCandidate = Number.isFinite(rawEnd) ? rawEnd : index === chunks.length - 1 ? fallbackDuration : start + .35;
    const end = Math.min(fallbackDuration, Math.max(start + .04, endCandidate));
    cursor = end;
    return [{ word, start: Number(start.toFixed(3)), end: Number(end.toFixed(3)), confidence: .82 }];
  });
}

function groupWords(words: WordTiming[]) {
  const groups: WordTiming[][] = [];
  let current: WordTiming[] = [];
  words.forEach((word, index) => {
    current.push(word);
    const span = current.at(-1)!.end - current[0].start;
    if (current.length >= 5 || span >= 2.7 || /[.!?،؛]$/.test(word.word) || index === words.length - 1) {
      groups.push(current);
      current = [];
    }
  });
  return groups.map((group, index) => ({
    id: `voice-caption-${Date.now().toString(36)}-${index}`,
    start: group[0].start,
    end: group.at(-1)!.end,
    text: group.map((word) => word.word).join(' ').replace(/\s+([,.!?،؛])/g, '$1'),
    words: group,
  }));
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const storageId = path.basename(String(input.storageId ?? ''));
    if (!storageId || storageId !== String(input.storageId ?? '')) return NextResponse.json({ error: 'Voix off stockée introuvable.' }, { status: 400 });

    const audioPath = path.join(process.cwd(), 'storage', 'uploads', storageId);
    if (!existsSync(audioPath)) return NextResponse.json({ error: 'Le fichier audio doit être uploadé sur le serveur avant la transcription.' }, { status: 404 });

    const requestedLanguage = ['ar', 'fr'].includes(String(input.language)) ? String(input.language) : 'auto';
    const duration = Math.min(600, Math.max(1, Number(input.duration) || 30));
    const audio = await decodeAudio(audioPath);
    const transcriber = await getTranscriber();
    const options: Record<string, unknown> = {
      task: 'transcribe',
      return_timestamps: 'word',
      chunk_length_s: 25,
      stride_length_s: 4,
    };
    if (requestedLanguage === 'ar') options.language = 'arabic';
    if (requestedLanguage === 'fr') options.language = 'french';

    const result = await transcriber(audio, options);
    const rawScript = String(result.text ?? '').trim();
    if (!rawScript || /^\[?(?:blank[_ ]audio|no[_ ]speech)\]?$/i.test(rawScript)) return NextResponse.json({ error: 'Aucune parole détectée dans cette voix off.' }, { status: 422 });
    const words = normalizeWords(Array.isArray(result.chunks) ? result.chunks : [], duration);
    if (!words.length) return NextResponse.json({ error: 'Aucune parole détectée dans cette voix off.' }, { status: 422 });

    const captions = groupWords(words);
    const script = rawScript || captions.map((caption) => caption.text).join(' ');
    return NextResponse.json({
      engine: 'local-whisper-transformers',
      model: MODEL_ID,
      mode: 'ai_transcribed_timestamps',
      language: requestedLanguage,
      script,
      scriptAr: script,
      wordCount: words.length,
      words,
      captions,
      warning: 'Les mots et timestamps ont été inférés localement depuis l’audio par Whisper. Ils restent éditables avant le montage.',
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({
      error: error instanceof Error ? `Transcription impossible : ${error.message}` : 'Transcription impossible.',
      hint: 'Au premier lancement, le modèle Whisper open source est téléchargé puis mis en cache localement.',
    }, { status: 500 });
  }
}
