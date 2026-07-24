import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

// Initialize theme on document root immediately
const initializeTheme = () => {
  try {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'dark');
    
    const html = document.documentElement;
    if (theme === 'light') {
      html.classList.add('light-theme');
      html.classList.remove('dark');
    } else {
      html.classList.remove('light-theme');
      html.classList.add('dark');
    }
    return theme;
  } catch (error) {
    console.error('Error initializing theme:', error);
    return 'dark';
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize immediately without waiting for useEffect
    try {
      const saved = localStorage.getItem('theme') as Theme | null;
      return saved || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.classList.add('light-theme');
      html.classList.remove('dark');
    } else {
      html.classList.remove('light-theme');
      html.classList.add('dark');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Initialize theme before React renders
initializeTheme();
