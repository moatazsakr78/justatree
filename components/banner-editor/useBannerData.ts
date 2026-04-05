'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase/client';
import type { HeroBanner, BannerElement } from './types';

export function useBannerData(themeId: string = 'just-a-tree') {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('hero_banners')
        .select('*')
        .eq('theme_id', themeId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching banners:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [themeId]);

  const saveBanner = useCallback(async (banner: Partial<HeroBanner> & { id: string }) => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('hero_banners')
        .update({
          name: banner.name,
          background_type: banner.background_type,
          background_value: banner.background_value,
          elements: banner.elements,
          tablet_elements: banner.tablet_elements || [],
          mobile_elements: banner.mobile_elements || [],
          cta_link: banner.cta_link,
          is_active: banner.is_active,
          display_order: banner.display_order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', banner.id);

      if (error) throw error;

      // Trigger ISR revalidation
      await fetch('/api/revalidate?type=home', { method: 'GET' });

      return true;
    } catch (error) {
      console.error('Error saving banner:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const createBanner = useCallback(async (banner: Omit<HeroBanner, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from('hero_banners')
        .insert({
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
        })
        .select()
        .single();

      if (error) throw error;

      await fetch('/api/revalidate?type=home', { method: 'GET' });

      return data as HeroBanner;
    } catch (error) {
      console.error('Error creating banner:', error);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteBanner = useCallback(async (bannerId: string) => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('hero_banners')
        .delete()
        .eq('id', bannerId);

      if (error) throw error;

      await fetch('/api/revalidate?type=home', { method: 'GET' });

      return true;
    } catch (error) {
      console.error('Error deleting banner:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const reorderBanners = useCallback(async (orderedIds: string[]) => {
    setSaving(true);
    try {
      const updates = orderedIds.map((id, index) =>
        (supabase as any)
          .from('hero_banners')
          .update({ display_order: index })
          .eq('id', id)
      );

      await Promise.all(updates);

      await fetch('/api/revalidate?type=home', { method: 'GET' });

      return true;
    } catch (error) {
      console.error('Error reordering banners:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const saveAllBanners = useCallback(async (bannersToSave: HeroBanner[]) => {
    setSaving(true);
    try {
      const updates = bannersToSave.map((banner) =>
        (supabase as any)
          .from('hero_banners')
          .update({
            name: banner.name,
            background_type: banner.background_type,
            background_value: banner.background_value,
            elements: banner.elements,
            tablet_elements: banner.tablet_elements || [],
            mobile_elements: banner.mobile_elements || [],
            cta_link: banner.cta_link,
            is_active: banner.is_active,
            display_order: banner.display_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', banner.id)
      );

      await Promise.all(updates);

      await fetch('/api/revalidate?type=home', { method: 'GET' });

      return true;
    } catch (error) {
      console.error('Error saving banners:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    banners,
    setBanners,
    loading,
    saving,
    fetchBanners,
    saveBanner,
    createBanner,
    deleteBanner,
    reorderBanners,
    saveAllBanners,
  };
}
