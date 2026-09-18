'use client';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Coins,
  Download,
  Film,
  Link2,
  Loader2,
  Mic2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud,
  Wand2,
  X,
} from 'lucide-react';
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';

type Step = 'voice' | 'videos' | 'style' | 'result';
type VoiceMode = 'sawtify' | 'sawtify-file' | 'manual';
type CaptionLanguage = 'source' | 'ar' | 'fr' | 'en' | 'darija';

type VoiceAsset = { storageId: string; url: string; name: string; duration?: number };
type VideoAsset = { id: string; storageId: string; url: string; name: string; kind: 'video' | 'image'; duration?: number; description: string };
type WordTiming = { word: string; start: number; end: number; confidence?: number };
type AlignedCaption = { id: string; start: number; end: number; text: string; words?: WordTiming[] };
type Scene = { sceneId: string; assetId: string; start: number; duration: number; sourceStart: number; transition: string };

const CAPTION_LANGUAGES: Array<{ id: CaptionLanguage; label: string; sample: string }> = [
  { id: 'source', label: 'Langue d’origine', sample: 'AUTO' },
  { id: 'ar', label: 'Arabe', sample: 'عربي' },
  { id: 'fr', label: 'Français', sample: 'FR' },
  { id: 'en', label: 'Anglais', sample: 'EN' },
  { id: 'darija', label: 'Darija', sample: 'دارجة' },
];

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'voice', label: 'Voix off' },
  { id: 'videos', label: 'Vidéos' },
  { id: 'style', label: 'Captions' },
  { id: 'result', label: 'Résultat' },
];

function formatDuration(value?: number) {
  if (!value || !Number.isFinite(value)) return '—';
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return minutes > 0 ? `${minutes}min ${String(seconds).padStart(2, '0')}s` : `${seconds}s`;
}

function probeDuration(url: string, isAudio: boolean): Promise<number | undefined> {
  return new Promise((resolve) => {
    const element = document.createElement(isAudio ? 'audio' : 'video');
    const timer = window.setTimeout(() => resolve(undefined), 8000);
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      window.clearTimeout(timer);
      resolve(Number.isFinite(element.duration) ? element.duration : undefined);
    };
    element.onerror = () => {
      window.clearTimeout(timer);
      resolve(undefined);
    };
    element.src = url;
  });
}

async function uploadToAssets(file: File): Promise<{ storageId: string; url: string; name: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/assets', { method: 'POST', body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Upload impossible');
  return { storageId: data.storageId, url: data.url, name: file.name };
}

