# Darja Video Studio

Plateforme de création vidéo en darija avec deux expériences : un workflow automatique simple par défaut et un éditeur multipiste avancé. Construite avec Next.js, React et un moteur FFmpeg self-hosted.

## Démarrage

```bash
npm install
npm run dev
```

## Fonctionnalités actives

- workflow voice-first : upload voix off (ou génération de la voix off par IA depuis un script) → transcription automatique → script/captions mot par mot → vidéos → styles → montage ;
- génération de voix off par IA (TTS) directement depuis un script écrit ou généré, sans micro ni enregistrement ;
- transcription locale de la voix en Darija/arabe/français avec Whisper ONNX open source ;
- import optionnel des scripts/timestamps exacts `{ word, start, end }` fournis par la plateforme voix ;
- correction manuelle du texte transcrit et réalignement disponible ;
- captions karaoke mot par mot dans la preview et l’export FFmpeg/ASS ;
- captions configurables à 1, 2, 3 ou jusqu’à 10 mots, avec mode automatique ;
- taille de police 20–72 px, petite par défaut, position verticale et majuscules réglables ;
- découpage des captions indépendant des plans vidéo pour conserver un montage fluide ;
- planificateur sémantique qui associe chaque scène aux noms/descriptions des médias ;
- 24 thèmes complets : 8 Darija, 8 arabes et 8 français ;
- 24 vraies polices open source et self-hosted, choisissables indépendamment des thèmes ;
- 10 fonts arabe/Darija et 14 fonts Darija latin/français, identiques dans la preview et l’export FFmpeg ;
- interface responsive dédiée aux ordinateurs, tablettes et mobiles ;
- génération d’un projet/timeline complète en un clic ;
- export MP4 direct ou ouverture dans l’éditeur avancé ;
- import local par bouton ou drag-and-drop depuis l’ordinateur, puis stockage self-hosted ;
- drag-and-drop d’un média vers une piste et un timecode précis ;
- autosave/restauration du projet dans le navigateur ;
- streaming HTTP Range des médias lourds sans lecture complète en mémoire ;
- preview 9:16 composée depuis les clips réellement actifs sur la timeline ;
- synchronisation du temps global, des trims et des médias ;
- véritable timeline multipiste interactive ;
- sélection, déplacement horizontal et déplacement entre pistes compatibles ;
- trim non destructif avec `sourceStart`, split, duplication et suppression ;
- snapping magnétique, zoom, verrouillage, mute/visible et ajout de pistes ;
- menu clic droit sur les clips avec split, duplication et suppression ;
- raccourcis : espace, S, Suppr, Ctrl/Cmd+D et Ctrl/Cmd+Z ;
- générateur local de scripts darija par sujet, ton et durée ;
- sortie séparée en alphabet latin ou arabe, sans mélange d’alphabets ;
- insertion automatique du script en captions horodatées sur la timeline ;
- captions darija latin/arabe synchronisées par timestamps ;
- recherches et filtres Médias, Modèles et Transitions fonctionnels ;
- aide, plein écran, menu projet et options d’export fonctionnels ;
- textes libres ajoutés à une vraie piste ;
- transitions preview : fade, slide, zoom, flash, rotation et wipe ;
- transformation des clips : X, Y, échelle, rotation, opacité et crop ;
- keyframes interpolés dans la preview et rendus pour X, Y, échelle et rotation ;
- effets : enhance, grain, glow et motion blur ;
- panneaux Médias, Modèles, Texte, Captions, Audio, Transitions et Effets reliés à l’état du projet ;
- inspecteur contextuel vidéo/image, texte, audio ou captions ;
- upload avec lecture HTTP Range ;
- export MP4 réel en H.264 1080×1920, audio AAC et captions intégrées ;
- moteur FFmpeg isolé et entièrement self-hosted.

## Quick Studio (flow simplifié)

Accessible sur `/quick`. Pensé comme une appli haut niveau (pas un éditeur type DaVinci Resolve) en 4 étapes :

