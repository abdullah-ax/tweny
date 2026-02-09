/**
 * Menu Components - Production-ready, typed React components
 * with Framer Motion animations for the "v0.dev" experience
 */

export { MenuItem } from './MenuItem';
export { MenuSection } from './MenuSection';
export { MenuDetailModal } from './MenuDetailModal';
export { MenuGrid } from './MenuGrid';
export { MenuHeader } from './MenuHeader';
export { MenuCart } from './MenuCart';
export { MenuShell } from './MenuShell';

// Re-export types from shared types file
export type {
    MenuItemData,
    MenuSectionData,
    CartItem,
} from '@/lib/types/menu.types';
