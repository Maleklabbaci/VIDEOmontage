import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, stat, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

type AssetInput = { id: string; name?: string; kind: 'video' | 'image' | 'audio'; storageId?: string };
type Keyframe = { time: number; property: string; value: number };
type ClipInput = {
  id: string; trackId: string; assetId?: string; kind: 'video' | 'image' | 'audio' | 'caption' | 'text'; name: string; text?: string;
  start: number; duration: number; sourceStart: number; color?: string; x?: number; y?: number; scale?: number; rotation?: number;
  opacity?: number; volume?: number; cropTop?: number; cropRight?: number; cropBottom?: number; cropLeft?: number;
  transitionIn?: string; transitionDuration?: number; effect?: 'none' | 'enhance' | 'grain' | 'glow' | 'motionBlur'; keyframes?: Keyframe[];
};
type TrackInput = { id: string; kind: string; muted?: boolean; clips: ClipInput[] };
type CaptionInput = { start: number; end: number; text: string };
type CaptionStyleInput = { preset?: string; fontSize?: number; textColor?: string; accentColor?: string; position?: number; uppercase?: boolean };
export type RenderPayload = { duration?: number; fps?: number; format?: string; projectName?: string; tracks?: TrackInput[]; assets?: AssetInput[]; captions?: CaptionInput[]; captionStyle?: CaptionStyleInput };

const number = (value: unknown, fallback: number, min = -Infinity, max = Infinity) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const ff = (value: number) => Number(value.toFixed(4)).toString();
const safeColor = (value?: string) => /^#[0-9a-f]{6}$/i.test(value ?? '') ? value! : '#252733';
const assTime = (seconds: number) => {
  const centiseconds = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(centiseconds / 360000);
  const minutes = Math.floor((centiseconds % 360000) / 6000);
  const secs = Math.floor((centiseconds % 6000) / 100);
  const cs = centiseconds % 100;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};
const assColor = (hex?: string) => {
  const value = /^#[0-9a-f]{6}$/i.test(hex ?? '') ? hex!.slice(1) : 'FFFFFF';
  return `&H00${value.slice(4, 6)}${value.slice(2, 4)}${value.slice(0, 2)}`;
};
const assEscape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\r?\n/g, '\\N');

function keyframeExpression(clip: ClipInput, property: string, base: number, offset = 0) {
  const frames = (clip.keyframes ?? []).filter((frame) => frame.property === property).sort((a, b) => a.time - b.time);
  if (!frames.length) return ff(base);
  const points = [{ time: offset, value: base }, ...frames.map((frame) => ({ time: offset + number(frame.time, 0, 0, clip.duration), value: number(frame.value, base) }))]
    .filter((point, index, list) => index === 0 || Math.abs(point.time - list[index - 1].time) > .001);
  let expression = ff(points.at(-1)!.value);
  for (let index = points.length - 2; index >= 0; index--) {
    const from = points[index];
    const to = points[index + 1];
    const span = Math.max(.001, to.time - from.time);
    const linear = `${ff(from.value)}+(${ff(to.value - from.value)})*(t-${ff(from.time)})/${ff(span)}`;
    expression = `if(lt(t\\,${ff(to.time)})\\,${linear}\\,${expression})`;
  }
  return expression;
}

function makeAss(captions: CaptionInput[], style: CaptionStyleInput, duration: number, width: number, height: number) {
  const fontSize = Math.round(number(style.fontSize, 54, 18, 110) * (width / 720));
  const position = number(style.position, 77, 10, 92);
  const marginV = Math.round((1 - position / 100) * height);
  const primary = assColor(style.textColor);
  const accent = assColor(style.accentColor);
  const borderStyle = style.preset === 'box' ? 3 : 1;
  const outline = style.preset === 'minimal' ? 1 : 3;
  const body = captions
    .filter((caption) => caption.end > 0 && caption.start < duration)
    .map((caption) => {
      const raw = style.uppercase ? caption.text.toUpperCase() : caption.text;
      const text = style.preset === 'impact' ? `{\\c${primary}\\bord${outline}}${assEscape(raw)}` : assEscape(raw);
      return `Dialogue: 0,${assTime(caption.start)},${assTime(Math.min(duration, caption.end))},Darja,,0,0,0,,${text}`;
    }).join('\n');
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Darja,DejaVu Sans,${fontSize},${primary},${accent},&H00101012,&H90000000,-1,0,0,0,100,100,0,0,${borderStyle},${outline},2,2,28,28,${marginV},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${body}\n`;
}

async function existingAssetPath(asset?: AssetInput) {
  if (!asset?.storageId || path.basename(asset.storageId) !== asset.storageId) return null;
  const candidate = path.join(process.cwd(), 'storage', 'uploads', asset.storageId);
  try { await stat(candidate); return candidate; } catch { return null; }
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('FFmpeg binary unavailable'));
    const process = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    process.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-16000); });
    process.on('error', reject);
    process.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with ${code}: ${stderr}`)));
  });
}

