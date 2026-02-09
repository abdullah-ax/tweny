/**
 * Motion Design System for Tweny Menus
 * 
 * This file defines the complete animation vocabulary and design tokens
 * used across all menu components. Inspired by v0.dev's premium feel.
 */

// ============================================
// Spring Physics Configuration
// ============================================
export const springs = {
    // Ultra-smooth for micro-interactions
    micro: { type: 'spring' as const, stiffness: 400, damping: 30 },

    // Standard smooth transition
    smooth: { type: 'spring' as const, stiffness: 300, damping: 25 },

    // Bouncy for playful elements
    bouncy: { type: 'spring' as const, stiffness: 500, damping: 15, mass: 0.5 },

    // Snappy for buttons and interactions
    snappy: { type: 'spring' as const, stiffness: 600, damping: 35 },

    // Gentle for page transitions
    gentle: { type: 'spring' as const, stiffness: 200, damping: 20 },

    // Quick response
    quick: { type: 'spring' as const, stiffness: 700, damping: 40 },
} as const;

// ============================================
// Animation Variants
// ============================================
export const variants = {
    // Staggered children entrance
    staggerContainer: {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.1,
            },
        },
    },

    // Fade up entrance for items
    fadeUp: {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: springs.smooth,
        },
        exit: {
            opacity: 0,
            y: -10,
            transition: { duration: 0.15 },
        },
    },

    // Scale fade for modals/overlays
    scaleFade: {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: springs.smooth,
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.15 },
        },
    },

    // Slide variants
    slideRight: {
        hidden: { opacity: 0, x: -30 },
        visible: { opacity: 1, x: 0, transition: springs.smooth },
        exit: { opacity: 0, x: 30, transition: { duration: 0.15 } },
    },

    slideLeft: {
        hidden: { opacity: 0, x: 30 },
        visible: { opacity: 1, x: 0, transition: springs.smooth },
        exit: { opacity: 0, x: -30, transition: { duration: 0.15 } },
    },

    // Card hover state
    cardHover: {
        rest: { scale: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
        hover: {
            scale: 1.02,
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            transition: springs.snappy,
        },
        tap: { scale: 0.98 },
    },

    // Button press
    buttonPress: {
        rest: { scale: 1 },
        hover: { scale: 1.02, transition: springs.quick },
        tap: { scale: 0.95, transition: springs.quick },
    },

    // Backdrop blur entrance
    backdrop: {
        hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
        visible: {
            opacity: 1,
            backdropFilter: 'blur(12px)',
            transition: { duration: 0.3 },
        },
        exit: {
            opacity: 0,
            backdropFilter: 'blur(0px)',
            transition: { duration: 0.2 },
        },
    },

    // Image reveal
    imageReveal: {
        hidden: { opacity: 0, scale: 1.1 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.6, ease: 'easeOut' },
        },
    },

    // Price animation
    priceReveal: {
        hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
        visible: {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: springs.smooth,
        },
    },
};

// ============================================
// Color Palette (Luxury Restaurant Theme)
// ============================================
export const colors = {
    // Primary palette
    primary: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7',
        600: '#9333ea',
        700: '#7e22ce',
        800: '#6b21a8',
        900: '#581c87',
    },

    // Neutral palette (warm grays)
    neutral: {
        50: '#fafaf9',
        100: '#f5f5f4',
        200: '#e7e5e4',
        300: '#d6d3d1',
        400: '#a8a29e',
        500: '#78716c',
        600: '#57534e',
        700: '#44403c',
        800: '#292524',
        900: '#1c1917',
        950: '#0c0a09',
    },

    // Accent colors
    gold: '#d4af37',
    champagne: '#f7e7ce',
    burgundy: '#722f37',
    olive: '#708238',

    // Semantic colors
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Glass effects
    glass: {
        light: 'rgba(255, 255, 255, 0.7)',
        dark: 'rgba(0, 0, 0, 0.4)',
        blur: 'saturate(180%) blur(20px)',
    },
};

