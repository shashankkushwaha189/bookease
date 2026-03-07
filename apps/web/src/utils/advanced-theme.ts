/**
 * Advanced Dynamic Theming System for BookEase
 * Supports full white-label customization with CSS custom properties
 */

export interface ThemeColors {
  // Primary brand colors
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  
  // Accent colors
  accent: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  
  // Semantic colors
  success: {
    50: string;
    100: string;
    500: string;
    600: string;
  };
  
  error: {
    50: string;
    100: string;
    500: string;
    600: string;
  };
  
  warning: {
    50: string;
    100: string;
    500: string;
    600: string;
  };
  
  // Neutral colors
  neutral: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
}

export interface ThemeConfig {
  name: string;
  colors: ThemeColors;
  typography: {
    fontFamily: {
      primary: string;
      secondary: string;
      mono: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Default theme (BookEase)
export const defaultTheme: ThemeConfig = {
  name: 'BookEase',
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    accent: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
    },
  },
  typography: {
    fontFamily: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      secondary: 'Georgia, "Times New Roman", serif',
      mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
};

// Industry-specific theme presets
export const industryThemes: Record<string, Partial<ThemeConfig>> = {
  healthcare: {
    name: 'Healthcare Professional',
    colors: {
      primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
        950: '#082f49',
      },
      accent: {
        50: '#f0fdfa',
        100: '#ccfbf1',
        200: '#99f6e4',
        300: '#5eead4',
        400: '#2dd4bf',
        500: '#14b8a6',
        600: '#0d9488',
        700: '#0f766e',
        800: '#115e59',
        900: '#134e4a',
        950: '#042f2e',
      },
      success: defaultTheme.colors.success,
      error: defaultTheme.colors.error,
      warning: defaultTheme.colors.warning,
      neutral: defaultTheme.colors.neutral,
    },
    typography: {
      fontFamily: {
        primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        secondary: defaultTheme.typography.fontFamily.secondary,
        mono: defaultTheme.typography.fontFamily.mono,
      },
      fontSize: defaultTheme.typography.fontSize,
    },
  },
  
  salon: {
    name: 'Salon & Spa',
    colors: {
      primary: {
        50: '#fdf4ff',
        100: '#fae8ff',
        200: '#f5d0fe',
        300: '#f0abfc',
        400: '#e879f9',
        500: '#d946ef',
        600: '#c026d3',
        700: '#a21caf',
        800: '#86198f',
        900: '#701a75',
        950: '#4a044e',
      },
      accent: {
        50: '#fefce8',
        100: '#fef9c3',
        200: '#fef08a',
        300: '#fde047',
        400: '#facc15',
        500: '#eab308',
        600: '#ca8a04',
        700: '#a16207',
        800: '#854d0e',
        900: '#713f12',
        950: '#422006',
      },
      success: defaultTheme.colors.success,
      error: defaultTheme.colors.error,
      warning: defaultTheme.colors.warning,
      neutral: defaultTheme.colors.neutral,
    },
    typography: {
      fontFamily: {
        primary: '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif',
        secondary: defaultTheme.typography.fontFamily.secondary,
        mono: defaultTheme.typography.fontFamily.mono,
      },
      fontSize: defaultTheme.typography.fontSize,
    },
  },
  
  consulting: {
    name: 'Consulting & Professional',
    colors: {
      primary: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#020617',
      },
      accent: {
        50: '#f1f5f9',
        100: '#e2e8f0',
        200: '#cbd5e1',
        300: '#94a3b8',
        400: '#64748b',
        500: '#475569',
        600: '#334155',
        700: '#1e293b',
        800: '#0f172a',
        900: '#020617',
        950: '#020617',
      },
      success: defaultTheme.colors.success,
      error: defaultTheme.colors.error,
      warning: defaultTheme.colors.warning,
      neutral: defaultTheme.colors.neutral,
    },
    typography: {
      fontFamily: {
        primary: '"Source Sans Pro", -apple-system, BlinkMacSystemFont, sans-serif',
        secondary: defaultTheme.typography.fontFamily.secondary,
        mono: defaultTheme.typography.fontFamily.mono,
      },
      fontSize: defaultTheme.typography.fontSize,
    },
  },
  
