'use client';

import React from 'react';
import { Rnd } from 'react-rnd';
import type { BannerElement } from './types';
import { REFERENCE_CANVAS } from './constants';

interface BannerElementWrapperProps {
  element: BannerElement;
  containerWidth: number;
  containerHeight: number;
  scaleFactor: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<BannerElement>) => void;
}

// Render element content (shared between editor and renderer)
function ElementContent({
  element,
  scaleFactor,
}: {
  element: BannerElement;
  scaleFactor: number;
}) {
  const { type, content, opacity } = element;

  switch (type) {
    case 'image':
      return content.src ? (
        <img
          src={content.src}
          alt={content.alt || ''}
          style={{
            width: '100%',
            height: '100%',
            objectFit: content.objectFit || 'contain',
            opacity,
          }}
          draggable={false}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center border-2 border-dashed border-white/40 rounded-lg"
          style={{ opacity }}
        >
          <div className="text-center text-white/60">
            <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">اضغط لاختيار صورة</span>
          </div>
        </div>
      );

    case 'text':
      return (
        <div
          className="w-full h-full flex items-center"
          style={{
            justifyContent: content.textAlign === 'center' ? 'center' : content.textAlign === 'left' ? 'flex-start' : 'flex-end',
            opacity,
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
              userSelect: 'none',
            }}
          >
            {content.text || 'نص جديد'}
          </span>
        </div>
      );

    case 'badge':
      return (
        <div className="w-full h-full flex items-center justify-center" style={{ opacity }}>
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
              userSelect: 'none',
            }}
          >
            {content.badgeText || 'شارة'}
          </span>
        </div>
      );

    case 'cta_button':
      return (
        <div className="w-full h-full flex items-center justify-center" style={{ opacity }}>
          <button
            style={{
              padding: `${12 * scaleFactor}px ${32 * scaleFactor}px`,
              borderRadius: `${content.borderRadius || 50}px`,
              fontWeight: '700',
              fontSize: `${16 * scaleFactor}px`,
              backgroundColor: content.buttonBgColor || '#D4A574',
              color: content.buttonTextColor || '#1A2F23',
              border: 'none',
              cursor: 'default',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {content.buttonText || 'زر'}
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

export default function BannerElementWrapper({
  element,
  containerWidth,
  containerHeight,
  scaleFactor,
  isSelected,
  onSelect,
  onUpdate,
}: BannerElementWrapperProps) {
  // Convert percentages to pixels
  const x = (element.position.x / 100) * containerWidth;
  const y = (element.position.y / 100) * containerHeight;
  const width = (element.size.width / 100) * containerWidth;
  const height = (element.size.height / 100) * containerHeight;

  return (
    <Rnd
      position={{ x, y }}
      size={{ width, height }}
      onDragStop={(_e, d) => {
        const newX = (d.x / containerWidth) * 100;
        const newY = (d.y / containerHeight) * 100;
        onUpdate({ position: { x: newX, y: newY } });
      }}
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        const newWidth = (parseFloat(ref.style.width) / containerWidth) * 100;
        const newHeight = (parseFloat(ref.style.height) / containerHeight) * 100;
        const newX = (position.x / containerWidth) * 100;
        const newY = (position.y / containerHeight) * 100;
        onUpdate({
          size: { width: newWidth, height: newHeight },
          position: { x: newX, y: newY },
        });
      }}
      style={{
        zIndex: element.zIndex,
        outline: isSelected ? '2px solid #3B82F6' : '1px dashed rgba(255,255,255,0.3)',
        borderRadius: '4px',
        cursor: 'move',
      }}
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      resizeHandleStyles={{
        topLeft: handleStyle,
        topRight: handleStyle,
        bottomLeft: handleStyle,
        bottomRight: handleStyle,
        top: midHandleStyle,
        right: midHandleStyle,
        bottom: midHandleStyle,
        left: midHandleStyle,
      }}
    >
      <div
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        style={{ width: '100%', height: '100%' }}
      >
        <ElementContent element={element} scaleFactor={scaleFactor} />
      </div>
    </Rnd>
  );
}

const handleStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  backgroundColor: '#3B82F6',
  borderRadius: '2px',
  border: '1px solid white',
};

const midHandleStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  backgroundColor: '#3B82F6',
  borderRadius: '50%',
  border: '1px solid white',
};
