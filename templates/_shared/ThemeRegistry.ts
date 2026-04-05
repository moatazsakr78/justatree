/**
 * Website Theme Registry
 *
 * Maps theme IDs to their lazy import loaders for code-splitting.
 * Only the active theme's JS is downloaded by the browser.
 *
 * To add a new theme:
 * 1. Create folder in templates/{theme-name}/
 * 2. Add registerTheme() call below
 */

import type { ThemeExports, ThemeMetadata } from './ThemeContract';

type LazyThemeLoader = () => Promise<ThemeExports>;

interface ThemeRegistryEntry {
  metadata: ThemeMetadata;
  load: LazyThemeLoader;
}

const registry: Record<string, ThemeRegistryEntry> = {};

export function registerTheme(metadata: ThemeMetadata, loader: LazyThemeLoader) {
  registry[metadata.id] = { metadata, load: loader };
}

export function getThemeLoader(themeId: string): LazyThemeLoader | null {
  return registry[themeId]?.load ?? null;
}

export function getThemeMetadata(themeId: string): ThemeMetadata | null {
  return registry[themeId]?.metadata ?? null;
}

export function getRegisteredThemes(): ThemeMetadata[] {
  return Object.values(registry).map(entry => entry.metadata);
}

// ============================================
// Register all available themes below
// ============================================

registerTheme(
  {
    id: 'default',
    name: 'القالب الافتراضي',
    nameEn: 'Default',
    description: 'القالب الأصلي للمتجر - التصميم الكلاسيكي',
    author: 'Just A Tree',
    version: '1.0.0',
    thumbnail: '/themes/default/thumbnail.png',
  },
  () => import('@/templates/default') as Promise<ThemeExports>
);

registerTheme(
  {
    id: 'modern',
    name: 'عصري',
    nameEn: 'Modern',
    description: 'تصميم عصري وأنيق - عرض شبكي للمنتجات، شريط تنقل سفلي للموبايل، تصميم بطاقات حديث',
    author: 'Just A Tree',
    version: '1.0.0',
    thumbnail: '/themes/modern/thumbnail.png',
  },
  () => import('@/templates/modern') as Promise<ThemeExports>
);

registerTheme(
  {
    id: 'just-a-tree',
    name: 'مجرد شجرة',
    nameEn: 'Just A Tree',
    description: 'تصميم مستوحى من الطبيعة - أجواء نباتية فاخرة لمتاجر الأشجار والنباتات الزينة',
    author: 'Just A Tree',
    version: '1.0.0',
    thumbnail: '/themes/just-a-tree/thumbnail.png',
  },
  () => import('@/templates/just-a-tree') as Promise<ThemeExports>
);
