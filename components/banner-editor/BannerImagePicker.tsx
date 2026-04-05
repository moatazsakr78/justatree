'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase/client';
import { uploadBannerImage } from '@/app/lib/supabase/storage';

interface BannerImagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
}

export default function BannerImagePicker({ isOpen, onClose, onSelect }: BannerImagePickerProps) {
  const [tab, setTab] = useState<'upload' | 'products'>('upload');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && tab === 'products') {
      loadProducts();
    }
  }, [isOpen, tab]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('products')
        .select('id, name, main_image_url')
        .not('main_image_url', 'is', null)
        .order('name');
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      onSelect(url);
      onClose();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1F2937] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="text-lg font-bold text-white">اختيار صورة</h3>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'upload' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/60 hover:text-white'
            }`}
          >
            رفع صورة جديدة
          </button>
          <button
            onClick={() => setTab('products')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'products' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/60 hover:text-white'
            }`}
          >
            اختيار من المنتجات
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          {tab === 'upload' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-48 h-48 border-2 border-dashed border-white/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-400/5 transition-all"
              >
                {uploading ? (
                  <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full" />
                ) : (
                  <>
                    <svg className="w-12 h-12 text-white/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-white/60 text-sm">اضغط لرفع صورة</span>
                    <span className="text-white/40 text-xs mt-1">PNG شفاف مفضّل</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="بحث عن منتج..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-400"
                  dir="rtl"
                />
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => {
                        onSelect(product.main_image_url);
                        onClose();
                      }}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-blue-400 transition-all"
                    >
                      <img
                        src={product.main_image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <span className="text-white text-xs line-clamp-1">{product.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
