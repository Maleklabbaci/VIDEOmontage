'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Clapperboard,
  Cloud,
  Copy,
  Crop,
  Diamond,
  Download,
  Eye,
  EyeOff,
  FileText,
  FolderUp,
  Grid2X2,
  ImagePlus,
  Lock,
  LockOpen,
  Magnet,
  Maximize2,
  Mic2,
  MonitorPlay,
  MousePointer2,
  Move,
  Palette,
  Pause,
  Play,
  Plus,
  Redo2,
  Rocket,
  RotateCcw,
  Scissors,
  Search,
  Settings2,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  UploadCloud,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ChangeEvent, CSSProperties, Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { CAPTION_FONTS, getCaptionFont, type CaptionFontId } from '@/lib/caption-fonts';
import {
  Caption,
  CaptionStyle,
  demoCaptions,
  effects,
  initialTimelineTracks,
  MediaAsset,
  starterAssets,
  tabs,
  TabId,
  templates,
  TimelineClip,
  TimelineTrack,
  TransitionType,
  transitions,
  WordTiming,
} from '@/lib/editor-data';

const INITIAL_STYLE: CaptionStyle = {
  preset: 'impact',
  fontSize: 54,
  textColor: '#ffffff',
  accentColor: '#ff6b35',
  backgroundColor: '#101116',
  position: 77,
  uppercase: true,
  shadow: true,
  fontFamily: 'anton',
  animation: 'pop',
};

const PRESETS: Array<{
  id: CaptionStyle['preset'];
  name: string;
  sample: string;
  patch: Partial<CaptionStyle>;
}> = [
  {
    id: 'impact',
    name: 'Impact DZ',
    sample: 'SAH !',
    patch: { preset: 'impact', textColor: '#ffffff', accentColor: '#ff6b35', backgroundColor: '#101116', fontSize: 54, shadow: true },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    sample: 'Darija',
    patch: { preset: 'minimal', textColor: '#ffffff', accentColor: '#ffffff', backgroundColor: '#101116', fontSize: 44, shadow: false },
  },
  {
    id: 'neon',
    name: 'Neon Pop',
    sample: 'WOW',
    patch: { preset: 'neon', textColor: '#f8ff3e', accentColor: '#a06bff', backgroundColor: '#251643', fontSize: 52, shadow: true },
  },
  {
    id: 'box',
    name: 'Box Pro',
    sample: 'PRO',
    patch: { preset: 'box', textColor: '#111217', accentColor: '#ffcf48', backgroundColor: '#ffcf48', fontSize: 48, shadow: true },
  },
];

const PALETTE = ['#ff6b35', '#7c6cff', '#1bc98e', '#ff4f91', '#f5b841', '#39a7ff'];
const TOTAL_DURATION = 32;

function formatTime(value: number, frames = false) {
  const safe = Math.max(0, value);
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  if (frames) {
    const frame = Math.floor((safe % 1) * 30);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frame).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function cloneTracks(value: TimelineTrack[]) {
  return value.map((track) => ({ ...track, clips: track.clips.map((clip) => ({ ...clip, keyframes: clip.keyframes?.map((keyframe) => ({ ...keyframe })) })) }));
}

function probeMediaDuration(file: File, url: string) {
  if (file.type.startsWith('image')) return Promise.resolve(undefined);
  return new Promise<number | undefined>((resolve) => {
    const element = document.createElement(file.type.startsWith('audio') ? 'audio' : 'video');
    const timer = window.setTimeout(() => resolve(undefined), 6000);
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      window.clearTimeout(timer);
      resolve(Number.isFinite(element.duration) ? element.duration : undefined);
      element.removeAttribute('src');
      element.load();
    };
    element.onerror = () => {
      window.clearTimeout(timer);
      resolve(undefined);
    };
    element.src = url;
  });
}

export function Editor() {
  const [mode, setMode] = useState<'auto' | 'advanced'>('auto');
  return mode === 'auto' ? <AutoStudio onOpenAdvanced={() => setMode('advanced')} /> : <AdvancedEditor onBackToEasy={() => setMode('auto')} />;
}

