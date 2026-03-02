import { useTheme } from '@/app/contexts/ThemeContext';
import { themeConfig } from '@/app/utils/theme-config';

export function useThemeColors() {
  const { theme } = useTheme();
  return themeConfig[theme];
}
