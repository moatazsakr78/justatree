'use client';

import React from 'react';

interface BannerEditorToolbarProps {
  onAddElement: (type: 'image' | 'text' | 'badge' | 'cta_button') => void;
  onSave: () => void;
  onDiscard: () => void;
  onClose: () => void;
  onChangeBackground: () => void;
  saving: boolean;
  hasChanges: boolean;
  currentSlide: number;
  totalSlides: number;
  onAddSlide: () => void;
  onDeleteSlide: () => void;
  onPrevSlide: () => void;
  onNextSlide: () => void;
}

export default function BannerEditorToolbar({
  onAddElement,
  onSave,
  onDiscard,
  onClose,
  onChangeBackground,
  saving,
  hasChanges,
  currentSlide,
  totalSlides,
  onAddSlide,
  onDeleteSlide,
  onPrevSlide,
  onNextSlide,
}: BannerEditorToolbarProps) {
  return (
    <>
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="إغلاق المحرر"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {hasChanges && (
            <button
              onClick={onDiscard}
              className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              تراجع
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-white text-sm font-medium">
          <span className="text-white/50">محرر البانر</span>
          <span className="text-white/30">|</span>
          <div className="flex items-center gap-1">
            <button onClick={onPrevSlide} className="p-1 hover:bg-white/10 rounded" disabled={totalSlides <= 1}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="text-xs text-white/70">{currentSlide + 1} / {totalSlides}</span>
            <button onClick={onNextSlide} className="p-1 hover:bg-white/10 rounded" disabled={totalSlides <= 1}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={saving || !hasChanges}
            className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${
              hasChanges
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <span className="flex items-center gap-1">
                <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                حفظ...
              </span>
            ) : (
              'حفظ'
            )}
          </button>
        </div>
      </div>

      {/* Left toolbar - add elements */}
      <div
        className="absolute left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 p-2 rounded-xl"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <ToolbarButton
          icon={<TextIcon />}
          label="نص"
          onClick={() => onAddElement('text')}
        />
        <ToolbarButton
          icon={<ImageIcon />}
          label="صورة"
          onClick={() => onAddElement('image')}
        />
        <ToolbarButton
          icon={<BadgeIcon />}
          label="شارة"
          onClick={() => onAddElement('badge')}
        />
        <ToolbarButton
          icon={<ButtonIcon />}
          label="زر"
          onClick={() => onAddElement('cta_button')}
        />

        <div className="h-px bg-white/10 my-1" />

        <ToolbarButton
          icon={<GradientIcon />}
          label="خلفية"
          onClick={onChangeBackground}
        />
        <ToolbarButton
          icon={<PlusIcon />}
          label="سلايد +"
          onClick={onAddSlide}
        />
        {totalSlides > 1 && (
          <ToolbarButton
            icon={<TrashIcon />}
            label="حذف سلايد"
            onClick={onDeleteSlide}
            danger
          />
        )}
      </div>
    </>
  );
}

function ToolbarButton({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 p-2 rounded-lg transition-colors group ${
        danger ? 'hover:bg-red-500/20' : 'hover:bg-white/10'
      }`}
      title={label}
    >
      <span className={danger ? 'text-red-400' : 'text-white/70 group-hover:text-white'}>{icon}</span>
      <span className={`text-[9px] ${danger ? 'text-red-400' : 'text-white/50 group-hover:text-white/70'}`}>{label}</span>
    </button>
  );
}

// Icons
const TextIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
  </svg>
);

const ImageIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const BadgeIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
  </svg>
);

const ButtonIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
  </svg>
);

const GradientIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