function AdvancedEditor({ onBackToEasy }: { onBackToEasy: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('media');
  const [assets, setAssets] = useState<MediaAsset[]>(starterAssets);
  const [captions, setCaptions] = useState<Caption[]>(demoCaptions);
  const [tracks, setTracks] = useState<TimelineTrack[]>(initialTimelineTracks);
  const [timelinePast, setTimelinePast] = useState<TimelineTrack[][]>([]);
  const [timelineFuture, setTimelineFuture] = useState<TimelineTrack[][]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>('clip-life');
  const [snapping, setSnapping] = useState(true);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(INITIAL_STYLE);
  const [pastStyles, setPastStyles] = useState<CaptionStyle[]>([]);
  const [futureStyles, setFutureStyles] = useState<CaptionStyle[]>([]);
  const [currentTime, setCurrentTime] = useState(5.2);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(82);
  const [zoom, setZoom] = useState(78);
  const [scriptMode, setScriptMode] = useState<'latin' | 'arabic'>('latin');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('Démo produit — Darija');
  const [saveState, setSaveState] = useState<'saving' | 'saved'>('saved');
  const [assetDragActive, setAssetDragActive] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [renderStatus, setRenderStatus] = useState<'idle' | 'sending' | 'ready' | 'error'>('idle');
  const [renderJob, setRenderJob] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const autosaveReady = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedTimelineClip = useMemo(
    () => tracks.flatMap((track) => track.clips).find((clip) => clip.id === selectedClipId) ?? null,
    [tracks, selectedClipId],
  );
  const voiceClip = useMemo(
    () => tracks.flatMap((track) => track.clips).find((clip) => clip.id === 'clip-voice') ?? null,
    [tracks],
  );
  const activeVisualClips = useMemo(
    () => tracks.flatMap((track, trackIndex) => track.kind === 'video' && !track.muted
      ? track.clips.filter((clip) => currentTime >= clip.start && currentTime < clip.start + clip.duration).map((clip) => ({ clip, trackIndex }))
      : []),
    [tracks, currentTime],
  );
  const activeAudioClips = useMemo(
    () => tracks.flatMap((track) => track.kind === 'audio' && !track.muted
      ? track.clips.filter((clip) => currentTime >= clip.start && currentTime < clip.start + clip.duration)
      : []),
    [tracks, currentTime],
  );
  const activeTextClips = useMemo(
    () => tracks.flatMap((track) => track.kind === 'text' && !track.muted
      ? track.clips.filter((clip) => currentTime >= clip.start && currentTime < clip.start + clip.duration)
      : []),
    [tracks, currentTime],
  );
  const captionsVisible = !tracks.find((track) => track.id === 'captions')?.muted;
  const currentCaption = useMemo(() => {
    const captionClips = tracks.find((track) => track.id === 'captions')?.clips ?? [];
    const clip = captionClips.find((item) => currentTime >= item.start && currentTime < item.start + item.duration) ?? captionClips[0];
    if (!clip) return captions[0];
    const sourceId = clip.id.replace('timeline-', '');
    const source = captions.find((caption) => caption.id === sourceId);
    return {
      id: sourceId,
      start: clip.start,
      end: clip.start + clip.duration,
      text: clip.text ?? clip.name,
      textAr: source?.textAr,
      words: source?.words,
    };
  }, [captions, currentTime, tracks]);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    let accumulated = 0;
    const tick = (now: number) => {
      accumulated += Math.min(.1, (now - last) / 1000);
      last = now;
      if (accumulated >= 1 / 30) {
        const delta = accumulated;
        accumulated = 0;
        setCurrentTime((time) => {
          const next = time + delta;
          if (next >= TOTAL_DURATION) {
            setPlaying(false);
            return 0;
          }
          return next;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    const captionClips = tracks.find((track) => track.id === 'captions')?.clips ?? [];
    setCaptions((items) => items.map((caption) => {
      const clip = captionClips.find((item) => item.id === `timeline-${caption.id}`);
      return clip ? { ...caption, start: clip.start, end: clip.start + clip.duration, text: clip.text ?? clip.name } : caption;
    }));
  }, [tracks]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('darja-studio-project-v2');
      if (stored) {
        const project = JSON.parse(stored);
        if (Array.isArray(project.tracks)) setTracks(project.tracks);
        if (Array.isArray(project.captions)) setCaptions(project.captions);
        if (project.captionStyle) setCaptionStyle((style) => ({ ...style, ...project.captionStyle }));
        if (Array.isArray(project.assets)) setAssets(project.assets);
        if (typeof project.projectName === 'string') setProjectName(project.projectName);
      }
    } catch {
      window.localStorage.removeItem('darja-studio-project-v2');
    }
    autosaveReady.current = true;
  }, []);

  useEffect(() => {
    if (!autosaveReady.current) return;
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      const persistentAssets = assets.filter((asset) => !asset.id.startsWith('upload-') || asset.storageId).map((asset) => ({ ...asset, url: asset.storageId ? `/api/assets/${encodeURIComponent(asset.storageId)}` : asset.url }));
      window.localStorage.setItem('darja-studio-project-v2', JSON.stringify({ version: 2, projectName, tracks, captions, captionStyle, assets: persistentAssets }));
      setSaveState('saved');
    }, 550);
    return () => window.clearTimeout(timer);
  }, [projectName, tracks, captions, captionStyle, assets]);

  const commitStyle = (patch: Partial<CaptionStyle>) => {
    setPastStyles((history) => [...history.slice(-29), captionStyle]);
    setFutureStyles([]);
    setCaptionStyle((style) => ({ ...style, ...patch }));
  };

  const beginTimelineChange = () => {
    setTimelinePast((history) => [...history.slice(-49), cloneTracks(tracks)]);
    setTimelineFuture([]);
  };

  const commitTimeline = (updater: (current: TimelineTrack[]) => TimelineTrack[]) => {
    beginTimelineChange();
    setTracks((current) => updater(cloneTracks(current)));
  };

  const undo = () => {
    const previousTimeline = timelinePast.at(-1);
    if (previousTimeline) {
      setTimelineFuture((future) => [cloneTracks(tracks), ...future]);
      setTimelinePast((history) => history.slice(0, -1));
      setTracks(cloneTracks(previousTimeline));
      return;
    }
    const previousStyle = pastStyles.at(-1);
    if (!previousStyle) return;
    setFutureStyles((future) => [captionStyle, ...future]);
    setPastStyles((history) => history.slice(0, -1));
    setCaptionStyle(previousStyle);
  };

  const redo = () => {
    const nextTimeline = timelineFuture[0];
    if (nextTimeline) {
      setTimelinePast((history) => [...history, cloneTracks(tracks)]);
      setTimelineFuture((future) => future.slice(1));
      setTracks(cloneTracks(nextTimeline));
      return;
    }
    const nextStyle = futureStyles[0];
    if (!nextStyle) return;
    setPastStyles((history) => [...history, captionStyle]);
    setFutureStyles((future) => future.slice(1));
    setCaptionStyle(nextStyle);
  };

  const removeSelectedClip = () => {
    if (!selectedClipId) return;
    commitTimeline((current) => current.map((track) => ({ ...track, clips: track.clips.filter((clip) => clip.id !== selectedClipId) })));
    setSelectedClipId(null);
    notify('Clip supprimé');
  };

  const duplicateSelectedClip = () => {
    if (!selectedClipId) return;
    commitTimeline((current) => current.map((track) => {
      const source = track.clips.find((clip) => clip.id === selectedClipId);
      if (!source) return track;
      const duplicate: TimelineClip = {
        ...source,
        id: `${source.id}-copy-${Date.now().toString(36)}`,
        start: Math.min(TOTAL_DURATION - source.duration, source.start + Math.min(.5, source.duration)),
        name: `${source.name} copie`,
      };
      setSelectedClipId(duplicate.id);
      return { ...track, clips: [...track.clips, duplicate] };
    }));
    notify('Clip dupliqué');
  };

  const splitSelectedClip = () => {
    if (!selectedClipId) return;
    const selected = tracks.flatMap((track) => track.clips).find((clip) => clip.id === selectedClipId);
    if (!selected || currentTime <= selected.start + .08 || currentTime >= selected.start + selected.duration - .08) {
      notify('Place le curseur à l’intérieur du clip');
      return;
    }
    const rightId = `${selected.id}-split-${Date.now().toString(36)}`;
    commitTimeline((current) => current.map((track) => ({
      ...track,
      clips: track.clips.flatMap((clip) => {
        if (clip.id !== selectedClipId) return [clip];
        const leftDuration = currentTime - clip.start;
        const right: TimelineClip = {
          ...clip,
          id: rightId,
          name: `${clip.name} B`,
          start: currentTime,
          duration: clip.duration - leftDuration,
          sourceStart: clip.sourceStart + leftDuration,
        };
        return [{ ...clip, duration: leftDuration, name: `${clip.name} A` }, right];
      }),
    })));
    setSelectedClipId(rightId);
    notify('Clip découpé au curseur');
  };

  const addVideoTrack = () => {
    commitTimeline((current) => {
      const videoCount = current.filter((track) => track.kind === 'video').length + 1;
      const insertAt = current.findIndex((track) => track.kind !== 'video');
      const nextTrack: TimelineTrack = { id: `video-${Date.now().toString(36)}`, name: `Vidéo ${videoCount}`, kind: 'video', locked: false, muted: false, clips: [] };
      const copy = [...current];
      copy.splice(insertAt < 0 ? current.length : insertAt, 0, nextTrack);
      return copy;
    });
    notify('Nouvelle piste vidéo ajoutée');
  };

  const toggleTrackLock = (trackId: string) => {
    commitTimeline((current) => current.map((track) => track.id === trackId ? { ...track, locked: !track.locked } : track));
  };

  const toggleTrackMute = (trackId: string) => {
    commitTimeline((current) => current.map((track) => track.id === trackId ? { ...track, muted: !track.muted } : track));
  };

  const updateSelectedClip = (patch: Partial<TimelineClip>) => {
    if (!selectedClipId) return;
    commitTimeline((current) => current.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => clip.id === selectedClipId ? { ...clip, ...patch } : clip),
    })));
  };

  const updateVoiceClip = (patch: Partial<TimelineClip>) => {
    commitTimeline((current) => current.map((track) => ({ ...track, clips: track.clips.map((clip) => clip.id === 'clip-voice' ? { ...clip, ...patch } : clip) })));
  };

  const applyTransition = (transition: TransitionType) => {
    if (!selectedTimelineClip || (selectedTimelineClip.kind !== 'video' && selectedTimelineClip.kind !== 'image')) {
      notify('Sélectionne d’abord un clip vidéo ou image');
      return;
    }
    updateSelectedClip({ transitionIn: transition, transitionDuration: transition === 'none' ? 0 : .5 });
    notify(`Transition ${transition === 'none' ? 'supprimée' : transition} appliquée`);
  };

  const applyTemplate = (templateId: string) => {
    const styles: Record<string, Partial<CaptionStyle>> = {
      t1: PRESETS[0].patch,
      t2: PRESETS[1].patch,
      t3: { ...PRESETS[2].patch, accentColor: '#20c997' },
      t4: { ...PRESETS[3].patch, accentColor: '#ff4f91', backgroundColor: '#ff4f91' },
    };
    commitStyle(styles[templateId] ?? PRESETS[0].patch);
    notify('Modèle appliqué au projet');
  };

  const applyEffect = (effect: NonNullable<TimelineClip['effect']>) => {
    if (!selectedTimelineClip || (selectedTimelineClip.kind !== 'video' && selectedTimelineClip.kind !== 'image')) {
      notify('Sélectionne d’abord un clip vidéo ou image');
      return;
    }
    updateSelectedClip({ effect });
    notify(`Effet ${effect} appliqué`);
  };

  const addTransformKeyframes = () => {
    if (!selectedTimelineClip || !['video', 'image', 'text'].includes(selectedTimelineClip.kind)) return;
    const localTime = Math.min(selectedTimelineClip.duration, Math.max(0, currentTime - selectedTimelineClip.start));
    const values = {
      x: selectedTimelineClip.x ?? 0,
      y: selectedTimelineClip.y ?? 0,
      scale: selectedTimelineClip.scale ?? 1,
      rotation: selectedTimelineClip.rotation ?? 0,
      opacity: selectedTimelineClip.opacity ?? 1,
    };
    const retained = (selectedTimelineClip.keyframes ?? []).filter((keyframe) => Math.abs(keyframe.time - localTime) > .03);
    const keyframes = (Object.entries(values) as Array<[keyof typeof values, number]>).map(([property, value]) => ({
      id: `kf-${property}-${Date.now().toString(36)}`,
      time: localTime,
      property,
      value,
    }));
    updateSelectedClip({ keyframes: [...retained, ...keyframes] });
    notify(`Keyframe ajouté à ${localTime.toFixed(2)}s`);
  };

  const clearTransformKeyframes = () => {
    if (!selectedTimelineClip) return;
    updateSelectedClip({ keyframes: [] });
    notify('Keyframes supprimés');
  };

  const addTextClip = (text: string) => {
    const clipId = `text-${Date.now().toString(36)}`;
    const trackId = 'text-main';
    const clip: TimelineClip = { id: clipId, trackId, kind: 'text', name: text, text, start: Math.min(currentTime, TOTAL_DURATION - 4), duration: 4, sourceStart: 0, color: '#ffffff', x: 0, y: -24, scale: 1, rotation: 0, opacity: 1 };
    commitTimeline((current) => {
      const existing = current.find((track) => track.id === trackId);
      if (existing) return current.map((track) => track.id === trackId ? { ...track, clips: [...track.clips, clip] } : track);
      const insertAt = current.findIndex((track) => track.kind === 'caption');
      const nextTrack: TimelineTrack = { id: trackId, name: 'Textes', kind: 'text', locked: false, muted: false, clips: [clip] };
      const copy = [...current];
      copy.splice(insertAt < 0 ? current.length : insertAt, 0, nextTrack);
      return copy;
    });
    setSelectedClipId(clipId);
    notify('Texte ajouté à la timeline');
  };

  const placeAssetOnTimeline = (asset: MediaAsset, requestedTrackId?: string, requestedStart = currentTime) => {
    const defaultDuration = asset.kind === 'image' ? 4 : 6;
    const duration = Math.min(TOTAL_DURATION, Math.max(.5, asset.duration ?? defaultDuration));
    const start = Math.min(Math.max(0, requestedStart), TOTAL_DURATION - duration);
    const clipId = `clip-${Date.now().toString(36)}`;
    const requestedTrack = requestedTrackId ? tracks.find((track) => track.id === requestedTrackId) : undefined;
    if (requestedTrack?.locked) { notify('Cette piste est verrouillée'); return; }
    if (requestedTrack && asset.kind === 'audio' && requestedTrack.kind !== 'audio') { notify('Dépose l’audio sur une piste audio'); return; }
    if (requestedTrack && asset.kind !== 'audio' && requestedTrack.kind !== 'video') { notify('Dépose la vidéo ou l’image sur une piste vidéo'); return; }

    const fallbackTrack = asset.kind === 'audio' ? tracks.find((track) => track.kind === 'audio' && !track.locked) : tracks.find((track) => track.kind === 'video' && !track.locked);
    const destination = requestedTrack ?? fallbackTrack;
    const audioTrackId = `audio-${Date.now().toString(36)}`;
    commitTimeline((current) => {
      if (!destination && asset.kind === 'audio') {
        const audioNumber = current.filter((track) => track.kind === 'audio').length + 1;
        return [...current, { id: audioTrackId, name: `Audio ${audioNumber}`, kind: 'audio', locked: false, muted: false, clips: [{ id: clipId, trackId: audioTrackId, assetId: asset.id, kind: 'audio', name: asset.name, start, duration, sourceStart: 0, color: asset.color, volume: 1 }] }];
      }
      if (!destination) return current;
      return current.map((track) => track.id === destination.id ? {
        ...track,
        clips: [...track.clips, { id: clipId, trackId: track.id, assetId: asset.id, kind: asset.kind, name: asset.name, start, duration, sourceStart: 0, color: asset.color, x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, volume: 1 }].sort((a, b) => a.start - b.start),
      } : track);
    });
    setSelectedClipId(clipId);
    setCurrentTime(start);
    notify(`${asset.name} déposé sur ${destination?.name ?? 'une nouvelle piste'} à ${formatTime(start)}`);
  };

  const addAssetToTimeline = (asset: MediaAsset) => placeAssetOnTimeline(asset);
  const dropAssetOnTimeline = (assetId: string, trackId: string, time: number) => {
    const asset = assets.find((item) => item.id === assetId);
    if (asset) placeAssetOnTimeline(asset, trackId, time);
  };

  const togglePlayback = async () => {
    setPlaying((value) => !value);
  };

  const seek = (time: number) => {
    setCurrentTime(Math.min(TOTAL_DURATION, Math.max(0, time)));
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (stageRef.current?.requestFullscreen) await stageRef.current.requestFullscreen();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, [contenteditable="true"]')) return;
      if (event.code === 'Space') {
        event.preventDefault();
        void togglePlayback();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        removeSelectedClip();
      } else if (event.key.toLowerCase() === 's' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        splitSelectedClip();
      } else if (event.key.toLowerCase() === 'd' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        duplicateSelectedClip();
      } else if (event.key.toLowerCase() === 'z' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const importFiles = async (files: File[]) => {
    const accepted = files.filter((file) => file.type.startsWith('video') || file.type.startsWith('audio') || file.type.startsWith('image'));
    if (!accepted.length) {
      notify('Aucun fichier vidéo, image ou audio compatible');
      return;
    }
    const batchId = Date.now();
    const localEntries = accepted.map((file, index) => {
      const kind: MediaAsset['kind'] = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
      const url = URL.createObjectURL(file);
      const asset: MediaAsset = { id: `upload-${batchId}-${index}`, name: file.name, kind, url, color: PALETTE[(assets.length + index) % PALETTE.length] };
      return { file, asset, localUrl: url };
    });
    setAssets((list) => [...localEntries.map((entry) => entry.asset), ...list]);
    const firstVideo = localEntries.find((entry) => entry.asset.kind === 'video');
    if (firstVideo) setActiveVideoId(firstVideo.asset.id);
    notify(`${accepted.length} média${accepted.length > 1 ? 's' : ''} importé${accepted.length > 1 ? 's' : ''} · stockage en cours`);

    await Promise.all(localEntries.map(async ({ file, asset, localUrl }) => {
      const duration = await probeMediaDuration(file, localUrl);
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await fetch('/api/assets', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('upload failed');
        const uploaded = await response.json();
        setAssets((list) => list.map((item) => item.id === asset.id ? { ...item, storageId: uploaded.storageId, url: uploaded.url, duration } : item));
        URL.revokeObjectURL(localUrl);
      } catch {
        setAssets((list) => list.map((item) => item.id === asset.id ? { ...item, duration } : item));
        notify(`${asset.name} reste local : stockage indisponible`);
      }
    }));
    notify('Médias prêts pour la preview et le rendu');
  };

  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void importFiles(files);
  };

  const updateCurrentCaption = (text: string) => {
    setCaptions((items) => items.map((item) => (item.id === currentCaption.id ? { ...item, text } : item)));
    setTracks((items) => items.map((track) => track.id === 'captions' ? {
      ...track,
      clips: track.clips.map((clip) => clip.id === `timeline-${currentCaption.id}` ? { ...clip, name: text, text } : clip),
    } : track));
  };

  const applyGeneratedScript = (generatedCaptions: Caption[]) => {
    setCaptions(generatedCaptions);
    setTracks((current) => current.map((track) => track.id === 'captions' ? {
      ...track,
      clips: generatedCaptions.map((caption) => ({
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
    } : track));
    setCurrentTime(0);
    setSelectedClipId(`timeline-${generatedCaptions[0]?.id ?? ''}`);
    setScriptOpen(false);
    notify('Script généré et captions ajoutées à la timeline');
  };

  const createRenderJob = async (settings?: { format: string; fps: number; quality: 'standard' | 'high' | 'maximum'; fileName: string }) => {
    setRenderStatus('sending');
    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          duration: TOTAL_DURATION,
          format: settings?.format ?? '1080x1920',
          fps: settings?.fps ?? 30,
          quality: settings?.quality ?? 'high',
          codec: 'h264',
          captions: captionsVisible ? captions : [],
          captionStyle,
          tracks,
          assets: assets.map(({ id, name, kind, duration, storageId }) => ({ id, name, kind, duration, storageId })),
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const video = await response.blob();
      const url = URL.createObjectURL(video);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = settings?.fileName?.endsWith('.mp4') ? settings.fileName : `${settings?.fileName || projectName.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'darja-video'}.mp4`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setRenderJob(`${(video.size / 1024 / 1024).toFixed(1)} Mo`);
      setRenderStatus('ready');
    } catch (error) {
      console.error(error);
      setRenderStatus('error');
    }
  };

  const downloadProject = () => {
    const manifest = {
      version: '0.1',
      name: projectName,
      duration: TOTAL_DURATION,
      fps: 30,
      format: '1080x1920',
      captions,
      captionStyle,
      tracks,
      assets: assets.map(({ id, name, kind, duration, storageId }) => ({ id, name, kind, duration, storageId })),
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'darja-studio-project.json';
    anchor.click();
    URL.revokeObjectURL(url);
    notify('Projet téléchargé');
  };

  const resetProject = () => {
    if (!window.confirm('Réinitialiser le projet et supprimer les modifications locales ?')) return;
    window.localStorage.removeItem('darja-studio-project-v2');
    setTracks(cloneTracks(initialTimelineTracks));
    setCaptions(demoCaptions);
    setCaptionStyle(INITIAL_STYLE);
    setAssets(starterAssets);
    setProjectName('Nouveau projet Darija');
    setSelectedClipId('clip-intro');
    setCurrentTime(0);
    setAccountOpen(false);
    notify('Projet réinitialisé');
  };

  const captionText = scriptMode === 'arabic' ? currentCaption.textAr || currentCaption.text : currentCaption.text;
  const activeWordIndex = currentCaption.words?.findIndex((word) => currentTime >= word.start && currentTime < word.end) ?? -1;
  const captionProgress = Math.min(1, Math.max(0, (currentTime - currentCaption.start) / .24));
  const captionFont = `${getCaptionFont(captionStyle.fontFamily).family}, sans-serif`;
  const captionCss: CSSProperties = {
    '--caption-color': captionStyle.textColor,
    '--caption-accent': captionStyle.accentColor,
    '--caption-bg': captionStyle.backgroundColor,
    '--caption-size': `${captionStyle.fontSize}px`,
    '--caption-position': `${captionStyle.position}%`,
    '--caption-font': captionFont,
    '--caption-progress': captionProgress,
  } as CSSProperties;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <button className="icon-button subtle" title="Retour au mode automatique" onClick={onBackToEasy}>
            <ArrowLeft size={18} />
          </button>
          <div className="brand-mark"><span>D</span></div>
          <div className="brand-copy">
            <strong>DARJA STUDIO</strong>
            <span>VIDEO LAB</span>
          </div>
        </div>

        <div className="project-title-wrap">
          <input
            aria-label="Nom du projet"
            className="project-title"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
          />
          <div className={`save-state ${saveState}`}><Cloud size={13} /> {saveState === 'saving' ? 'Enregistrement…' : 'Sauvegardé automatiquement'}</div>
        </div>

        <div className="top-actions">
          <button className="icon-button" onClick={undo} disabled={!timelinePast.length && !pastStyles.length} title="Annuler">
            <Undo2 size={18} />
          </button>
          <button className="icon-button" onClick={redo} disabled={!timelineFuture.length && !futureStyles.length} title="Rétablir">
            <Redo2 size={18} />
          </button>
          <span className="top-divider" />
          <button className="script-top-button" onClick={() => setScriptOpen(true)}><Sparkles size={16} /> Script IA</button>
          <button className="preview-button" onClick={toggleFullscreen}><Eye size={17} /> Aperçu</button>
          <button className="export-button" onClick={() => { setExportOpen(true); setRenderStatus('idle'); }}>
            <Download size={17} /> Exporter
          </button>
          <div className="account-wrap">
            <button className="avatar" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen}>Y</button>
            {accountOpen && <div className="account-menu"><strong>Projet local</strong><span>Darja Studio self-hosted</span><button onClick={() => { downloadProject(); setAccountOpen(false); }}><Download size={14} /> Télécharger le projet</button><button onClick={() => { setHelpOpen(true); setAccountOpen(false); }}><CircleHelp size={14} /> Ouvrir l’aide</button><button className="danger-menu-item" onClick={resetProject}><RotateCcw size={14} /> Réinitialiser le projet</button></div>}
          </div>
        </div>
      </header>

      <div className="editor-grid">
        <nav className="tool-rail" aria-label="Outils d’édition">
          <div className="rail-main">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`rail-item ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={21} strokeWidth={activeTab === id ? 2.2 : 1.8} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="rail-bottom">
            <button className="rail-item" onClick={() => setHelpOpen(true)}><CircleHelp size={20} /><span>Aide</span></button>
          </div>
        </nav>

        <aside
          className={`asset-panel ${assetDragActive ? 'file-drag-active' : ''}`}
          onDragEnter={(event) => { if (Array.from(event.dataTransfer.types).includes('Files')) { event.preventDefault(); setAssetDragActive(true); } }}
          onDragOver={(event) => { if (Array.from(event.dataTransfer.types).includes('Files')) event.preventDefault(); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setAssetDragActive(false); }}
          onDrop={(event) => { if (event.dataTransfer.files.length) { event.preventDefault(); setAssetDragActive(false); void importFiles(Array.from(event.dataTransfer.files)); } }}
        >
          {assetDragActive && <div className="asset-drop-overlay"><UploadCloud size={26} /><strong>Dépose tes fichiers</strong><span>Vidéos, images ou audio</span></div>}
          <PanelContent
            activeTab={activeTab}
            assets={assets}
            activeVideoId={activeVideoId}
            setActiveVideoId={setActiveVideoId}
            fileInputRef={fileInputRef}
            captions={captions}
            currentCaption={currentCaption}
            scriptMode={scriptMode}
            setScriptMode={setScriptMode}
            setCurrentTime={seek}
            updateCurrentCaption={updateCurrentCaption}
            addAssetToTimeline={addAssetToTimeline}
            addTextClip={addTextClip}
            selectedTimelineClip={selectedTimelineClip}
            applyTransition={applyTransition}
            applyEffect={applyEffect}
            applyTemplate={applyTemplate}
            openScriptGenerator={() => setScriptOpen(true)}
            voiceClip={voiceClip}
            updateVoiceClip={updateVoiceClip}
            selectVoiceTrack={() => { setSelectedClipId('clip-voice'); seek(0); }}
            notify={notify}
          />
          <input ref={fileInputRef} className="hidden-input" type="file" multiple accept="video/*,image/*,audio/*" onChange={onUpload} />
        </aside>

        <main className="workspace">
          <div className="workspace-bar">
            <div className="canvas-select"><MousePointer2 size={15} /> Outil sélection</div>
            <div className="canvas-actions">
              <button className="icon-button small" title="Découper" onClick={splitSelectedClip}><Scissors size={16} /></button>
              <button className="icon-button small" title="Ajuster le clip au cadre" disabled={!selectedTimelineClip || !['video', 'image'].includes(selectedTimelineClip.kind)} onClick={() => updateSelectedClip({ x: 0, y: 0, scale: 1, rotation: 0, cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0 })}><SlidersHorizontal size={16} /></button>
              <span className="zoom-label">Ajuster</span>
              <button className="icon-button small" title="Plein écran" onClick={toggleFullscreen}><Maximize2 size={16} /></button>
            </div>
          </div>

          <div className="stage-area" ref={stageRef}>
            <div className="stage-shadow">
              <div className={`video-canvas preset-${captionStyle.preset}`} style={captionCss}>
                {activeVisualClips.length ? activeVisualClips.map(({ clip, trackIndex }, index) => (
                  <VisualClipLayer
                    key={clip.id}
                    clip={clip}
                    asset={assets.find((asset) => asset.id === clip.assetId)}
                    currentTime={currentTime}
                    playing={playing}
                    selected={clip.id === selectedClipId}
                    zIndex={trackIndex * 10 + index}
                    onSelect={() => setSelectedClipId(clip.id)}
                  />
                )) : <div className="empty-canvas"><ImagePlus size={24} /><span>Aucun clip à cet instant</span></div>}
                {activeAudioClips.map((clip) => {
                  const asset = assets.find((item) => item.id === clip.assetId);
                  return asset?.url ? <AudioClipLayer key={clip.id} clip={clip} asset={asset} currentTime={currentTime} playing={playing} volume={volume} /> : null;
                })}
                {activeTextClips.map((clip) => <TextClipLayer key={clip.id} clip={clip} currentTime={currentTime} selected={clip.id === selectedClipId} onSelect={() => setSelectedClipId(clip.id)} />)}
                <div className="safe-zone" />
                {captionsVisible && <div
                  dir={scriptMode === 'arabic' ? 'rtl' : 'ltr'}
                  className={`caption-on-canvas animation-${captionStyle.animation ?? 'pop'} ${captionStyle.shadow ? 'with-shadow' : ''} ${captionStyle.uppercase ? 'is-uppercase' : ''}`}
                >
                  <span>{currentCaption.words?.length ? currentCaption.words.map((word, index) => <b key={`${word.start}-${index}`} className={index === activeWordIndex ? 'active-word' : index < activeWordIndex ? 'spoken-word' : ''}>{word.word} </b>) : captionText}</span>
                  <i />
                </div>}
                <div className="canvas-tag"><Sparkles size={11} /> Auto captions</div>
              </div>
            </div>
          </div>

          <div className="playback-bar">
            <div className="playback-center">
              <button className="icon-button small" onClick={() => seek(0)} title="Début"><SkipBack size={17} /></button>
              <button className="play-button" onClick={togglePlayback} title={playing ? 'Pause' : 'Lecture'}>
                {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>
              <button className="icon-button small" onClick={() => seek(Math.min(TOTAL_DURATION, currentTime + 5))} title="Avancer"><SkipForward size={17} /></button>
            </div>
            <div className="timecode"><strong>{formatTime(currentTime, true)}</strong><span>/</span>{formatTime(TOTAL_DURATION, true)}</div>
            <div className="preview-volume">
              <Volume2 size={16} />
              <input aria-label="Volume" type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
            </div>
          </div>
        </main>

        <InspectorPanel
          clip={selectedTimelineClip}
          currentTime={currentTime}
          captionStyle={captionStyle}
          commitStyle={commitStyle}
          updateClip={updateSelectedClip}
          addKeyframes={addTransformKeyframes}
          clearKeyframes={clearTransformKeyframes}
          applyTransition={applyTransition}
        />

        <Timeline
          currentTime={currentTime}
          tracks={tracks}
          setTracks={setTracks}
          beginTimelineChange={beginTimelineChange}
          selectedClipId={selectedClipId}
          setSelectedClipId={setSelectedClipId}
          snapping={snapping}
          setSnapping={setSnapping}
          zoom={zoom}
          setZoom={setZoom}
          seek={seek}
          playing={playing}
          togglePlayback={togglePlayback}
          splitSelectedClip={splitSelectedClip}
          duplicateSelectedClip={duplicateSelectedClip}
          removeSelectedClip={removeSelectedClip}
          addVideoTrack={addVideoTrack}
          toggleTrackLock={toggleTrackLock}
          toggleTrackMute={toggleTrackMute}
          onDropAsset={dropAssetOnTimeline}
          undo={undo}
          redo={redo}
          canUndo={Boolean(timelinePast.length || pastStyles.length)}
          canRedo={Boolean(timelineFuture.length || futureStyles.length)}
        />
      </div>

      {scriptOpen && <ScriptDialog onClose={() => setScriptOpen(false)} onApply={applyGeneratedScript} />}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}

      {exportOpen && (
        <ExportDialog
          projectName={projectName}
          renderStatus={renderStatus}
          renderJob={renderJob}
          onClose={() => setExportOpen(false)}
          onRender={createRenderJob}
          onDownloadProject={downloadProject}
        />
      )}

      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  );
}

type AutoScriptResult = {
  script: string;
  scriptAr: string;
  captions: Caption[];
  engine: string;
};

type AutoProject = {
  version: number;
  projectName: string;
  tracks: TimelineTrack[];
  captions: Caption[];
  captionStyle: CaptionStyle;
  assets: MediaAsset[];
};

type CaptionGroupSize = 'auto' | number;

function regroupCaptions(captions: Caption[], groupSize: CaptionGroupSize): Caption[] {
  if (groupSize === 'auto') return captions.map((caption, index) => ({ ...caption, id: `caption-auto-${index}` }));
  const size = Math.max(1, Math.min(10, Math.round(groupSize)));
  const words = captions.flatMap((caption) => caption.words ?? []);
  if (!words.length) return captions;
  const result: Caption[] = [];
  for (let index = 0; index < words.length; index += size) {
    const group = words.slice(index, index + size);
    result.push({
      id: `caption-${size}-${index / size}`,
      start: group[0].start,
      end: group.at(-1)!.end,
      text: group.map((word) => word.word).join(' ').replace(/\s+([,.!?،؛])/g, '$1'),
      words: group,
    });
  }
  return result;
}

function createMontageScenes(captions: Caption[]): Caption[] {
  if (!captions.length) return [];
  const scenes: Caption[] = [];
  let group: Caption[] = [];
  const flush = () => {
    if (!group.length) return;
    const words = group.flatMap((caption) => caption.words ?? []);
    scenes.push({
      id: `montage-scene-${scenes.length}`,
      start: group[0].start,
      end: group.at(-1)!.end,
      text: group.map((caption) => caption.text).join(' '),
      words: words.length ? words : undefined,
    });
    group = [];
  };
  captions.forEach((caption, index) => {
    const previous = group.at(-1);
    if (previous && caption.start - previous.end > .9 && previous.end - group[0].start >= 2.2) flush();
    group.push(caption);
    const span = caption.end - group[0].start;
    const sentenceEnd = /[.!?،؛]$/.test(caption.text.trim());
    if ((span >= 3 && sentenceEnd) || span >= 5.2 || index === captions.length - 1) flush();
  });
  return scenes;
}

type AutoStyleDefinition = {
  id: string;
  group: 'darija' | 'arabic' | 'french';
  name: string;
  subtitle: string;
  sample: string;
  captionStyle: Partial<CaptionStyle>;
  effect: NonNullable<TimelineClip['effect']>;
  transitions: TransitionType[];
  previewBackground: string;
  previewColor: string;
};

const AUTO_STYLES: AutoStyleDefinition[] = [
  { id: 'dz-impact', group: 'darija', name: 'Impact DZ', subtitle: 'Bold · cuts rapides', sample: 'SAH!', captionStyle: { preset: 'impact', fontFamily: 'anton', fontSize: 56, textColor: '#ffffff', accentColor: '#ff6b35', animation: 'pop' }, effect: 'enhance', transitions: ['zoom', 'slide', 'flash'], previewBackground: 'linear-gradient(145deg,#f06b3e,#2c1b21)', previewColor: '#ffffff' },
  { id: 'dz-street', group: 'darija', name: 'Street Alger', subtitle: 'Urbain · énergique', sample: 'VRAI', captionStyle: { preset: 'box', fontFamily: 'archivo-black', fontSize: 53, textColor: '#111217', accentColor: '#a9ff45', backgroundColor: '#a9ff45', animation: 'pop' }, effect: 'grain', transitions: ['flash', 'slide'], previewBackground: 'linear-gradient(145deg,#1d1f22,#3d4442)', previewColor: '#a9ff45' },
  { id: 'dz-pop', group: 'darija', name: 'Darija Pop', subtitle: 'Coloré · réseaux', sample: 'WOW', captionStyle: { preset: 'neon', fontFamily: 'nunito', fontSize: 52, textColor: '#fff34e', accentColor: '#ff4f91', backgroundColor: '#3a1230', animation: 'pop' }, effect: 'glow', transitions: ['zoom', 'rotate'], previewBackground: 'radial-gradient(circle,#ff4f91,#49205f 68%)', previewColor: '#fff34e' },
  { id: 'dz-podcast', group: 'darija', name: 'Podcast DZ', subtitle: 'Lisible · conversation', sample: 'POD', captionStyle: { preset: 'minimal', fontFamily: 'inter', fontSize: 45, textColor: '#ffffff', accentColor: '#5bd6b4', animation: 'fade' }, effect: 'enhance', transitions: ['fade', 'slide'], previewBackground: 'linear-gradient(145deg,#16483c,#101917)', previewColor: '#ffffff' },
  { id: 'dz-cinema', group: 'darija', name: 'Cinéma DZ', subtitle: 'Dramatique · lent', sample: 'FILM', captionStyle: { preset: 'minimal', fontFamily: 'playfair-display', fontSize: 42, textColor: '#f4dfbd', accentColor: '#c99748', animation: 'fade', uppercase: false }, effect: 'grain', transitions: ['fade', 'zoom'], previewBackground: 'linear-gradient(145deg,#5b3b20,#12110f 72%)', previewColor: '#f4dfbd' },
  { id: 'dz-sale', group: 'darija', name: 'Promo Darija', subtitle: 'Vente · CTA', sample: '-50%', captionStyle: { preset: 'box', fontFamily: 'bebas-neue', fontSize: 57, textColor: '#ffffff', accentColor: '#f23535', backgroundColor: '#f23535', animation: 'pop' }, effect: 'enhance', transitions: ['flash', 'zoom'], previewBackground: 'linear-gradient(145deg,#f23535,#771919)', previewColor: '#ffffff' },
  { id: 'dz-neon', group: 'darija', name: 'Neon Casbah', subtitle: 'Glow · nuit', sample: 'NIGHT', captionStyle: { preset: 'neon', fontFamily: 'sora', fontSize: 51, textColor: '#3dffdc', accentColor: '#9a68ff', backgroundColor: '#19102d', animation: 'pop' }, effect: 'glow', transitions: ['rotate', 'zoom'], previewBackground: 'radial-gradient(circle,#6637a8,#100b1c 70%)', previewColor: '#3dffdc' },
  { id: 'dz-clean', group: 'darija', name: 'Darija Clean', subtitle: 'Simple · moderne', sample: 'BESSAH', captionStyle: { preset: 'minimal', fontFamily: 'montserrat', fontSize: 44, textColor: '#ffffff', accentColor: '#ffffff', animation: 'fade', uppercase: false }, effect: 'none', transitions: ['fade', 'slide'], previewBackground: 'linear-gradient(145deg,#4c5966,#171a1e)', previewColor: '#ffffff' },

  { id: 'ar-bold', group: 'arabic', name: 'عربي قوي', subtitle: 'واضح · متحرك', sample: 'قوي', captionStyle: { preset: 'box', fontFamily: 'cairo', fontSize: 59, textColor: '#15120b', accentColor: '#f6c64d', backgroundColor: '#f6c64d', uppercase: false, animation: 'pop' }, effect: 'enhance', transitions: ['zoom', 'flash'], previewBackground: 'linear-gradient(145deg,#ffd968,#9d6c17)', previewColor: '#15120b' },
  { id: 'ar-clean', group: 'arabic', name: 'عربي بسيط', subtitle: 'نظيف · أنيق', sample: 'بسيط', captionStyle: { preset: 'minimal', fontFamily: 'tajawal', fontSize: 49, textColor: '#ffffff', accentColor: '#48d6aa', uppercase: false, animation: 'fade' }, effect: 'enhance', transitions: ['fade', 'slide'], previewBackground: 'linear-gradient(145deg,#1b594b,#101917)', previewColor: '#ffffff' },
  { id: 'ar-gold', group: 'arabic', name: 'ذهب عربي', subtitle: 'فاخر · ذهبي', sample: 'ذهب', captionStyle: { preset: 'minimal', fontFamily: 'changa', fontSize: 52, textColor: '#ffe7a5', accentColor: '#d7a72f', uppercase: false, animation: 'fade' }, effect: 'glow', transitions: ['fade', 'zoom'], previewBackground: 'linear-gradient(145deg,#6d501b,#17130b)', previewColor: '#ffe7a5' },
  { id: 'ar-news', group: 'arabic', name: 'أخبار', subtitle: 'رسمي · مباشر', sample: 'خبر', captionStyle: { preset: 'box', fontFamily: 'almarai', fontSize: 48, textColor: '#ffffff', accentColor: '#c42431', backgroundColor: '#c42431', uppercase: false, animation: 'fade' }, effect: 'enhance', transitions: ['slide', 'fade'], previewBackground: 'linear-gradient(145deg,#1d4273,#0e1827)', previewColor: '#ffffff' },
  { id: 'ar-modern', group: 'arabic', name: 'عربي مودرن', subtitle: 'حديث · اجتماعي', sample: 'جديد', captionStyle: { preset: 'neon', fontFamily: 'noto-sans-arabic', fontSize: 50, textColor: '#ffffff', accentColor: '#5d8cff', uppercase: false, animation: 'pop' }, effect: 'glow', transitions: ['zoom', 'slide'], previewBackground: 'linear-gradient(145deg,#5d8cff,#482b84)', previewColor: '#ffffff' },
  { id: 'ar-story', group: 'arabic', name: 'حكاية', subtitle: 'قصة · هادئ', sample: 'حكاية', captionStyle: { preset: 'minimal', fontFamily: 'el-messiri', fontSize: 47, textColor: '#fff4df', accentColor: '#cb8d67', uppercase: false, animation: 'fade' }, effect: 'grain', transitions: ['fade', 'zoom'], previewBackground: 'linear-gradient(145deg,#744835,#211815)', previewColor: '#fff4df' },
  { id: 'ar-luxury', group: 'arabic', name: 'فخامة', subtitle: 'أسود · راقي', sample: 'راقي', captionStyle: { preset: 'box', fontFamily: 'noto-kufi-arabic', fontSize: 50, textColor: '#111111', accentColor: '#efe5cf', backgroundColor: '#efe5cf', uppercase: false, animation: 'fade' }, effect: 'glow', transitions: ['fade', 'rotate'], previewBackground: 'linear-gradient(145deg,#38332a,#0b0b0b)', previewColor: '#efe5cf' },
  { id: 'ar-social', group: 'arabic', name: 'ترند عربي', subtitle: 'سريع · ترند', sample: 'ترند', captionStyle: { preset: 'impact', fontFamily: 'alexandria', fontSize: 55, textColor: '#ffffff', accentColor: '#ff5a9d', uppercase: false, animation: 'pop' }, effect: 'enhance', transitions: ['flash', 'zoom', 'slide'], previewBackground: 'linear-gradient(145deg,#ff5a9d,#63266f)', previewColor: '#ffffff' },

  { id: 'fr-minimal', group: 'french', name: 'Minimal FR', subtitle: 'Propre · moderne', sample: 'Simple.', captionStyle: { preset: 'minimal', fontFamily: 'poppins', fontSize: 43, textColor: '#ffffff', accentColor: '#ffffff', uppercase: false, animation: 'fade' }, effect: 'enhance', transitions: ['fade', 'slide'], previewBackground: 'linear-gradient(145deg,#dcdcd8,#6a6e72)', previewColor: '#17181b' },
  { id: 'fr-editorial', group: 'french', name: 'Éditorial', subtitle: 'Premium · élégant', sample: 'ÉDITO', captionStyle: { preset: 'box', fontFamily: 'raleway', fontSize: 46, textColor: '#141519', accentColor: '#f0eee8', backgroundColor: '#f0eee8', uppercase: false, animation: 'pop' }, effect: 'grain', transitions: ['fade', 'zoom'], previewBackground: 'linear-gradient(145deg,#5b5248,#171513)', previewColor: '#f0eee8' },
  { id: 'fr-bold', group: 'french', name: 'French Bold', subtitle: 'Puissant · publicité', sample: 'GRAND', captionStyle: { preset: 'impact', fontFamily: 'barlow-condensed', fontSize: 56, textColor: '#ffffff', accentColor: '#ff3c35', animation: 'pop' }, effect: 'enhance', transitions: ['flash', 'slide'], previewBackground: 'linear-gradient(145deg,#ff3c35,#4a1520)', previewColor: '#ffffff' },
  { id: 'fr-cinema', group: 'french', name: 'Cinéma FR', subtitle: 'Film · émotion', sample: 'HISTOIRE', captionStyle: { preset: 'minimal', fontFamily: 'playfair-display', fontSize: 41, textColor: '#f5e8d1', accentColor: '#c79960', uppercase: false, animation: 'fade' }, effect: 'grain', transitions: ['fade', 'zoom'], previewBackground: 'linear-gradient(145deg,#79502f,#15120f)', previewColor: '#f5e8d1' },
  { id: 'fr-podcast', group: 'french', name: 'Podcast FR', subtitle: 'Interview · lisible', sample: 'PAROLE', captionStyle: { preset: 'box', fontFamily: 'libre-franklin', fontSize: 45, textColor: '#ffffff', accentColor: '#6b5cff', backgroundColor: '#6b5cff', uppercase: false, animation: 'pop' }, effect: 'enhance', transitions: ['slide', 'fade'], previewBackground: 'linear-gradient(145deg,#5447cc,#1b183b)', previewColor: '#ffffff' },
  { id: 'fr-luxury', group: 'french', name: 'Luxe Français', subtitle: 'Chic · premium', sample: 'LUXE', captionStyle: { preset: 'minimal', fontFamily: 'montserrat', fontSize: 46, textColor: '#e9d3a1', accentColor: '#b98c3b', uppercase: true, animation: 'fade' }, effect: 'glow', transitions: ['fade', 'rotate'], previewBackground: 'linear-gradient(145deg,#312c25,#0b0b0a)', previewColor: '#e9d3a1' },
  { id: 'fr-social', group: 'french', name: 'Social Pop', subtitle: 'Reels · dynamique', sample: 'VIRAL', captionStyle: { preset: 'neon', fontFamily: 'oswald', fontSize: 51, textColor: '#edff47', accentColor: '#ff4f91', animation: 'pop' }, effect: 'glow', transitions: ['zoom', 'flash'], previewBackground: 'radial-gradient(circle,#f04891,#382061 68%)', previewColor: '#edff47' },
  { id: 'fr-corporate', group: 'french', name: 'Corporate', subtitle: 'Entreprise · sérieux', sample: 'PRO', captionStyle: { preset: 'minimal', fontFamily: 'roboto-slab', fontSize: 42, textColor: '#ffffff', accentColor: '#4ca3ff', uppercase: false, animation: 'fade' }, effect: 'enhance', transitions: ['fade', 'slide'], previewBackground: 'linear-gradient(145deg,#315f91,#101a25)', previewColor: '#ffffff' },
];

function AutoStudio({ onOpenAdvanced }: { onOpenAdvanced: () => void }) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<'energetic' | 'educational' | 'sales' | 'story'>('energetic');
  const [duration, setDuration] = useState(30);
  const [alphabet, setAlphabet] = useState<'latin' | 'arabic' | 'french'>('latin');
  const [script, setScript] = useState<AutoScriptResult | null>(null);
  const [manualScript, setManualScript] = useState('');
  const [scriptSource, setScriptSource] = useState<'voice' | 'paste' | 'generate'>('voice');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<'auto' | 'ar' | 'fr'>('auto');
  const [alignmentMode, setAlignmentMode] = useState<'exact_api_timestamps' | 'ai_transcribed_timestamps' | 'estimated_local' | null>(null);
  const [apiWordTimings, setApiWordTimings] = useState<WordTiming[]>([]);
  const [visualAssets, setVisualAssets] = useState<MediaAsset[]>([]);
  const [voiceAsset, setVoiceAsset] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [template, setTemplate] = useState('dz-impact');
  const [captionFont, setCaptionFont] = useState<CaptionFontId>('anton');
  const [captionGroupSize, setCaptionGroupSize] = useState<CaptionGroupSize>(2);
  const [captionFontSize, setCaptionFontSize] = useState(36);
  const [captionPosition, setCaptionPosition] = useState(78);
  const [captionUppercase, setCaptionUppercase] = useState(false);
  const [styleLanguage, setStyleLanguage] = useState<'all' | 'arabic' | 'french' | 'darija'>('all');
  const [fontLanguage, setFontLanguage] = useState<'all' | 'arabic' | 'latin'>('all');
  const [project, setProject] = useState<AutoProject | null>(null);
  const [scenePlan, setScenePlan] = useState<Array<{ sceneId: string; assetId: string; sourceStart: number; transition: TransitionType; semanticScore: number; reason: string }>>([]);
  const [assembling, setAssembling] = useState(false);
  const [assemblyProgress, setAssemblyProgress] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [message, setMessage] = useState('');
  const visualInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const timestampsInputRef = useRef<HTMLInputElement>(null);

  const uploadOne = async (file: File, index: number): Promise<MediaAsset> => {
    const kind: MediaAsset['kind'] = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
    const localUrl = URL.createObjectURL(file);
    const id = `auto-${Date.now()}-${index}`;
    const durationValue = await probeMediaDuration(file, localUrl);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/assets', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload impossible');
      URL.revokeObjectURL(localUrl);
      return { id, name: file.name, kind, url: data.url, storageId: data.storageId, duration: durationValue, color: PALETTE[index % PALETTE.length] };
    } catch {
      return { id, name: file.name, kind, url: localUrl, duration: durationValue, color: PALETTE[index % PALETTE.length] };
    }
  };

  const addVisualFiles = async (files: File[]) => {
    const compatible = files.filter((file) => file.type.startsWith('video') || file.type.startsWith('image'));
    if (!compatible.length) { setMessage('Ajoute au moins une vidéo ou une image.'); return; }
    setUploading(true);
    setMessage('Import des médias…');
    const uploaded = await Promise.all(compatible.map((file, index) => uploadOne(file, visualAssets.length + index)));
    setVisualAssets((items) => [...items, ...uploaded]);
    setUploading(false);
    setMessage(`${uploaded.length} média${uploaded.length > 1 ? 's' : ''} prêt${uploaded.length > 1 ? 's' : ''}.`);
  };

  const addVoiceFile = async (file?: File) => {
    if (!file || !file.type.startsWith('audio')) { setMessage('Choisis un fichier audio compatible.'); return; }
    setUploading(true);
    setMessage('Import de la voix off…');
    const uploaded = await uploadOne(file, 5);
    setVoiceAsset(uploaded);
    setScript(null);
    setManualScript('');
    setAlignmentMode(null);
    if (uploaded.duration) setDuration(Number(Math.min(600, uploaded.duration).toFixed(2)));
    setUploading(false);
    setMessage('Voix off prête. Génération automatique du script…');
    await transcribeVoice(uploaded);
  };

  const loadWordTimestamps = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const words = Array.isArray(parsed) ? parsed : Array.isArray(parsed.words) ? parsed.words : Array.isArray(parsed.timestamps) ? parsed.timestamps : [];
      if (!words.length) throw new Error('Aucun timestamp trouvé');
      setApiWordTimings(words);
      setMessage(`${words.length} timestamps mot par mot chargés depuis l’API voix.`);
    } catch {
      setApiWordTimings([]);
      setMessage('JSON invalide. Format attendu : [{ word, start, end }].');
    }
  };

  const transcribeVoice = async (asset: MediaAsset | null = voiceAsset) => {
    if (!asset?.storageId) { setMessage('La voix doit finir son upload serveur avant la transcription.'); return; }
    setTranscribing(true);
    setScriptSource('voice');
    setMessage('Whisper écoute la voix et génère les captions mot par mot… Le premier lancement peut télécharger le modèle local.');
    try {
      const response = await fetch('/api/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storageId: asset.storageId, duration: asset.duration ?? duration, language: transcriptionLanguage }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Transcription impossible');
      setScript({ script: data.script, scriptAr: data.scriptAr ?? data.script, captions: data.captions, engine: data.engine });
      setManualScript(data.script);
      setAlignmentMode('ai_transcribed_timestamps');
      if (data.language === 'ar') setAlphabet('arabic');
      if (data.language === 'fr') setAlphabet('french');
      setMessage(`${data.wordCount} mots et ${data.captions.length} captions générés directement depuis la voix.`);
    } catch (error) {
      setScript(null);
      setAlignmentMode(null);
      setMessage(error instanceof Error ? error.message : 'Transcription impossible');
    } finally {
      setTranscribing(false);
    }
  };

  const alignText = async (text: string, latinText = text, arabicText = text) => {
    const response = await fetch('/api/align', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script: text, duration: voiceAsset?.duration ?? duration, wordTimestamps: apiWordTimings }) });
    const alignment = await response.json();
    if (!response.ok) throw new Error(alignment.error || 'Synchronisation impossible');
    setAlignmentMode(alignment.mode);
    setScript({ script: latinText, scriptAr: arabicText, captions: alignment.captions, engine: alignment.mode });
    setManualScript(text);
    setMessage(alignment.mode === 'exact_api_timestamps' ? `${alignment.wordCount} mots synchronisés exactement avec la voix.` : `${alignment.wordCount} mots alignés en mode estimé. Importe les timestamps API pour le mode exact.`);
  };

  const synchronizeManualScript = async () => {
    if (!voiceAsset || manualScript.trim().length < 2) return;
    setScriptLoading(true);
    try { await alignText(manualScript.trim()); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Synchronisation impossible'); }
    finally { setScriptLoading(false); }
  };

  const generateScript = async () => {
    if (!voiceAsset || topic.trim().length < 3) return;
    setScriptLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, tone, duration: voiceAsset.duration ?? duration }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Génération impossible');
      const selectedText = alphabet === 'arabic' ? data.scriptAr : data.script;
      await alignText(selectedText, data.script, data.scriptAr);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Génération impossible');
    } finally {
      setScriptLoading(false);
    }
  };

  const buildProject = (planning = scenePlan) => {
    if (!script || !visualAssets.length) return null;
    const projectDuration = duration;
    const selectedStyle = AUTO_STYLES.find((style) => style.id === template) ?? AUTO_STYLES[0];
    const resolvedCaptionStyle: CaptionStyle = { ...INITIAL_STYLE, ...selectedStyle.captionStyle, fontFamily: captionFont, fontSize: captionFontSize, position: captionPosition, uppercase: captionUppercase };
    const outputCaptions = regroupCaptions(script.captions, captionGroupSize).map((caption) => ({ ...caption, text: alphabet === 'arabic' ? caption.textAr ?? caption.text : caption.text }));
    const montageScenes = createMontageScenes(script.captions);
    const planByScene = new Map(planning.map((scene) => [scene.sceneId, scene]));
    const visualClips: TimelineClip[] = montageScenes.map((scene, index) => {
      const planned = planByScene.get(scene.id);
      const asset = visualAssets.find((item) => item.id === planned?.assetId) ?? visualAssets[index % visualAssets.length];
      return {
        id: `auto-visual-${index}`,
        trackId: 'video-main',
        assetId: asset.id,
        kind: asset.kind,
        name: asset.name,
        start: scene.start,
        duration: Math.max(.2, scene.end - scene.start),
        sourceStart: planned?.sourceStart ?? 0,
        color: asset.color,
        x: 0, y: 0, scale: 1, rotation: 0, opacity: 1,
        transitionIn: selectedStyle.transitions[index % selectedStyle.transitions.length] ?? planned?.transition ?? 'fade',
        transitionDuration: .32,
        effect: selectedStyle.effect,
      };
    });
    const tracks: TimelineTrack[] = [
      { id: 'video-main', name: 'Montage automatique', kind: 'video', locked: false, muted: false, clips: visualClips },
      { id: 'captions', name: 'Captions Darija', kind: 'caption', locked: false, muted: false, clips: outputCaptions.map((caption) => ({ id: `timeline-${caption.id}`, trackId: 'captions', kind: 'caption', name: caption.text, text: caption.text, start: caption.start, duration: caption.end - caption.start, sourceStart: 0, color: '#6658b8' })) },
    ];
    if (voiceAsset) tracks.push({ id: 'voice', name: 'Voix off', kind: 'audio', locked: false, muted: false, clips: [{ id: 'clip-voice', trackId: 'voice', assetId: voiceAsset.id, kind: 'audio', name: voiceAsset.name, start: 0, duration: Math.min(projectDuration, voiceAsset.duration ?? projectDuration), sourceStart: 0, color: '#23896d', volume: 1, noiseReduction: true }] });
    return { version: 2, projectName: (topic.trim() || manualScript.split(/\s+/).slice(0, 7).join(' ') || 'Montage Darija').slice(0, 60), tracks, captions: outputCaptions, captionStyle: resolvedCaptionStyle, assets: [...visualAssets, ...(voiceAsset ? [voiceAsset] : [])] } satisfies AutoProject;
  };

  const assembleProject = async () => {
    if (!script || !visualAssets.length || !voiceAsset) return;
    setAssembling(true);
    setAssemblyProgress(18);
    setMessage('Analyse du script et des médias…');
    try {
      const montageScenes = createMontageScenes(script.captions);
      const response = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tone, captions: montageScenes, assets: visualAssets.map(({ id, name, kind, duration: assetDuration, description }) => ({ id, name, kind, duration: assetDuration, description })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Planification impossible');
      const planning = data.scenes as Array<{ sceneId: string; assetId: string; sourceStart: number; transition: TransitionType; semanticScore: number; reason: string }>;
      setScenePlan(planning);
      setAssemblyProgress(58);
      const nextProject = buildProject(planning);
      if (!nextProject) throw new Error('Projet incomplet');
      window.localStorage.setItem('darja-studio-project-v2', JSON.stringify(nextProject));
      setAssemblyProgress(86);
      setProject(nextProject);
      setAssemblyProgress(100);
      setMessage(`${planning.length} scènes montées : plans choisis, captions synchronisées et transitions appliquées.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Montage automatique impossible');
    } finally {
      setAssembling(false);
    }
  };

  const exportProject = async () => {
    const readyProject = project ?? buildProject();
    if (!readyProject) return;
    setRendering(true);
    setMessage('Rendu MP4 en cours…');
    try {
      const response = await fetch('/api/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectName: readyProject.projectName, duration, format: '1080x1920', fps: 30, quality: 'high', tracks: readyProject.tracks, captions: readyProject.captions, captionStyle: readyProject.captionStyle, assets: readyProject.assets.map(({ id, name, kind, duration: assetDuration, storageId }) => ({ id, name, kind, duration: assetDuration, storageId })) }) });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${readyProject.projectName.toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'darja-video'}.mp4`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMessage('Vidéo exportée avec succès.');
    } catch {
      setMessage('Le rendu a échoué. Vérifie que les médias ont fini leur upload.');
    } finally {
      setRendering(false);
    }
  };

  const steps = [
    { id: 1, label: 'Voix off', hint: 'Audio → captions', icon: Mic2, done: Boolean(voiceAsset && script) },
    { id: 2, label: 'Script & sync', hint: 'Chaque mot', icon: FileText, done: Boolean(script) },
    { id: 3, label: 'Vidéos', hint: 'Plans à choisir', icon: Clapperboard, done: visualAssets.length > 0 },
    { id: 4, label: 'Style & montage', hint: 'IA automatique', icon: Palette, done: Boolean(project) },
  ];
  const firstVisual = visualAssets[0];
  const selectedAutoStyle = AUTO_STYLES.find((style) => style.id === template) ?? AUTO_STYLES[0];
  const formattedCaptions = script ? regroupCaptions(script.captions, captionGroupSize) : [];
  const captionPreviewText = formattedCaptions[0]?.text ?? 'CAPTION';

  return (
    <div className="auto-app">
      <header className="auto-header">
        <div className="auto-brand"><div className="brand-mark"><span>D</span></div><span><strong>DARJA</strong><small>STUDIO</small></span></div>
        <div className="auto-mode-pill"><Sparkles size={13} /> Montage automatique</div>
        <button className="advanced-link" onClick={onOpenAdvanced}><SlidersHorizontal size={15} /> Éditeur avancé</button>
      </header>

      <main className="auto-main">
        <section className="auto-intro"><span className="auto-kicker"><Rocket size={13} /> Voice-first · captions mot par mot</span><h1>Men la voix l vidéo.<br/><em>Kolchi synchronisé.</em></h1><p>Ajoute seulement ta voix off : Whisper génère le script et les captions mot par mot, puis le moteur choisit les bons plans et termine le montage.</p></section>

        <nav className="auto-steps" aria-label="Étapes de création">
          {steps.map(({ id, label, hint, icon: Icon, done }, index) => <button key={id} className={`${step === id ? 'active' : ''} ${done ? 'done' : ''}`} onClick={() => setStep(id)}><i>{done ? <Check size={15} /> : <Icon size={16} />}</i><span><strong>{label}</strong><small>{hint}</small></span>{index < steps.length - 1 && <ChevronStep />}</button>)}
        </nav>

        <section className="auto-workspace">
          <div className="auto-panel">
            {step === 1 && <div className="auto-step-content voice-first-step">
              <div className="auto-section-title"><span>01</span><div><h2>Importe la voix, le script se génère</h2><p>Whisper écoute l’audio et crée automatiquement le texte, les captions et les timestamps mot par mot.</p></div></div>
              {!voiceAsset ? <button className="auto-upload-zone voice-zone" onClick={() => voiceInputRef.current?.click()}><i><Mic2 size={25}/></i><strong>Importer la voix off</strong><span>MP3, WAV, M4A ou AAC</span></button> : <div className="voice-ready"><i><Volume2 size={22}/></i><div><strong>{voiceAsset.name}</strong><span>{voiceAsset.duration ? `${voiceAsset.duration.toFixed(2)} secondes détectées` : 'Audio prêt'}</span></div><audio controls src={voiceAsset.url}/><button onClick={() => { setVoiceAsset(null); setScript(null); setAlignmentMode(null); }}><Trash2 size={15}/></button></div>}
              <input ref={voiceInputRef} type="file" hidden accept="audio/*" onChange={(event) => { void addVoiceFile(event.target.files?.[0]); event.target.value = ''; }}/>
              {voiceAsset && <div className={`voice-transcription-card ${script ? 'ready' : ''}`}><div><i>{transcribing ? <RotateCcw className="spin" size={18}/> : script ? <CheckCircle2 size={18}/> : <Sparkles size={18}/>}</i><span><strong>{transcribing ? 'Génération du script en cours…' : script ? 'Script et captions générés' : 'Générer depuis cette voix'}</strong><small>{transcribing ? 'Analyse locale Whisper · attends la fin du traitement' : script ? `${script.captions.reduce((sum, caption) => sum + (caption.words?.length ?? 0), 0)} mots · ${script.captions.length} captions synchronisées` : 'Transcription Darija, arabe ou français'}</small></span></div><label>Langue<select value={transcriptionLanguage} disabled={transcribing} onChange={(event) => setTranscriptionLanguage(event.target.value as typeof transcriptionLanguage)}><option value="auto">Détection automatique</option><option value="ar">Darija / Arabe</option><option value="fr">Français</option></select></label><button disabled={transcribing || uploading} onClick={() => void transcribeVoice()}>{transcribing ? 'Transcription…' : script ? 'Retranscrire' : 'Transcrire la voix'}</button></div>}
              {voiceAsset && <details className="timestamps-optional"><summary>Option avancée : importer le script/timestamps de ta plateforme</summary><div className="timestamps-card"><div><i><Sparkles size={17}/></i><span><strong>Timestamps API disponibles ?</strong><small>Ils restent prioritaires pour une synchronisation authoritative.</small></span></div><button onClick={() => timestampsInputRef.current?.click()}>{apiWordTimings.length ? <><Check size={14}/> {apiWordTimings.length} mots chargés</> : <><UploadCloud size={14}/> Importer JSON</>}</button><input ref={timestampsInputRef} type="file" hidden accept=".json,application/json" onChange={(event) => { void loadWordTimestamps(event.target.files?.[0]); event.target.value = ''; }}/></div></details>}
              <div className="alignment-explainer"><span className={alignmentMode === 'exact_api_timestamps' ? 'exact' : script ? 'ai' : ''}>{alignmentMode === 'exact_api_timestamps' ? 'Timestamps exacts API' : alignmentMode === 'ai_transcribed_timestamps' ? 'Captions générées par Whisper' : transcribing ? 'Whisper travaille…' : 'En attente de la voix'}</span><p>{alignmentMode === 'ai_transcribed_timestamps' ? 'Le texte et le minutage ont été détectés directement dans l’audio. Vérifie-les à l’étape suivante avant le montage.' : 'Après l’upload, la transcription démarre automatiquement. Tu peux aussi la relancer avec une langue imposée.'}</p></div>
              <div className="auto-step-actions"><button className="auto-primary compact" disabled={!script || transcribing || uploading} onClick={() => setStep(2)}>Vérifier les captions <ArrowRight size={15}/></button></div>
            </div>}

            {step === 2 && <div className="auto-step-content script-sync-step">
              <div className="auto-section-title"><span>02</span><div><h2>Vérifie le script généré depuis la voix</h2><p>Les captions viennent déjà de l’audio. Corrige seulement un mot si Whisper s’est trompé.</p></div></div>
              <div className="script-source-switch three"><button className={scriptSource === 'voice' ? 'active' : ''} onClick={() => setScriptSource('voice')}><Mic2 size={14}/> Depuis la voix</button><button className={scriptSource === 'paste' ? 'active' : ''} onClick={() => setScriptSource('paste')}><FileText size={14}/> Importer texte</button><button className={scriptSource === 'generate' ? 'active' : ''} onClick={() => setScriptSource('generate')}><Sparkles size={14}/> Écrire autre script</button></div>
              {scriptSource !== 'generate' ? <>
                {scriptSource === 'voice' && <div className="caption-origin"><Mic2 size={16}/><span><strong>Transcrit depuis {voiceAsset?.name}</strong><small>Le texte ci-dessous a été entendu dans la voix, il n’a pas été inventé.</small></span><button disabled={transcribing} onClick={() => void transcribeVoice()}>{transcribing ? 'Écoute…' : 'Relancer'}</button></div>}
                <label className="auto-topic script-paste"><textarea value={manualScript} onChange={(event) => { setManualScript(event.target.value); setScript(null); setAlignmentMode(null); }} placeholder={scriptSource === 'voice' ? 'Le script entendu dans la voix apparaîtra ici…' : 'Colle ici exactement le script utilisé pour générer la voix off…'} maxLength={12000}/><small>{manualScript.trim().split(/\s+/).filter(Boolean).length} mots</small></label>
                <div className="auto-options sync-options"><label>Écriture<select value={alphabet} onChange={(event) => setAlphabet(event.target.value as typeof alphabet)}><option value="latin">Darija latin</option><option value="arabic">Arabe / العربية</option><option value="french">Français</option></select></label><label>Durée détectée<div className="detected-duration">{(voiceAsset?.duration ?? duration).toFixed(2)} secondes</div></label></div>
                <button className="auto-primary" onClick={synchronizeManualScript} disabled={scriptLoading || transcribing || !voiceAsset || manualScript.trim().length < 2}>{scriptLoading ? <><RotateCcw className="spin" size={17}/> Mise à jour…</> : <><Sparkles size={17}/> {scriptSource === 'voice' ? 'Mettre à jour les captions' : 'Synchroniser le texte importé'}</>}</button>
              </> : <>
                <label className="auto-topic"><textarea value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Exemple : présenter ma nouvelle application de livraison…" maxLength={120}/><small>{topic.length}/120</small></label>
                <div className="auto-options"><label>Ton<select value={tone} onChange={(event) => setTone(event.target.value as typeof tone)}><option value="energetic">Énergique</option><option value="educational">Éducatif</option><option value="sales">Commercial</option><option value="story">Storytelling</option></select></label><label>Durée<div className="detected-duration">{(voiceAsset?.duration ?? duration).toFixed(2)}s</div></label><label>Écriture<select value={alphabet} onChange={(event) => setAlphabet(event.target.value as typeof alphabet)}><option value="latin">Darija latin</option><option value="arabic">دارجة عربية</option></select></label></div>
                <button className="auto-primary" onClick={generateScript} disabled={scriptLoading || !voiceAsset || topic.trim().length < 3}>{scriptLoading ? <><RotateCcw className="spin" size={17}/> Génération + sync…</> : <><Sparkles size={17}/> Générer et synchroniser</>}</button>
              </>}
              {script && <div className="caption-format-card"><div className="caption-format-title"><div><Type size={16}/><span><strong>Affichage des captions</strong><small>Le rythme des captions ne change pas le rythme des plans vidéo.</small></span></div><b>{formattedCaptions.length} captions</b></div><div className="caption-control-row"><label>Mots affichés</label><div className="caption-word-buttons">{([1, 2, 3] as const).map((count) => <button key={count} className={captionGroupSize === count ? 'active' : ''} onClick={() => { setCaptionGroupSize(count); setProject(null); }}>{count} mot{count > 1 ? 's' : ''}</button>)}<button className={captionGroupSize === 'auto' ? 'active' : ''} onClick={() => { setCaptionGroupSize('auto'); setProject(null); }}>Auto</button><label className={typeof captionGroupSize === 'number' && captionGroupSize > 3 ? 'active' : ''}>Perso <input type="number" min="1" max="10" value={typeof captionGroupSize === 'number' ? captionGroupSize : 4} onChange={(event) => { setCaptionGroupSize(Math.max(1, Math.min(10, Number(event.target.value) || 1))); setProject(null); }}/></label></div></div><div className="caption-control-row"><label>Taille <b>{captionFontSize}px</b></label><div className="caption-size-controls"><button className={captionFontSize === 28 ? 'active' : ''} onClick={() => { setCaptionFontSize(28); setProject(null); }}>Petite</button><button className={captionFontSize === 36 ? 'active' : ''} onClick={() => { setCaptionFontSize(36); setProject(null); }}>Normale</button><button className={captionFontSize === 48 ? 'active' : ''} onClick={() => { setCaptionFontSize(48); setProject(null); }}>Grande</button><input type="range" min="20" max="72" value={captionFontSize} onChange={(event) => { setCaptionFontSize(Number(event.target.value)); setProject(null); }}/></div></div><div className="caption-control-row compact"><label>Position <b>{captionPosition}%</b></label><input type="range" min="20" max="90" value={captionPosition} onChange={(event) => { setCaptionPosition(Number(event.target.value)); setProject(null); }}/><button className={`caption-case-toggle ${captionUppercase ? 'active' : ''}`} onClick={() => { setCaptionUppercase((value) => !value); setProject(null); }}>AA</button></div><div className="caption-live-sample" dir={alphabet === 'arabic' ? 'rtl' : 'ltr'} style={{ fontFamily: `${getCaptionFont(captionFont).family}, sans-serif`, fontSize: `${Math.max(13, captionFontSize * .45)}px` }}>{captionUppercase ? captionPreviewText.toUpperCase() : captionPreviewText}</div></div>}
              {script && <div className={`auto-script-result word-sync-result ${alignmentMode === 'exact_api_timestamps' ? 'exact' : ''}`} dir={alphabet === 'arabic' ? 'rtl' : 'ltr'}><div><span><CheckCircle2 size={15}/> {alignmentMode === 'exact_api_timestamps' ? 'Timestamps exacts API' : alignmentMode === 'ai_transcribed_timestamps' ? 'Captions générées depuis la voix' : 'Synchronisation estimée'}</span><small>{script.captions.reduce((sum, caption) => sum + (caption.words?.length ?? 0), 0)} mots · {formattedCaptions.length} captions</small></div><div className="word-timing-preview">{script.captions.flatMap((caption) => caption.words ?? []).slice(0, 18).map((word, index) => <span key={`${word.start}-${index}`}><b>{word.word}</b><small>{word.start.toFixed(2)}s</small></span>)}</div><button onClick={() => setStep(3)}>Ajouter les vidéos <ArrowRight size={15}/></button></div>}
              <div className="auto-step-actions"><button className="auto-secondary" onClick={() => setStep(1)}><ArrowLeft size={15}/> Retour à la voix</button></div>
            </div>}

            {step === 3 && <div className="auto-step-content">
              <div className="auto-section-title"><span>03</span><div><h2>Ajoute les plans disponibles</h2><p>Décris chaque plan en quelques mots : le moteur choisira celui qui correspond au script.</p></div></div>
              <div className={`auto-upload-zone media-zone ${dropActive ? 'active' : ''}`} onClick={() => visualInputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDropActive(true); }} onDragLeave={() => setDropActive(false)} onDrop={(event) => { event.preventDefault(); setDropActive(false); void addVisualFiles(Array.from(event.dataTransfer.files)); }}><i><UploadCloud size={27}/></i><strong>{uploading ? 'Import en cours…' : 'Glisse tes vidéos et images ici'}</strong><span>ou clique pour parcourir · jusqu’à 500 Mo par fichier</span></div>
              <input ref={visualInputRef} type="file" hidden multiple accept="video/*,image/*" onChange={(event) => { void addVisualFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }}/>
              {visualAssets.length > 0 && <div className="auto-media-list">{visualAssets.map((asset, index) => <div key={asset.id}><div>{asset.kind === 'image' && asset.url ? <img src={asset.url} alt=""/> : asset.kind === 'video' && asset.url ? <video src={asset.url} muted preload="metadata"/> : <Clapperboard size={18}/>}<span>{index + 1}</span></div><p>{asset.name}</p><input value={asset.description ?? ''} onChange={(event) => setVisualAssets((items) => items.map((item) => item.id === asset.id ? { ...item, description: event.target.value } : item))} placeholder="Décris ce plan…"/><button onClick={() => setVisualAssets((items) => items.filter((item) => item.id !== asset.id))}><X size={13}/></button></div>)}</div>}
              <div className="auto-step-actions"><button className="auto-secondary" onClick={() => setStep(2)}><ArrowLeft size={15}/> Retour</button><button className="auto-primary compact" disabled={!visualAssets.length || uploading} onClick={() => setStep(4)}>Choisir le style <ArrowRight size={15}/></button></div>
            </div>}

            {step === 4 && <div className="auto-step-content style-step">
              <div className="auto-section-title"><span>04</span><div><h2>Style et montage intelligent</h2><p>Le moteur associe chaque scène du script au plan le plus pertinent.</p></div></div>
              <div className="style-language-filter"><button className={styleLanguage === 'all' ? 'active' : ''} onClick={() => setStyleLanguage('all')}>Tous</button><button className={styleLanguage === 'arabic' ? 'active' : ''} onClick={() => setStyleLanguage('arabic')}>Arabe</button><button className={styleLanguage === 'french' ? 'active' : ''} onClick={() => setStyleLanguage('french')}>Français</button><button className={styleLanguage === 'darija' ? 'active' : ''} onClick={() => setStyleLanguage('darija')}>Darija</button></div>
              <div className="style-count"><strong>{AUTO_STYLES.filter((style) => styleLanguage === 'all' || style.group === styleLanguage).length} styles</strong><span>Chaque style change captions, couleurs, effets et transitions.</span></div>
              <div className="auto-template-grid expanded style-library">
                {AUTO_STYLES.filter((style) => styleLanguage === 'all' || style.group === styleLanguage).map((style) => <button key={style.id} className={`auto-style-card ${template === style.id ? 'active' : ''}`} onClick={() => { setTemplate(style.id); setCaptionFont(getCaptionFont(style.captionStyle.fontFamily).id); setProject(null); }}><div dir={style.group === 'arabic' ? 'rtl' : 'ltr'} style={{ background: style.previewBackground, color: style.previewColor }}><strong>{style.sample}</strong><span>{style.name}</span></div><small>{style.subtitle}</small>{template === style.id && <i><Check size={12}/></i>}</button>)}
              </div>
              <div className="font-library-head"><div><Type size={15}/><span><strong>Police des captions</strong><small>Indépendante du thème · {CAPTION_FONTS.length} fonts self-hosted</small></span></div><div className="font-language-filter"><button className={fontLanguage === 'all' ? 'active' : ''} onClick={() => setFontLanguage('all')}>Toutes</button><button className={fontLanguage === 'arabic' ? 'active' : ''} onClick={() => setFontLanguage('arabic')}>Arabe</button><button className={fontLanguage === 'latin' ? 'active' : ''} onClick={() => setFontLanguage('latin')}>Latin/FR</button></div></div>
              <div className="caption-font-grid">{CAPTION_FONTS.filter((font) => fontLanguage === 'all' || font.group === fontLanguage).map((font) => <button key={font.id} className={captionFont === font.id ? 'active' : ''} onClick={() => { setCaptionFont(font.id); setProject(null); }}><b dir={font.group === 'arabic' ? 'rtl' : 'ltr'} style={{ fontFamily: `${font.family}, sans-serif`, fontWeight: font.weight }}>{font.sample}</b><span>{font.name}</span>{captionFont === font.id && <i><Check size={10}/></i>}</button>)}</div>
              <div className="auto-summary"><div><FileText size={16}/><span><strong>{script ? `${formattedCaptions.length} captions · ${createMontageScenes(script.captions).length} plans` : 'Script manquant'}</strong><small>{alignmentMode === 'exact_api_timestamps' ? 'Timing exact API' : alignmentMode === 'ai_transcribed_timestamps' ? 'Transcrit depuis la voix' : 'Timing estimé'}</small></span></div><div><Mic2 size={16}/><span><strong>{voiceAsset ? 'Voix synchronisée' : 'Voix manquante'}</strong><small>{voiceAsset?.name ?? 'Requis'}</small></span></div><div><Clapperboard size={16}/><span><strong>{visualAssets.length} médias</strong><small>Montage automatique</small></span></div></div>
              {!project ? <button className="auto-generate-video" onClick={assembleProject} disabled={!script || !voiceAsset || !visualAssets.length || assembling}>{assembling ? <><RotateCcw className="spin" size={18}/> Construction {assemblyProgress}%</> : <><Rocket size={18}/> Construire ma vidéo</>}</button> : <div className="auto-ready-actions"><div><CheckCircle2 size={21}/><span><strong>Ton montage est prêt</strong><small>Tu peux l’exporter directement ou modifier chaque détail.</small></span></div><button onClick={exportProject} disabled={rendering}><Download size={16}/>{rendering ? 'Rendu en cours…' : 'Exporter MP4'}</button><button onClick={onOpenAdvanced}><SlidersHorizontal size={16}/> Affiner le montage</button></div>}
              <div className="auto-step-actions"><button className="auto-secondary" onClick={() => setStep(3)}><ArrowLeft size={15}/> Retour</button></div>
            </div>}
          </div>

          <aside className="auto-preview-card">
            <div className="auto-preview-head"><span><MonitorPlay size={14}/> Aperçu</span><small>9:16 · {duration}s</small></div>
            <div className="auto-phone-preview">{firstVisual?.url ? (firstVisual.kind === 'image' ? <img src={firstVisual.url} alt=""/> : <video src={firstVisual.url} muted autoPlay loop playsInline/>) : <div className="auto-preview-empty"><Smartphone size={30}/><span>Ton aperçu apparaîtra ici</span></div>}<div className={`auto-caption-demo preset-${selectedAutoStyle.captionStyle.preset ?? 'impact'}`} style={{ color: selectedAutoStyle.captionStyle.textColor, background: selectedAutoStyle.captionStyle.preset === 'box' ? selectedAutoStyle.captionStyle.backgroundColor : undefined, textDecorationColor: selectedAutoStyle.captionStyle.accentColor, fontFamily: `${getCaptionFont(captionFont).family}, sans-serif`, fontSize: `${Math.max(8, captionFontSize * .32)}px`, top: `${captionPosition}%`, bottom: 'auto', transform: 'translateY(-50%)', textTransform: captionUppercase ? 'uppercase' : 'none' }}>{script ? (captionUppercase ? captionPreviewText.toUpperCase() : captionPreviewText) : 'CAPTIONS DARIJA'}</div><i className="auto-phone-progress"/></div>
            <div className="auto-preview-stats"><span><Sparkles size={13}/> Auto captions</span><span><Clapperboard size={13}/> Auto cuts</span></div>
          </aside>
        </section>
        {message && <div className="auto-message"><Check size={14}/>{message}</div>}
      </main>
    </div>
  );
}

