'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase/client';

interface ThemeContextType {
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({ isLoading: true });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const STORE_THEME_CACHE_KEY = 'store-theme-cache';

    // Set CSS variables on the document root
    const setThemeVariables = (theme: any) => {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', theme.primary_color);
      root.style.setProperty('--primary-hover-color', theme.primary_hover_color);
      root.style.setProperty('--button-color', theme.button_color);
      root.style.setProperty('--button-hover-color', theme.button_hover_color);
    };

    // Apply dashboard theme from localStorage immediately (prevents flash)
    const savedDashTheme = localStorage.getItem('dash-theme');
    if (savedDashTheme && savedDashTheme !== 'modern') {
      document.documentElement.setAttribute('data-dash-theme', savedDashTheme);
    } else {
      document.documentElement.removeAttribute('data-dash-theme');
    }

    // Apply cached store theme instantly (no network wait on repeat visits)
    const cachedTheme = localStorage.getItem(STORE_THEME_CACHE_KEY);
    if (cachedTheme) {
      try {
        setThemeVariables(JSON.parse(cachedTheme));
      } catch {}
    } else {
      // Set default theme if no cache (before fetching from DB)
      setThemeVariables({
        primary_color: '#5d1f1f',
        primary_hover_color: '#4A1616',
        button_color: '#5d1f1f',
        button_hover_color: '#4A1616',
      });
    }

    // Fetch active theme from database in background
    const fetchActiveTheme = async () => {
      try {
        // Fetch store theme
        const { data, error } = await (supabase as any)
          .from('store_theme_colors')
          .select('*')
          .eq('is_active', true)
          .single();

        if (data && !error) {
          setThemeVariables(data);
          // Cache for instant load on next visit
          localStorage.setItem(STORE_THEME_CACHE_KEY, JSON.stringify({
            primary_color: data.primary_color,
            primary_hover_color: data.primary_hover_color,
            button_color: data.button_color,
            button_hover_color: data.button_hover_color,
          }));
        }

        // Sync dashboard theme from DB settings
        const { data: settingsData } = await (supabase as any)
          .from('system_settings')
          .select('settings_data')
          .eq('is_active', true)
          .single();

        if (settingsData?.settings_data?.ui?.dashboard_theme) {
          const dbDashTheme = settingsData.settings_data.ui.dashboard_theme;
          localStorage.setItem('dash-theme', dbDashTheme);
          if (dbDashTheme && dbDashTheme !== 'modern') {
            document.documentElement.setAttribute('data-dash-theme', dbDashTheme);
          } else {
            document.documentElement.removeAttribute('data-dash-theme');
          }
        }
      } catch (err) {
        console.error('Error fetching theme:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
