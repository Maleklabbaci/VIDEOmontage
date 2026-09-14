'use client';

import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Download,
  Eye,
  FolderUp,
  Grid2X2,
  ImagePlus,
  Languages,
  Lock,
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
  Type,
  Undo2,
  UploadCloud,
  Volume2,
  WandSparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ChangeEvent, CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import {
  Caption,
  CaptionStyle,
  demoCaptions,
  effects,
  MediaAsset,
  starterAssets,
  tabs,
  TabId,
  templates,
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

export function Editor() {
  const [activeTab, setActiveTab] = useState<TabId>('media');
  const [assets, setAssets] = useState<MediaAsset[]>(starterAssets);
  const [captions, setCaptions] = useState<Caption[]>(demoCaptions);
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
  const currentCaption = useMemo(
    () => captions.find((caption) => currentTime >= caption.start && currentTime < caption.end) ?? captions[0],
    [captions, currentTime],
  );

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

  const commitStyle = (patch: Partial<CaptionStyle>) => {
    setPastStyles((history) => [...history.slice(-29), captionStyle]);
    setFutureStyles([]);
    setCaptionStyle((style) => ({ ...style, ...patch }));
  };

  const undo = () => {
    const previous = pastStyles.at(-1);
    if (!previous) return;
    setFutureStyles((future) => [captionStyle, ...future]);
    setPastStyles((history) => history.slice(0, -1));
    setCaptionStyle(previous);
  };

  const redo = () => {
    const next = futureStyles[0];
    if (!next) return;
    setPastStyles((history) => [...history, captionStyle]);
    setFutureStyles((future) => future.slice(1));
    setCaptionStyle(next);
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
          <button className="icon-button" onClick={undo} disabled={!pastStyles.length} title="Annuler">
            <Undo2 size={18} />
          </button>
          <button className="icon-button" onClick={redo} disabled={!futureStyles.length} title="Rétablir">
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
          captions={captions}
          zoom={zoom}
          setZoom={setZoom}
          seek={seek}
          playing={playing}
          togglePlayback={togglePlayback}
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
          <div className="media-grid">
            <button className="media-add" onClick={() => fileInputRef.current?.click()}><ImagePlus size={23} /><span>Ajouter</span></button>
            {assets.map((asset) => (
              <button
                key={asset.id}
                className={`media-card ${activeVideoId === asset.id ? 'selected' : ''}`}
                onClick={() => {
                  if (asset.kind === 'video' && asset.url) setActiveVideoId(asset.id);
                  else notify(asset.url ? `${asset.name} ajouté à la sélection` : 'Média de démonstration');
                }}
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
  captions,
  zoom,
  setZoom,
  seek,
  playing,
  togglePlayback,
}: {
  currentTime: number;
  captions: Caption[];
  zoom: number;
  setZoom: (value: number) => void;
  seek: (time: number) => void;
  playing: boolean;
  togglePlayback: () => void;
}) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const setFromPointer = (clientX: number) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const labelWidth = 112;
    const x = Math.min(rect.width - labelWidth, Math.max(0, clientX - rect.left - labelWidth));
    seek((x / (rect.width - labelWidth)) * TOTAL_DURATION);
  };
  const rulerMarks = Array.from({ length: 9 }, (_, index) => index * 4);

  return (
    <section className="timeline-panel">
      <div className="timeline-toolbar">
        <div className="timeline-tools-left">
          <button className="icon-button small"><MousePointer2 size={16} /></button>
          <button className="icon-button small"><Scissors size={16} /></button>
          <span />
          <button className="icon-button small"><Undo2 size={16} /></button>
          <button className="icon-button small"><Redo2 size={16} /></button>
        </div>
        <div className="timeline-transport">
          <button onClick={() => seek(0)}><SkipBack size={15} /></button>
          <button onClick={togglePlayback}>{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button>
          <strong>{formatTime(currentTime, true)}</strong>
        </div>
        <div className="timeline-zoom">
          <button onClick={() => setZoom(Math.max(20, zoom - 10))}><ZoomOut size={15} /></button>
          <input aria-label="Zoom timeline" type="range" min="20" max="140" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <button onClick={() => setZoom(Math.min(140, zoom + 10))}><ZoomIn size={15} /></button>
          <button className="fit-button">Ajuster</button>
        </div>
      </div>

      <div
        className="timeline-body"
        ref={timelineRef}
        onMouseDown={(event) => setFromPointer(event.clientX)}
        style={{ '--timeline-scale': zoom / 78 } as CSSProperties}
      >
        <div className="track-label ruler-label"><span>PISTES</span></div>
        <div className="timeline-ruler">
          {rulerMarks.map((mark) => <span key={mark} style={{ left: `${(mark / TOTAL_DURATION) * 100}%` }}><i />{formatTime(mark)}</span>)}
        </div>

        <div className="track-label"><div className="track-icon video"><Grid2X2 size={14} /></div><span>Vidéo</span><Lock size={12} /></div>
        <div className="track-lane video-lane">
          <Clip className="clip-orange" start={0} end={8.2} name="Intro produit" />
          <Clip className="clip-violet" start={8.2} end={20.6} name="Plan lifestyle" />
          <Clip className="clip-green" start={20.6} end={30.4} name="B-roll téléphone" />
          <button className="clip-add" style={{ left: '95%' }}><Plus size={13} /></button>
          <span className="transition-dot" style={{ left: '25.6%' }}>×</span>
          <span className="transition-dot" style={{ left: '64.2%' }}>×</span>
        </div>

        <div className="track-label"><div className="track-icon caption"><Type size={14} /></div><span>Captions</span><Lock size={12} /></div>
        <div className="track-lane captions-lane">
          {captions.map((caption, index) => (
            <div key={caption.id} className={`caption-clip shade-${index % 3}`} style={{ left: `${(caption.start / TOTAL_DURATION) * 100}%`, width: `${((caption.end - caption.start) / TOTAL_DURATION) * 100}%` }}>
              <span>{caption.text}</span>
            </div>
          ))}
        </div>

        <div className="track-label"><div className="track-icon audio"><Volume2 size={14} /></div><span>Voix off</span><Lock size={12} /></div>
        <div className="track-lane audio-lane">
          <div className="audio-clip">
            <span className="waveform">{Array.from({ length: 58 }, (_, i) => <i key={i} style={{ height: `${18 + ((i * 17) % 68)}%` }} />)}</span>
            <strong>Voix off — Darija.wav</strong>
          </div>
        </div>

        <div className="playhead" style={{ left: `calc(112px + (100% - 112px) * ${currentTime / TOTAL_DURATION})` }}>
          <i /><span />
        </div>
      </div>
    </section>
  );
}

function Clip({ className, start, end, name }: { className: string; start: number; end: number; name: string }) {
  return (
    <div className={`video-clip ${className}`} style={{ left: `${(start / TOTAL_DURATION) * 100}%`, width: `${((end - start) / TOTAL_DURATION) * 100}%` }}>
      <i /><span>{name}</span><small>{formatTime(end - start)}</small>
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
              <div className="render-message success"><Check size={16} /><span><strong>Job {renderJob} créé</strong>Le contrat front/API est validé. Le worker Remotion + FFmpeg sera connecté à la prochaine phase pour produire le MP4.</span></div>
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