function ChevronStep() {
  return <span className="step-connector"><i/></span>;
}

function PanelContent({
  activeTab,
  assets,
  activeVideoId,
  setActiveVideoId,
  fileInputRef,
  captions,
  currentCaption,
  scriptMode,
  setScriptMode,
  setCurrentTime,
  updateCurrentCaption,
  addAssetToTimeline,
  addTextClip,
  selectedTimelineClip,
  applyTransition,
  applyEffect,
  applyTemplate,
  openScriptGenerator,
  voiceClip,
  updateVoiceClip,
  selectVoiceTrack,
  notify,
}: {
  activeTab: TabId;
  assets: MediaAsset[];
  activeVideoId: string | null;
  setActiveVideoId: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  captions: Caption[];
  currentCaption: Caption;
  scriptMode: 'latin' | 'arabic';
  setScriptMode: (value: 'latin' | 'arabic') => void;
  setCurrentTime: (time: number) => void;
  updateCurrentCaption: (text: string) => void;
  addAssetToTimeline: (asset: MediaAsset) => void;
  addTextClip: (text: string) => void;
  selectedTimelineClip: TimelineClip | null;
  applyTransition: (transition: TransitionType) => void;
  applyEffect: (effect: NonNullable<TimelineClip['effect']>) => void;
  applyTemplate: (templateId: string) => void;
  openScriptGenerator: () => void;
  voiceClip: TimelineClip | null;
  updateVoiceClip: (patch: Partial<TimelineClip>) => void;
  selectVoiceTrack: () => void;
  notify: (message: string) => void;
}) {
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | MediaAsset['kind']>('all');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState<'all' | 'reels' | 'ads'>('all');
  const [transitionSearch, setTransitionSearch] = useState('');
  const filteredAssets = assets.filter((asset) => (mediaFilter === 'all' || asset.kind === mediaFilter) && asset.name.toLowerCase().includes(mediaSearch.toLowerCase()));
  const filteredTemplates = templates.filter((template, index) => template.name.toLowerCase().includes(templateSearch.toLowerCase()) && (templateCategory === 'all' || (templateCategory === 'reels' ? template.format === '9:16' : index % 2 === 0)));
  const filteredTransitions = transitions.filter((transition) => transition.name.toLowerCase().includes(transitionSearch.toLowerCase()));

  if (activeTab === 'media') {
    return (
      <>
        <PanelHeader title="Médias" />
        <div className="panel-content">
          <button className="upload-button" onClick={() => fileInputRef.current?.click()}><UploadCloud size={17} /> Importer des médias</button>
          <div className="search-box"><Search size={15} /><input value={mediaSearch} onChange={(event) => setMediaSearch(event.target.value)} placeholder="Rechercher vos médias" /></div>
          <div className="panel-tabs"><button className={mediaFilter === 'all' ? 'active' : ''} onClick={() => setMediaFilter('all')}>Tout</button><button className={mediaFilter === 'video' ? 'active' : ''} onClick={() => setMediaFilter('video')}>Vidéos</button><button className={mediaFilter === 'image' ? 'active' : ''} onClick={() => setMediaFilter('image')}>Images</button><button className={mediaFilter === 'audio' ? 'active' : ''} onClick={() => setMediaFilter('audio')}>Audio</button></div>
          <p className="media-helper">Glisse un média vers une piste, ou double-clique pour l’ajouter au curseur.</p>
          <div className="media-grid">
            <button className="media-add" onClick={() => fileInputRef.current?.click()}><ImagePlus size={23} /><span>Ajouter</span></button>
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                className={`media-card ${activeVideoId === asset.id ? 'selected' : ''}`}
                draggable
                onClick={() => {
                  if (asset.kind === 'video' && asset.url) setActiveVideoId(asset.id);
                  else notify('Double-clique pour ajouter ce média à la timeline');
                }}
                onDoubleClick={() => addAssetToTimeline(asset)}
                onDragStart={(event) => { event.dataTransfer.setData('application/x-darja-asset', asset.id); event.dataTransfer.effectAllowed = 'copy'; }}
              >
                <div className="media-thumb" style={{ '--media-color': asset.color } as CSSProperties}>
                  {asset.url && asset.kind === 'image' ? <img src={asset.url} alt="" /> : asset.url && asset.kind === 'video' ? <video src={asset.url} muted /> : <Grid2X2 size={17} />}
                  {asset.duration && <small>{formatTime(asset.duration)}</small>}
                  <span className={`asset-kind ${asset.kind}`}>{asset.kind === 'video' ? 'VID' : asset.kind === 'audio' ? 'AUD' : 'IMG'}</span>
                </div>
                <span>{asset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (activeTab === 'captions') {
    return (
      <>
        <PanelHeader title="Captions IA" badge="8 segments" />
        <div className="panel-content">
          <button className="generate-script-button" onClick={openScriptGenerator}><Sparkles size={16} /> Générer le script en darija</button>
          <div className="language-switch">
            <button className={scriptMode === 'latin' ? 'active' : ''} onClick={() => setScriptMode('latin')}>Darija latin</button>
            <button className={scriptMode === 'arabic' ? 'active' : ''} onClick={() => setScriptMode('arabic')}>دارجة</button>
          </div>
          <div className="ai-note"><Sparkles size={16} /><div><strong>Synchronisation prête</strong><span>Les timestamps de ta voix off sont chargés.</span></div></div>
          <div className="caption-list">
            {captions.map((caption) => (
              <button key={caption.id} className={caption.id === currentCaption.id ? 'caption-row active' : 'caption-row'} onClick={() => setCurrentTime(caption.start + 0.05)}>
                <span>{formatTime(caption.start)}</span>
                <p dir={scriptMode === 'arabic' ? 'rtl' : 'ltr'}>{scriptMode === 'arabic' ? caption.textAr : caption.text}</p>
              </button>
            ))}
          </div>
          <label className="edit-caption-label">Segment sélectionné</label>
          <textarea value={currentCaption.text} onChange={(event) => updateCurrentCaption(event.target.value)} />
        </div>
      </>
    );
  }

  if (activeTab === 'templates') {
    return (
      <>
        <PanelHeader title="Modèles" badge="Pro" />
        <div className="panel-content">
          <div className="search-box"><Search size={15} /><input value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Rechercher un modèle" /></div>
          <div className="filter-chips"><button className={templateCategory === 'all' ? 'active' : ''} onClick={() => setTemplateCategory('all')}>Pour vous</button><button className={templateCategory === 'reels' ? 'active' : ''} onClick={() => setTemplateCategory('reels')}>Reels</button><button className={templateCategory === 'ads' ? 'active' : ''} onClick={() => setTemplateCategory('ads')}>Ads</button></div>
          <div className="template-grid">
            {filteredTemplates.map((template) => (
              <button key={template.id} className="template-card" onClick={() => applyTemplate(template.id)}>
                <div style={{ background: `linear-gradient(145deg, ${template.colors[0]}, ${template.colors[1]})` }}>
                  <strong>{template.name.split(' ')[0]}</strong><span>{template.format}</span>
                </div>
                <p>{template.name}</p>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (activeTab === 'transitions') {
    return (
      <>
        <PanelHeader title="Transitions" />
        <div className="panel-content">
          <div className="search-box"><Search size={15} /><input value={transitionSearch} onChange={(event) => setTransitionSearch(event.target.value)} placeholder="Rechercher une transition" /></div>
          <p className="helper-copy">Clique sur une transition pour l’ajouter entre les deux clips sélectionnés.</p>
          <div className="transition-grid">
            {filteredTransitions.map((transition) => {
              const transitionType = ({ tr1: 'fade', tr2: 'slide', tr3: 'zoom', tr4: 'flash', tr5: 'rotate', tr6: 'wipe' } as const)[transition.id as keyof { tr1: 'fade'; tr2: 'slide'; tr3: 'zoom'; tr4: 'flash'; tr5: 'rotate'; tr6: 'wipe' }];
              return (
                <button
                  key={transition.id}
                  className={selectedTimelineClip?.transitionIn === transitionType ? 'active' : ''}
                  onClick={() => applyTransition(transitionType)}
                ><span>{transition.symbol}</span><small>{transition.name}</small></button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  if (activeTab === 'effects') {
    return (
      <>
        <PanelHeader title="Effets" badge="Nouveau" />
        <div className="panel-content">
          <div className="effects-list">
            {effects.map(({ id, name, icon: Icon, color }) => {
              const effect = ({ fx1: 'enhance', fx2: 'grain', fx3: 'glow', fx4: 'motionBlur' } as const)[id as 'fx1' | 'fx2' | 'fx3' | 'fx4'];
              return (
                <button key={id} className={selectedTimelineClip?.effect === effect ? 'active' : ''} onClick={() => applyEffect(effect)}>
                  <i style={{ background: `${color}20`, color }}><Icon size={20} /></i>
                  <span><strong>{name}</strong><small>Appliquer au clip sélectionné</small></span>
                  {selectedTimelineClip?.effect === effect ? <Check size={17} /> : <Plus size={17} />}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  if (activeTab === 'audio') {
    return (
      <>
        <PanelHeader title="Audio" />
        <div className="panel-content">
          <button className="voice-card" onClick={selectVoiceTrack}>
            <i><Mic2 size={22} /></i><span><strong>Voix off Darija</strong><small>00:32 · timestamps inclus</small></span><Play size={16} fill="currentColor" />
          </button>
          <label className="section-mini-title">RÉGLAGES</label>
          <div className="audio-setting audio-range-setting"><span>Volume voix</span><input aria-label="Volume de la voix" type="range" min="0" max="2" step=".01" value={voiceClip?.volume ?? 1} onChange={(event) => updateVoiceClip({ volume: Number(event.target.value) })} /><strong>{Math.round((voiceClip?.volume ?? 1) * 100)}%</strong></div>
          <div className="audio-setting"><span>Réduction du bruit</span><button className={voiceClip?.noiseReduction ? 'switch-on' : 'switch-off'} onClick={() => updateVoiceClip({ noiseReduction: !voiceClip?.noiseReduction })} aria-pressed={Boolean(voiceClip?.noiseReduction)}><i /></button></div>
          <div className="audio-setting"><span>Découpage source</span><strong>{(voiceClip?.sourceStart ?? 0).toFixed(1)}s → {((voiceClip?.sourceStart ?? 0) + (voiceClip?.duration ?? 0)).toFixed(1)}s</strong></div>
          <button className="upload-secondary" onClick={() => fileInputRef.current?.click()}><FolderUp size={16} /> Ajouter une piste audio</button>
        </div>
      </>
    );
  }

  return (
    <>
      <PanelHeader title="Texte" />
      <div className="panel-content">
        <button className="add-text-button" onClick={() => addTextClip('NOUVEAU TEXTE')}><Plus size={18} /> Ajouter un texte</button>
        <label className="section-mini-title">STYLES RAPIDES</label>
        <div className="text-styles">
          <button onClick={() => addTextClip('TITRE')}><strong>TITRE</strong><span>Montserrat Bold</span></button>
          <button onClick={() => addTextClip('Sous-titre')}><strong>Sous-titre</strong><span>Inter Medium</span></button>
          <button onClick={() => addTextClip('عنوان بالدارجة')} dir="rtl"><strong>عنوان بالدارجة</strong><span>Alexandria Bold</span></button>
        </div>
      </div>
    </>
  );
}

function PanelHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="panel-head">
      <div><h2>{title}</h2>{badge && <span>{badge}</span>}</div>
    </div>
  );
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="color-control">
      <span>{label}</span>
      <label><i style={{ background: value }} /><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><strong>{value.toUpperCase()}</strong></label>
    </div>
  );
}

function getAnimatedValue(clip: TimelineClip, property: 'x' | 'y' | 'scale' | 'rotation' | 'opacity', localTime: number) {
  const defaults = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
  const base = clip[property] ?? defaults[property];
  const frames = (clip.keyframes ?? []).filter((frame) => frame.property === property).sort((a, b) => a.time - b.time);
  if (!frames.length) return base;
  const previous = [...frames].reverse().find((frame) => frame.time <= localTime);
  const next = frames.find((frame) => frame.time > localTime);
  if (!previous && next) {
    if (next.time <= .001) return next.value;
    const progress = Math.max(0, Math.min(1, localTime / next.time));
    return base + (next.value - base) * progress;
  }
  if (previous && next) {
    const progress = Math.max(0, Math.min(1, (localTime - previous.time) / (next.time - previous.time)));
    return previous.value + (next.value - previous.value) * progress;
  }
  return previous?.value ?? base;
}

function VisualClipLayer({
  clip,
  asset,
  currentTime,
  playing,
  selected,
  zIndex,
  onSelect,
}: {
  clip: TimelineClip;
  asset?: MediaAsset;
  currentTime: number;
  playing: boolean;
  selected: boolean;
  zIndex: number;
  onSelect: () => void;
}) {
  const mediaRef = useRef<HTMLVideoElement>(null);
  const localTime = Math.max(0, currentTime - clip.start);
  const x = getAnimatedValue(clip, 'x', localTime);
  const y = getAnimatedValue(clip, 'y', localTime);
  const baseScale = getAnimatedValue(clip, 'scale', localTime);
  const baseRotation = getAnimatedValue(clip, 'rotation', localTime);
  const baseOpacity = getAnimatedValue(clip, 'opacity', localTime);
  const transition = clip.transitionIn ?? 'none';
  const transitionDuration = Math.max(.05, clip.transitionDuration ?? .45);
  const progress = transition === 'none' ? 1 : Math.min(1, localTime / transitionDuration);
  let transitionScale = 1;
  let transitionX = 0;
  let transitionRotation = 0;
  let transitionOpacity = 1;
  let brightness = 1;
  let wipeRight = 0;
  if (transition === 'fade') transitionOpacity = progress;
  if (transition === 'slide') transitionX = (1 - progress) * 105;
  if (transition === 'zoom') transitionScale = .72 + progress * .28;
  if (transition === 'rotate') transitionRotation = (1 - progress) * -16;
  if (transition === 'flash') brightness = 1 + (1 - progress) * 2.2;
  if (transition === 'wipe') wipeRight = (1 - progress) * 100;

  useEffect(() => {
    const video = mediaRef.current;
    if (!video) return;
    const desired = clip.sourceStart + localTime;
    if (Number.isFinite(video.duration) && Math.abs(video.currentTime - desired) > .12) video.currentTime = Math.min(desired, Math.max(0, video.duration - .03));
    if (playing && video.paused) void video.play().catch(() => undefined);
    if (!playing && !video.paused) video.pause();
  }, [clip.sourceStart, localTime, playing]);

  const effectFilter = clip.effect === 'enhance' ? 'saturate(1.22) contrast(1.1)' : clip.effect === 'glow' ? 'saturate(1.14) drop-shadow(0 0 10px rgba(255,255,255,.3))' : clip.effect === 'motionBlur' ? 'blur(.8px)' : '';
  const style = {
    zIndex,
    opacity: Math.max(0, Math.min(1, baseOpacity * transitionOpacity)),
    transform: `translate(-50%, -50%) translate(${x + transitionX}%, ${y}%) scale(${Math.max(.05, baseScale * transitionScale)}) rotate(${baseRotation + transitionRotation}deg)`,
    clipPath: `inset(${clip.cropTop ?? 0}% ${Math.max(clip.cropRight ?? 0, wipeRight)}% ${clip.cropBottom ?? 0}% ${clip.cropLeft ?? 0}%)`,
    filter: `${effectFilter} brightness(${brightness})`,
  } as CSSProperties;

  return (
    <div className={`visual-clip-layer effect-${clip.effect ?? 'none'} ${selected ? 'selected' : ''}`} style={style} onPointerDown={(event) => { event.stopPropagation(); onSelect(); }}>
      {asset?.url && clip.kind === 'video' ? (
        <video ref={mediaRef} src={asset.url} playsInline muted preload="auto" />
      ) : asset?.url && clip.kind === 'image' ? (
        <img src={asset.url} alt="" />
      ) : clip.id === 'clip-intro' ? (
        <DemoVisual />
      ) : (
        <div className="mock-visual" style={{ background: `radial-gradient(circle at 72% 24%, ${clip.color}, transparent 42%), linear-gradient(145deg, ${clip.color}bb, #12131a 72%)` }}>
          <Grid2X2 size={30} /><strong>{clip.name}</strong><span>{formatTime(clip.sourceStart)} → {formatTime(clip.sourceStart + clip.duration)}</span>
        </div>
      )}
      {selected && <span className="canvas-selection-label">{clip.name}</span>}
    </div>
  );
}

function AudioClipLayer({ clip, asset, currentTime, playing, volume }: { clip: TimelineClip; asset: MediaAsset; currentTime: number; playing: boolean; volume: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const localTime = Math.max(0, currentTime - clip.start);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const desired = clip.sourceStart + localTime;
    audio.volume = Math.max(0, Math.min(1, (volume / 100) * (clip.volume ?? 1)));
    if (Number.isFinite(audio.duration) && Math.abs(audio.currentTime - desired) > .14) audio.currentTime = Math.min(desired, Math.max(0, audio.duration - .03));
    if (playing && audio.paused) void audio.play().catch(() => undefined);
    if (!playing && !audio.paused) audio.pause();
  }, [clip.sourceStart, clip.volume, localTime, playing, volume]);
  return <audio ref={audioRef} src={asset.url} preload="auto" />;
}

function TextClipLayer({ clip, currentTime, selected, onSelect }: { clip: TimelineClip; currentTime: number; selected: boolean; onSelect: () => void }) {
  const localTime = Math.max(0, currentTime - clip.start);
  const x = getAnimatedValue(clip, 'x', localTime);
  const y = getAnimatedValue(clip, 'y', localTime);
  const scale = getAnimatedValue(clip, 'scale', localTime);
  const rotation = getAnimatedValue(clip, 'rotation', localTime);
  const opacity = getAnimatedValue(clip, 'opacity', localTime);
  return <div className={`free-text-layer ${selected ? 'selected' : ''}`} style={{ opacity, transform: `translate(-50%, -50%) translate(${x}%, ${y}%) scale(${scale}) rotate(${rotation}deg)` }} onPointerDown={(event) => { event.stopPropagation(); onSelect(); }}>{clip.text ?? clip.name}</div>;
}

function InspectorPanel({
  clip,
  currentTime,
  captionStyle,
  commitStyle,
  updateClip,
  addKeyframes,
  clearKeyframes,
  applyTransition,
}: {
  clip: TimelineClip | null;
  currentTime: number;
  captionStyle: CaptionStyle;
  commitStyle: (patch: Partial<CaptionStyle>) => void;
  updateClip: (patch: Partial<TimelineClip>) => void;
  addKeyframes: () => void;
  clearKeyframes: () => void;
  applyTransition: (transition: TransitionType) => void;
}) {
  const isVisual = clip?.kind === 'video' || clip?.kind === 'image';
  if (isVisual && clip) {
    const localTime = Math.max(0, Math.min(clip.duration, currentTime - clip.start));
    return (
      <aside className="inspector-panel">
        <div className="inspector-head">
          <div><SlidersHorizontal size={17} /><span><strong>Réglages du clip</strong><small>{clip.name}</small></span></div>
        </div>
        <div className="inspector-scroll">
          <section className="control-section clip-source-section">
            <div className="section-row"><label className="section-label">DÉCOUPAGE SOURCE</label><span>{formatTime(localTime, true)}</span></div>
            <div className="inspector-two-cols">
              <InspectorNumber label="Début source" value={clip.sourceStart} step={.1} min={0} onChange={(value) => updateClip({ sourceStart: value })} suffix="s" />
              <InspectorNumber label="Durée" value={clip.duration} step={.1} min={.2} max={TOTAL_DURATION - clip.start} onChange={(value) => updateClip({ duration: value })} suffix="s" />
            </div>
            <p>Les poignées de la timeline modifient ces valeurs sans altérer le fichier original.</p>
          </section>

          <section className="control-section">
            <div className="section-row"><label className="section-label">TRANSFORMATION</label><Move size={13} /></div>
            <div className="inspector-two-cols">
              <InspectorNumber label="Position X" value={clip.x ?? 0} step={1} min={-150} max={150} onChange={(value) => updateClip({ x: value })} suffix="%" />
              <InspectorNumber label="Position Y" value={clip.y ?? 0} step={1} min={-150} max={150} onChange={(value) => updateClip({ y: value })} suffix="%" />
              <InspectorNumber label="Échelle" value={clip.scale ?? 1} step={.05} min={.05} max={4} onChange={(value) => updateClip({ scale: value })} suffix="×" />
              <InspectorNumber label="Rotation" value={clip.rotation ?? 0} step={1} min={-360} max={360} onChange={(value) => updateClip({ rotation: value })} suffix="°" />
            </div>
            <label className="inspector-range"><span>Opacité <strong>{Math.round((clip.opacity ?? 1) * 100)}%</strong></span><input type="range" min="0" max="1" step=".01" value={clip.opacity ?? 1} onChange={(event) => updateClip({ opacity: Number(event.target.value) })} /></label>
            <button className="reset-clip-button" onClick={() => updateClip({ x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 })}><RotateCcw size={13} /> Réinitialiser la transformation</button>
          </section>

          <section className="control-section">
            <div className="section-row"><label className="section-label">CROP</label><Crop size={13} /></div>
            <div className="crop-grid">
              <InspectorNumber label="Haut" value={clip.cropTop ?? 0} min={0} max={90} onChange={(value) => updateClip({ cropTop: value })} suffix="%" />
              <InspectorNumber label="Droite" value={clip.cropRight ?? 0} min={0} max={90} onChange={(value) => updateClip({ cropRight: value })} suffix="%" />
              <InspectorNumber label="Bas" value={clip.cropBottom ?? 0} min={0} max={90} onChange={(value) => updateClip({ cropBottom: value })} suffix="%" />
              <InspectorNumber label="Gauche" value={clip.cropLeft ?? 0} min={0} max={90} onChange={(value) => updateClip({ cropLeft: value })} suffix="%" />
            </div>
          </section>

          <section className="control-section">
            <label className="section-label">TRANSITION D’ENTRÉE</label>
            <div className="transition-select-row">
              {(['none', 'fade', 'slide', 'zoom', 'wipe'] as TransitionType[]).map((transition) => <button key={transition} className={clip.transitionIn === transition ? 'active' : ''} onClick={() => applyTransition(transition)}>{transition}</button>)}
            </div>
            {clip.transitionIn && clip.transitionIn !== 'none' && <label className="inspector-range"><span>Durée <strong>{(clip.transitionDuration ?? .5).toFixed(2)}s</strong></span><input type="range" min=".1" max="2" step=".05" value={clip.transitionDuration ?? .5} onChange={(event) => updateClip({ transitionDuration: Number(event.target.value) })} /></label>}
          </section>

          <section className="control-section">
            <div className="section-row"><label className="section-label">KEYFRAMES</label><span>{clip.keyframes?.length ?? 0}</span></div>
            <div className="keyframe-actions">
              <button onClick={addKeyframes}><Diamond size={13} fill="currentColor" /> Ajouter à {localTime.toFixed(2)}s</button>
              <button onClick={clearKeyframes} disabled={!clip.keyframes?.length}><Trash2 size={13} /></button>
            </div>
            <p className="keyframe-help">Change les valeurs, déplace le curseur, puis ajoute un autre keyframe. La preview interpole automatiquement.</p>
          </section>
        </div>
      </aside>
    );
  }

  if (clip?.kind === 'text') {
    return (
      <aside className="inspector-panel">
        <div className="inspector-head"><div><Type size={17} /><span><strong>Réglages du texte</strong><small>{clip.name}</small></span></div></div>
        <div className="inspector-scroll">
          <section className="control-section"><label className="section-label">CONTENU</label><textarea className="inspector-textarea" value={clip.text ?? clip.name} onChange={(event) => updateClip({ text: event.target.value, name: event.target.value })} /></section>
          <section className="control-section"><label className="section-label">TRANSFORMATION</label><div className="inspector-two-cols"><InspectorNumber label="Position X" value={clip.x ?? 0} min={-150} max={150} onChange={(value) => updateClip({ x: value })} suffix="%" /><InspectorNumber label="Position Y" value={clip.y ?? 0} min={-150} max={150} onChange={(value) => updateClip({ y: value })} suffix="%" /><InspectorNumber label="Échelle" value={clip.scale ?? 1} min={.1} max={4} step={.05} onChange={(value) => updateClip({ scale: value })} suffix="×" /><InspectorNumber label="Rotation" value={clip.rotation ?? 0} min={-360} max={360} onChange={(value) => updateClip({ rotation: value })} suffix="°" /></div></section>
          <section className="control-section"><div className="keyframe-actions"><button onClick={addKeyframes}><Diamond size={13} fill="currentColor" /> Ajouter un keyframe</button><button onClick={clearKeyframes}><Trash2 size={13} /></button></div></section>
        </div>
      </aside>
    );
  }

  if (clip?.kind === 'audio') {
    return (
      <aside className="inspector-panel">
        <div className="inspector-head"><div><Volume2 size={17} /><span><strong>Réglages audio</strong><small>{clip.name}</small></span></div></div>
        <div className="inspector-scroll">
          <section className="control-section"><label className="section-label">DÉCOUPAGE</label><div className="inspector-two-cols"><InspectorNumber label="Début source" value={clip.sourceStart} min={0} step={.1} onChange={(value) => updateClip({ sourceStart: value })} suffix="s" /><InspectorNumber label="Durée" value={clip.duration} min={.2} step={.1} onChange={(value) => updateClip({ duration: value })} suffix="s" /></div></section>
          <section className="control-section"><label className="inspector-range"><span>Volume <strong>{Math.round((clip.volume ?? 1) * 100)}%</strong></span><input type="range" min="0" max="2" step=".01" value={clip.volume ?? 1} onChange={(event) => updateClip({ volume: Number(event.target.value) })} /></label></section>
        </div>
      </aside>
    );
  }

  return (
    <aside className="inspector-panel">
      <div className="inspector-head">
        <div><Type size={17} /><strong>Style des captions</strong></div>
      </div>
      <div className="inspector-scroll">
        <section className="control-section">
          <label className="section-label">MODÈLES</label>
          <div className="preset-grid">
            {PRESETS.map((preset) => <button key={preset.id} className={`preset-card ${captionStyle.preset === preset.id ? 'active' : ''} ${preset.id}`} onClick={() => commitStyle(preset.patch)}><span>{preset.sample}</span><small>{preset.name}</small>{captionStyle.preset === preset.id && <i><Check size={11} /></i>}</button>)}
          </div>
        </section>
        <section className="control-section">
          <div className="section-row"><label className="section-label">TYPOGRAPHIE</label><button onClick={() => commitStyle(INITIAL_STYLE)}>Réinitialiser</button></div>
          <select className="select-field" value={getCaptionFont(captionStyle.fontFamily).id} onChange={(event) => commitStyle({ fontFamily: event.target.value as CaptionStyle['fontFamily'] })}><optgroup label="Darija / Arabe">{CAPTION_FONTS.filter((font) => font.group === 'arabic').map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}</optgroup><optgroup label="Darija latin / Français">{CAPTION_FONTS.filter((font) => font.group === 'latin').map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}</optgroup></select>
          <div className="triple-controls"><div><span>Taille</span><input type="number" value={captionStyle.fontSize} onChange={(e) => commitStyle({ fontSize: Number(e.target.value) })} /></div><button className={captionStyle.uppercase ? 'toggle-button active' : 'toggle-button'} onClick={() => commitStyle({ uppercase: !captionStyle.uppercase })}>AA</button><button className={captionStyle.shadow ? 'toggle-button active' : 'toggle-button'} onClick={() => commitStyle({ shadow: !captionStyle.shadow })}>S</button></div>
        </section>
        <section className="control-section"><label className="section-label">COULEURS</label><ColorControl label="Texte" value={captionStyle.textColor} onChange={(value) => commitStyle({ textColor: value })} /><ColorControl label="Accent" value={captionStyle.accentColor} onChange={(value) => commitStyle({ accentColor: value })} /><ColorControl label="Fond" value={captionStyle.backgroundColor} onChange={(value) => commitStyle({ backgroundColor: value })} /></section>
        <section className="control-section"><div className="section-row"><label className="section-label">POSITION</label><span>{captionStyle.position}%</span></div><div className="position-control"><div className="phone-position"><i style={{ top: `${captionStyle.position}%` }} /></div><input type="range" min="15" max="88" value={captionStyle.position} onChange={(e) => commitStyle({ position: Number(e.target.value) })} /></div></section>
        <section className="control-section"><label className="section-label">ANIMATION D’ENTRÉE</label><select className="select-field" value={captionStyle.animation ?? 'pop'} onChange={(event) => commitStyle({ animation: event.target.value as CaptionStyle['animation'] })}><option value="pop">Pop</option><option value="fade">Fondu</option><option value="none">Aucune</option></select></section>
      </div>
    </aside>
  );
}

function InspectorNumber({ label, value, onChange, min = -9999, max = 9999, step = 1, suffix }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  return <label className="inspector-number"><span>{label}</span><div><input type="number" value={Number(value.toFixed(2))} min={min} max={max} step={step} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value))))} />{suffix && <i>{suffix}</i>}</div></label>;
}

function DemoVisual() {
  return (
    <div className="demo-visual">
      <div className="demo-noise" />
      <div className="orange-orb" />
      <div className="violet-card"><i /><i /><i /><strong>100%</strong><span>DARIJA</span></div>
      <div className="floating-pill pill-one"><Sparkles size={13} /> AI SCRIPT</div>
      <div className="floating-pill pill-two"><Mic2 size={13} /> VOIX DZ</div>
      <div className="demo-person">
        <div className="head"><i /></div>
        <div className="body"><span /></div>
      </div>
      <div className="demo-title"><small>CRÉE TON CONTENU</small><strong>PLUS VITE.</strong></div>
    </div>
  );
}

function Timeline({
  currentTime,
  tracks,
  setTracks,
  beginTimelineChange,
  selectedClipId,
  setSelectedClipId,
  snapping,
  setSnapping,
  zoom,
  setZoom,
  seek,
  playing,
  togglePlayback,
  splitSelectedClip,
  duplicateSelectedClip,
  removeSelectedClip,
  addVideoTrack,
  toggleTrackLock,
  toggleTrackMute,
  onDropAsset,
  undo,
  redo,
  canUndo,
  canRedo,
}: {
  currentTime: number;
  tracks: TimelineTrack[];
  setTracks: Dispatch<SetStateAction<TimelineTrack[]>>;
  beginTimelineChange: () => void;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  snapping: boolean;
  setSnapping: (value: boolean) => void;
  zoom: number;
  setZoom: (value: number) => void;
  seek: (time: number) => void;
  playing: boolean;
  togglePlayback: () => void;
  splitSelectedClip: () => void;
  duplicateSelectedClip: () => void;
  removeSelectedClip: () => void;
  addVideoTrack: () => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  onDropAsset: (assetId: string, trackId: string, time: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  type DragMode = 'move' | 'trim-left' | 'trim-right';
  type DragState = {
    mode: DragMode;
    clip: TimelineClip;
    pointerX: number;
    laneWidth: number;
    trackId: string;
  };

  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clipId: string } | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const selectedClip = useMemo(
    () => tracks.flatMap((track) => track.clips).find((clip) => clip.id === selectedClipId) ?? null,
    [tracks, selectedClipId],
  );
  const rulerMarks = Array.from({ length: 17 }, (_, index) => index * 2);

  const compatibleTrack = (clip: TimelineClip, track: TimelineTrack) => {
    if (clip.kind === 'video' || clip.kind === 'image') return track.kind === 'video';
    return clip.kind === track.kind;
  };

  const snapValue = (value: number, targets: number[]) => {
    if (!snapping) return value;
    const threshold = Math.max(.06, .22 * (78 / zoom));
    const nearest = targets.reduce<{ value: number; distance: number } | null>((best, target) => {
      const distance = Math.abs(target - value);
      return !best || distance < best.distance ? { value: target, distance } : best;
    }, null);
    return nearest && nearest.distance <= threshold ? nearest.value : value;
  };

  useEffect(() => {
    if (!drag) return;
    document.body.classList.add('timeline-dragging');

    const onPointerMove = (event: PointerEvent) => {
      const delta = ((event.clientX - drag.pointerX) / drag.laneWidth) * TOTAL_DURATION;
      const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const hoveredLane = element?.closest<HTMLElement>('[data-track-id]');

      setTracks((current) => {
        const allClips = current.flatMap((track) => track.clips).filter((clip) => clip.id !== drag.clip.id);
        const targets = [0, currentTime, TOTAL_DURATION, ...allClips.flatMap((clip) => [clip.start, clip.start + clip.duration])];

        if (drag.mode === 'move') {
          const maxStart = Math.max(0, TOTAL_DURATION - drag.clip.duration);
          const rawStart = Math.min(maxStart, Math.max(0, drag.clip.start + delta));
          const nextStart = Math.min(maxStart, Math.max(0, snapValue(rawStart, targets)));
          let targetTrackId = drag.trackId;
          if (hoveredLane?.dataset.trackId) {
            const candidateTrack = current.find((track) => track.id === hoveredLane.dataset.trackId);
            if (candidateTrack && !candidateTrack.locked && compatibleTrack(drag.clip, candidateTrack)) targetTrackId = candidateTrack.id;
          }
          return current.map((track) => {
            const withoutDragged = track.clips.filter((clip) => clip.id !== drag.clip.id);
            if (track.id !== targetTrackId) return withoutDragged.length === track.clips.length ? track : { ...track, clips: withoutDragged };
            const moved = { ...drag.clip, trackId: targetTrackId, start: nextStart };
            return { ...track, clips: [...withoutDragged, moved].sort((a, b) => a.start - b.start) };
          });
        }

        return current.map((track) => {
          if (track.id !== drag.trackId) return track;
          return {
            ...track,
            clips: track.clips.map((clip) => {
              if (clip.id !== drag.clip.id) return clip;
              if (drag.mode === 'trim-left') {
                const fixedEnd = drag.clip.start + drag.clip.duration;
                const rawStart = Math.min(fixedEnd - .2, Math.max(0, drag.clip.start + delta));
                const nextStart = Math.min(fixedEnd - .2, Math.max(0, snapValue(rawStart, targets)));
                return {
                  ...clip,
                  start: nextStart,
                  duration: fixedEnd - nextStart,
                  sourceStart: Math.max(0, drag.clip.sourceStart + (nextStart - drag.clip.start)),
                };
              }
              const rawEnd = Math.min(TOTAL_DURATION, Math.max(drag.clip.start + .2, drag.clip.start + drag.clip.duration + delta));
              const nextEnd = Math.min(TOTAL_DURATION, Math.max(drag.clip.start + .2, snapValue(rawEnd, targets)));
              return { ...clip, duration: nextEnd - drag.clip.start };
            }),
          };
        });
      });
    };

    const onPointerUp = () => setDrag(null);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
    return () => {
      document.body.classList.remove('timeline-dragging');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [drag, currentTime, setTracks, snapping, zoom]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('blur', close);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('blur', close); };
  }, [contextMenu]);

  const startDrag = (event: React.PointerEvent, clip: TimelineClip, track: TimelineTrack, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    if (track.locked) return;
    const lane = (event.currentTarget as HTMLElement).closest<HTMLElement>('.track-content-v2');
    if (!lane) return;
    setSelectedClipId(clip.id);
    beginTimelineChange();
    setDrag({ mode, clip: { ...clip }, pointerX: event.clientX, laneWidth: lane.getBoundingClientRect().width, trackId: track.id });
  };

  const seekFromEvent = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    seek(((event.clientX - rect.left) / rect.width) * TOTAL_DURATION);
  };

  return (
    <section className="timeline-panel timeline-v2">
      <div className="timeline-toolbar">
        <div className="timeline-tools-left">
          <span className="icon-button small active-tool" title="Outil de sélection"><MousePointer2 size={16} /></span>
          <button className="icon-button small" onClick={splitSelectedClip} disabled={!selectedClip} title="Découper au curseur (S)"><Scissors size={16} /></button>
          <button className="icon-button small" onClick={duplicateSelectedClip} disabled={!selectedClip} title="Dupliquer (Ctrl+D)"><Copy size={15} /></button>
          <button className="icon-button small danger-tool" onClick={removeSelectedClip} disabled={!selectedClip} title="Supprimer"><Trash2 size={15} /></button>
          <span />
          <button className="icon-button small" onClick={undo} disabled={!canUndo} title="Annuler"><Undo2 size={16} /></button>
          <button className="icon-button small" onClick={redo} disabled={!canRedo} title="Rétablir"><Redo2 size={16} /></button>
          <button className={`icon-button small ${snapping ? 'magnet-on' : ''}`} onClick={() => setSnapping(!snapping)} title="Snapping magnétique"><Magnet size={15} /></button>
          <button className="add-track-button" onClick={addVideoTrack}><Plus size={14} /> Piste</button>
        </div>
        <div className="timeline-transport">
          <button onClick={() => seek(0)}><SkipBack size={15} /></button>
          <button onClick={togglePlayback}>{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button>
          <strong>{formatTime(currentTime, true)}</strong>
        </div>
        <div className="timeline-zoom">
          {selectedClip && <span className="selection-readout">{selectedClip.name} · {selectedClip.duration.toFixed(1)}s</span>}
          <button onClick={() => setZoom(Math.max(40, zoom - 10))}><ZoomOut size={15} /></button>
          <input aria-label="Zoom timeline" type="range" min="40" max="180" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <button onClick={() => setZoom(Math.min(180, zoom + 10))}><ZoomIn size={15} /></button>
          <button className="fit-button" onClick={() => setZoom(78)}>Ajuster</button>
        </div>
      </div>

      <div className="timeline-body-v2" ref={timelineScrollRef} onPointerDown={(event) => {
        if (event.target === event.currentTarget) setSelectedClipId(null);
      }}>
        <div className="timeline-content-v2" style={{ width: `${Math.max(100, (zoom / 78) * 100)}%` }}>
          <div className="timeline-row-v2 ruler-row-v2">
            <div className="track-label-v2 ruler-label-v2"><span>PISTES</span></div>
            <div
              className="ruler-content-v2"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                seekFromEvent(event);
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromEvent(event);
              }}
            >
              {rulerMarks.map((mark) => (
                <span key={mark} className={mark % 4 === 0 ? 'major' : ''} style={{ left: `${(mark / TOTAL_DURATION) * 100}%` }}>
                  <i />{mark % 4 === 0 ? formatTime(mark) : ''}
                </span>
              ))}
            </div>
          </div>

          {tracks.map((track) => (
            <div key={track.id} className={`timeline-row-v2 kind-${track.kind}`}>
              <div className="track-label-v2">
                <div className={`track-icon ${track.kind}`}>
                  {track.kind === 'video' ? <Grid2X2 size={13} /> : track.kind === 'audio' ? <Volume2 size={13} /> : <Type size={13} />}
                </div>
                <span>{track.name}</span>
                <button
                  title={track.muted ? 'Afficher / activer' : 'Masquer / couper'}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => toggleTrackMute(track.id)}
                >
                  {track.muted ? (track.kind === 'audio' ? <VolumeX size={12} /> : <EyeOff size={12} />) : (track.kind === 'audio' ? <Volume2 size={12} /> : <Eye size={12} />)}
                </button>
                <button
                  title={track.locked ? 'Déverrouiller' : 'Verrouiller'}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => toggleTrackLock(track.id)}
                >
                  {track.locked ? <Lock size={12} /> : <LockOpen size={12} />}
                </button>
              </div>
              <div
                className={`track-content-v2 ${track.locked ? 'locked' : ''} ${track.muted ? 'muted' : ''} ${dragOverTrackId === track.id ? 'drop-target' : ''}`}
                data-track-id={track.id}
                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDragOverTrackId(track.id); }}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverTrackId(null); }}
                onDrop={(event) => {
                  event.preventDefault();
                  const assetId = event.dataTransfer.getData('application/x-darja-asset');
                  const rect = event.currentTarget.getBoundingClientRect();
                  const time = Math.min(TOTAL_DURATION, Math.max(0, ((event.clientX - rect.left) / rect.width) * TOTAL_DURATION));
                  setDragOverTrackId(null);
                  if (assetId) onDropAsset(assetId, track.id, time);
                }}
                onPointerDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  setSelectedClipId(null);
                  seekFromEvent(event);
                }}
              >
                {track.clips.map((clip) => (
                  <TimelineClipView
                    key={clip.id}
                    clip={clip}
                    track={track}
                    selected={clip.id === selectedClipId}
                    dragging={clip.id === drag?.clip.id}
                    onSelect={() => setSelectedClipId(clip.id)}
                    onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); setSelectedClipId(clip.id); setContextMenu({ x: Math.min(event.clientX, window.innerWidth - 200), y: Math.min(event.clientY, window.innerHeight - 115), clipId: clip.id }); }}
                    onStartDrag={startDrag}
                  />
                ))}
                {!track.clips.length && <span className="empty-track-hint">Dépose un média ici</span>}
              </div>
            </div>
          ))}

          <div className="playhead-v2" style={{ left: `calc(112px + (100% - 112px) * ${currentTime / TOTAL_DURATION})` }}>
            <i /><span />
          </div>
        </div>
      </div>
      {contextMenu && <div className="clip-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onPointerDown={(event) => event.stopPropagation()}>
        <button onClick={() => { splitSelectedClip(); setContextMenu(null); }}><Scissors size={14} /> Découper au curseur <kbd>S</kbd></button>
        <button onClick={() => { duplicateSelectedClip(); setContextMenu(null); }}><Copy size={14} /> Dupliquer <kbd>Ctrl D</kbd></button>
        <button className="danger" onClick={() => { removeSelectedClip(); setContextMenu(null); }}><Trash2 size={14} /> Supprimer <kbd>Suppr</kbd></button>
      </div>}
    </section>
  );
}

