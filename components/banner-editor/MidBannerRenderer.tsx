'use client';

import React, { useState } from 'react';
import type { HeroBanner, DeviceMode } from './types';
import BannerEditorFull from './BannerEditor';

// Decorative SVGs
const LeafPattern = ({ className = '', opacity = 0.05 }: { className?: string; opacity?: number }) => (
  <svg className={className} viewBox="0 0 200 200" fill="white" opacity={opacity} xmlns="http://www.w3.org/2000/svg">
    <path d="M40,20 C60,10 80,30 70,50 C60,70 30,60 40,20Z"/>
    <path d="M150,40 C170,30 190,50 180,70 C170,90 140,80 150,40Z"/>
    <path d="M80,120 C100,110 120,130 110,150 C100,170 70,160 80,120Z"/>
    <path d="M160,150 C180,140 200,160 190,180 C180,200 150,190 160,150Z"/>
    <path d="M20,100 C40,90 60,110 50,130 C40,150 10,140 20,100Z"/>
  </svg>
);

const TreeSilhouette = ({ className = '', color = 'white', opacity = 0.03 }: { className?: string; color?: string; opacity?: number }) => (
  <svg className={className} viewBox="0 0 100 120" fill={color} opacity={opacity}>
    <path d="M50,5 L30,40 L38,40 L20,70 L35,70 L15,100 L85,100 L65,70 L80,70 L62,40 L70,40 Z"/>
    <rect x="45" y="100" width="10" height="20" fill={color}/>
  </svg>
);

// Simplified element renderer for mid banner
function RenderElement({ element, width, height }: { element: any; width: number; height: number }) {
  const left = (element.position.x / 100) * width;
  const top = (element.position.y / 100) * height;
  const w = (element.size.width / 100) * width;
  const h = (element.size.height / 100) * height;
  const scale = height / 200;

  const style: React.CSSProperties = {
    position: 'absolute', left, top, width: w, height: h,
    zIndex: element.zIndex, opacity: element.opacity, pointerEvents: 'none',
  };

  switch (element.type) {
    case 'text':
      return (
        <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: element.content.textAlign === 'center' ? 'center' : 'flex-end' }}>
          <span style={{
            fontSize: `${(element.content.fontSize || 20) * scale}px`,
            fontWeight: element.content.fontWeight || '700',
            color: element.content.color || '#FFFFFF',
            textAlign: element.content.textAlign || 'right',
            width: '100%', wordBreak: 'break-word',
          }}>{element.content.text}</span>
        </div>
      );
    case 'cta_button':
      return (
        <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>
          <button style={{
            padding: `${12 * scale}px ${32 * scale}px`,
            borderRadius: `${element.content.borderRadius || 50}px`,
            fontWeight: '700', fontSize: `${16 * scale}px`,
            backgroundColor: element.content.buttonBgColor || '#D4A574',
            color: element.content.buttonTextColor || '#1A2F23',
            border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {element.content.buttonText}
            <svg className="inline-block mr-2" width={16 * scale} height={16 * scale} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
        </div>
      );
    case 'image':
      return element.content.src ? (
        <div style={style}>
          <img src={element.content.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      ) : null;
    default:
      return null;
  }
}

interface MidBannerRendererProps {
  banners: HeroBanner[];
  isAdmin: boolean;
  theme: Record<string, string>;
  themeId?: string;
  deviceType?: DeviceMode;
}

export default function MidBannerRenderer({
  banners,
  isAdmin,
  theme,
  themeId = 'just-a-tree',
  deviceType = 'desktop',
}: MidBannerRendererProps) {
  const [isEditing, setIsEditing] = useState(false);

  const midBanner = banners.filter(b => b.slot === 'mid_banner');

  if (midBanner.length === 0 && !isAdmin) return null;

  const banner = midBanner[0];
  const bannerHeight = deviceType === 'mobile' ? 160 : 200;

  if (isEditing && banner) {
    return (
      <div className="mb-14 -mx-6">
        <BannerEditorFull
          initialBanners={midBanner}
          height={bannerHeight}
          isAdmin={true}
          theme={theme}
          themeId={themeId}
          deviceType={deviceType}
        />
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setIsEditing(false)}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            العودة للعرض
          </button>
        </div>
      </div>
    );
  }

  if (!banner) return null;

  return (
    <section
      className="mb-14 -mx-6 relative overflow-hidden group"
      style={{ height: `${bannerHeight}px`, background: banner.background_value }}
    >
      <LeafPattern className="absolute top-0 right-0 w-full h-full" opacity={0.06} />
      <TreeSilhouette className="absolute bottom-0 right-20 h-48 w-48" color="white" opacity={0.05} />

      {/* Render elements from DB */}
      <div className="absolute inset-0 z-10">
        {banner.elements?.map((el: any) => (
          <RenderElement
            key={el.id}
            element={el}
            width={typeof window !== 'undefined' ? window.innerWidth : 1280}
            height={bannerHeight}
          />
        ))}
      </div>

      {/* Admin edit button */}
      {isAdmin && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-3 left-3 z-20 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
          title="تعديل البانر"
        >
          <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
    </section>
  );
}