export async function renderVideo(payload: RenderPayload) {
  const duration = number(payload.duration, 32, .5, 180);
  const fps = Math.round(number(payload.fps, 30, 12, 60));
  const formatMatch = /^(\d{3,4})x(\d{3,4})$/.exec(payload.format ?? '1080x1920');
  const width = Math.round(number(formatMatch?.[1], 1080, 360, 1920) / 2) * 2;
  const height = Math.round(number(formatMatch?.[2], 1920, 360, 1920) / 2) * 2;
  const tracks = payload.tracks ?? [];
  const assets = new Map((payload.assets ?? []).map((asset) => [asset.id, asset]));
  const visualClips = tracks.filter((track) => track.kind === 'video').flatMap((track) => track.clips).filter((clip) => clip.kind === 'video' || clip.kind === 'image');
  const audioClips = tracks.filter((track) => track.kind === 'audio' && !track.muted).flatMap((track) => track.clips).filter((clip) => clip.kind === 'audio');
  const textEvents: CaptionInput[] = tracks.filter((track) => track.kind === 'text').flatMap((track) => track.clips).map((clip) => ({ start: clip.start, end: clip.start + clip.duration, text: clip.text ?? clip.name }));
  const mediaClips = [...visualClips, ...audioClips];
  const paths = new Map<string, string>();
  for (const clip of mediaClips) {
    const mediaPath = await existingAssetPath(assets.get(clip.assetId ?? ''));
    if (mediaPath) paths.set(clip.id, mediaPath);
  }

  const token = randomUUID();
  const outputPath = path.join(os.tmpdir(), `darja-render-${token}.mp4`);
  const assPath = path.join(os.tmpdir(), `darja-captions-${token}.ass`);
  await writeFile(assPath, makeAss([...(payload.captions ?? []), ...textEvents], payload.captionStyle ?? {}, duration, width, height), 'utf8');

  const args: string[] = ['-y', '-f', 'lavfi', '-i', `color=c=0x111218:s=${width}x${height}:r=${fps}:d=${ff(duration)}`, '-f', 'lavfi', '-t', ff(duration), '-i', 'anullsrc=r=48000:cl=stereo'];
  const inputIndexes = new Map<string, number>();
  let inputIndex = 2;
  for (const clip of mediaClips) {
    const mediaPath = paths.get(clip.id);
    if (!mediaPath) continue;
    if (clip.kind === 'image') args.push('-loop', '1', '-t', ff(number(clip.duration, 4, .2, duration)), '-i', mediaPath);
    else args.push('-i', mediaPath);
    inputIndexes.set(clip.id, inputIndex++);
  }

  const filters: string[] = ['[0:v]format=yuv420p[base0]'];
  let baseLabel = 'base0';
  visualClips.forEach((clip, index) => {
    const start = number(clip.start, 0, 0, duration);
    const clipDuration = number(clip.duration, 1, .2, duration - start || .2);
    const sourceStart = number(clip.sourceStart, 0, 0, 86400);
    const scale = number(clip.scale, 1, .05, 4);
    const rotation = number(clip.rotation, 0, -360, 360);
    const opacity = number(clip.opacity, 1, 0, 1);
    const x = number(clip.x, 0, -200, 200);
    const y = number(clip.y, 0, -200, 200);
    const cropTop = number(clip.cropTop, 0, 0, 90) / 100;
    const cropRight = number(clip.cropRight, 0, 0, 90) / 100;
    const cropBottom = number(clip.cropBottom, 0, 0, 90) / 100;
    const cropLeft = number(clip.cropLeft, 0, 0, 90) / 100;
    const horizontalKeep = Math.max(.05, 1 - cropLeft - cropRight);
    const verticalKeep = Math.max(.05, 1 - cropTop - cropBottom);
    const transitionDuration = number(clip.transitionDuration, .45, .05, Math.min(2, clipDuration));
    let scaleExpression = keyframeExpression(clip, 'scale', scale);
    let rotationExpression = keyframeExpression(clip, 'rotation', rotation);
    let xExpression = keyframeExpression(clip, 'x', x, start);
    const yExpression = keyframeExpression(clip, 'y', y, start);
    if (clip.transitionIn === 'zoom') scaleExpression = `(${scaleExpression})*(if(lt(t\\,${ff(transitionDuration)})\\,0.72+0.28*t/${ff(transitionDuration)}\\,1))`;
    if (clip.transitionIn === 'rotate') rotationExpression = `(${rotationExpression})+if(lt(t\\,${ff(transitionDuration)})\\,-16*(1-t/${ff(transitionDuration)})\\,0)`;
    if (clip.transitionIn === 'slide') xExpression = `(${xExpression})+if(lt(t\\,${ff(start + transitionDuration)})\\,105*(1-(t-${ff(start)})/${ff(transitionDuration)})\\,0)`;
    const input = inputIndexes.get(clip.id);
    const source = input === undefined
      ? `color=c=${safeColor(clip.color).replace('#', '0x')}:s=${width}x${height}:r=${fps}:d=${ff(clipDuration)}`
      : `[${input}:v]trim=start=${ff(sourceStart)}:duration=${ff(clipDuration)},setpts=PTS-STARTPTS,fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
    let chain = `${source},crop=iw*${ff(horizontalKeep)}:ih*${ff(verticalKeep)}:iw*${ff(cropLeft)}:ih*${ff(cropTop)},scale=w='trunc(${width}*(${scaleExpression})/2)*2':h='trunc(${height}*(${scaleExpression})/2)*2':eval=frame,setsar=1,format=rgba`;
    if (clip.effect === 'enhance') chain += ',eq=contrast=1.08:saturation=1.2';
    if (clip.effect === 'grain') chain += ',noise=alls=9:allf=t';
    if (clip.effect === 'glow') chain += ',unsharp=5:5:1.0:5:5:0';
    if (clip.effect === 'motionBlur') chain += ',gblur=sigma=1';
    if (Math.abs(rotation) > .01 || clip.transitionIn === 'rotate' || clip.keyframes?.some((frame) => frame.property === 'rotation')) chain += `,rotate='(${rotationExpression})*PI/180':ow=rotw(iw):oh=roth(ih):c=none`;
    if (clip.transitionIn === 'flash') chain += `,eq=brightness='if(lt(t,${ff(transitionDuration)}),0.45*(1-t/${ff(transitionDuration)}),0)':eval=frame`;
    if (opacity < .999) chain += `,colorchannelmixer=aa=${ff(opacity)}`;
    if (clip.transitionIn === 'fade' || clip.transitionIn === 'wipe') chain += `,fade=t=in:st=0:d=${ff(transitionDuration)}:alpha=1`;
    chain += `,setpts=PTS-STARTPTS+${ff(start)}/TB[v${index}]`;
    filters.push(chain);
    const nextBase = `base${index + 1}`;
    filters.push(`[${baseLabel}][v${index}]overlay=x='(W-w)/2+W*(${xExpression})/100':y='(H-h)/2+H*(${yExpression})/100':enable='between(t,${ff(start)},${ff(start + clipDuration)})':eof_action=pass:eval=frame[${nextBase}]`);
    baseLabel = nextBase;
  });

  const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
  filters.push(`[${baseLabel}]subtitles=filename='${escapedAssPath}'[vout]`);

  const audioLabels: string[] = [];
  audioClips.forEach((clip, index) => {
    const input = inputIndexes.get(clip.id);
    if (input === undefined) return;
    const start = number(clip.start, 0, 0, duration);
    const clipDuration = number(clip.duration, 1, .2, duration - start || .2);
    const sourceStart = number(clip.sourceStart, 0, 0, 86400);
    const delay = Math.round(start * 1000);
    const label = `audio${index}`;
    filters.push(`[${input}:a]atrim=start=${ff(sourceStart)}:duration=${ff(clipDuration)},asetpts=PTS-STARTPTS,adelay=${delay}:all=1,volume=${ff(number(clip.volume, 1, 0, 2))}[${label}]`);
    audioLabels.push(label);
  });
  if (audioLabels.length) {
    filters.push(`[1:a]atrim=duration=${ff(duration)}[silence]`);
    filters.push(`[silence]${audioLabels.map((label) => `[${label}]`).join('')}amix=inputs=${audioLabels.length + 1}:duration=longest:dropout_transition=0,atrim=duration=${ff(duration)}[aout]`);
  } else {
    filters.push(`[1:a]atrim=duration=${ff(duration)}[aout]`);
  }

  args.push('-filter_complex', filters.join(';'), '-map', '[vout]', '-map', '[aout]', '-t', ff(duration), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outputPath);

  try {
    await runFfmpeg(args);
    return await readFile(outputPath);
  } finally {
    await Promise.allSettled([unlink(outputPath), unlink(assPath)]);
  }
}