function TimelineClipView({
  clip,
  track,
  selected,
  dragging,
  onSelect,
  onContextMenu,
  onStartDrag,
}: {
  clip: TimelineClip;
  track: TimelineTrack;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onStartDrag: (event: React.PointerEvent, clip: TimelineClip, track: TimelineTrack, mode: 'move' | 'trim-left' | 'trim-right') => void;
}) {
  const clipStyle = {
    left: `${(clip.start / TOTAL_DURATION) * 100}%`,
    width: `${(clip.duration / TOTAL_DURATION) * 100}%`,
    '--clip-color': clip.color,
  } as CSSProperties;

  return (
    <div
      className={`timeline-clip-v2 ${clip.kind} ${selected ? 'selected' : ''} ${dragging ? 'dragging' : ''}`}
      style={clipStyle}
      title={`${clip.name} — ${clip.duration.toFixed(2)}s`}
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
      onContextMenu={onContextMenu}
      onPointerDown={(event) => onStartDrag(event, clip, track, 'move')}
    >
      <button className="trim-handle left" aria-label="Raccourcir le début" onPointerDown={(event) => onStartDrag(event, clip, track, 'trim-left')}><i /></button>
      {clip.kind === 'audio' && (
        <span className="waveform-v2">{Array.from({ length: 64 }, (_, i) => <i key={i} style={{ height: `${18 + ((i * 17) % 70)}%` }} />)}</span>
      )}
      {clip.kind === 'video' && <span className="clip-film-pattern" />}
      <span className="clip-keyframes">{Array.from(new Set((clip.keyframes ?? []).map((keyframe) => keyframe.time.toFixed(3)))).map((time) => <i key={time} style={{ left: `${(Number(time) / clip.duration) * 100}%` }} />)}</span>
      <span className="clip-copy">
        <strong>{clip.name}</strong>
        {clip.kind !== 'caption' && <small>{clip.duration.toFixed(1)}s</small>}
      </span>
      <button className="trim-handle right" aria-label="Raccourcir la fin" onPointerDown={(event) => onStartDrag(event, clip, track, 'trim-right')}><i /></button>
    </div>
  );
}

