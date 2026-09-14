import type { Metadata } from 'next';
import './globals.css';

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
