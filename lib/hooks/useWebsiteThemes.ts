import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase/client';

export interface WebsiteTheme {
  id: string;
  theme_id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  is_active: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useWebsiteThemes() {
  const [themes, setThemes] = useState<WebsiteTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchThemes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('website_themes')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching website themes:', error);
        setThemes([]);
      } else {
        setThemes(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching website themes:', err);
      setThemes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  const activateTheme = async (themeId: string) => {
    try {
      const response = await fetch('/api/website-themes/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: themeId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to activate theme');
      }

      await fetchThemes();
    } catch (err) {
      console.error('Error in activateTheme:', err);
      throw err;
    }
  };

  const deleteTheme = async (themeId: string) => {
    try {
      const response = await fetch(`/api/website-themes?id=${themeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete theme');
      }

      await fetchThemes();
    } catch (err) {
      console.error('Error in deleteTheme:', err);
      throw err;
    }
  };

  return {
    themes,
    isLoading,
    activateTheme,
    deleteTheme,
    refreshThemes: fetchThemes,
  };
}
