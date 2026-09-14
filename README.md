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
- véritable timeline multipiste interactive ;
- sélection, déplacement horizontal et déplacement entre pistes compatibles ;
- trim gauche/droite, split, duplication et suppression ;
- snapping magnétique, zoom, verrouillage et ajout de pistes ;
- raccourcis clavier : espace, S, Suppr, Ctrl/Cmd+D et Ctrl/Cmd+Z ;
- ajout d’un média à la timeline par double-clic ;
- panneaux modèles, transitions et effets ;
- historique undo/redo de la timeline et des styles ;
- contrat API initial pour les jobs de rendu.

## Prochaine couche de production

- stockage objet (S3/R2) et base PostgreSQL ;
- worker FFmpeg/WebCodecs isolé et entièrement self-hosted ;
- waveform audio et vraie timeline de clips ;
- autosave, comptes, collaboration et file de jobs ;
- export MP4 H.264/H.265 et suivi de progression.
