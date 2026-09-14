# Darja Video Studio

Plateforme de création vidéo en darija avec deux expériences : un workflow automatique simple par défaut et un éditeur multipiste avancé. Construite avec Next.js, React et un moteur FFmpeg self-hosted.

## Démarrage

```bash
npm install
npm run dev
```

## Fonctionnalités actives

- workflow voice-first : upload voix off → transcription automatique → script/captions mot par mot → vidéos → styles → montage ;
- transcription locale de la voix en Darija/arabe/français avec Whisper ONNX open source ;
- import optionnel des scripts/timestamps exacts `{ word, start, end }` fournis par la plateforme voix ;
- correction manuelle du texte transcrit et réalignement disponible ;
- captions karaoke mot par mot dans la preview et l’export FFmpeg/ASS ;
- planificateur sémantique qui associe chaque scène aux noms/descriptions des médias ;
- 24 styles complets : 8 Darija, 8 arabes et 8 français ;
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

## API

- `POST /api/assets` : stockage d’un média ;
- `GET /api/assets/:filename` : lecture avec support Range ;
- `POST /api/render` : composition et téléchargement du MP4 ;
- `POST /api/script` : génération locale du script darija ;
- `POST /api/align` : alignement mot par mot exact ou estimé ;
- `POST /api/transcribe` : génération locale du script, des captions et timestamps depuis la voix ;
- `POST /api/plan` : sélection sémantique des plans pour chaque scène.

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
