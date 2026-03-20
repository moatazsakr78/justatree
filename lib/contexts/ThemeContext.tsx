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
    if (savedDashTheme === 'classic') {
      document.documentElement.setAttribute('data-dash-theme', 'classic');
    } else {
      document.documentElement.removeAttribute('data-dash-theme');
    }

    // Set default theme immediately (before fetching from DB)
    setThemeVariables({
      primary_color: '#5d1f1f',
      primary_hover_color: '#4A1616',
      button_color: '#5d1f1f',
      button_hover_color: '#4A1616',
    });

    // Fetch active theme from database
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
          if (dbDashTheme === 'classic') {
            document.documentElement.setAttribute('data-dash-theme', 'classic');
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