  education: {
    name: 'Education & Training',
    colors: {
      primary: {
        50: '#fef7ff',
        100: '#fae5ff',
        200: '#f3d4ff',
        300: '#e9b5ff',
        400: '#db8fff',
        500: '#c855ff',
        600: '#b13cff',
        700: '#9625ff',
        800: '#7e0fff',
        900: '#6b0fff',
        950: '#4e00ff',
      },
      accent: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
        950: '#052e16',
      },
      success: defaultTheme.colors.success,
      error: defaultTheme.colors.error,
      warning: defaultTheme.colors.warning,
      neutral: defaultTheme.colors.neutral,
    },
    typography: {
      fontFamily: {
        primary: '"Nunito", -apple-system, BlinkMacSystemFont, sans-serif',
        secondary: defaultTheme.typography.fontFamily.secondary,
        mono: defaultTheme.typography.fontFamily.mono,
      },
      fontSize: defaultTheme.typography.fontSize,
    },
  },
};

// Helper function to generate color shades from base color
export function generateColorShades(baseColor: string): ThemeColors['primary'] {
  // This is a simplified version - in production, you'd use a proper color manipulation library
  const colors: any = {};
  
  // For now, return default shades - implement proper color generation as needed
  return defaultTheme.colors.primary;
}

// Helper function to apply theme to CSS custom properties
export function applyThemeToCSS(theme: ThemeConfig): void {
  const root = document.documentElement;
  
  // Apply color variables
  Object.entries(theme.colors.primary).forEach(([key, value]) => {
    root.style.setProperty(`--color-primary-${key}`, value);
  });
  
  Object.entries(theme.colors.accent).forEach(([key, value]) => {
    root.style.setProperty(`--color-accent-${key}`, value);
  });
  
  Object.entries(theme.colors.success).forEach(([key, value]) => {
    root.style.setProperty(`--color-success-${key}`, value);
  });
  
  Object.entries(theme.colors.error).forEach(([key, value]) => {
    root.style.setProperty(`--color-error-${key}`, value);
  });
  
  Object.entries(theme.colors.warning).forEach(([key, value]) => {
    root.style.setProperty(`--color-warning-${key}`, value);
  });
  
  Object.entries(theme.colors.neutral).forEach(([key, value]) => {
    root.style.setProperty(`--color-neutral-${key}`, value);
  });
  
  // Apply typography variables
  root.style.setProperty('--font-primary', theme.typography.fontFamily.primary);
  root.style.setProperty('--font-secondary', theme.typography.fontFamily.secondary);
  root.style.setProperty('--font-mono', theme.typography.fontFamily.mono);
  
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, value);
  });
  
  // Apply spacing variables
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });
  
  // Apply border radius variables
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });
  
  // Apply shadow variables
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });
}

// Helper function to create custom theme from brand colors
export function createCustomTheme(
  brandColor: string,
  accentColor: string,
  customizations?: Partial<ThemeConfig>
): ThemeConfig {
  // Generate color palettes from brand colors
  const primaryColors = generateColorShades(brandColor);
  const accentColors = generateColorShades(accentColor);
  
  return {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: primaryColors,
      accent: accentColors,
      ...customizations?.colors,
    },
    ...customizations,
  };
}

// Theme utility functions
export const themeUtils = {
  getColor: (colorPath: string): string => {
    const path = colorPath.split('.');
    return `var(--color-${path.join('-')})`;
  },
  
  getFontSize: (size: keyof ThemeConfig['typography']['fontSize']): string => {
    return `var(--font-size-${size})`;
  },
  
  getSpacing: (size: keyof ThemeConfig['spacing']): string => {
    return `var(--spacing-${size})`;
  },
  
  getRadius: (size: keyof ThemeConfig['borderRadius']): string => {
    return `var(--radius-${size})`;
  },
  
  getShadow: (size: keyof ThemeConfig['shadows']): string => {
    return `var(--shadow-${size})`;
  },
  
  getFont: (type: keyof ThemeConfig['typography']['fontFamily']): string => {
    return `var(--font-${type})`;
  },
};
