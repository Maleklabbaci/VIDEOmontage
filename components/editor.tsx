'use client';

import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Copy,
  Download,
  Eye,
  FolderUp,
  Grid2X2,
  ImagePlus,
  Languages,
  Lock,
  LockOpen,
  Magnet,
  Maximize2,
  Mic2,
  MoreHorizontal,
  MousePointer2,
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
  WandSparkles,
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
  return value.map((track) => ({ ...track, clips: track.clips.map((clip) => ({ ...clip })) }));
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
  const [renderStatus, setRenderStatus] = useState<'idle' | 'sending' | 'ready' | 'error'>('idle');
  const [renderJob, setRenderJob] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeVideo = useMemo(
    () => assets.find((asset) => asset.id === activeVideoId && asset.kind === 'video'),
    [assets, activeVideoId],
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
    if (!playing || activeVideo?.url) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
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
  }, [playing, activeVideo?.url]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume / 100;
  }, [volume]);

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
    if (activeVideo?.url && videoRef.current) {
      if (playing) {
        videoRef.current.pause();
        setPlaying(false);
      } else {
        if (videoRef.current.currentTime >= videoRef.current.duration) videoRef.current.currentTime = 0;
        await videoRef.current.play();
        setPlaying(true);
      }
      return;
    }
    setPlaying((value) => !value);
  };

  const seek = (time: number) => {
    const next = Math.min(TOTAL_DURATION, Math.max(0, time));
    setCurrentTime(next);
    if (videoRef.current && activeVideo?.url) {
      const videoDuration = Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : TOTAL_DURATION;
      videoRef.current.currentTime = Math.min(next, videoDuration);
    }
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

  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const nextAssets: MediaAsset[] = files.map((file, index) => {
      const kind: MediaAsset['kind'] = file.type.startsWith('video')
        ? 'video'
        : file.type.startsWith('audio')
          ? 'audio'
          : 'image';
      return {
        id: `upload-${Date.now()}-${index}`,
        name: file.name,
        kind,
        url: URL.createObjectURL(file),
        color: PALETTE[(assets.length + index) % PALETTE.length],
      };
    });
    setAssets((list) => [...nextAssets, ...list]);
    const firstVideo = nextAssets.find((asset) => asset.kind === 'video');
    if (firstVideo) setActiveVideoId(firstVideo.id);
    notify(`${files.length} média${files.length > 1 ? 's' : ''} ajouté${files.length > 1 ? 's' : ''}`);
    event.target.value = '';
  };

  const updateCurrentCaption = (text: string) => {
    setCaptions((items) => items.map((item) => (item.id === currentCaption.id ? { ...item, text } : item)));
    setTracks((items) => items.map((track) => track.id === 'captions' ? {
      ...track,
      clips: track.clips.map((clip) => clip.id === `timeline-${currentCaption.id}` ? { ...clip, name: text, text } : clip),
    } : track));
  };

  const createRenderJob = async () => {
    setRenderStatus('sending');
    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          duration: TOTAL_DURATION,
          format: '1080x1920',
          fps: 30,
          codec: 'h264',
          captions,
          captionStyle,
          tracks,
          assets: assets.map(({ id, name, kind, duration }) => ({ id, name, kind, duration })),
        }),
      });
      if (!response.ok) throw new Error('Render request failed');
      const data = await response.json();
      setRenderJob(data.jobId);
      setRenderStatus('ready');
    } catch {
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
      assets: assets.map(({ id, name, kind, duration }) => ({ id, name, kind, duration })),
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
  const captionCss: CSSProperties = {
    '--caption-color': captionStyle.textColor,
    '--caption-accent': captionStyle.accentColor,
    '--caption-bg': captionStyle.backgroundColor,
    '--caption-size': `${captionStyle.fontSize}px`,
    '--caption-position': `${captionStyle.position}%`,
  } as CSSProperties;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <button className="icon-button subtle" title="Retour">
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
          <button className="preview-button"><Eye size={17} /> Aperçu</button>
          <button className="export-button" onClick={() => { setExportOpen(true); setRenderStatus('idle'); }}>
            <Download size={17} /> Exporter
          </button>
          <button className="avatar">Y</button>
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
            <button className="rail-item"><CircleHelp size={20} /><span>Aide</span></button>
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
            notify={notify}
          />
          <input ref={fileInputRef} className="hidden-input" type="file" multiple accept="video/*,image/*,audio/*" onChange={onUpload} />
        </aside>

        <main className="workspace">
          <div className="workspace-bar">
            <button className="canvas-select"><MousePointer2 size={15} /> Sélection <ChevronDown size={14} /></button>
            <div className="canvas-actions">
              <button className="icon-button small" title="Découper"><Scissors size={16} /></button>
              <button className="icon-button small" title="Ajuster"><SlidersHorizontal size={16} /></button>
              <span className="zoom-label">Ajuster</span>
              <button className="icon-button small" title="Plein écran"><Maximize2 size={16} /></button>
            </div>
          </div>

          <div className="stage-area">
            <div className="stage-shadow">
              <div className={`video-canvas preset-${captionStyle.preset}`} style={captionCss}>
                {activeVideo?.url ? (
                  <video
                    ref={videoRef}
                    src={activeVideo.url}
                    playsInline
                    onTimeUpdate={(event) => setCurrentTime(Math.min(event.currentTarget.currentTime, TOTAL_DURATION))}
                    onEnded={() => setPlaying(false)}
                    onPause={() => setPlaying(false)}
                    onPlay={() => setPlaying(true)}
                  />
                ) : (
                  <DemoVisual />
                )}
                <div className="safe-zone" />
                <div
                  dir={scriptMode === 'arabic' ? 'rtl' : 'ltr'}
                  className={`caption-on-canvas ${captionStyle.shadow ? 'with-shadow' : ''} ${captionStyle.uppercase ? 'is-uppercase' : ''}`}
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

        <aside className="inspector-panel">
          <div className="inspector-head">
            <div><Type size={17} /><strong>Style des captions</strong></div>
            <button className="icon-button small"><MoreHorizontal size={18} /></button>
          </div>
          <div className="inspector-scroll">
            <section className="control-section">
              <label className="section-label">MODÈLES</label>
              <div className="preset-grid">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    className={`preset-card ${captionStyle.preset === preset.id ? 'active' : ''} ${preset.id}`}
                    onClick={() => commitStyle(preset.patch)}
                  >
                    <span>{preset.sample}</span>
                    <small>{preset.name}</small>
                    {captionStyle.preset === preset.id && <i><Check size={11} /></i>}
                  </button>
                ))}
              </div>
            </section>

            <section className="control-section">
              <div className="section-row"><label className="section-label">TYPOGRAPHIE</label><button>Réinitialiser</button></div>
              <button className="select-field"><strong>Montserrat ExtraBold</strong><ChevronDown size={15} /></button>
              <div className="triple-controls">
                <div><span>Taille</span><input type="number" value={captionStyle.fontSize} onChange={(e) => commitStyle({ fontSize: Number(e.target.value) })} /></div>
                <button className={captionStyle.uppercase ? 'toggle-button active' : 'toggle-button'} onClick={() => commitStyle({ uppercase: !captionStyle.uppercase })}>AA</button>
                <button className={captionStyle.shadow ? 'toggle-button active' : 'toggle-button'} onClick={() => commitStyle({ shadow: !captionStyle.shadow })}>S</button>
              </div>
            </section>

            <section className="control-section">
              <label className="section-label">COULEURS</label>
              <ColorControl label="Texte" value={captionStyle.textColor} onChange={(value) => commitStyle({ textColor: value })} />
              <ColorControl label="Accent" value={captionStyle.accentColor} onChange={(value) => commitStyle({ accentColor: value })} />
              <ColorControl label="Fond" value={captionStyle.backgroundColor} onChange={(value) => commitStyle({ backgroundColor: value })} />
            </section>

            <section className="control-section">
              <div className="section-row"><label className="section-label">POSITION</label><span>{captionStyle.position}%</span></div>
              <div className="position-control">
                <div className="phone-position"><i style={{ top: `${captionStyle.position}%` }} /></div>
                <input type="range" min="15" max="88" value={captionStyle.position} onChange={(e) => commitStyle({ position: Number(e.target.value) })} />
              </div>
            </section>

            <section className="control-section compact">
              <button className="expand-row"><WandSparkles size={17} /><span>Animation d’entrée</span><strong>Pop</strong><ChevronDown size={15} /></button>
              <button className="expand-row"><Languages size={17} /><span>Langue</span><strong>Darija DZ</strong><ChevronDown size={15} /></button>
            </section>
          </div>
        </aside>

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
  notify: (message: string) => void;
}) {
  if (activeTab === 'media') {
    return (
      <>
        <PanelHeader title="Médias" />
        <div className="panel-content">
          <button className="upload-button" onClick={() => fileInputRef.current?.click()}><UploadCloud size={17} /> Importer des médias</button>
          <div className="search-box"><Search size={15} /><input placeholder="Rechercher vos médias" /></div>
          <div className="panel-tabs"><button className="active">Tout</button><button>Vidéos</button><button>Images</button><button>Audio</button></div>
          <p className="media-helper">Double-clique un média pour l’ajouter au curseur.</p>
          <div className="media-grid">
            <button className="media-add" onClick={() => fileInputRef.current?.click()}><ImagePlus size={23} /><span>Ajouter</span></button>
            {assets.map((asset) => (
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
          <div className="search-box"><Search size={15} /><input placeholder="Rechercher un modèle" /></div>
          <div className="filter-chips"><button className="active">Pour vous</button><button>Reels</button><button>Ads</button></div>
          <div className="template-grid">
            {templates.map((template) => (
              <button key={template.id} className="template-card" onClick={() => notify(`${template.name} appliqué`)}>
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
          <div className="search-box"><Search size={15} /><input placeholder="Rechercher" /></div>
          <p className="helper-copy">Clique sur une transition pour l’ajouter entre les deux clips sélectionnés.</p>
          <div className="transition-grid">
            {transitions.map((transition) => (
              <button key={transition.id} onClick={() => notify(`Transition “${transition.name}” ajoutée`)}><span>{transition.symbol}</span><small>{transition.name}</small></button>
            ))}
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
            {effects.map(({ id, name, icon: Icon, color }) => (
              <button key={id} onClick={() => notify(`Effet “${name}” activé`)}>
                <i style={{ background: `${color}20`, color }}><Icon size={20} /></i>
                <span><strong>{name}</strong><small>Glisser sur un clip</small></span>
                <Plus size={17} />
              </button>
            ))}
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
          <button className="voice-card" onClick={() => notify('Voix off sélectionnée')}>
            <i><Mic2 size={22} /></i><span><strong>Voix off Darija</strong><small>00:32 · timestamps inclus</small></span><Play size={16} fill="currentColor" />
          </button>
          <label className="section-mini-title">RÉGLAGES</label>
          <div className="audio-setting"><span>Volume voix</span><strong>100%</strong></div>
          <div className="audio-setting"><span>Réduction du bruit</span><button className="switch-on"><i /></button></div>
          <div className="audio-setting"><span>Duck musique</span><strong>-14 dB</strong></div>
          <button className="upload-secondary" onClick={() => fileInputRef.current?.click()}><FolderUp size={16} /> Ajouter une piste audio</button>
        </div>
      </>
    );
  }

  return (
    <>
      <PanelHeader title="Texte" />
      <div className="panel-content">
        <button className="add-text-button" onClick={() => notify('Bloc de texte ajouté')}><Plus size={18} /> Ajouter un texte</button>
        <label className="section-mini-title">STYLES RAPIDES</label>
        <div className="text-styles">
          <button onClick={() => notify('Titre ajouté')}><strong>TITRE</strong><span>Montserrat Bold</span></button>
          <button onClick={() => notify('Sous-titre ajouté')}><strong>Sous-titre</strong><span>Inter Medium</span></button>
          <button onClick={() => notify('Texte arabe ajouté')} dir="rtl"><strong>عنوان بالدارجة</strong><span>Alexandria Bold</span></button>
        </div>
      </div>
    </>
  );
}

function PanelHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="panel-head">
      <div><h2>{title}</h2>{badge && <span>{badge}</span>}</div>
      <button className="icon-button small"><MoreHorizontal size={18} /></button>
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
          <button className="icon-button small active-tool" title="Outil de sélection"><MousePointer2 size={16} /></button>
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
      <span className="clip-copy">
        <strong>{clip.name}</strong>
        {clip.kind !== 'caption' && <small>{clip.duration.toFixed(1)}s</small>}
      </span>
      <button className="trim-handle right" aria-label="Raccourcir la fin" onPointerDown={(event) => onStartDrag(event, clip, track, 'trim-right')}><i /></button>
    </div>
  );
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
  onRender: () => void;
  onDownloadProject: () => void;
}) {
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
            <label>Nom du fichier<input defaultValue="demo-produit-darija.mp4" /></label>
            <div className="export-row">
              <label>Résolution<button>1080 × 1920 <ChevronDown size={14} /></button></label>
              <label>Images/sec<button>30 FPS <ChevronDown size={14} /></button></label>
            </div>
            <div className="export-row">
              <label>Format<button>MP4 · H.264 <ChevronDown size={14} /></button></label>
              <label>Qualité<button>Élevée <ChevronDown size={14} /></button></label>
            </div>
            <div className="export-summary"><div><Sparkles size={17} /><span><strong>Prêt pour le moteur de rendu</strong><small>32 s · environ 18 Mo · captions intégrées</small></span></div><Check size={17} /></div>
            {renderStatus === 'ready' && (
              <div className="render-message success"><Check size={16} /><span><strong>Job {renderJob} créé</strong>Le contrat front/API est validé. Le worker open source FFmpeg + WebCodecs sera connecté à la prochaine phase pour produire le MP4.</span></div>
            )}
            {renderStatus === 'error' && <div className="render-message error">Impossible de préparer le job de rendu.</div>}
          </div>
        </div>
        <div className="export-footer">
          <button className="manifest-button" onClick={onDownloadProject}>Télécharger le projet JSON</button>
          <button className="render-button" onClick={onRender} disabled={renderStatus === 'sending'}>
            {renderStatus === 'sending' ? <><RotateCcw className="spin" size={17} /> Préparation…</> : <><Sparkles size={17} /> Préparer le rendu</>}
          </button>
        </div>
      </div>
    </div>
  );
}
