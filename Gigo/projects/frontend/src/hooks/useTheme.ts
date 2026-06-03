import { useEffect } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const theme: Theme = 'light';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = () => {};

  return { theme, toggle };
}
