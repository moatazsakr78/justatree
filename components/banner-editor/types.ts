// Banner Editor Types

export interface BannerElementContent {
  // image
  src?: string;
  alt?: string;
  objectFit?: 'contain' | 'cover';
  // text
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: 'right' | 'center' | 'left';
  textShadow?: string;
  lineHeight?: number;
  // badge
  badgeText?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  // cta_button
  buttonText?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonLink?: string;
  borderRadius?: number;
}

export interface BannerElement {
  id: string;
  type: 'image' | 'text' | 'badge' | 'cta_button';
  position: { x: number; y: number }; // % of canvas (0-100)
  size: { width: number; height: number }; // % of canvas
  rotation: number;
  zIndex: number;
  opacity: number;
  content: BannerElementContent;
}

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export interface HeroBanner {
  id: string;
  name: string | null;
  display_order: number;
  is_active: boolean;
  theme_id: string;
  background_type: 'gradient' | 'color' | 'image';
  background_value: string;
  canvas_width: number;
  canvas_height: number;
  elements: BannerElement[];
  tablet_elements: BannerElement[];
  mobile_elements: BannerElement[];
  cta_link: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export interface BannerEditorProps {
  banners: HeroBanner[];
  themeId: string;
  height: number;
  isAdmin: boolean;
  theme: Record<string, string>;
  onBannersUpdate?: () => void;
}

// Fallback slide type matching current HERO_SLIDES
export interface FallbackSlide {
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  gradient: string;
}
