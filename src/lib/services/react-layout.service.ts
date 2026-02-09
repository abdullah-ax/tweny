/**
 * React Menu Layout Service
 * 
 * Converts AI-generated strategies into React/Framer component-ready data
 * for stunning, modern menus instead of old HTML/CSS approach.
 */

import { MenuStrategy, LayoutSection, LayoutItem } from './strategy.service';
import { MenuSectionData, MenuItemData } from '@/lib/types/menu.types';

// ============================================
// Types
// ============================================

export interface ReactMenuLayout {
    id: string;
    restaurantId: number;
    restaurantName: string;
    strategyId: string;
    strategyName: string;
    sections: MenuSectionData[];
    theme: MenuTheme;
    variant: 'a' | 'b';
    metadata: {
        createdAt: string;
        version: number;
        optimizedFor: 'mobile' | 'desktop' | 'both';
    };
}

export interface MenuTheme {
    colorScheme: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
    };
    typography: {
        headingFont: string;
        bodyFont: string;
        priceStyle: 'bold' | 'subtle' | 'accent' | 'hidden-dollar';
    };
    layoutType: 'grid' | 'list' | 'magazine' | 'minimal';
    columns: number;
    showCurrency: boolean;
    animations: {
        enabled: boolean;
        staggerDelay: number;
        itemHover: 'scale' | 'lift' | 'glow' | 'none';
    };
}

export interface MenuContext {
    restaurantName?: string;
    restaurantId?: number;
    tagline?: string;
    extractedColors?: {
        dominant?: string;
        accent?: string;
        background?: string;
    };
    items?: Array<{
        id: string;
        name: string;
        description?: string;
        price: number;
        category?: string;
    }>;
}

// ============================================
// Main Service
// ============================================

export class ReactLayoutService {
    /**
     * Build a React-compatible menu layout from a strategy
     */
    static buildReactLayout(
        strategy: MenuStrategy,
        context?: MenuContext,
        restaurantId?: number
    ): ReactMenuLayout {
        const { layout } = strategy;

        // Apply menu engineering rules to sections
        const optimizedSections = this.applyMenuEngineeringRules(layout.sections);

        // Convert to React MenuSectionData format
        const sections = this.convertToMenuSections(optimizedSections);

        // Build theme from strategy colors
        const theme = this.buildTheme(layout, context?.extractedColors);

        return {
            id: `react-layout-${Date.now()}`,
            restaurantId: restaurantId || context?.restaurantId || 1,
            restaurantName: context?.restaurantName || 'Restaurant',
            strategyId: strategy.id,
            strategyName: strategy.name,
            sections,
            theme,
            variant: 'a',
            metadata: {
                createdAt: new Date().toISOString(),
                version: 1,
                optimizedFor: 'mobile',
            },
        };
    }

    /**
     * Convert strategy layout sections to React MenuSectionData format
     */
    private static convertToMenuSections(layoutSections: LayoutSection[]): MenuSectionData[] {
        return layoutSections.map((section, sectionIndex) => ({
            id: sectionIndex + 1,
            title: section.name,
            description: null,
            items: section.items.map((item, itemIndex) => this.convertToMenuItem(item, itemIndex)),
        }));
    }

    /**
     * Convert strategy LayoutItem to React MenuItemData
     */
    private static convertToMenuItem(item: LayoutItem, index: number): MenuItemData {
        // Determine if high margin based on quadrant or explicit flag
        const isHighMargin = item.quadrant === 'star' || item.quadrant === 'puzzle' || item.isHighlighted;

        // Determine position for Golden Triangle optimization
        let position: MenuItemData['position'] = 'standard';
        if (index === 0 && isHighMargin) {
            position = 'top-right';
        } else if (index === 1 && isHighMargin) {
            position = 'center';
        }

        return {
            id: typeof item.id === 'string' ? parseInt(item.id) || index + 1 : item.id,
            name: item.name,
            description: item.description || null,
            price: item.price,
            imageUrl: null, // Can be enhanced later with image support
            rating: null,
            votes: null,
            isHighMargin,
            isAnchor: item.isAnchor || false,
            position,
        };
    }

