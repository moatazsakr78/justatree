/**
 * Supabase Image URL Utility
 *
 * DISABLED: Supabase Image Transforms were consuming 1,863% of the Pro Plan quota
 * (100 transforms/month limit). Functions now return original storage URLs.
 * Next.js/Vercel image optimization handles resizing where <Image> is used.
 *
 * Presets and types are kept for potential future use or migration to next/image sizes.
 */

export type ImagePreset = 'card_desktop' | 'card_tablet' | 'card_mobile' | 'search_thumb'
  | 'detail_main' | 'detail_thumb' | 'detail_shape';

interface TransformOptions {
  width: number;
  quality?: number;
}

const PRESETS: Record<ImagePreset, TransformOptions> = {
  card_desktop: { width: 400, quality: 75 },
  card_tablet: { width: 350, quality: 75 },
  card_mobile: { width: 250, quality: 70 },
  search_thumb: { width: 128, quality: 70 },
  detail_main:  { width: 800, quality: 80 },
  detail_thumb: { width: 100, quality: 70 },
  detail_shape: { width: 80,  quality: 70 },
};

/**
 * Returns the original image URL without Supabase Image Transforms.
 * Previously converted URLs to /render/image/ path — disabled due to quota overuse.
 */
export function getTransformedImageUrl(
  src: string | null | undefined,
  presetOrOptions: ImagePreset | TransformOptions
): string {
  if (!src) return '/placeholder-product.svg';
  return src;
}

/**
 * Get the appropriate image preset for a device type
 */
export function getPresetForDevice(deviceType: 'desktop' | 'tablet' | 'mobile'): ImagePreset {
  switch (deviceType) {
    case 'desktop': return 'card_desktop';
    case 'tablet': return 'card_tablet';
    case 'mobile': return 'card_mobile';
  }
}

/**
 * Generate an array of transformed URLs for background preloading
 */
export function getTransformedUrls(
  images: (string | null | undefined)[],
  presetOrOptions: ImagePreset | TransformOptions
): string[] {
  return images
    .filter((img): img is string => !!img)
    .map(img => getTransformedImageUrl(img, presetOrOptions));
}
