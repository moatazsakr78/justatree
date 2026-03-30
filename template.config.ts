/**
 * @deprecated This file is deprecated.
 * Website themes are now managed via the database (website_themes table)
 * and loaded dynamically through templates/_shared/ThemeRegistry.ts
 *
 * To change the active theme, use the Settings page → "قالب الموقع"
 * or update the website_themes table in the database.
 */

// Kept for backward compatibility - not used by the theme system anymore
export const ACTIVE_TEMPLATE = 'default';

export interface TemplateInfo {
  name: string;
  description: string;
  author?: string;
  version?: string;
}

export const TEMPLATES: Record<string, TemplateInfo> = {
  default: {
    name: 'Default Template',
    description: 'القالب الافتراضي للمتجر',
    author: 'El Farouk Group',
    version: '1.0.0'
  }
};
