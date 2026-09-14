import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Caption = { id: string; start: number; end: number; text: string };
type Asset = { id: string; name: string; kind: 'video' | 'image'; duration?: number; description?: string };

const stopWords = new Set(['avec', 'pour', 'dans', 'une', 'des', 'les', 'plus', 'tout', 'cette', 'hada', 'hiya', 'belli', 'wach', '3la', 'ta3', 'the', 'and', 'على', 'هذا', 'هذه', 'اللي', 'باش', 'غير']);
const tokens = (value: string) => value.toLowerCase().normalize('NFKD').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word));
const hash = (value: string) => [...value].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7);

export async function POST(request: Request) {
  const input = await request.json();
  const captions: Caption[] = Array.isArray(input.captions) ? input.captions : [];
  const assets: Asset[] = Array.isArray(input.assets) ? input.assets.filter((asset: Asset) => asset?.id && (asset.kind === 'video' || asset.kind === 'image')) : [];
  const tone = String(input.tone ?? 'energetic');
  if (!captions.length || !assets.length) return NextResponse.json({ error: 'Captions et médias requis.' }, { status: 400 });

  const useCount = new Map<string, number>();
  let previousAsset = '';
  const scenes = captions.map((caption, sceneIndex) => {
    const sceneWords = new Set(tokens(caption.text));
    const ranked = assets.map((asset, assetIndex) => {
      const assetWords = tokens(`${asset.name} ${asset.description ?? ''}`);
      const overlap = assetWords.filter((word) => sceneWords.has(word)).length;
      const repeated = useCount.get(asset.id) ?? 0;
      const varietyPenalty = repeated * 1.5 + (previousAsset === asset.id ? 2.5 : 0);
      const sequenceBonus = assetIndex === sceneIndex % assets.length ? 1.2 : 0;
      const stableTieBreak = (hash(`${caption.id}-${asset.id}`) % 100) / 1000;
      return { asset, score: overlap * 8 + sequenceBonus - varietyPenalty + stableTieBreak, overlap };
    }).sort((a, b) => b.score - a.score);
    const selected = ranked[0];
    const count = useCount.get(selected.asset.id) ?? 0;
    useCount.set(selected.asset.id, count + 1);
    previousAsset = selected.asset.id;
    const sceneDuration = Math.max(.2, caption.end - caption.start);
    const mediaDuration = Number(selected.asset.duration) || sceneDuration;
    const maxSourceStart = Math.max(0, mediaDuration - sceneDuration);
    const sourceStart = maxSourceStart > 0 ? (count * 2.7) % maxSourceStart : 0;
    const transitions = tone === 'educational' ? ['fade', 'slide'] : tone === 'story' ? ['fade', 'zoom'] : ['zoom', 'slide', 'flash'];
    return {
      sceneId: caption.id,
      assetId: selected.asset.id,
      start: caption.start,
      duration: sceneDuration,
      sourceStart: Number(sourceStart.toFixed(3)),
      transition: transitions[sceneIndex % transitions.length],
      semanticScore: Number(selected.score.toFixed(2)),
      reason: selected.overlap > 0 ? 'Correspondance entre le script et le nom/description du média.' : 'Choix basé sur la variété et le rythme des scènes.',
    };
  });

  return NextResponse.json({ engine: 'semantic-scene-planner-v1', scenes, assetUsage: Object.fromEntries(useCount) });
}