export function QuickStudio() {
  const [step, setStep] = useState<Step>('voice');

  // Étape 1 — voix off + script
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('sawtify');
  const [sawtifyUrl, setSawtifyUrl] = useState('');
  const [sawtifyScript, setSawtifyScript] = useState('');
  const [manualScript, setManualScript] = useState('');
  const [voice, setVoice] = useState<VoiceAsset | null>(null);
  const [script, setScript] = useState('');
  const [wordTimestamps, setWordTimestamps] = useState<WordTiming[]>([]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const sawtifyFileInputRef = useRef<HTMLInputElement>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [pointsLoading, setPointsLoading] = useState(true);

  // Étape 2 — vidéos
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Étape 3 — captions + génération
  const [captionLanguage, setCaptionLanguage] = useState<CaptionLanguage>('source');
  const [generating, setGenerating] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Résultat
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState('video-finale.mp4');

  const targetDuration = voice?.duration;

  const stepIndex = useMemo(() => STEPS.findIndex((item) => item.id === step), [step]);

  useEffect(() => {
    void fetch('/api/credits').then(async (response) => {
      const data = await response.json();
      setPoints(Number(data.points ?? 0));
    }).catch(() => setPoints(null)).finally(() => setPointsLoading(false));
  }, []);

  const importFromSawtify = async () => {
    setVoiceError(null);
    if (!sawtifyUrl.trim() || !sawtifyScript.trim()) {
      setVoiceError('Colle le lien audio Sawtify et le script généré.');
      return;
    }
    setVoiceLoading(true);
    try {
      const response = await fetch('/api/sawtify/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: sawtifyUrl.trim(), script: sawtifyScript.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import Sawtify impossible.");
      const duration = await probeDuration(data.url, true);
      setVoice({ storageId: data.storageId, url: data.url, name: data.name, duration });
      setScript(data.script);
      setWordTimestamps(Array.isArray(data.wordTimestamps) ? data.wordTimestamps : []);
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : 'Import Sawtify impossible.');
    } finally {
      setVoiceLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const audioUrl = params.get('audioUrl');
    const importedScript = params.get('script');
    if (!audioUrl || !importedScript) return;
    setSawtifyUrl(audioUrl);
    setSawtifyScript(importedScript);
    void (async () => {
      setVoiceMode('sawtify');
      setVoiceLoading(true);
      setVoiceError(null);
      try {
        const response = await fetch('/api/sawtify/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioUrl, script: importedScript }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Import Sawtify impossible.');
        const duration = await probeDuration(data.url, true);
        setVoice({ storageId: data.storageId, url: data.url, name: data.name, duration });
        setScript(data.script);
        setWordTimestamps(Array.isArray(data.wordTimestamps) ? data.wordTimestamps : []);
      } catch (error) {
        setVoiceError(error instanceof Error ? error.message : 'Import Sawtify impossible.');
      } finally {
        setVoiceLoading(false);
      }
    })();
  }, []);

  const importManualVoice = async (file?: File) => {
    setVoiceError(null);
    if (!file || !file.type.startsWith('audio')) {
      setVoiceError('Choisis un fichier audio (MP3, WAV, M4A…).');
      return;
    }
    if (manualScript.trim().length < 2) {
      setVoiceError('Colle le script exact de cette voix off avant d’importer.');
      return;
    }
    setVoiceLoading(true);
    try {
      const uploaded = await uploadToAssets(file);
      const duration = await probeDuration(uploaded.url, true);
      setVoice({ ...uploaded, duration });
      setScript(manualScript.trim());
      setWordTimestamps([]);
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : 'Import de la voix off impossible.');
    } finally {
      setVoiceLoading(false);
    }
  };

  const resetVoice = () => {
    setVoice(null);
    setScript('');
    setWordTimestamps([]);
    setSawtifyUrl('');
    setSawtifyScript('');
    setManualScript('');
    setVoiceError(null);
  };

  const importSawtifyFile = async (file?: File) => {
    setVoiceError(null);
    if (!file || !file.type.startsWith('audio')) {
      setVoiceError('Choisis un fichier audio Sawtify (MP3, WAV, M4A…).');
      return;
    }
    if (sawtifyScript.trim().length < 2) {
      setVoiceError('Colle le script Sawtify avant d’importer la voix.');
      return;
    }
    setVoiceLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('script', sawtifyScript.trim());
      const response = await fetch('/api/sawtify/import', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import Sawtify impossible.');
      const duration = await probeDuration(data.url, true);
      setVoice({ storageId: data.storageId, url: data.url, name: data.name, duration });
      setScript(data.script);
      setWordTimestamps(Array.isArray(data.wordTimestamps) ? data.wordTimestamps : []);
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : 'Import Sawtify impossible.');
    } finally {
      setVoiceLoading(false);
    }
  };

  const addVideoFiles = async (files: File[]) => {
    const compatible = files.filter((file) => file.type.startsWith('video') || file.type.startsWith('image'));
    if (!compatible.length) {
      setVideosError('Ajoute au moins une vidéo ou une image.');
      return;
    }
    setVideosError(null);
    setVideosLoading(true);
    try {
      const uploaded = await Promise.all(
        compatible.map(async (file, index) => {
          const asset = await uploadToAssets(file);
          const kind: 'video' | 'image' = file.type.startsWith('video') ? 'video' : 'image';
          const duration = await probeDuration(asset.url, false);
          return {
            id: `video-${Date.now().toString(36)}-${index}`,
            storageId: asset.storageId,
            url: asset.url,
            name: file.name,
            kind,
            duration,
            description: file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' '),
          } satisfies VideoAsset;
        }),
      );
      setVideos((items) => [...items, ...uploaded]);
    } catch (error) {
      setVideosError(error instanceof Error ? error.message : 'Upload des vidéos impossible.');
    } finally {
      setVideosLoading(false);
    }
  };

  const removeVideo = (id: string) => setVideos((items) => items.filter((item) => item.id !== id));
  const updateVideoDescription = (id: string, description: string) =>
    setVideos((items) => items.map((item) => (item.id === id ? { ...item, description } : item)));

  const generateFinalVideo = async () => {
    if (!voice || !script.trim() || !videos.length) return;
    setGenerating(true);
    setGenerateError(null);
    let charged = false;
    try {
      const creditResponse = await fetch('/api/credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'debit' }) });
      const creditData = await creditResponse.json();
      if (!creditResponse.ok) throw new Error(creditData.error || 'Points insuffisants.');
      setPoints(Number(creditData.points));
      charged = true;
      setProgressLabel('Synchronisation du script sur la voix off…');
      const alignResponse = await fetch('/api/align', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, duration: voice.duration ?? 30, wordTimestamps }),
      });
      const alignData = await alignResponse.json();
      if (!alignResponse.ok) throw new Error(alignData.error || 'Synchronisation impossible.');
      const duration: number = alignData.duration;
      const alignedCaptions: AlignedCaption[] = alignData.captions;

      setProgressLabel('Sélection intelligente des plans vidéo…');
      const planResponse = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone: 'energetic',
          captions: alignedCaptions,
          assets: videos.map((video) => ({ id: video.id, name: video.name, kind: video.kind, duration: video.duration, description: video.description })),
        }),
      });
      const planData = await planResponse.json();
      if (!planResponse.ok) throw new Error(planData.error || 'Montage automatique impossible.');
      const scenes: Scene[] = planData.scenes;

      let burnCaptions = alignedCaptions;
      if (captionLanguage !== 'source') {
        setProgressLabel('Traduction des captions (Gemini)…');
        const translateResponse = await fetch('/api/captions/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ captions: alignedCaptions, targetLanguage: captionLanguage }),
        });
        const translateData = await translateResponse.json();
        if (!translateResponse.ok) throw new Error(translateData.error || 'Traduction des captions impossible.');
        burnCaptions = translateData.captions;
      }

      setProgressLabel('Rendu final de la vidéo…');
      const videoKindById = new Map(videos.map((video) => [video.id, video.kind]));
      const renderPayload = {
        duration,
        fps: 30,
        format: '1080x1920',
        quality: 'high',
        projectName: 'Montage rapide',
        assets: [
          ...videos.map((video) => ({ id: video.id, name: video.name, kind: video.kind, storageId: video.storageId })),
          { id: 'voice-asset', name: voice.name, kind: 'audio', storageId: voice.storageId },
        ],
        tracks: [
          {
            id: 'video-track',
            kind: 'video',
            clips: scenes.map((scene) => ({
              id: scene.sceneId,
              trackId: 'video-track',
              assetId: scene.assetId,
              kind: videoKindById.get(scene.assetId) ?? 'video',
              name: '',
              start: scene.start,
              duration: scene.duration,
              sourceStart: scene.sourceStart,
              transitionIn: scene.transition,
              transitionDuration: 0.45,
              scale: 1,
              rotation: 0,
              opacity: 1,
              x: 0,
              y: 0,
            })),
          },
          {
            id: 'voice-track',
            kind: 'audio',
            clips: [
              { id: 'voice-clip', trackId: 'voice-track', assetId: 'voice-asset', kind: 'audio', name: voice.name, start: 0, duration, sourceStart: 0, volume: 1 },
            ],
          },
        ],
        captions: burnCaptions,
        captionStyle: { preset: 'impact', fontSize: 52, textColor: '#ffffff', accentColor: '#ff6b35', position: 78, uppercase: true, fontFamily: 'anton' },
      };

      const renderResponse = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renderPayload),
      });
      if (!renderResponse.ok) {
        const errorData = await renderResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Rendu final impossible.');
      }
      const blob = await renderResponse.blob();
      setResultUrl(URL.createObjectURL(blob));
      setResultName('video-finale.mp4');
      setStep('result');
    } catch (error) {
      if (charged) {
        await fetch('/api/credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'refund' }) }).catch(() => undefined);
        setPoints((current) => current === null ? current : current + 250);
      }
      setGenerateError(error instanceof Error ? error.message : 'Génération impossible.');
    } finally {
      setGenerating(false);
      setProgressLabel('');
    }
  };

  const restart = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    resetVoice();
    setVideos([]);
    setCaptionLanguage('source');
    setStep('voice');
  };

  const canGoToVideos = Boolean(voice && script.trim());
  const canGoToStyle = videos.length > 0;

  return (
    <div className="quick-studio">
      <div className="quick-top">
        <div className="quick-brand">
          <div className="quick-brand-mark">Q</div>
          <div>
            <strong>Quick Studio</strong>
            <span>Voix off → vidéos → montage → résultat</span>
          </div>
        </div>
        <a className="quick-back" href="/">
          <ArrowLeft size={15} /> Éditeur complet
        </a>
        <div className="quick-points"><Coins size={14} /><strong>{pointsLoading ? '…' : points ?? 0}</strong><span>points</span></div>
      </div>

      <div className="quick-steps">
        {STEPS.map((item, index) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={`quick-step-pill ${step === item.id ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}>
              <i>{index < stepIndex ? <Check size={11} /> : index + 1}</i>
              <span className="label">{item.label}</span>
            </div>
            {index < STEPS.length - 1 && <div className="quick-step-sep" />}
          </div>
        ))}
      </div>

      <div className="quick-body">
        <div className="quick-panel">
          {step === 'voice' && (
            <>
              <h1>Voix off &amp; script</h1>
              <p className="lead">Récupère la voix off directement depuis Sawtify, ou importe un fichier audio avec son script exact. Aucune génération de voix ici.</p>

              {!voice ? (
                <div className="quick-card">
                  <div className="quick-switch quick-switch-three">
                    <button className={voiceMode === 'sawtify' ? 'active' : ''} onClick={() => setVoiceMode('sawtify')}>
                      <Link2 size={14} /> Depuis Sawtify
                    </button>
                    <button className={voiceMode === 'sawtify-file' ? 'active' : ''} onClick={() => setVoiceMode('sawtify-file')}>
                      <Mic2 size={14} /> Audio + script
                    </button>
                    <button className={voiceMode === 'manual' ? 'active' : ''} onClick={() => setVoiceMode('manual')}>
                      <UploadCloud size={14} /> Import manuel
                    </button>
                  </div>

                  {voiceMode === 'sawtify' ? (
                    <>
                      <div className="quick-field">
                        <label>Lien audio Sawtify</label>
                        <input type="url" value={sawtifyUrl} onChange={(event) => setSawtifyUrl(event.target.value)} placeholder="https://sawtify.com/export/…mp3" />
                        <small>Le lien de téléchargement direct de la voix off générée sur Sawtify.</small>
                      </div>
                      <div className="quick-field">
                        <label>Script Sawtify</label>
                        <textarea value={sawtifyScript} onChange={(event) => setSawtifyScript(event.target.value)} placeholder="Colle ici le script tel qu'exporté depuis Sawtify…" maxLength={12000} />
                        <small>On récupère le script déjà généré par Sawtify, pas besoin de rappeler l’API à chaque fois.</small>
                      </div>
                      <button className="quick-primary" disabled={voiceLoading} onClick={() => void importFromSawtify()}>
                        {voiceLoading ? <Loader2 className="quick-spin" size={16} /> : <Link2 size={16} />}
                        {voiceLoading ? 'Import…' : 'Importer depuis Sawtify'}
                      </button>
                    </>
                  ) : voiceMode === 'sawtify-file' ? (
                    <>
                      <div className="quick-field">
                        <label>Script exporté depuis Sawtify</label>
                        <textarea value={sawtifyScript} onChange={(event) => setSawtifyScript(event.target.value)} placeholder="Colle le script généré dans Sawtify…" maxLength={12000} />
                      </div>
                      <input ref={sawtifyFileInputRef} type="file" accept="audio/*" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => void importSawtifyFile(event.target.files?.[0])} />
                      <button className="quick-dropzone" onClick={() => sawtifyFileInputRef.current?.click()} type="button">
                        <Mic2 size={22} />
                        <strong>{voiceLoading ? 'Import…' : 'Importer l’audio Sawtify'}</strong>
                        <span>Le son et le script sont envoyés ensemble</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="quick-field">
                        <label>Script exact de la voix off</label>
                        <textarea value={manualScript} onChange={(event) => setManualScript(event.target.value)} placeholder="Colle ici le texte exact utilisé pour générer cette voix off…" maxLength={12000} />
                      </div>
                      <input ref={voiceInputRef} type="file" accept="audio/*" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => void importManualVoice(event.target.files?.[0])} />
                      <button className="quick-dropzone" onClick={() => voiceInputRef.current?.click()} type="button">
                        <Mic2 size={22} />
                        <strong>{voiceLoading ? 'Import…' : 'Choisir le fichier audio'}</strong>
                        <span>MP3, WAV, M4A ou AAC</span>
                      </button>
                    </>
                  )}

                  {voiceError && (
                    <div className="quick-status error">
                      <AlertTriangle size={15} /> {voiceError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="quick-card">
                  <div className="quick-asset-row">
                    <i>
                      <Mic2 size={17} />
                    </i>
                    <div className="info">
                      <strong>{voice.name}</strong>
                      <small>Voix off prête · {formatDuration(voice.duration)}</small>
                    </div>
                    <button onClick={resetVoice} type="button" title="Retirer">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="quick-field">
                    <label>Script (modifiable si besoin)</label>
                    <textarea value={script} onChange={(event) => setScript(event.target.value)} maxLength={12000} />
                  </div>
                </div>
              )}

              <div className="quick-footer">
                <span />
                <button className="quick-primary" disabled={!canGoToVideos} onClick={() => setStep('videos')}>
                  Continuer <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {step === 'videos' && (
            <>
              <h1>Vidéos du montage</h1>
              <p className="lead">Ajoute les rushs à utiliser. Le montage choisira et découpera automatiquement les meilleurs segments pour coller à la durée de la voix off ({formatDuration(targetDuration)}).</p>

              <div className="quick-card">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*,image/*"
                  multiple
                  hidden
                  onChange={(event: ChangeEvent<HTMLInputElement>) => void addVideoFiles(Array.from(event.target.files ?? []))}
                />
                <div
                  className={`quick-dropzone ${dropActive ? 'active' : ''}`}
                  onClick={() => videoInputRef.current?.click()}
                  onDragOver={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDropActive(true); }}
                  onDragLeave={() => setDropActive(false)}
                  onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDropActive(false); void addVideoFiles(Array.from(event.dataTransfer.files)); }}
                >
                  <Film size={22} />
                  <strong>{videosLoading ? 'Import…' : 'Glisse tes vidéos ici, ou clique pour choisir'}</strong>
                  <span>MP4, MOV, WEBM ou images — plusieurs fichiers à la fois</span>
                </div>
                {videosError && (
                  <div className="quick-status error">
                    <AlertTriangle size={15} /> {videosError}
                  </div>
                )}
              </div>

              {videos.length > 0 && (
                <div className="quick-card">
                  {videos.map((video) => (
                    <div className="quick-asset-row" key={video.id}>
                      <i>
                        <Film size={16} />
                      </i>
                      <div className="info">
                        <strong>{video.name}</strong>
                        <small>{formatDuration(video.duration)}</small>
                      </div>
                      <input value={video.description} onChange={(event) => updateVideoDescription(video.id, event.target.value)} placeholder="Description (aide au montage auto)" />
                      <button onClick={() => removeVideo(video.id)} type="button" title="Retirer">
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="quick-footer">
                <button className="quick-secondary" onClick={() => setStep('voice')}>
                  <ArrowLeft size={16} /> Retour
                </button>
                <button className="quick-primary" disabled={!canGoToStyle} onClick={() => setStep('style')}>
                  Continuer <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {step === 'style' && (
            <>
              <h1>Langue des captions</h1>
              <p className="lead">Les captions mot-par-mot sont ajoutées automatiquement. Choisis leur langue d’affichage — la traduction est faite par Gemini si besoin.</p>

              <div className="quick-card">
                <div className="quick-lang-grid">
                  {CAPTION_LANGUAGES.map((language) => (
                    <button key={language.id} className={captionLanguage === language.id ? 'active' : ''} onClick={() => setCaptionLanguage(language.id)} type="button">
                      <strong>{language.sample}</strong>
                      {language.label}
                    </button>
                  ))}
                </div>
                <small style={{ color: 'var(--muted-2)' }}>
                  {captionLanguage === 'source' ? 'Les captions garderont la langue du script d’origine.' : 'La traduction Gemini adapte le texte, sans changer le timing global.'}
                </small>
              </div>

              {generating && (
                <div className="quick-card">
                  <div className="quick-status loading">
                    <Loader2 size={15} /> {progressLabel || 'Génération en cours…'}
                  </div>
                </div>
              )}
              {generateError && (
                <div className="quick-status error">
                  <AlertTriangle size={15} /> {generateError}
                </div>
              )}

              <div className="quick-footer">
                <button className="quick-secondary" disabled={generating} onClick={() => setStep('videos')}>
                  <ArrowLeft size={16} /> Retour
                </button>
                <button className="quick-primary quick-one-click" disabled={generating || points === null || points <= 1000} onClick={() => void generateFinalVideo()}>
                  {generating ? <Loader2 className="quick-spin" size={16} /> : <Wand2 size={16} />}
                  {generating ? 'Génération…' : 'Faire le montage en 1 clic · 250 pts'}
                </button>
              </div>
            </>
          )}

          {step === 'result' && resultUrl && (
            <>
              <h1>C’est prêt 🎬</h1>
              <p className="lead">Le montage, les coupes et les captions ont été générés automatiquement à partir de la voix off.</p>
              <video className="quick-result-video" src={resultUrl} controls playsInline />
              <div className="quick-result-actions">
                <a className="quick-download" href={resultUrl} download={resultName}>
                  <Download size={16} /> Télécharger le MP4
                </a>
                <button className="quick-restart" onClick={restart} type="button">
                  <RotateCcw size={16} /> Nouveau montage
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
