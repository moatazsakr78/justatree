/**
 * Modern Template (عصري) - Component Exports
 *
 * A clean, modern, editorial-inspired e-commerce theme.
 * Features: grid-based product display, bottom navigation (mobile),
 * category pills, modern card design with hover effects.
 */

export { default as MobileHome } from './MobileHome';
export { default as TabletHome } from './TabletHome';
export { default as DesktopHome } from './DesktopHome';

// Re-export types for convenience
export type { UserInfo, Product, ProductColor, ProductShape, ProductSize } from '@/components/website/shared/types';
