import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useDarkMode() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (currentTheme: Theme) => {
      let resolvedIsDark = false;
      if (currentTheme === 'system') {
        resolvedIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        resolvedIsDark = currentTheme === 'dark';
      }

      setIsDark(resolvedIsDark);
      
      if (resolvedIsDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    // Listener for system changes if system theme is selected
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return { theme, setTheme, isDark };
}
