# Darja Video Studio

Prototype autonome d'un éditeur vidéo web en darija, construit avec Next.js et React.

## Démarrage

```bash
npm install
npm run dev
```

## Déjà présent

- médiathèque avec import local vidéo/image/audio ;
- aperçu vertical et lecture synchronisée ;
- captions darija basées sur des timestamps ;
- styles, couleurs, position, ombre et presets ;
- timeline multipiste, zoom et déplacement de la tête de lecture ;
- panneaux modèles, transitions et effets ;
- undo/redo des styles de captions ;
- contrat API initial pour les jobs de rendu.

## Prochaine couche de production

- stockage objet (S3/R2) et base PostgreSQL ;
- worker Remotion + FFmpeg isolé ;
- waveform audio et vraie timeline de clips ;
- autosave, comptes, collaboration et file de jobs ;
- export MP4 H.264/H.265 et suivi de progression.
