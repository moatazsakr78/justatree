'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { HeroBanner, BannerElement, FallbackSlide, DeviceMode } from './types';
import { DEFAULT_ELEMENTS, PRESET_GRADIENTS, REFERENCE_CANVAS, DEVICE_PRESETS } from './constants';
import { useBannerData } from './useBannerData';
import BannerRenderer from './BannerRenderer';
import BannerElementWrapper from './BannerElementWrapper';
import BannerEditorToolbar from './BannerEditorToolbar';
import BannerElementProperties from './BannerElementProperties';
import BannerImagePicker from './BannerImagePicker';
import BannerGradientPicker from './BannerGradientPicker';

// Decorative SVG components (same as BannerRenderer)
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

interface BannerEditorFullProps {
  initialBanners: HeroBanner[];
  height: number;
  isAdmin: boolean;
  theme: Record<string, string>;
  fallbackSlides?: FallbackSlide[];
  themeId?: string;
  deviceType?: DeviceMode;
}

export default function BannerEditorFull({
  initialBanners,
  height,
  isAdmin,
  theme,
  fallbackSlides,
  themeId = 'just-a-tree',
  deviceType = 'desktop',
}: BannerEditorFullProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayBanners, setDisplayBanners] = useState<HeroBanner[]>(initialBanners);
  const [editBanners, setEditBanners] = useState<HeroBanner[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(REFERENCE_CANVAS.width);
  const [canvasReady, setCanvasReady] = useState(false);

  const { saving, saveBanner, createBanner, deleteBanner, fetchBanners, saveAllBanners } = useBannerData(themeId);

  // Editor uses deviceMode preview height; renderer uses actual device height
  const editorHeight = isEditing ? DEVICE_PRESETS[deviceMode].height : height;
  const scaleFactor = editorHeight / REFERENCE_CANVAS.height;

  // Track container width — get initial width immediately to avoid position shift
  useEffect(() => {
    if (!containerRef.current) return;
    setContainerWidth(containerRef.current.getBoundingClientRect().width);
    setCanvasReady(true);
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isEditing]);

  // Current slide data
  const currentBanner = editBanners[activeSlide];

  // Get elements for current device mode
  const getElements = (banner: HeroBanner | undefined): BannerElement[] => {
    if (!banner) return [];
    if (deviceMode === 'mobile') return banner.mobile_elements || [];
    if (deviceMode === 'tablet') return banner.tablet_elements || [];
    return banner.elements || [];
  };

  // Set elements for current device mode
  const setElements = (banner: HeroBanner, elements: BannerElement[]): HeroBanner => {
    if (deviceMode === 'mobile') return { ...banner, mobile_elements: elements };
    if (deviceMode === 'tablet') return { ...banner, tablet_elements: elements };
    return { ...banner, elements };
  };

  const currentElements = getElements(currentBanner);

  const enterEditMode = useCallback(async () => {
    // Fetch latest from DB
    const latest = await fetchBanners();
    if (latest && latest.length > 0) {
      setEditBanners(JSON.parse(JSON.stringify(latest)));
    } else {
      // If no banners in DB yet, create empty one
      setEditBanners([{
        id: 'new-' + Date.now(),
        name: 'بانر جديد',
        display_order: 0,
        is_active: true,
        theme_id: themeId,
        background_type: 'gradient',
        background_value: PRESET_GRADIENTS[0].value,
        canvas_width: REFERENCE_CANVAS.width,
        canvas_height: REFERENCE_CANVAS.height,
        elements: [],
        tablet_elements: [],
        mobile_elements: [],
        cta_link: null,
        created_at: null,
        updated_at: null,
        created_by: null,
      }]);
    }
    setActiveSlide(0);
    setSelectedElementId(null);
    setHasChanges(false);
    setIsEditing(true);
  }, [fetchBanners, themeId]);

  // Device preview: constrain document width for non-desktop devices
  useEffect(() => {
    if (!isEditing) return;

    const resetStyles = () => {
      document.documentElement.style.maxWidth = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.boxShadow = '';
      document.body.style.backgroundColor = '';
    };

    if (deviceMode !== 'desktop') {
      const deviceWidth = DEVICE_PRESETS[deviceMode].width;
      document.documentElement.style.maxWidth = deviceWidth + 'px';
      document.documentElement.style.margin = '0 auto';
      document.documentElement.style.boxShadow = '0 0 80px rgba(0,0,0,0.4)';
      document.body.style.backgroundColor = '#111827';
    } else {
      resetStyles();
    }

    return resetStyles;
  }, [isEditing, deviceMode]);

  const exitEditMode = () => {
    if (hasChanges) {
      if (!confirm('هل تريد الخروج بدون حفظ التغييرات؟')) return;
    }
    setDeviceMode('desktop'); // Reset to desktop before closing
    setIsEditing(false);
    setSelectedElementId(null);
    setHasChanges(false);
  };

  const handleSave = async () => {
    const results = await Promise.all(
      editBanners.map(async (banner) => {
        if (banner.id.startsWith('new-')) {
          // Create new banner
          const created = await createBanner({
            name: banner.name,
            display_order: banner.display_order,
            is_active: banner.is_active,
            theme_id: banner.theme_id,
            background_type: banner.background_type,
            background_value: banner.background_value,
            canvas_width: banner.canvas_width,
            canvas_height: banner.canvas_height,
            elements: banner.elements,
            tablet_elements: banner.tablet_elements || [],
            mobile_elements: banner.mobile_elements || [],
            cta_link: banner.cta_link,
          });
          return !!created;
        } else {
          return await saveBanner(banner);
        }
      })
    );

    if (results.every(Boolean)) {
      setHasChanges(false);
      // Refresh to get real IDs and update display
      const updated = await fetchBanners();
      if (updated) {
        const freshData = JSON.parse(JSON.stringify(updated));
        setEditBanners(freshData);
        setDisplayBanners(freshData);
      }
      alert('تم حفظ البانر بنجاح!');
    } else {
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDiscard = () => {
    if (!confirm('هل تريد التراجع عن جميع التغييرات؟')) return;
    enterEditMode();
  };

  // Element operations
  const addElement = (type: 'image' | 'text' | 'badge' | 'cta_button') => {
    if (!currentBanner) return;

    const template = DEFAULT_ELEMENTS[type];
    const newElement: BannerElement = {
      ...template,
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };

    if (type === 'image') {
      // Open image picker
      setImagePickerTarget(newElement.id);
      setShowImagePicker(true);
    }

    const updated = [...editBanners];
    updated[activeSlide] = setElements(currentBanner, [...currentElements, newElement]);
    setEditBanners(updated);
    setSelectedElementId(newElement.id);
    setHasChanges(true);
  };

  const updateElement = (elementId: string, updates: Partial<BannerElement>) => {
    if (!currentBanner) return;

    const updated = [...editBanners];
    const elements = currentElements.map(el => {
      if (el.id !== elementId) return el;
      return {
        ...el,
        ...updates,
        content: updates.content ? { ...el.content, ...updates.content } : el.content,
      };
    });
    updated[activeSlide] = setElements(currentBanner, elements);
    setEditBanners(updated);
    setHasChanges(true);
  };

  const deleteElement = () => {
    if (!currentBanner || !selectedElementId) return;

    const updated = [...editBanners];
    updated[activeSlide] = setElements(
      currentBanner,
      currentElements.filter(el => el.id !== selectedElementId)
    );
    setEditBanners(updated);
    setSelectedElementId(null);
    setHasChanges(true);
  };

  // Slide operations
  const addSlide = () => {
    const newBanner: HeroBanner = {
      id: 'new-' + Date.now(),
      name: `سلايد ${editBanners.length + 1}`,
      display_order: editBanners.length,
      is_active: true,
      theme_id: themeId,
      background_type: 'gradient',
      background_value: PRESET_GRADIENTS[editBanners.length % PRESET_GRADIENTS.length].value,
      canvas_width: REFERENCE_CANVAS.width,
      canvas_height: REFERENCE_CANVAS.height,
      elements: [],
      tablet_elements: [],
      mobile_elements: [],
      cta_link: null,
      created_at: null,
      updated_at: null,
      created_by: null,
    };
    setEditBanners([...editBanners, newBanner]);
    setActiveSlide(editBanners.length);
    setSelectedElementId(null);
    setHasChanges(true);
  };

  const copyFromDesktop = () => {
    if (!currentBanner || deviceMode === 'desktop') return;
    if (!confirm('سيتم استبدال التصميم الحالي بتصميم الكمبيوتر. متأكد؟')) return;
    const desktopElements = JSON.parse(JSON.stringify(currentBanner.elements || []));
    const updated = [...editBanners];
    updated[activeSlide] = setElements(currentBanner, desktopElements);
    setEditBanners(updated);
    setSelectedElementId(null);
    setHasChanges(true);
  };

  const deleteSlide = async () => {
    if (editBanners.length <= 1) return;
    if (!confirm('هل تريد حذف هذا السلايد؟')) return;

    const bannerToDelete = editBanners[activeSlide];

    // If it's a saved banner, delete from DB
    if (!bannerToDelete.id.startsWith('new-')) {
      await deleteBanner(bannerToDelete.id);
    }

    const updated = editBanners.filter((_, i) => i !== activeSlide);
    // Re-order
    updated.forEach((b, i) => { b.display_order = i; });
    setEditBanners(updated);
    setActiveSlide(Math.min(activeSlide, updated.length - 1));
    setSelectedElementId(null);
    setHasChanges(true);
  };

  const changeBackground = (gradient: string) => {
    if (!currentBanner) return;
    const updated = [...editBanners];
    updated[activeSlide] = {
      ...currentBanner,
      background_type: 'gradient',
      background_value: gradient,
    };
    setEditBanners(updated);
    setHasChanges(true);
  };

  // Handle image selection from picker
  const handleImageSelect = (imageUrl: string) => {
    if (imagePickerTarget) {
      updateElement(imagePickerTarget, {
        content: { src: imageUrl },
      });
      setImagePickerTarget(null);
    }
  };

  const selectedElement = currentElements.find(el => el.id === selectedElementId) || null;

  // Keyboard shortcuts: ALT+wheel, ALT+±, Delete
  useEffect(() => {
    if (!isEditing) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.altKey || !selectedElementId || !currentBanner) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 2 : -2;
      const el = currentBanner.elements.find(el => el.id === selectedElementId);
      if (!el) return;
      updateElement(selectedElementId, {
        size: {
          width: Math.max(5, el.size.width + delta),
          height: Math.max(5, el.size.height + delta),
        }
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElementId || !currentBanner) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.altKey && (e.key === '+' || e.key === '=' || e.key === '-')) {
        e.preventDefault();
        const delta = e.key === '-' ? -2 : 2;
        const el = currentBanner.elements.find(el => el.id === selectedElementId);
        if (!el) return;
        updateElement(selectedElementId, {
          size: {
            width: Math.max(5, el.size.width + delta),
            height: Math.max(5, el.size.height + delta),
          }
        });
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteElement();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, selectedElementId, currentBanner, updateElement, deleteElement]);

  // If not editing, show the regular renderer
  if (!isEditing) {
    return (
      <BannerRenderer
        banners={displayBanners}
        height={height}
        isAdmin={isAdmin}
        theme={theme}
        fallbackSlides={fallbackSlides}
        onEditClick={enterEditMode}
        deviceType={deviceType}
      />
    );
  }

  // Editor mode
  return (
    <div className="relative" ref={containerRef}>
      {/* Outer clip container — hides elements that overflow beyond the banner area */}
      <div style={{ overflow: 'hidden', height: `${editorHeight}px`, position: 'relative' }}>
      {/* Banner canvas — overflow visible inside for drag/resize freedom */}
      <section
        className="relative"
        style={{ height: `${editorHeight}px` }}
        onClick={() => setSelectedElementId(null)}
      >
        {/* Background */}
        {currentBanner && (
          <div
            className="absolute inset-0"
            style={{ background: currentBanner.background_value }}
          >
            <LeafPattern className="absolute top-0 right-0 w-96 h-96" opacity={0.06} />
            <LeafPattern className="absolute bottom-0 left-0 w-72 h-72 rotate-180" opacity={0.04} />
            <TreeSilhouette className="absolute bottom-0 left-20 h-80 w-80" opacity={0.04} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(149,213,178,0.15) 0%, transparent 60%)' }}></div>
          </div>
        )}

        {/* Elements with drag/resize — only render when canvas width is measured */}
        <div className="absolute inset-0 z-10">
          {canvasReady && currentElements.map((element) => (
            <BannerElementWrapper
              key={element.id}
              element={element}
              containerWidth={containerWidth}
              containerHeight={editorHeight}
              scaleFactor={scaleFactor}
              isSelected={selectedElementId === element.id}
              onSelect={() => setSelectedElementId(element.id)}
              onUpdate={(updates) => updateElement(element.id, updates)}
            />
          ))}
        </div>

        {/* Slide indicators (in editor) */}
        {editBanners.length > 1 && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3">
            {editBanners.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide(index);
                  setSelectedElementId(null);
                }}
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

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: `linear-gradient(to top, ${theme.warmLinen || '#F7F5F0'}, transparent)` }}></div>
      </section>
      </div>{/* End outer clip container */}

      {/* Editor UI overlays */}
      <BannerEditorToolbar
        onAddElement={addElement}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onClose={exitEditMode}
        onChangeBackground={() => setShowGradientPicker(true)}
        saving={saving}
        hasChanges={hasChanges}
        currentSlide={activeSlide}
        totalSlides={editBanners.length}
        onAddSlide={addSlide}
        onDeleteSlide={deleteSlide}
        onPrevSlide={() => {
          setActiveSlide((activeSlide + 1) % editBanners.length);
          setSelectedElementId(null);
        }}
        onNextSlide={() => {
          setActiveSlide((activeSlide - 1 + editBanners.length) % editBanners.length);
          setSelectedElementId(null);
        }}
        deviceMode={deviceMode}
        onDeviceModeChange={(mode) => {
          setDeviceMode(mode);
          setSelectedElementId(null);
        }}
        onCopyFromDesktop={copyFromDesktop}
        isDevicePreview={deviceMode !== 'desktop'}
      />

      <BannerElementProperties
        element={selectedElement}
        onUpdate={(updates) => {
          if (selectedElementId) updateElement(selectedElementId, updates);
        }}
        onDelete={deleteElement}
        onOpenImagePicker={() => {
          if (selectedElementId) {
            setImagePickerTarget(selectedElementId);
            setShowImagePicker(true);
          }
        }}
        isDevicePreview={deviceMode !== 'desktop'}
      />

      {/* Modals */}
      <BannerImagePicker
        isOpen={showImagePicker}
        onClose={() => {
          setShowImagePicker(false);
          setImagePickerTarget(null);
        }}
        onSelect={handleImageSelect}
      />

      <BannerGradientPicker
        isOpen={showGradientPicker}
        onClose={() => setShowGradientPicker(false)}
        currentValue={currentBanner?.background_value || ''}
        onSelect={changeBackground}
      />
    </div>
  );
}
