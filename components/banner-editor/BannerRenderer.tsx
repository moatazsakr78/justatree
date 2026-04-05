'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { HeroBanner, BannerElement, FallbackSlide } from './types';
import { REFERENCE_CANVAS } from './constants';

interface BannerRendererProps {
  banners: HeroBanner[];
  height: number;
  isAdmin: boolean;
  theme: Record<string, string>;
  fallbackSlides?: FallbackSlide[];
  onEditClick?: () => void;
}

// Decorative SVG components
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

const LeafIcon = ({ size = 14, color = '#2D6A4F' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
  </svg>
);

// Render a single banner element at its position
function RenderElement({
  element,
  containerWidth,
  containerHeight,
  scaleFactor
}: {
  element: BannerElement;
  containerWidth: number;
  containerHeight: number;
  scaleFactor: number;
}) {
  const { position, size, rotation, zIndex, opacity, content, type } = element;

  // Convert percentages to pixels
  const left = (position.x / 100) * containerWidth;
  const top = (position.y / 100) * containerHeight;
  const width = (size.width / 100) * containerWidth;
  const height = (size.height / 100) * containerHeight;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    zIndex,
    opacity,
    pointerEvents: 'none',
  };

  switch (type) {
    case 'image':
      return (
        <div style={baseStyle}>
          <img
            src={content.src}
            alt={content.alt || ''}
            style={{
              width: '100%',
              height: '100%',
              objectFit: content.objectFit || 'contain',
            }}
            draggable={false}
          />
        </div>
      );

    case 'text':
      return (
        <div
          style={{
            ...baseStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: content.textAlign === 'center' ? 'center' : content.textAlign === 'left' ? 'flex-start' : 'flex-end',
          }}
        >
          <span
            style={{
              fontSize: `${(content.fontSize || 36) * scaleFactor}px`,
              fontWeight: content.fontWeight || '700',
              color: content.color || '#FFFFFF',
              textAlign: (content.textAlign as any) || 'right',
              textShadow: content.textShadow || 'none',
              lineHeight: content.lineHeight || 1.3,
              width: '100%',
              wordBreak: 'break-word',
            }}
          >
            {content.text}
          </span>
        </div>
      );

    case 'badge':
      return (
        <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: `${6 * scaleFactor}px ${16 * scaleFactor}px`,
              borderRadius: '9999px',
              fontSize: `${12 * scaleFactor}px`,
              fontWeight: '700',
              backgroundColor: content.backgroundColor || '#D4A57430',
              color: content.textColor || '#D4A574',
              border: `1px solid ${content.borderColor || '#D4A57450'}`,
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}
          >
            <LeafIcon size={12 * scaleFactor} color={content.textColor || '#D4A574'} />
            {content.badgeText}
          </span>
        </div>
      );

    case 'cta_button':
      return (
        <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            style={{
              padding: `${12 * scaleFactor}px ${32 * scaleFactor}px`,
              borderRadius: `${content.borderRadius || 50}px`,
              fontWeight: '700',
              fontSize: `${16 * scaleFactor}px`,
              backgroundColor: content.buttonBgColor || '#D4A574',
              color: content.buttonTextColor || '#1A2F23',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap',
              pointerEvents: 'auto',
            }}
            onClick={() => {
              if (content.buttonLink) {
                window.location.href = content.buttonLink;
              }
            }}
          >
            {content.buttonText}
            <svg className="inline-block mr-2" width={16 * scaleFactor} height={16 * scaleFactor} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
        </div>
      );

    default:
      return null;
  }
}

