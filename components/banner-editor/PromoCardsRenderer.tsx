'use client';

import React, { useState, useCallback } from 'react';
import type { HeroBanner, DeviceMode } from './types';
import BannerEditorFull from './BannerEditor';

// Decorative leaf pattern (reused)
const LeafPattern = ({ className = '', opacity = 0.05 }: { className?: string; opacity?: number }) => (
  <svg className={className} viewBox="0 0 200 200" fill="white" opacity={opacity} xmlns="http://www.w3.org/2000/svg">
    <path d="M40,20 C60,10 80,30 70,50 C60,70 30,60 40,20Z"/>
    <path d="M150,40 C170,30 190,50 180,70 C170,90 140,80 150,40Z"/>
    <path d="M80,120 C100,110 120,130 110,150 C100,170 70,160 80,120Z"/>
    <path d="M160,150 C180,140 200,160 190,180 C180,200 150,190 160,150Z"/>
    <path d="M20,100 C40,90 60,110 50,130 C40,150 10,140 20,100Z"/>
  </svg>
);

const LeafIcon = ({ size = 14, color = '#2D6A4F' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
  </svg>
);

// Render a single element at position (simplified for small cards)
function RenderElement({ element, width, height }: { element: any; width: number; height: number }) {
  const left = (element.position.x / 100) * width;
  const top = (element.position.y / 100) * height;
  const w = (element.size.width / 100) * width;
  const h = (element.size.height / 100) * height;
  const scale = height / 220;

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
        <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button style={{
            padding: `${8 * scale}px ${20 * scale}px`,
            borderRadius: `${element.content.borderRadius || 50}px`,
            fontWeight: '700', fontSize: `${12 * scale}px`,
            backgroundColor: element.content.buttonBgColor || 'rgba(255,255,255,0.95)',
            color: element.content.buttonTextColor || '#1B4332',
            border: 'none', whiteSpace: 'nowrap', pointerEvents: 'auto', cursor: 'pointer',
          }}>{element.content.buttonText}</button>
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

interface PromoCardsRendererProps {
  banners: HeroBanner[];
  isAdmin: boolean;
  theme: Record<string, string>;
  themeId?: string;
  deviceType?: DeviceMode;
}

export default function PromoCardsRenderer({
  banners,
  isAdmin,
  theme,
  themeId = 'just-a-tree',
  deviceType = 'desktop',
}: PromoCardsRendererProps) {
  const [editingCard, setEditingCard] = useState<number | null>(null);

  const promoCards = banners.filter(b => b.slot === 'promo_card').sort((a, b) => a.display_order - b.display_order);

  // Fallback: if no promo cards in DB, show nothing
  if (promoCards.length === 0 && !isAdmin) return null;

  // If editing a specific card, show the editor
  if (editingCard !== null && promoCards[editingCard]) {
    return (
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-6">
          <BannerEditorFull
            initialBanners={[promoCards[editingCard]]}
            height={220}
            isAdmin={true}
            theme={theme}
            themeId={themeId}
            deviceType={deviceType}
          />
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setEditingCard(null)}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              العودة للعرض
            </button>
          </div>
        </div>
      </section>
    );
  }

  const cols = deviceType === 'mobile' ? 'grid-cols-1' : deviceType === 'tablet' ? 'grid-cols-2' : 'grid-cols-3';
  const cardHeight = deviceType === 'mobile' ? 180 : 220;

  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className={`grid ${cols} gap-6`}>
          {promoCards.map((card, index) => (
            <div
              key={card.id}
              className="relative rounded-2xl overflow-hidden group cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
              style={{ height: `${cardHeight}px`, background: card.background_value }}
              onClick={() => isAdmin ? setEditingCard(index) : null}
            >
              <LeafPattern className="absolute top-0 left-0 w-full h-full" opacity={0.08} />
              <div className="absolute top-4 left-4 w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <LeafIcon size={20} color="rgba(255,255,255,0.6)" />
              </div>

              {/* Render elements from DB */}
              {card.elements?.map((el: any) => (
                <RenderElement key={el.id} element={el} width={400} height={cardHeight} />
              ))}

              {/* Hover overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' }}></div>

              {/* Admin edit indicator */}
              {isAdmin && (
                <div className="absolute top-2 right-2 z-10 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
