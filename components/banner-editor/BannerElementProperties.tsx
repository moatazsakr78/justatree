'use client';

import React, { useState, useRef } from 'react';
import type { BannerElement } from './types';

interface BannerElementPropertiesProps {
  element: BannerElement | null;
  onUpdate: (updates: Partial<BannerElement>) => void;
  onDelete: () => void;
  onOpenImagePicker: () => void;
  isDevicePreview?: boolean;
}

export default function BannerElementProperties({
  element,
  onUpdate,
  onDelete,
  onOpenImagePicker,
  isDevicePreview = false,
}: BannerElementPropertiesProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (!element) return null;

  const updateContent = (updates: Record<string, any>) => {
    onUpdate({ content: { ...element.content, ...updates } });
  };

  return (
    <div
      className="z-40 w-56 rounded-xl select-none"
      style={{
        position: isDevicePreview ? 'fixed' : 'absolute',
        right: '12px',
        top: isDevicePreview ? '60px' : '48px',
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        maxHeight: 'calc(100vh - 80px)',
        overflow: 'hidden',
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-grab active:cursor-grabbing border-b border-white/10"
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
            className="p-0.5 text-white/40 hover:text-white transition-colors"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
              style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="w-1 h-1 rounded-full bg-white/20" />
          </div>
        </div>
        <span className="text-white text-xs font-medium">
          {element.type === 'text' ? 'نص' : element.type === 'image' ? 'صورة' : element.type === 'badge' ? 'شارة' : 'زر'}
        </span>
      </div>

      {!collapsed && (
      <div style={{ maxHeight: 'calc(100vh - 130px)', overflowY: 'auto' }}>
      {/* Delete button */}
      <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-end">
        <button
          onClick={onDelete}
          className="p-1 text-red-400 hover:bg-red-400/10 rounded transition-colors text-[10px] flex items-center gap-1"
          title="حذف العنصر"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          حذف
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Common: Opacity */}
        <PropertySlider
          label="الشفافية"
          value={element.opacity}
          min={0}
          max={1}
          step={0.1}
          onChange={val => onUpdate({ opacity: val })}
        />

        {/* Common: Z-Index */}
        <PropertySlider
          label="الطبقة"
          value={element.zIndex}
          min={1}
          max={50}
          step={1}
          onChange={val => onUpdate({ zIndex: val })}
        />

        {/* Common: Rotation */}
        <PropertySlider
          label="الدوران"
          value={element.rotation}
          min={-180}
          max={180}
          step={1}
          onChange={val => onUpdate({ rotation: val })}
          showValue
          suffix="°"
        />

        <div className="h-px bg-white/10" />

        {/* Type-specific properties */}
        {element.type === 'text' && (
          <>
            <PropertyInput
              label="النص"
              value={element.content.text || ''}
              onChange={val => updateContent({ text: val })}
              multiline
            />
            <PropertySlider
              label="حجم الخط"
              value={element.content.fontSize || 36}
              min={10}
              max={80}
              step={2}
              onChange={val => updateContent({ fontSize: val })}
              showValue
              suffix="px"
            />
            <PropertyColor
              label="اللون"
              value={element.content.color || '#FFFFFF'}
              onChange={val => updateContent({ color: val })}
            />
            <PropertySelect
              label="الوزن"
              value={element.content.fontWeight || '700'}
              options={[
                { value: '400', label: 'عادي' },
                { value: '600', label: 'متوسط' },
                { value: '700', label: 'عريض' },
                { value: '900', label: 'أعرض' },
              ]}
              onChange={val => updateContent({ fontWeight: val })}
            />
            <PropertySelect
              label="المحاذاة"
              value={element.content.textAlign || 'right'}
              options={[
                { value: 'right', label: 'يمين' },
                { value: 'center', label: 'وسط' },
                { value: 'left', label: 'يسار' },
              ]}
              onChange={val => updateContent({ textAlign: val })}
            />
          </>
        )}

        {element.type === 'image' && (
          <>
            <button
              onClick={onOpenImagePicker}
              className="w-full px-3 py-2 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              {element.content.src ? 'تغيير الصورة' : 'اختيار صورة'}
            </button>
            {element.content.src && (
              <div className="rounded-lg overflow-hidden border border-white/10">
                <img src={element.content.src} alt="" className="w-full h-20 object-contain bg-black/20" />
              </div>
            )}
            <PropertySelect
              label="التناسب"
              value={element.content.objectFit || 'contain'}
              options={[
                { value: 'contain', label: 'احتواء' },
                { value: 'cover', label: 'تغطية' },
              ]}
              onChange={val => updateContent({ objectFit: val })}
            />
          </>
        )}

        {element.type === 'badge' && (
          <>
            <PropertyInput
              label="النص"
              value={element.content.badgeText || ''}
              onChange={val => updateContent({ badgeText: val })}
            />
            <PropertyColor
              label="لون النص"
              value={element.content.textColor || '#D4A574'}
              onChange={val => updateContent({ textColor: val })}
            />
            <PropertyColor
              label="لون الخلفية"
              value={element.content.backgroundColor || '#D4A57430'}
              onChange={val => updateContent({ backgroundColor: val })}
            />
          </>
        )}

        {element.type === 'cta_button' && (
          <>
            <PropertyInput
              label="نص الزر"
              value={element.content.buttonText || ''}
              onChange={val => updateContent({ buttonText: val })}
            />
            <PropertyInput
              label="الرابط"
              value={element.content.buttonLink || ''}
              onChange={val => updateContent({ buttonLink: val })}
              dir="ltr"
            />
            <PropertyColor
              label="لون الزر"
              value={element.content.buttonBgColor || '#D4A574'}
              onChange={val => updateContent({ buttonBgColor: val })}
            />
            <PropertyColor
              label="لون النص"
              value={element.content.buttonTextColor || '#1A2F23'}
              onChange={val => updateContent({ buttonTextColor: val })}
            />
          </>
        )}
      </div>
      </div>
      )}
    </div>
  );
}

// Sub-components

function PropertySlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  showValue,
  suffix = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  showValue?: boolean;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        {showValue && <span className="text-white/50 text-[10px]">{Math.round(value)}{suffix}</span>}
        <label className="text-white/70 text-[10px]">{label}</label>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}

function PropertyInput({
  label,
  value,
  onChange,
  multiline,
  dir = 'rtl',
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  dir?: string;
}) {
  return (
    <div>
      <label className="text-white/70 text-[10px] block mb-1 text-right">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-blue-400 resize-none"
          rows={2}
          dir={dir}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-blue-400"
          dir={dir}
        />
      )}
    </div>
  );
}

function PropertyColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  // Extract hex from value (handle rgba/hex with alpha)
  const hexVal = value.length <= 7 ? value : value.slice(0, 7);

  return (
    <div>
      <label className="text-white/70 text-[10px] block mb-1 text-right">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-blue-400"
          dir="ltr"
        />
        <input
          type="color"
          value={hexVal}
          onChange={e => onChange(e.target.value)}
          className="w-7 h-7 rounded border border-white/10 cursor-pointer bg-transparent"
        />
      </div>
    </div>
  );
}

function PropertySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="text-white/70 text-[10px] block mb-1 text-right">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-blue-400"
        dir="rtl"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-[#1F2937]">{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
