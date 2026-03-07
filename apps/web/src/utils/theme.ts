/**
 * Theme utilities for the BookEase application
 * Uses advanced dynamic theming with CSS custom properties
 */

import { applyThemeToCSS, createCustomTheme, industryThemes, defaultTheme, type ThemeConfig } from './advanced-theme';

/**
 * Applies dynamic tenant branding using CSS custom properties
 * This now fully implements dynamic theming for white-label capability
 * 
 * @param brandColor Primary business branding color (hex)
 * @param accentColor Secondary business branding color (hex)
 * @param industry Optional industry preset for additional customization
 */
export function applyTenantTheme(
  brandColor: string, 
  accentColor: string, 
  industry?: keyof typeof industryThemes
) {
  let theme: ThemeConfig;
  
  if (industry && industryThemes[industry]) {
    // Apply industry preset and merge with custom colors
    const industryTheme = industryThemes[industry];
    theme = createCustomTheme(brandColor, accentColor, industryTheme);
  } else {
    // Create custom theme from brand colors
    theme = createCustomTheme(brandColor, accentColor);
  }
  
  // Apply theme to CSS custom properties
  applyThemeToCSS(theme);
  
  console.log('🎨 Applied dynamic theme:', {
    industry: industry || 'Custom',
    brandColor,
    accentColor,
    themeName: theme.name,
  });
}

/**
 * Gets current theme information
 */
export function getCurrentTheme() {
  return {
    brandColor: '#3b82f6', // brand-500
    accentColor: '#22c55e', // success-500
    surfaceColor: '#ffffff', // surface/white
    backgroundColor: '#f9fafb', // background/gray-50
    borderColor: '#e5e7eb', // border-light/gray-200
    textPrimary: '#111827', // neutral-900
    textSecondary: '#6b7280', // neutral-600
    textTertiary: '#9ca3af', // neutral-400
  };
}

/**
 * Available industry themes for quick setup
 */
export const availableIndustryThemes = Object.keys(industryThemes).map(key => ({
  key,
  name: industryThemes[key].name,
}));

/**
 * Apply industry theme preset
 */
export function applyIndustryTheme(industry: keyof typeof industryThemes) {
  const industryTheme = industryThemes[industry];
  if (!industryTheme) return;
  
  // Create a complete theme from the industry preset
  const theme: ThemeConfig = {
    ...defaultTheme,
    ...industryTheme,
    colors: {
      ...defaultTheme.colors,
      ...industryTheme.colors,
    },
    typography: {
      ...defaultTheme.typography,
      ...industryTheme.typography,
    },
  };
  
  applyThemeToCSS(theme);
  console.log('🎨 Applied industry theme:', industryTheme.name);
}

/**
 * Reset to default theme
 */
export function resetToDefaultTheme() {
  applyThemeToCSS(defaultTheme);
  console.log('🎨 Reset to default theme');
}

/**
 * Available Tailwind color utilities for theming
 */
export const tailwindTheme = {
    // Brand colors
    brand: {
        50: 'bg-brand-50',
        100: 'bg-brand-100',
        200: 'bg-brand-200',
        300: 'bg-brand-300',
        400: 'bg-brand-400',
        500: 'bg-brand-500',
        600: 'bg-brand-600',
        700: 'bg-brand-700',
        800: 'bg-brand-800',
        900: 'bg-brand-900',
    },
    // Success colors
    success: {
        50: 'bg-success-50',
        100: 'bg-success-100',
        200: 'bg-success-200',
        300: 'bg-success-300',
        400: 'bg-success-400',
        500: 'bg-success-500',
        600: 'bg-success-600',
        700: 'bg-success-700',
        800: 'bg-success-800',
        900: 'bg-success-900',
    },
    // Error colors
    error: {
        50: 'bg-error-50',
        100: 'bg-error-100',
        200: 'bg-error-200',
        300: 'bg-error-300',
        400: 'bg-error-400',
        500: 'bg-error-500',
        600: 'bg-error-600',
        700: 'bg-error-700',
        800: 'bg-error-800',
        900: 'bg-error-900',
    },
    // Neutral colors
    neutral: {
        50: 'bg-neutral-50',
        100: 'bg-neutral-100',
        200: 'bg-neutral-200',
        300: 'bg-neutral-300',
        400: 'bg-neutral-400',
        500: 'bg-neutral-500',
        600: 'bg-neutral-600',
        700: 'bg-neutral-700',
        800: 'bg-neutral-800',
        900: 'bg-neutral-900',
    },
};
