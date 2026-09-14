import type { LucideIcon } from 'lucide-react';
import {
  Captions,
  Film,
  ImageIcon,
  Layers3,
  Music2,
  Sparkles,
  Type,
  WandSparkles,
} from 'lucide-react';

export type TabId = 'media' | 'templates' | 'text' | 'captions' | 'audio' | 'transitions' | 'effects';

export type WordTiming = {
  word: string;
  start: number;
  end: number;
  confidence?: number;
};

export type Caption = {
  id: string;
  start: number;
  end: number;
  text: string;
  textAr?: string;
  words?: WordTiming[];
};

export type CaptionStyle = {
  preset: 'impact' | 'minimal' | 'neon' | 'box';
  fontSize: number;
  textColor: string;
  accentColor: string;
  backgroundColor: string;
  position: number;
  uppercase: boolean;
  shadow: boolean;
  fontFamily?: 'impact' | 'sans' | 'rounded';
  animation?: 'pop' | 'fade' | 'none';
};

export type MediaAsset = {
  id: string;
  name: string;
  kind: 'video' | 'image' | 'audio';
  url?: string;
  storageId?: string;
  color: string;
  duration?: number;
  description?: string;
};

export type TimelineClipKind = 'video' | 'image' | 'audio' | 'caption' | 'text';
export type TransitionType = 'none' | 'fade' | 'slide' | 'zoom' | 'flash' | 'rotate' | 'wipe';
export type KeyframeProperty = 'x' | 'y' | 'scale' | 'rotation' | 'opacity';

export type TimelineKeyframe = {
  id: string;
  time: number;
  property: KeyframeProperty;
  value: number;
};

export type TimelineClip = {
  id: string;
  trackId: string;
  assetId?: string;
  kind: TimelineClipKind;
  name: string;
  start: number;
  duration: number;
  sourceStart: number;
  color: string;
  text?: string;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  volume?: number;
  noiseReduction?: boolean;
  cropTop?: number;
  cropRight?: number;
  cropBottom?: number;
  cropLeft?: number;
  transitionIn?: TransitionType;
  transitionDuration?: number;
  effect?: 'none' | 'enhance' | 'grain' | 'glow' | 'motionBlur';
  keyframes?: TimelineKeyframe[];
};

export type TimelineTrack = {
  id: string;
  name: string;
  kind: TimelineClipKind;
  locked: boolean;
  muted: boolean;
  clips: TimelineClip[];
};

export const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'media', label: 'Médias', icon: ImageIcon },
  { id: 'templates', label: 'Modèles', icon: Layers3 },
  { id: 'text', label: 'Texte', icon: Type },
  { id: 'captions', label: 'Captions', icon: Captions },
  { id: 'audio', label: 'Audio', icon: Music2 },
  { id: 'transitions', label: 'Transitions', icon: Film },
  { id: 'effects', label: 'Effets', icon: WandSparkles },
];

export const demoCaptions: Caption[] = [
  { id: 'c1', start: 0.0, end: 3.4, text: "SALAM! LYOM RAH N'HADRO", textAr: 'سلام! اليوم راح نهضرو' },
  { id: 'c2', start: 3.4, end: 6.8, text: '3LA KIFACH TSAYEB', textAr: 'على كيفاش تصايب' },
  { id: 'c3', start: 6.8, end: 10.7, text: 'VIDEO PRO B DARIJA', textAr: 'فيديو برو بالدارجة' },
  { id: 'c4', start: 10.7, end: 15.0, text: 'FI GHIR QUELQUES CLICS', textAr: 'في غير شوية كليكات' },
  { id: 'c5', start: 15.0, end: 19.4, text: "KHIR L'MODEL LI Y3EJBEK", textAr: 'خير المودال لي يعجبك' },
  { id: 'c6', start: 19.4, end: 23.8, text: 'ZID EFFETS W TRANSITIONS', textAr: 'زيد المؤثرات والانتقالات' },
  { id: 'c7', start: 23.8, end: 27.8, text: "W KHALI L'IA TKEMEL", textAr: 'وخلي الذكاء الاصطناعي يكمل' },
  { id: 'c8', start: 27.8, end: 32.0, text: 'SAHLA, SERI3A, 100% DARIJA', textAr: 'سهلة، سريعة، مئة بالمئة دارجة' },
];