// Render fallback slides (original HERO_SLIDES format)
function FallbackRenderer({
  slides,
  activeSlide,
  setActiveSlide,
  height,
  theme,
}: {
  slides: FallbackSlide[];
  activeSlide: number;
  setActiveSlide: (i: number) => void;
  height: number;
  theme: Record<string, string>;
}) {
  return (
    <section className="relative overflow-hidden" style={{ height: `${height}px` }}>
      {slides.map((slide, index) => (
        <div
          key={index}
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background: slide.gradient,
            opacity: activeSlide === index ? 1 : 0,
            transform: activeSlide === index ? 'scale(1)' : 'scale(1.05)',
          }}
        >
          <LeafPattern className="absolute top-0 right-0 w-96 h-96" opacity={0.06} />
          <LeafPattern className="absolute bottom-0 left-0 w-72 h-72 rotate-180" opacity={0.04} />
          <TreeSilhouette className="absolute bottom-0 left-20 h-80 w-80" opacity={0.04} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(149,213,178,0.15) 0%, transparent 60%)' }}></div>
        </div>
      ))}

      <div className="absolute inset-0 z-10 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-xl">
            <span
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
              style={{ backgroundColor: `${theme.antiqueGold || '#D4A574'}30`, color: theme.antiqueGold || '#D4A574', border: `1px solid ${theme.antiqueGold || '#D4A574'}50` }}
            >
              <LeafIcon size={12} color={theme.antiqueGold || '#D4A574'} />
              {slides[activeSlide].badge}
            </span>
            <h2
              className="text-4xl md:text-5xl font-black mb-4 leading-tight"
              style={{ color: '#FFFFFF', textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}
            >
              {slides[activeSlide].title}
            </h2>
            <p className="text-lg mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {slides[activeSlide].subtitle}
            </p>
            <button
              className="px-8 py-3.5 rounded-full font-bold text-base transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
              style={{ backgroundColor: theme.antiqueGold || '#D4A574', color: theme.nightForest || '#1A2F23' }}
            >
              {slides[activeSlide].cta}
              <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveSlide(index)}
            className="transition-all duration-500"
            style={{
              width: activeSlide === index ? '32px' : '10px',
              height: '10px',
              borderRadius: '5px',
              backgroundColor: activeSlide === index ? (theme.antiqueGold || '#D4A574') : 'rgba(255,255,255,0.4)',
            }}
          />
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: `linear-gradient(to top, ${theme.warmLinen || '#F7F5F0'}, transparent)` }}></div>
    </section>
  );
}

export default function BannerRenderer({
  banners,
  height,
  isAdmin,
  theme,
  fallbackSlides,
  onEditClick,
}: BannerRendererProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(REFERENCE_CANVAS.width);

  const slideCount = banners.length || (fallbackSlides?.length || 0);

  // Auto-rotate slides
  useEffect(() => {
    if (slideCount <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slideCount);
    }, 5000);
    return () => clearInterval(interval);
  }, [slideCount]);

  // Track container width for responsive scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const scaleFactor = height / REFERENCE_CANVAS.height;

  // Use fallback if no banners from DB
  if (!banners || banners.length === 0) {
    if (fallbackSlides && fallbackSlides.length > 0) {
      return (
        <div className="relative">
          <FallbackRenderer
            slides={fallbackSlides}
            activeSlide={activeSlide}
            setActiveSlide={setActiveSlide}
            height={height}
            theme={theme}
          />
          {isAdmin && (
            <button
              onClick={onEditClick}
              className="absolute top-4 left-4 z-30 p-2.5 rounded-full transition-all duration-300 hover:scale-110"
              style={{
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
              title="تعديل البانر"
            >
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="relative" ref={containerRef}>
      <section className="relative overflow-hidden" style={{ height: `${height}px` }}>
        {/* Background layers */}
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className="absolute inset-0 transition-all duration-1000"
            style={{
              background: banner.background_value,
              opacity: activeSlide === index ? 1 : 0,
              transform: activeSlide === index ? 'scale(1)' : 'scale(1.05)',
            }}
          >
            {/* Decorative overlays */}
            <LeafPattern className="absolute top-0 right-0 w-96 h-96" opacity={0.06} />
            <LeafPattern className="absolute bottom-0 left-0 w-72 h-72 rotate-180" opacity={0.04} />
            <TreeSilhouette className="absolute bottom-0 left-20 h-80 w-80" opacity={0.04} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(149,213,178,0.15) 0%, transparent 60%)' }}></div>
          </div>
        ))}

        {/* Elements layer - render active slide's elements */}
        <div className="absolute inset-0 z-10">
          {banners[activeSlide]?.elements?.map((element) => (
            <RenderElement
              key={element.id}
              element={element}
              containerWidth={containerWidth}
              containerHeight={height}
              scaleFactor={scaleFactor}
            />
          ))}
        </div>

        {/* Slide indicators */}
        {banners.length > 1 && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveSlide(index)}
                className="transition-all duration-500"
                style={{
                  width: activeSlide === index ? '32px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  backgroundColor: activeSlide === index ? (theme.antiqueGold || '#D4A574') : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
        )}

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: `linear-gradient(to top, ${theme.warmLinen || '#F7F5F0'}, transparent)` }}></div>
      </section>

      {/* Admin edit button */}
      {isAdmin && (
        <button
          onClick={onEditClick}
          className="absolute top-4 left-4 z-30 p-2.5 rounded-full transition-all duration-300 hover:scale-110"
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
          title="تعديل البانر"
        >
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
    </div>
  );
}