function ScriptDialog({ onClose, onApply }: { onClose: () => void; onApply: (captions: Caption[]) => void }) {
  const [topic, setTopic] = useState('Créer des vidéos professionnelles en darija');
  const [tone, setTone] = useState<'energetic' | 'educational' | 'sales' | 'story'>('energetic');
  const [duration, setDuration] = useState(30);
  const [alphabet, setAlphabet] = useState<'latin' | 'arabic'>('latin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ script: string; scriptAr: string; captions: Caption[]; engine: string } | null>(null);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, tone, duration }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Génération impossible');
      setResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Génération impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="script-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <div className="export-head"><div><span><Sparkles size={19} /></span><div><h2>Générer un script en darija</h2><p>Moteur local self-hosted · aucune donnée externe</p></div></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
        <div className="script-body">
          <div className="script-form">
            <label>Sujet de la vidéo<textarea value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={120} placeholder="Exemple : présenter mon produit…" /></label>
            <div className="export-row"><label>Ton<select value={tone} onChange={(event) => setTone(event.target.value as typeof tone)}><option value="energetic">Énergique</option><option value="educational">Éducatif</option><option value="sales">Commercial</option><option value="story">Storytelling</option></select></label><label>Durée<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value="15">15 secondes</option><option value="30">30 secondes</option></select></label></div>
            <div className="language-switch"><button className={alphabet === 'latin' ? 'active' : ''} onClick={() => setAlphabet('latin')}>Darija latin</button><button className={alphabet === 'arabic' ? 'active' : ''} onClick={() => setAlphabet('arabic')}>دارجة عربية</button></div>
            <button className="generate-main-button" onClick={generate} disabled={loading || topic.trim().length < 3}>{loading ? <><RotateCcw className="spin" size={16} /> Génération…</> : <><Sparkles size={16} /> Générer le script</>}</button>
            {error && <div className="script-error">{error}</div>}
          </div>
          <div className="script-result" dir={alphabet === 'arabic' ? 'rtl' : 'ltr'}>
            {result ? <><div className="script-result-head"><span>{result.captions.length} segments</span><small>{result.engine}</small></div><p>{alphabet === 'arabic' ? result.scriptAr : result.script}</p></> : <div className="script-empty"><Sparkles size={24} /><strong>Ton script apparaîtra ici</strong><span>Il sera automatiquement transformé en captions avec timestamps.</span></div>}
          </div>
        </div>
        <div className="export-footer"><button className="manifest-button" onClick={onClose}>Annuler</button><button className="render-button" disabled={!result} onClick={() => result && onApply(result.captions)}><Check size={16} /> Utiliser ce script</button></div>
      </div>
    </div>
  );
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const shortcuts = [['Espace', 'Lecture / pause'], ['S', 'Découper au curseur'], ['Suppr', 'Supprimer le clip'], ['Ctrl + D', 'Dupliquer'], ['Ctrl + Z', 'Annuler'], ['Glisser un média', 'Déposer sur une piste et un timecode'], ['Clic droit clip', 'Ouvrir les actions rapides'], ['Double-clic média', 'Ajouter au curseur']];
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="help-dialog" onMouseDown={(event) => event.stopPropagation()}><div className="export-head"><div><span><CircleHelp size={19} /></span><div><h2>Aide Darja Studio</h2><p>Commandes principales de l’éditeur</p></div></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="help-body"><h3>Raccourcis</h3>{shortcuts.map(([key, action]) => <div className="shortcut-row" key={key}><kbd>{key}</kbd><span>{action}</span></div>)}<div className="help-note"><strong>Workflow conseillé</strong><span>Importe les médias, double-clique pour les ajouter, ajuste la timeline, génère les captions puis exporte le MP4.</span></div></div><div className="export-footer"><button className="render-button" onClick={onClose}><Check size={16} /> Compris</button></div></div></div>;
}