// ============================================
// Typography Scale
// ============================================
export const typography = {
    // Font families
    fonts: {
        display: '"Playfair Display", Georgia, serif',
        body: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        mono: '"JetBrains Mono", monospace',
    },

    // Font sizes with line heights
    sizes: {
        xs: { fontSize: '0.75rem', lineHeight: '1rem' },
        sm: { fontSize: '0.875rem', lineHeight: '1.25rem' },
        base: { fontSize: '1rem', lineHeight: '1.5rem' },
        lg: { fontSize: '1.125rem', lineHeight: '1.75rem' },
        xl: { fontSize: '1.25rem', lineHeight: '1.75rem' },
        '2xl': { fontSize: '1.5rem', lineHeight: '2rem' },
        '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem' },
        '4xl': { fontSize: '2.25rem', lineHeight: '2.5rem' },
        '5xl': { fontSize: '3rem', lineHeight: '1' },
    },

    // Font weights
    weights: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },
};

// ============================================
// Spacing & Layout
// ============================================
export const spacing = {
    menuGrid: {
        gap: '1rem',
        columns: {
            mobile: 1,
            tablet: 2,
            desktop: 3,
        },
    },
    cardPadding: {
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
    },
    sectionGap: '2rem',
};

// ============================================
// Shadow Presets
// ============================================
export const shadows = {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    glow: '0 0 40px rgba(168, 85, 247, 0.3)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
};

// ============================================
// Border Radius Presets
// ============================================
export const radii = {
    none: '0',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
};

// ============================================
// Animation Delays for Stagger
// ============================================
export const staggerDelays = {
    fast: 0.05,
    normal: 0.08,
    slow: 0.12,
};

// ============================================
// Z-Index Scale
// ============================================
export const zIndex = {
    base: 0,
    dropdown: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    popover: 50,
    toast: 60,
};

// ============================================
// Menu-Specific Design Tokens
// ============================================
export const menuDesign = {
    // Item card dimensions
    card: {
        minHeight: '140px',
        imageAspectRatio: '4/3',
        borderRadius: radii['2xl'],
    },

    // Featured item styling (for high-margin items)
    featured: {
        borderWidth: '2px',
        borderColor: colors.gold,
        badge: {
            background: `linear-gradient(135deg, ${colors.gold}, ${colors.champagne})`,
            text: colors.neutral[900],
        },
    },

    // Price display
    price: {
        color: colors.neutral[900],
        fontSize: typography.sizes.xl.fontSize,
        fontWeight: typography.weights.bold,
    },

    // Category header
    category: {
        color: colors.neutral[700],
        fontSize: typography.sizes['2xl'].fontSize,
        fontFamily: typography.fonts.display,
        borderBottom: `2px solid ${colors.neutral[200]}`,
    },
};

// ============================================
// Responsive Breakpoints
// ============================================
export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
};

// ============================================
// Utility: Generate CSS Variables
// ============================================
export function generateCSSVariables(): string {
    return `
    :root {
      /* Primary Colors */
      --color-primary-50: ${colors.primary[50]};
      --color-primary-100: ${colors.primary[100]};
      --color-primary-500: ${colors.primary[500]};
      --color-primary-600: ${colors.primary[600]};
      --color-primary-700: ${colors.primary[700]};
      
      /* Neutral Colors */
      --color-neutral-50: ${colors.neutral[50]};
      --color-neutral-100: ${colors.neutral[100]};
      --color-neutral-200: ${colors.neutral[200]};
      --color-neutral-700: ${colors.neutral[700]};
      --color-neutral-800: ${colors.neutral[800]};
      --color-neutral-900: ${colors.neutral[900]};
      
      /* Accent Colors */
      --color-gold: ${colors.gold};
      --color-champagne: ${colors.champagne};
      
      /* Typography */
      --font-display: ${typography.fonts.display};
      --font-body: ${typography.fonts.body};
      
      /* Shadows */
      --shadow-md: ${shadows.md};
      --shadow-lg: ${shadows.lg};
      --shadow-xl: ${shadows.xl};
      
      /* Radii */
      --radius-lg: ${radii.lg};
      --radius-xl: ${radii.xl};
      --radius-2xl: ${radii['2xl']};
    }
  `;
}

export default {
    springs,
    variants,
    colors,
    typography,
    spacing,
    shadows,
    radii,
    staggerDelays,
    zIndex,
    menuDesign,
    breakpoints,
};
