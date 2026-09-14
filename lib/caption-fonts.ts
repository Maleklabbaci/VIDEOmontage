export type CaptionFontId =
  | 'cairo' | 'tajawal' | 'changa' | 'almarai' | 'noto-sans-arabic' | 'noto-kufi-arabic' | 'ibm-plex-sans-arabic' | 'readex-pro' | 'alexandria' | 'el-messiri'
  | 'inter' | 'poppins' | 'montserrat' | 'oswald' | 'bebas-neue' | 'anton' | 'barlow-condensed' | 'archivo-black' | 'raleway' | 'playfair-display' | 'libre-franklin' | 'roboto-slab' | 'nunito' | 'sora';

export type CaptionFontKey = CaptionFontId | 'impact' | 'sans' | 'rounded';

export type CaptionFontDefinition = {
  id: CaptionFontId;
  name: string;
  family: string;
  group: 'arabic' | 'latin';
  sample: string;
  weight: 400 | 700;
  packageName: string;
};

export const CAPTION_FONTS: CaptionFontDefinition[] = [
  { id: 'cairo', name: 'Cairo', family: 'Cairo', group: 'arabic', sample: 'دارجة', weight: 700, packageName: 'cairo' },
  { id: 'tajawal', name: 'Tajawal', family: 'Tajawal', group: 'arabic', sample: 'تجربة', weight: 700, packageName: 'tajawal' },
  { id: 'changa', name: 'Changa', family: 'Changa', group: 'arabic', sample: 'قوي', weight: 700, packageName: 'changa' },
  { id: 'almarai', name: 'Almarai', family: 'Almarai', group: 'arabic', sample: 'فيديو', weight: 700, packageName: 'almarai' },
  { id: 'noto-sans-arabic', name: 'Noto Sans Arabic', family: 'Noto Sans Arabic', group: 'arabic', sample: 'العربية', weight: 700, packageName: 'noto-sans-arabic' },
  { id: 'noto-kufi-arabic', name: 'Noto Kufi Arabic', family: 'Noto Kufi Arabic', group: 'arabic', sample: 'حديث', weight: 700, packageName: 'noto-kufi-arabic' },
  { id: 'ibm-plex-sans-arabic', name: 'IBM Plex Arabic', family: 'IBM Plex Sans Arabic', group: 'arabic', sample: 'واضح', weight: 700, packageName: 'ibm-plex-sans-arabic' },
  { id: 'readex-pro', name: 'Readex Pro', family: 'Readex Pro', group: 'arabic', sample: 'محتوى', weight: 700, packageName: 'readex-pro' },
  { id: 'alexandria', name: 'Alexandria', family: 'Alexandria', group: 'arabic', sample: 'إبداع', weight: 700, packageName: 'alexandria' },
  { id: 'el-messiri', name: 'El Messiri', family: 'El Messiri', group: 'arabic', sample: 'حكاية', weight: 700, packageName: 'el-messiri' },
  { id: 'inter', name: 'Inter', family: 'Inter', group: 'latin', sample: 'Darija', weight: 700, packageName: 'inter' },
  { id: 'poppins', name: 'Poppins', family: 'Poppins', group: 'latin', sample: 'Social', weight: 700, packageName: 'poppins' },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', group: 'latin', sample: 'MODERN', weight: 700, packageName: 'montserrat' },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', group: 'latin', sample: 'IMPACT', weight: 700, packageName: 'oswald' },
  { id: 'bebas-neue', name: 'Bebas Neue', family: 'Bebas Neue', group: 'latin', sample: 'VIRAL', weight: 400, packageName: 'bebas-neue' },
  { id: 'anton', name: 'Anton', family: 'Anton', group: 'latin', sample: 'GRAND', weight: 400, packageName: 'anton' },
  { id: 'barlow-condensed', name: 'Barlow Condensed', family: 'Barlow Condensed', group: 'latin', sample: 'STREET', weight: 700, packageName: 'barlow-condensed' },
  { id: 'archivo-black', name: 'Archivo Black', family: 'Archivo Black', group: 'latin', sample: 'BOLD', weight: 400, packageName: 'archivo-black' },
  { id: 'raleway', name: 'Raleway', family: 'Raleway', group: 'latin', sample: 'Élégant', weight: 700, packageName: 'raleway' },
  { id: 'playfair-display', name: 'Playfair Display', family: 'Playfair Display', group: 'latin', sample: 'Édito', weight: 700, packageName: 'playfair-display' },
  { id: 'libre-franklin', name: 'Libre Franklin', family: 'Libre Franklin', group: 'latin', sample: 'Propre', weight: 700, packageName: 'libre-franklin' },
  { id: 'roboto-slab', name: 'Roboto Slab', family: 'Roboto Slab', group: 'latin', sample: 'Story', weight: 700, packageName: 'roboto-slab' },
  { id: 'nunito', name: 'Nunito', family: 'Nunito', group: 'latin', sample: 'Friendly', weight: 700, packageName: 'nunito' },
  { id: 'sora', name: 'Sora', family: 'Sora', group: 'latin', sample: 'Digital', weight: 700, packageName: 'sora' },
];

const LEGACY_FONT_MAP: Record<string, CaptionFontId> = { impact: 'anton', sans: 'inter', rounded: 'nunito' };

export function getCaptionFont(id?: string) {
  const normalized = LEGACY_FONT_MAP[id ?? ''] ?? id ?? 'anton';
  return CAPTION_FONTS.find((font) => font.id === normalized) ?? CAPTION_FONTS.find((font) => font.id === 'anton')!;
}