export const starterAssets: MediaAsset[] = [
  { id: 'm1', name: 'Intro produit', kind: 'video', color: '#ff6b35', duration: 8.2 },
  { id: 'm2', name: 'Plan lifestyle', kind: 'video', color: '#7567ff', duration: 12.4 },
  { id: 'm3', name: 'B-roll téléphone', kind: 'video', color: '#20c997', duration: 9.8 },
  { id: 'm4', name: 'Voix off — Darija', kind: 'audio', color: '#f5b841', duration: 32 },
];

export const initialTimelineTracks: TimelineTrack[] = [
  {
    id: 'video-main',
    name: 'Vidéo 1',
    kind: 'video',
    locked: false,
    muted: false,
    clips: [
      { id: 'clip-intro', trackId: 'video-main', assetId: 'm1', kind: 'video', name: 'Intro produit', start: 0, duration: 8.2, sourceStart: 0, color: '#d65b35', x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, transitionIn: 'fade', transitionDuration: .45 },
      { id: 'clip-life', trackId: 'video-main', assetId: 'm2', kind: 'video', name: 'Plan lifestyle', start: 8.2, duration: 12.4, sourceStart: 0, color: '#6658d8', x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, transitionIn: 'slide', transitionDuration: .5 },
      { id: 'clip-phone', trackId: 'video-main', assetId: 'm3', kind: 'video', name: 'B-roll téléphone', start: 20.6, duration: 9.8, sourceStart: 0, color: '#269c79', x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, transitionIn: 'zoom', transitionDuration: .5 },
    ],
  },
  {
    id: 'video-overlay',
    name: 'Vidéo 2',
    kind: 'video',
    locked: false,
    muted: false,
    clips: [
      { id: 'clip-overlay', trackId: 'video-overlay', kind: 'video', name: 'Overlay produit', start: 4.6, duration: 5.4, sourceStart: 0, color: '#b94c83', x: 23, y: -16, scale: .42, rotation: 4, opacity: .95, transitionIn: 'zoom', transitionDuration: .4 },
    ],
  },
  {
    id: 'captions',
    name: 'Captions',
    kind: 'caption',
    locked: false,
    muted: false,
    clips: demoCaptions.map((caption) => ({
      id: `timeline-${caption.id}`,
      trackId: 'captions',
      kind: 'caption' as const,
      name: caption.text,
      text: caption.text,
      start: caption.start,
      duration: caption.end - caption.start,
      sourceStart: 0,
      color: '#6658b8',
    })),
  },
  {
    id: 'voice',
    name: 'Voix off',
    kind: 'audio',
    locked: false,
    muted: false,
    clips: [
      { id: 'clip-voice', trackId: 'voice', assetId: 'm4', kind: 'audio', name: 'Voix off — Darija.wav', start: 0, duration: 32, sourceStart: 0, color: '#23896d' },
    ],
  },
];

export const templates = [
  { id: 't1', name: 'Bold Story', format: '9:16', colors: ['#ff6838', '#f7c94b'] },
  { id: 't2', name: 'Clean Focus', format: '9:16', colors: ['#7c6cff', '#292750'] },
  { id: 't3', name: 'Dz Energy', format: '9:16', colors: ['#1fce8d', '#101a17'] },
  { id: 't4', name: 'Podcast Pop', format: '1:1', colors: ['#ff4f91', '#541137'] },
];

export const transitions = [
  { id: 'tr1', name: 'Fondu', symbol: '◐' },
  { id: 'tr2', name: 'Glissement', symbol: '↗' },
  { id: 'tr3', name: 'Zoom', symbol: '⊕' },
  { id: 'tr4', name: 'Flash', symbol: '✦' },
  { id: 'tr5', name: 'Rotation', symbol: '⟳' },
  { id: 'tr6', name: 'Masque', symbol: '◒' },
];

export const effects = [
  { id: 'fx1', name: 'Auto Enhance', icon: Sparkles, color: '#ffb338' },
  { id: 'fx2', name: 'Film Grain', icon: Film, color: '#8f7cff' },
  { id: 'fx3', name: 'Glow', icon: WandSparkles, color: '#ff5d9e' },
  { id: 'fx4', name: 'Motion Blur', icon: Layers3, color: '#38cba5' },
];