1. **Voix off + script** : soit importée depuis Sawtify (lien audio direct + script déjà généré, sans rappeler d'API TTS), soit un fichier audio uploadé manuellement avec son script exact collé à côté.
2. **Vidéos** : upload multiple/drag-and-drop des rushs, avec une courte description par clip pour aider le montage automatique.
3. **Captions** : choix de la langue d'affichage (langue d'origine, arabe, français, anglais ou darija) — traduites à la volée par Gemini si besoin.
4. **Résultat** : montage généré automatiquement, calé exactement sur la durée de la voix off, avec captions karaoke intégrées, prêt à télécharger.

Le montage réutilise le planificateur sémantique (`/api/plan`) pour associer chaque segment du script aux clips les plus pertinents et découper leur durée proportionnellement à la durée réelle de la voix off, puis le même moteur de rendu FFmpeg que l'éditeur avancé (`/api/render`).

### API additionnelles

- `POST /api/sawtify/import` : récupère la voix off + le script déjà générés par Sawtify (par lien `audioUrl` en JSON, ou par fichier direct en `multipart/form-data`), sans appeler de moteur TTS.
- `POST /api/captions/translate` : traduit/adapte les captions vers l'arabe, le français, l'anglais ou la darija via l'API Gemini. Nécessite une clé `GEMINI_API_KEY` côté serveur (variable optionnelle `GEMINI_MODEL`, par défaut `gemini-2.5-flash`). Sans clé, la route répond une erreur claire et l'interface reste utilisable en gardant la langue d'origine des captions.

## API

- `POST /api/assets` : stockage d’un média ;
- `GET /api/assets/:filename` : lecture avec support Range ;
- `POST /api/render` : composition et téléchargement du MP4 ;
- `POST /api/script` : génération locale du script darija ;
- `POST /api/align` : alignement mot par mot exact ou estimé ;
- `POST /api/transcribe` : génération locale du script, des captions et timestamps depuis la voix ;
- `POST /api/plan` : sélection sémantique des plans pour chaque scène ;
- `POST /api/voiceover` : génération d'une voix off par IA (TTS) à partir d'un script `{ script, language: "ar" | "fr" }`.

### Voix off par IA (TTS)

- Français : généré localement, gratuit, sans clé (moteur ONNX self-hosted `kokoro-js`, modèle `onnx-community/Kokoro-82M-v1.0-ONNX`, voix `ff_siwis`) ;
- Darija/arabe : nécessite une clé `ELEVENLABS_API_KEY` (meilleure qualité multilingue) côté serveur. Voix personnalisables via `DARJA_TTS_VOICE_AR` / `DARJA_TTS_VOICE_FR` (IDs de voix ElevenLabs). Sans clé, l'étape 1 affiche une erreur claire et invite à importer une voix off enregistrée en attendant ;
- la voix générée est ensuite retranscrite automatiquement par Whisper (comme un fichier importé) pour produire les captions mot par mot synchronisées.

Le modèle par défaut est `onnx-community/whisper-tiny_timestamped`. Pour une qualité Darija supérieure sur un serveur plus puissant :

```bash
DARJA_WHISPER_MODEL=onnx-community/whisper-small_timestamped npm run dev
```

Le modèle est téléchargé au premier usage puis conservé dans le cache local. `DARJA_WHISPER_CACHE` permet de choisir un répertoire de modèles persistant.

## À renforcer avant production

- jobs de rendu asynchrones avec Redis/BullMQ et progression ;
- stockage objet S3/R2/MinIO au lieu du disque local ;
- accélération WebCodecs côté navigateur et proxies basse résolution ;
- autosave PostgreSQL, comptes, permissions et collaboration ;
- keyframes d’opacité parfaitement identiques entre preview et FFmpeg ;
- rendu exact des transitions masque/flash et des textes libres ;
- tests E2E sur les grands projets et limites par utilisateur.

## Licence et déploiement

La pile d’édition reste sous notre contrôle. Le binaire `ffmpeg-static` utilisé ici est une build GPL incluant `libx264`. Pour une distribution commerciale, il faudra valider la stratégie de licence/codecs et éventuellement utiliser une build FFmpeg adaptée à l’infrastructure finale.
