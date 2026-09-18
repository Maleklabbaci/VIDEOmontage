import type { Metadata } from 'next';
import '@fontsource/cairo/700.css';
import '@fontsource/tajawal/700.css';
import '@fontsource/changa/700.css';
import '@fontsource/almarai/700.css';
import '@fontsource/noto-sans-arabic/700.css';
import '@fontsource/noto-kufi-arabic/700.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '@fontsource/readex-pro/700.css';
import '@fontsource/alexandria/700.css';
import '@fontsource/el-messiri/700.css';
import '@fontsource/inter/700.css';
import '@fontsource/poppins/700.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/oswald/700.css';
import '@fontsource/bebas-neue/400.css';
import '@fontsource/anton/400.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/archivo-black/400.css';
import '@fontsource/raleway/700.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/libre-franklin/700.css';
import '@fontsource/roboto-slab/700.css';
import '@fontsource/nunito/700.css';
import '@fontsource/sora/700.css';
import './globals.css';
import './timeline-v2.css';
import './composition.css';
import './interactions.css';
import './auto-studio.css';
import './voice-workflow.css';
import './transcription-workflow.css';
import './font-library.css';
import './caption-customizer.css';
import './quick-studio.css';

export const metadata: Metadata = {
  title: 'Darja Studio — Éditeur vidéo',
  description: 'Montage vidéo et captions en darija',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
