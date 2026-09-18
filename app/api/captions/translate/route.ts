import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type WordTiming = { word: string; start: number; end: number; confidence?: number };
type CaptionInput = { id: string; start: number; end: number; text: string; words?: WordTiming[] };

const LANGUAGE_NAMES: Record<string, string> = {
  ar: 'arabe standard moderne',
  fr: 'français',
  en: 'anglais',
  darija: 'darija algérienne (dialecte arabe parlé en Algérie, en caractères arabes, avec les emprunts français/arabes courants à l’oral)',
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function estimateWordWeights(words: string[]) {
  return words.map(
    (word) =>
      Math.max(0.65, Math.min(2.4, word.replace(/[^\p{L}\p{N}]/gu, '').length / 4)) +
      (/[.!?،؛]$/.test(word) ? 0.65 : /[,;:]$/.test(word) ? 0.28 : 0),
  );
}

// Les timestamps mot-par-mot exacts n'existent que pour le texte source (aligné sur l'audio réel).
// Pour une langue traduite, on répartit la fenêtre [start, end] de chaque caption au prorata
// du "poids" de chaque mot traduit — assez précis pour un rendu karaoké fluide.
function retimeWords(text: string, start: number, end: number): WordTiming[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const weights = estimateWordWeights(words);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const span = Math.max(0.08, end - start);
  let cursor = start;
  return words.map((word, index) => {
    const wordDuration = span * (weights[index] / totalWeight);
    const wordStart = cursor;
    cursor += wordDuration;
    return {
      word,
      start: Number(wordStart.toFixed(3)),
      end: Number((index === words.length - 1 ? end : cursor).toFixed(3)),
      confidence: 0.6,
    };
  });
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const captions: CaptionInput[] = Array.isArray(input.captions) ? input.captions : [];
    const targetLanguage = String(input.targetLanguage ?? '');
    const sourceLanguage = typeof input.sourceLanguage === 'string' && input.sourceLanguage.trim() ? input.sourceLanguage.trim() : "la langue d'origine du script";

    if (!captions.length) return NextResponse.json({ error: 'Aucune caption à traduire.' }, { status: 400 });
    if (!LANGUAGE_NAMES[targetLanguage]) return NextResponse.json({ error: 'Langue cible non supportée.' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Traduction indisponible : clé GEMINI_API_KEY manquante côté serveur." },
        { status: 501 },
      );
    }

    const lines = captions.map((caption, index) => `${index + 1}. ${caption.text}`).join('\n');
    const prompt = [
      `Tu traduis/adaptes des sous-titres de vidéo courte pour réseaux sociaux, depuis ${sourceLanguage} vers ${LANGUAGE_NAMES[targetLanguage]}.`,
      'Garde un ton percutant, naturel à l’oral, fidèle au sens, adapté aux réseaux sociaux. Ne rajoute aucune explication, aucun commentaire.',
      `Renvoie STRICTEMENT un tableau JSON de ${captions.length} chaînes de caractères, exactement dans le même ordre, une par ligne source ci-dessous :`,
      lines,
    ].join('\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return NextResponse.json({ error: `Traduction Gemini impossible (${response.status}). ${errorText.slice(0, 200)}` }, { status: 502 });
    }

    const data = await response.json();
    const raw = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((part: { text?: string }) => part.text ?? '')
      .join('');

    let translated: unknown;
    try {
      translated = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Réponse Gemini illisible.' }, { status: 502 });
    }

    if (!Array.isArray(translated) || translated.length !== captions.length) {
      return NextResponse.json({ error: 'La traduction Gemini ne correspond pas au nombre de captions envoyées.' }, { status: 502 });
    }

    const translatedCaptions = captions.map((caption, index) => {
      const text = String(translated[index] ?? caption.text).trim() || caption.text;
      return { id: caption.id, start: caption.start, end: caption.end, text, words: retimeWords(text, caption.start, caption.end) };
    });

    return NextResponse.json({ engine: `gemini-caption-translate-v1:${GEMINI_MODEL}`, language: targetLanguage, captions: translatedCaptions });
  } catch (error) {
    console.error('Caption translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? `Traduction impossible : ${error.message}` : 'Traduction impossible.' },
      { status: 500 },
    );
  }
}
