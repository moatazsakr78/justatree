/**
 * Website Theme Contract
 *
 * Defines the interface that every website theme must implement.
 * Each theme folder must export components matching ThemeExports.
 */

import type { ComponentType } from 'react';

// Props that every home page component receives
export interface ThemeHomeProps {
  userInfo: {
    id: string;
    name: string;
    email: string;
    cart: any[];
    cartCount?: number;
  };
  onCartUpdate: (cart: any[]) => void;
  onRemoveFromCart: (productId: string | number) => void;
  onUpdateQuantity: (productId: string | number, quantity: number) => void;
  onClearCart: () => void;
}

// Required exports from every theme's index.ts
export interface ThemeExports {
  DesktopHome: ComponentType<ThemeHomeProps>;
  TabletHome: ComponentType<ThemeHomeProps>;
  MobileHome: ComponentType<ThemeHomeProps>;
}

// Theme metadata (in each theme's theme.config.ts)
export interface ThemeMetadata {
  id: string;           // Must match folder name
  name: string;         // Display name (Arabic)
  nameEn: string;       // Display name (English)
  description: string;  // Arabic description
  author: string;
  version: string;
  thumbnail: string;    // Path to preview image in public/
}