function ExportDialog({
  projectName,
  renderStatus,
  renderJob,
  onClose,
  onRender,
  onDownloadProject,
}: {
  projectName: string;
  renderStatus: 'idle' | 'sending' | 'ready' | 'error';
  renderJob: string | null;
  onClose: () => void;
  onRender: (settings: { format: string; fps: number; quality: 'standard' | 'high' | 'maximum'; fileName: string }) => void;
  onDownloadProject: () => void;
}) {
  const [fileName, setFileName] = useState(`${projectName.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'darja-video'}.mp4`);
  const [format, setFormat] = useState('1080x1920');
  const [fps, setFps] = useState(30);
  const [quality, setQuality] = useState<'standard' | 'high' | 'maximum'>('high');
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="export-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <div className="export-head">
          <div><span><Download size={19} /></span><div><h2>Exporter la vidéo</h2><p>{projectName}</p></div></div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="export-body">
          <div className="export-preview"><DemoVisual /><span>9:16</span></div>
          <div className="export-settings">
            <label>Nom du fichier<input value={fileName} onChange={(event) => setFileName(event.target.value)} /></label>
            <div className="export-row">
              <label>Résolution<select value={format} onChange={(event) => setFormat(event.target.value)}><option value="540x960">540 × 960</option><option value="720x1280">720 × 1280</option><option value="1080x1920">1080 × 1920</option></select></label>
              <label>Images/sec<select value={fps} onChange={(event) => setFps(Number(event.target.value))}><option value="24">24 FPS</option><option value="30">30 FPS</option><option value="60">60 FPS</option></select></label>
            </div>
            <div className="export-row">
              <label>Format<div className="export-static-field">MP4 · H.264</div></label>
              <label>Qualité<select value={quality} onChange={(event) => setQuality(event.target.value as 'standard' | 'high' | 'maximum')}><option value="standard">Standard</option><option value="high">Élevée</option><option value="maximum">Maximum</option></select></label>
            </div>
            <div className="export-summary"><div><Sparkles size={17} /><span><strong>Moteur FFmpeg self-hosted prêt</strong><small>32 s · MP4 H.264 · audio AAC · captions intégrées</small></span></div><Check size={17} /></div>
            {renderStatus === 'ready' && (
              <div className="render-message success"><Check size={16} /><span><strong>Export terminé · {renderJob}</strong>Le fichier MP4 a été généré et téléchargé dans ton navigateur.</span></div>
            )}
            {renderStatus === 'error' && <div className="render-message error">Impossible de préparer le job de rendu.</div>}
          </div>
        </div>
        <div className="export-footer">
          <button className="manifest-button" onClick={onDownloadProject}>Télécharger le projet JSON</button>
          <button className="render-button" onClick={() => onRender({ format, fps, quality, fileName })} disabled={renderStatus === 'sending' || !fileName.trim()}>
            {renderStatus === 'sending' ? <><RotateCcw className="spin" size={17} /> Rendu MP4 en cours…</> : <><Download size={17} /> Exporter le MP4</>}
          </button>
        </div>
      </div>
    </div>
  );
}
