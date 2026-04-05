'use client'

import { useState, useEffect } from 'react'
import SocialMediaGrid from '@/components/website/SocialMediaGrid'
import { useCompanySettings } from '@/lib/hooks/useCompanySettings'
import { useStoreTheme } from '@/lib/hooks/useStoreTheme'
import { useSocialMediaPublic, SocialMediaLink } from '@/lib/hooks/useSocialMedia'

/**
 * Social Media Page - Client Component
 *
 * Uses the same header style as the shipping page
 */

export default function SocialMediaPage() {
  const { links, settings, isLoading: isSocialLoading } = useSocialMediaPublic()
  const { companyName, logoUrl, isLoading: isCompanyLoading } = useCompanySettings()
  const { primaryColor, isLoading: isThemeLoading } = useStoreTheme()

  const isLoading = isSocialLoading || isCompanyLoading || isThemeLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - Same style as shipping page */}
      <header className="border-b border-gray-700 py-0 sticky top-0 z-10" style={{backgroundColor: 'var(--primary-color)'}}>
        <div className="max-w-[80%] mx-auto px-4 flex items-center justify-between min-h-[80px]">
          {/* Right - Logo and Company Name */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 rounded-lg flex items-center justify-center">
                <img
                  src={logoUrl || '/assets/logo/justatree.png'}
                  alt="Logo"
                  className="h-full w-full object-contain rounded-lg"
                />
              </div>
              <h1 className="text-xl font-bold text-white">{companyName}</h1>
            </div>
          </div>

          {/* Center - Title */}
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">Social Media</h2>
          </div>

          {/* Left - Back Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/'}
              className="text-gray-300 hover:text-red-400 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              العودة للمتجر
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-6">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            تابعنا على السوشيال ميديا
          </h2>
          <p className="text-gray-600">
            ابق على تواصل معنا عبر منصات التواصل الاجتماعي
          </p>
        </div>

        {/* Social Media Grid */}
        <div className="max-w-4xl mx-auto">
          {links.length > 0 ? (
            <SocialMediaGrid
              links={links}
              iconShape={settings?.icon_shape || 'square'}
              className="px-4"
            />
          ) : (
            /* Empty State */
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="mb-4">
                <svg
                  className="w-20 h-20 mx-auto text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                لا توجد حسابات حالياً
              </h3>
              <p className="text-gray-500">
                سيتم إضافة حسابات التواصل الاجتماعي قريباً
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} Just A Tree</p>
      </footer>
    </div>
  )
}
