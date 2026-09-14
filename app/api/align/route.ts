import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type WordTiming = { word: string; start: number; end: number; confidence?: number };

function makeEstimatedTimings(script: string, duration: number): WordTiming[] {
  const words = script.trim().split(/\s+/).filter(Boolean);
  const weights = words.map((word) => Math.max(.65, Math.min(2.4, word.replace(/[^\p{L}\p{N}]/gu, '').length / 4)) + (/[.!?،؛]$/.test(word) ? .65 : /[,;:]$/.test(word) ? .28 : 0));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursor = 0;
  return words.map((word, index) => {
    const wordDuration = duration * (weights[index] / totalWeight);
    const start = cursor;
    cursor += wordDuration;
    return { word, start: Number(start.toFixed(3)), end: Number((index === words.length - 1 ? duration : cursor).toFixed(3)), confidence: .55 };
  });
}

function groupWords(words: WordTiming[]) {
  const groups: WordTiming[][] = [];
  let current: WordTiming[] = [];
  words.forEach((word, index) => {
    current.push(word);
    const span = current.at(-1)!.end - current[0].start;
    const punctuation = /[.!?،؛]$/.test(word.word);
    if (current.length >= 5 || span >= 2.6 || punctuation || index === words.length - 1) {
      groups.push(current);
      current = [];
    }
  });
  return groups.map((group, index) => ({
    id: `aligned-${Date.now().toString(36)}-${index}`,
    start: group[0].start,
    end: group.at(-1)!.end,
    text: group.map((item) => item.word).join(' '),
    words: group,
  }));
}

export async function POST(request: Request) {
  const input = await request.json();
  const script = String(input.script ?? '').trim().slice(0, 12000);
  const duration = Math.min(300, Math.max(1, Number(input.duration) || 30));
  if (script.length < 2) return NextResponse.json({ error: 'Le script est vide.' }, { status: 400 });

  const tokens = script.split(/\s+/).filter(Boolean);
  const provided = Array.isArray(input.wordTimestamps) ? input.wordTimestamps : [];
  let words: WordTiming[];
  let mode: 'exact_api_timestamps' | 'estimated_local';

  const validProvided = provided.length === tokens.length && provided.every((item: unknown) => {
    if (!item || typeof item !== 'object') return false;
    const timing = item as Record<string, unknown>;
    return Number.isFinite(Number(timing.start)) && Number.isFinite(Number(timing.end)) && Number(timing.end) > Number(timing.start);
  });

  if (validProvided) {
    words = provided.map((item: Record<string, unknown>, index: number) => ({
      word: String(item.word ?? tokens[index]),
      start: Number(Number(item.start).toFixed(3)),
      end: Number(Number(item.end).toFixed(3)),
      confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : 1,
    }));
    mode = 'exact_api_timestamps';
  } else {
    words = makeEstimatedTimings(script, duration);
    mode = 'estimated_local';
  }

  return NextResponse.json({
    mode,
    duration,
    wordCount: words.length,
    words,
    captions: groupWords(words),
    warning: mode === 'estimated_local' ? 'Alignement estimé. Fournis les timestamps mot par mot de l’API voix pour une précision exacte.' : null,
  });
}
