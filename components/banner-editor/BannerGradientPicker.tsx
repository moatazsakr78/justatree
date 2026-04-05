'use client';

import React, { useState } from 'react';
import { PRESET_GRADIENTS } from './constants';

interface BannerGradientPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: string;
  onSelect: (gradient: string) => void;
}

export default function BannerGradientPicker({ isOpen, onClose, currentValue, onSelect }: BannerGradientPickerProps) {
  const [customGradient, setCustomGradient] = useState(currentValue);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1F2937] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="text-lg font-bold text-white">اختيار الخلفية</h3>
        </div>

        <div className="p-4">
          {/* Preset gradients */}
          <p className="text-white/60 text-sm mb-3 text-right">تدرجات جاهزة</p>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {PRESET_GRADIENTS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  onSelect(preset.value);
                  onClose();
                }}
                className="group relative"
              >
                <div
                  className="w-full aspect-video rounded-lg transition-all hover:scale-105"
                  style={{
                    background: preset.value,
                    outline: currentValue === preset.value ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)',
                    outlineOffset: '2px',
                  }}
                />
                <span className="text-white/60 text-[10px] mt-1 block text-center">{preset.name}</span>
              </button>
            ))}
          </div>

          {/* Custom gradient input */}
          <p className="text-white/60 text-sm mb-2 text-right">تدرج مخصص (CSS)</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onSelect(customGradient);
                onClose();
              }}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
            >
              تطبيق
            </button>
            <input
              type="text"
              value={customGradient}
              onChange={e => setCustomGradient(e.target.value)}
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-blue-400"
              dir="ltr"
              placeholder="linear-gradient(135deg, #1B3A2D 0%, #2D6A4F 100%)"
            />
          </div>

          {/* Preview */}
          <div className="mt-4">
            <p className="text-white/60 text-sm mb-2 text-right">معاينة</p>
            <div
              className="w-full h-20 rounded-xl"
              style={{ background: customGradient }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
