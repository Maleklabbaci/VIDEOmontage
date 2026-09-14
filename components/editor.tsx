'use client';

import {
  ArrowLeft,
  Check,
  CircleHelp,
  Cloud,
  Copy,
  Crop,
  Diamond,
  Download,
  Eye,
  FolderUp,
  Grid2X2,
  ImagePlus,
  Lock,
  LockOpen,
  Magnet,
  Maximize2,
  Mic2,
  MousePointer2,
  Move,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Scissors,
  Search,
  Settings2,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  UploadCloud,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ChangeEvent, CSSProperties, Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
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
  fontFamily: 'impact',
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
  const [exportOpen, setExportOpen] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [renderStatus, setRenderStatus] = useState<'idle' | 'sending' | 'ready' | 'error'>('idle');
  const [renderJob, setRenderJob] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
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
    () => tracks.flatMap((track, trackIndex) => track.kind === 'video'
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
    () => tracks.flatMap((track) => track.kind === 'text'
      ? track.clips.filter((clip) => currentTime >= clip.start && currentTime < clip.start + clip.duration)
      : []),
    [tracks, currentTime],
  );
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
    const tick = (now: number) => {
      const delta = Math.min(.1, (now - last) / 1000);
      last = now;
      setCurrentTime((time) => {
        const next = time + delta;
        if (next >= TOTAL_DURATION) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
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

  const addAssetToTimeline = (asset: MediaAsset) => {
    const defaultDuration = asset.kind === 'image' ? 4 : 6;
    const duration = Math.min(TOTAL_DURATION, Math.max(.5, asset.duration ?? defaultDuration));
    const start = Math.min(Math.max(0, currentTime), TOTAL_DURATION - duration);
    const clipId = `clip-${Date.now().toString(36)}`;
    const audioTrackId = `audio-${Date.now().toString(36)}`;
    commitTimeline((current) => {
      if (asset.kind === 'audio') {
        const audioNumber = current.filter((track) => track.kind === 'audio').length + 1;
        return [...current, {
          id: audioTrackId,
          name: `Audio ${audioNumber}`,
          kind: 'audio',
          locked: false,
          muted: false,
          clips: [{ id: clipId, trackId: audioTrackId, assetId: asset.id, kind: 'audio', name: asset.name, start, duration, sourceStart: 0, color: asset.color }],
        }];
      }
      const destination = current.find((track) => track.kind === 'video' && !track.locked);
      if (!destination) return current;
      return current.map((track) => track.id === destination.id ? {
        ...track,
        clips: [...track.clips, { id: clipId, trackId: track.id, assetId: asset.id, kind: asset.kind, name: asset.name, start, duration, sourceStart: 0, color: asset.color }],
      } : track);
    });
    setSelectedClipId(clipId);
    notify(`${asset.name} ajouté à ${formatTime(start)}`);
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

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const batchId = Date.now();
    const localEntries = files.map((file, index) => {
      const kind: MediaAsset['kind'] = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
      const url = URL.createObjectURL(file);
      const asset: MediaAsset = {
        id: `upload-${batchId}-${index}`,
        name: file.name,
        kind,
        url,
        color: PALETTE[(assets.length + index) % PALETTE.length],
      };
      return { file, asset, localUrl: url };
    });
    setAssets((list) => [...localEntries.map((entry) => entry.asset), ...list]);
    const firstVideo = localEntries.find((entry) => entry.asset.kind === 'video');
    if (firstVideo) setActiveVideoId(firstVideo.asset.id);
    notify(`${files.length} média${files.length > 1 ? 's' : ''} importé${files.length > 1 ? 's' : ''} · stockage en cours`);
    event.target.value = '';

    await Promise.all(localEntries.map(async ({ file, asset, localUrl }) => {
      const duration = await probeMediaDuration(file, localUrl);
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await fetch('/api/assets', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('upload failed');
        const uploaded = await response.json();
        setAssets((list) => list.map((item) => item.id === asset.id ? {
          ...item,
          storageId: uploaded.storageId,
          url: uploaded.url,
          duration,
        } : item));
        URL.revokeObjectURL(localUrl);
      } catch {
        setAssets((list) => list.map((item) => item.id === asset.id ? { ...item, duration } : item));
        notify(`${asset.name} reste local : stockage indisponible`);
      }
    }));
    notify('Médias prêts pour la preview et le rendu');
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
          captions,
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

  const captionText = scriptMode === 'arabic' ? currentCaption.textAr || currentCaption.text : currentCaption.text;
  const captionProgress = Math.min(1, Math.max(0, (currentTime - currentCaption.start) / .24));
  const captionFont = captionStyle.fontFamily === 'sans' ? 'Inter, sans-serif' : captionStyle.fontFamily === 'rounded' ? 'Arial Rounded MT Bold, Inter, sans-serif' : 'Impact, Arial Black, sans-serif';
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
          <button className="icon-button subtle" title="Retour" onClick={() => window.history.back()}>
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
          <div className="save-state"><Cloud size={13} /> Sauvegardé</div>
        </div>

        <div className="top-actions">
          <button className="icon-button" onClick={undo} disabled={!timelinePast.length && !pastStyles.length} title="Annuler">
            <Undo2 size={18} />
          </button>
          <button className="icon-button" onClick={redo} disabled={!timelineFuture.length && !futureStyles.length} title="Rétablir">
            <Redo2 size={18} />
          </button>
          <span className="top-divider" />
          <button className="preview-button" onClick={toggleFullscreen}><Eye size={17} /> Aperçu</button>
          <button className="export-button" onClick={() => { setExportOpen(true); setRenderStatus('idle'); }}>
            <Download size={17} /> Exporter
          </button>
          <div className="account-wrap">
            <button className="avatar" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen}>Y</button>
            {accountOpen && <div className="account-menu"><strong>Projet local</strong><span>Darja Studio self-hosted</span><button onClick={() => { downloadProject(); setAccountOpen(false); }}><Download size={14} /> Télécharger le projet</button><button onClick={() => { setHelpOpen(true); setAccountOpen(false); }}><CircleHelp size={14} /> Ouvrir l’aide</button></div>}
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

        <aside className="asset-panel">
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
                <div
                  dir={scriptMode === 'arabic' ? 'rtl' : 'ltr'}
                  className={`caption-on-canvas animation-${captionStyle.animation ?? 'pop'} ${captionStyle.shadow ? 'with-shadow' : ''} ${captionStyle.uppercase ? 'is-uppercase' : ''}`}
                >
                  <span>{captionText}</span>
                  <i />
                </div>
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
          <p className="media-helper">Double-clique un média pour l’ajouter au curseur.</p>
          <div className="media-grid">
            <button className="media-add" onClick={() => fileInputRef.current?.click()}><ImagePlus size={23} /><span>Ajouter</span></button>
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                className={`media-card ${activeVideoId === asset.id ? 'selected' : ''}`}
                onClick={() => {
                  if (asset.kind === 'video' && asset.url) setActiveVideoId(asset.id);
                  else notify('Double-clique pour ajouter ce média à la timeline');
                }}
                onDoubleClick={() => addAssetToTimeline(asset)}
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
          <select className="select-field" value={captionStyle.fontFamily ?? 'impact'} onChange={(event) => commitStyle({ fontFamily: event.target.value as CaptionStyle['fontFamily'] })}><option value="impact">Impact ExtraBold</option><option value="sans">Sans moderne</option><option value="rounded">Rounded Bold</option></select>
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
                  title={track.locked ? 'Déverrouiller' : 'Verrouiller'}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => toggleTrackLock(track.id)}
                >
                  {track.locked ? <Lock size={12} /> : <LockOpen size={12} />}
                </button>
              </div>
              <div
                className={`track-content-v2 ${track.locked ? 'locked' : ''}`}
                data-track-id={track.id}
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
    </section>
  );
}

function TimelineClipView({
  clip,
  track,
  selected,
  dragging,
  onSelect,
  onStartDrag,
}: {
  clip: TimelineClip;
  track: TimelineTrack;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
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
  const shortcuts = [['Espace', 'Lecture / pause'], ['S', 'Découper au curseur'], ['Suppr', 'Supprimer le clip'], ['Ctrl + D', 'Dupliquer'], ['Ctrl + Z', 'Annuler'], ['Double-clic média', 'Ajouter à la timeline']];
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