    /**
     * Build theme configuration from strategy layout
     */
    private static buildTheme(
        layout: MenuStrategy['layout'],
        extractedColors?: MenuContext['extractedColors']
    ): MenuTheme {
        return {
            colorScheme: {
                primary: extractedColors?.dominant || layout.colorScheme.primary,
                secondary: layout.colorScheme.secondary,
                accent: extractedColors?.accent || layout.colorScheme.accent,
                background: extractedColors?.background || layout.colorScheme.background,
            },
            typography: {
                headingFont: layout.typography.headingFont,
                bodyFont: layout.typography.bodyFont,
                priceStyle: layout.typography.priceStyle as MenuTheme['typography']['priceStyle'],
            },
            layoutType: layout.type,
            columns: layout.columns,
            showCurrency: layout.typography.priceStyle !== 'hidden-dollar',
            animations: {
                enabled: true,
                staggerDelay: 0.05,
                itemHover: 'lift',
            },
        };
    }

    /**
     * Apply menu engineering rules to sections
     * - Stars at top of each category
     * - Puzzles in high-visibility spots
     * - Max 30% highlighted items
     */
    private static applyMenuEngineeringRules(sections: LayoutSection[]): LayoutSection[] {
        let totalHighlightedItems = 0;
        const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
        const maxHighlighted = Math.ceil(totalItems * 0.3);

        return sections.map((section) => {
            // Sort by quadrant priority: Stars → Puzzles → Plowhorses → Dogs
            const sortedItems = this.sortByQuadrant(section.items);

            // Apply highlighting rules
            const processedItems = sortedItems.map((item, idx) => {
                const newItem = { ...item };

                // First item in each category should be highlighted if it's a Star or Puzzle
                if (idx === 0 && (item.quadrant === 'star' || item.quadrant === 'puzzle')) {
                    if (totalHighlightedItems < maxHighlighted) {
                        newItem.isHighlighted = true;
                        totalHighlightedItems++;
                    }
                }

                // Add appropriate badges
                if (item.quadrant === 'star' && !newItem.badges.includes('Most Popular')) {
                    newItem.badges = [...newItem.badges, 'Most Popular'];
                } else if (item.quadrant === 'puzzle' && !newItem.badges.some(b => b.includes('Pick') || b.includes('Special'))) {
                    newItem.badges = [...newItem.badges, "Chef's Pick"];
                }

                return newItem;
            });

            return {
                ...section,
                items: processedItems,
            };
        });
    }

    /**
     * Sort items by menu engineering quadrant
     */
    private static sortByQuadrant(items: LayoutItem[]): LayoutItem[] {
        const order: Record<string, number> = { star: 1, puzzle: 2, plowhorse: 3, dog: 4 };
        return [...items].sort((a, b) => {
            const orderA = a.quadrant ? order[a.quadrant] : 3;
            const orderB = b.quadrant ? order[b.quadrant] : 3;
            return orderA - orderB;
        });
    }

    /**
     * Merge menu context items with strategy sections
     * Used when we have real menu data from PDF import
     */
    static mergeWithMenuItems(
        layout: ReactMenuLayout,
        menuItems: MenuContext['items']
    ): ReactMenuLayout {
        if (!menuItems?.length) return layout;

        // Group items by category
        const categorized = new Map<string, MenuContext['items']>();
        menuItems.forEach(item => {
            const category = item.category || 'Other';
            if (!categorized.has(category)) {
                categorized.set(category, []);
            }
            categorized.get(category)!.push(item);
        });

        // Create sections from categorized items
        const sections: MenuSectionData[] = [];
        let sectionId = 1;

        categorized.forEach((items, categoryName) => {
            sections.push({
                id: sectionId++,
                title: categoryName,
                description: null,
                items: items.map((item, idx) => ({
                    id: parseInt(item.id) || idx + 1,
                    name: item.name,
                    description: item.description || null,
                    price: item.price,
                    imageUrl: null,
                    rating: null,
                    votes: null,
                    isHighMargin: idx < 2, // First 2 items in each category are featured
                    isAnchor: false,
                    position: idx === 0 ? 'top-right' : 'standard',
                })),
            });
        });

        return {
            ...layout,
            sections,
        };
    }

    /**
     * Generate CSS custom properties for theming
     * Can be injected for dynamic color updates
     */
    static generateThemeCSS(theme: MenuTheme): string {
        return `
:root {
    --menu-primary: ${theme.colorScheme.primary};
    --menu-secondary: ${theme.colorScheme.secondary};
    --menu-accent: ${theme.colorScheme.accent};
    --menu-background: ${theme.colorScheme.background};
    --menu-heading-font: '${theme.typography.headingFont}', serif;
    --menu-body-font: '${theme.typography.bodyFont}', sans-serif;
}
        `.trim();
    }
}

export default ReactLayoutService;
