// Client-specific configuration - DO NOT commit this file
// Copy from client.config.example.ts and customize for each client

export const CLIENT_CONFIG = {
  // Database Schema
  schema: 'justatree' as const,
  supabaseProjectId: 'hecedrbnbknohssgaoso',

  // Branding
  appName: 'Just A Tree Store',
  shortName: 'justatree',
  companyName: 'Just A Tree',
  description: 'متجرك المتكامل للحصول على أفضل المنتجات بأسعار مميزة وجودة عالية',

  // Theme Colors
  themeColor: '#DC2626',
  backgroundColor: '#111827',
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',

  // Logo
  logoPath: '/assets/logo/justatree.png',

  // Currency
  defaultCurrency: 'ريال',
  websiteCurrency: 'جنيه',

  // Language
  lang: 'ar',
  dir: 'rtl' as const,
}

export type SchemaName = typeof CLIENT_CONFIG.schema
