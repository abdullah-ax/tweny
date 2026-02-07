/**
 * Context Service
 * Builds and manages the AI context from menu data, CSV reports, and extracted visuals
 * This context is used for all AI decisions in strategy and menu engineering
 */

export interface MenuContext {
    // Restaurant info
    restaurantId?: number;
    restaurantName?: string;
    cuisine?: string;

    // Menu data
    items: ContextMenuItem[];
    categories: string[];
    totalItems: number;

    // Visual context from PDF
    extractedColors: ColorPalette;
    extractedImages: ExtractedImage[];
    originalDesignStyle?: DesignStyle;

    // Sales data from CSV
    salesData?: SalesDataContext;

    // Analysis results
    menuEngineering?: MenuEngineeringAnalysis;

    // Metadata
    createdAt: string;
    lastUpdated: string;
}

export interface ContextMenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    category: string;
    cost?: number;
    imageUrl?: string;

    // Analytics from CSV
    salesVolume?: number;
    revenue?: number;
    margin?: number;
    bcgClass?: 'star' | 'cash_cow' | 'puzzle' | 'dog';
}

export interface ColorPalette {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    extracted: string[]; // All colors found
    dominant: string;
    scheme: 'warm' | 'cool' | 'neutral' | 'vibrant';
}

export interface ExtractedImage {
    id: string;
    dataUrl: string;
    width: number;
    height: number;
    position?: { x: number; y: number };
    associatedItem?: string; // Item name it might belong to
    type: 'logo' | 'food' | 'decoration' | 'unknown';
}

export interface DesignStyle {
    type: 'elegant' | 'casual' | 'modern' | 'rustic' | 'minimal' | 'vibrant';
    hasPhotos: boolean;
    layoutType: 'single-column' | 'multi-column' | 'grid' | 'magazine';
    fontStyle: 'serif' | 'sans-serif' | 'script' | 'mixed';
    priceDisplay: 'inline' | 'right-aligned' | 'below' | 'hidden-dollar';
}

export interface SalesDataContext {
    periodStart: string;
    periodEnd: string;
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    topSellers: { itemId: string; name: string; quantity: number }[];
    lowPerformers: { itemId: string; name: string; quantity: number }[];
    peakHours: number[];
    categoryBreakdown: { category: string; revenue: number; percentage: number }[];
}

export interface MenuEngineeringAnalysis {
    stars: ContextMenuItem[]; // High popularity, high profit
    cashCows: ContextMenuItem[]; // High popularity, low profit
    puzzles: ContextMenuItem[]; // Low popularity, high profit
    dogs: ContextMenuItem[]; // Low popularity, low profit

    averageMargin: number;
    averagePopularity: number;
    recommendations: AIRecommendation[];
}

export interface AIRecommendation {
    type: 'pricing' | 'placement' | 'description' | 'promotion' | 'removal';
    itemId: string;
    itemName: string;
    currentValue?: string | number;
    suggestedValue?: string | number;
    reasoning: string;
    expectedImpact: string;
    priority: 'high' | 'medium' | 'low';
}

/**
 * Context Service - Manages AI context for menu engineering
 */
export class ContextService {
    private static readonly STORAGE_KEY = 'tweny_menu_context';

    /**
     * Build context from multiple sources
     */
    static async buildContext(params: {
        menuItems: ContextMenuItem[];
        categories: string[];
        colorPalette?: ColorPalette;
        images?: ExtractedImage[];
        salesData?: SalesDataContext;
        restaurantInfo?: { id?: number; name?: string; cuisine?: string };
    }): Promise<MenuContext> {
        const {
            menuItems,
            categories,
            colorPalette,
            images = [],
            salesData,
            restaurantInfo,
        } = params;

        // Calculate menu engineering if sales data available
        let menuEngineering: MenuEngineeringAnalysis | undefined;
        if (salesData) {
            menuEngineering = this.calculateMenuEngineering(menuItems, salesData);
        }

        const context: MenuContext = {
            restaurantId: restaurantInfo?.id,
            restaurantName: restaurantInfo?.name,
            cuisine: restaurantInfo?.cuisine,
            items: menuItems,
            categories,
            totalItems: menuItems.length,
            extractedColors: colorPalette || this.getDefaultColorPalette(),
            extractedImages: images,
            originalDesignStyle: this.inferDesignStyle(colorPalette, images),
            salesData,
            menuEngineering,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        };

        // Persist to session storage
        this.saveContext(context);

        return context;
    }

    /**
     * Calculate menu engineering quadrants (BCG matrix)
     */
    private static calculateMenuEngineering(
        items: ContextMenuItem[],
        salesData: SalesDataContext
    ): MenuEngineeringAnalysis {
        // Calculate averages
        const itemsWithData = items.filter(i => i.salesVolume !== undefined && i.margin !== undefined);

        if (itemsWithData.length === 0) {
            return {
                stars: [],
                cashCows: [],
                puzzles: [],
                dogs: [],
                averageMargin: 0,
                averagePopularity: 0,
                recommendations: [],
            };
        }

        const avgMargin = itemsWithData.reduce((sum, i) => sum + (i.margin || 0), 0) / itemsWithData.length;
        const avgPopularity = itemsWithData.reduce((sum, i) => sum + (i.salesVolume || 0), 0) / itemsWithData.length;

        const stars: ContextMenuItem[] = [];
        const cashCows: ContextMenuItem[] = [];
        const puzzles: ContextMenuItem[] = [];
        const dogs: ContextMenuItem[] = [];

        itemsWithData.forEach(item => {
            const highMargin = (item.margin || 0) >= avgMargin;
            const highPopularity = (item.salesVolume || 0) >= avgPopularity;

            if (highMargin && highPopularity) {
                item.bcgClass = 'star';
                stars.push(item);
            } else if (!highMargin && highPopularity) {
                item.bcgClass = 'cash_cow';
                cashCows.push(item);
            } else if (highMargin && !highPopularity) {
                item.bcgClass = 'puzzle';
                puzzles.push(item);
            } else {
                item.bcgClass = 'dog';
                dogs.push(item);
            }
        });

        // Generate recommendations
        const recommendations = this.generateRecommendations(stars, cashCows, puzzles, dogs);

        return {
            stars,
            cashCows,
            puzzles,
            dogs,
            averageMargin: avgMargin,
            averagePopularity: avgPopularity,
            recommendations,
        };
    }

    /**
     * Generate AI recommendations based on BCG analysis
     */
    private static generateRecommendations(
        stars: ContextMenuItem[],
        cashCows: ContextMenuItem[],
        puzzles: ContextMenuItem[],
        dogs: ContextMenuItem[]
    ): AIRecommendation[] {
        const recommendations: AIRecommendation[] = [];

        // Stars: Feature prominently
        stars.slice(0, 3).forEach(item => {
            recommendations.push({
                type: 'placement',
                itemId: item.id,
                itemName: item.name,
                reasoning: 'This is a Star item - high profit and high popularity. Feature it prominently.',
                expectedImpact: '+10-15% sales on this item',
                priority: 'high',
            });
        });

        // Cash Cows: Consider price increase
        cashCows.slice(0, 3).forEach(item => {
            recommendations.push({
                type: 'pricing',
                itemId: item.id,
                itemName: item.name,
                currentValue: item.price,
                suggestedValue: Math.round(item.price * 1.1 * 100) / 100,
                reasoning: 'High popularity but low margin. A small price increase could improve profitability without losing customers.',
                expectedImpact: '+8-12% margin',
                priority: 'medium',
            });
        });

        // Puzzles: Improve descriptions, add promotions
        puzzles.slice(0, 3).forEach(item => {
            recommendations.push({
                type: 'description',
                itemId: item.id,
                itemName: item.name,
                reasoning: 'High profit but low sales. This item needs better visibility and more appealing descriptions.',
                expectedImpact: '+20-30% sales if promoted well',
                priority: 'high',
            });
        });

        // Dogs: Consider removing or re-engineering
        dogs.slice(0, 2).forEach(item => {
            recommendations.push({
                type: 'removal',
                itemId: item.id,
                itemName: item.name,
                reasoning: 'Low profit and low popularity. Consider removing or significantly re-engineering this item.',
                expectedImpact: 'Simplified menu, better focus',
                priority: 'low',
            });
        });

        return recommendations;
    }

    /**
     * Infer design style from colors and images
     */
    private static inferDesignStyle(
        colors?: ColorPalette,
        images?: ExtractedImage[]
    ): DesignStyle {
        const hasPhotos = images && images.filter(i => i.type === 'food').length > 0;
        const scheme = colors?.scheme || 'neutral';

        let type: DesignStyle['type'] = 'modern';
        if (scheme === 'warm') type = 'rustic';
        else if (scheme === 'cool') type = 'elegant';
        else if (scheme === 'vibrant') type = 'vibrant';

        return {
            type,
            hasPhotos: hasPhotos || false,
            layoutType: hasPhotos ? 'magazine' : 'multi-column',
            fontStyle: type === 'elegant' ? 'serif' : 'sans-serif',
            priceDisplay: 'right-aligned',
        };
    }

    /**
     * Get default color palette
     */
    private static getDefaultColorPalette(): ColorPalette {
        return {
            primary: '#1a1a2e',
            secondary: '#16213e',
            accent: '#f97316',
            background: '#0f0f1a',
            text: '#ffffff',
            extracted: ['#1a1a2e', '#f97316', '#ffffff'],
            dominant: '#1a1a2e',
            scheme: 'neutral',
        };
    }

    /**
     * Save context to session storage
     */
    static saveContext(context: MenuContext): void {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(context));
        }
    }

    /**
     * Load context from session storage
     */
    static loadContext(): MenuContext | null {
        if (typeof window === 'undefined') return null;

        const stored = sessionStorage.getItem(this.STORAGE_KEY);
        if (!stored) return null;

        try {
            return JSON.parse(stored) as MenuContext;
        } catch {
            return null;
        }
    }

    /**
     * Update specific part of context
     */
    static updateContext(updates: Partial<MenuContext>): MenuContext | null {
        const context = this.loadContext();
        if (!context) return null;

        const updated = {
            ...context,
            ...updates,
            lastUpdated: new Date().toISOString(),
        };

        this.saveContext(updated);
        return updated;
    }

    /**
     * Clear context
     */
    static clearContext(): void {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(this.STORAGE_KEY);
        }
    }

    /**
     * Generate AI prompt context string
     */
    static generateAIPrompt(context: MenuContext): string {
        let prompt = `## Restaurant Context\n`;
        if (context.restaurantName) prompt += `Name: ${context.restaurantName}\n`;
        if (context.cuisine) prompt += `Cuisine: ${context.cuisine}\n`;
        prompt += `Total Items: ${context.totalItems}\n`;
        prompt += `Categories: ${context.categories.join(', ')}\n\n`;

        prompt += `## Menu Items\n`;
        context.items.slice(0, 50).forEach(item => {
            prompt += `- ${item.name}: $${item.price}`;
            if (item.bcgClass) prompt += ` [${item.bcgClass}]`;
            if (item.description) prompt += ` - ${item.description}`;
            prompt += `\n`;
        });

        if (context.menuEngineering) {
            const me = context.menuEngineering;
            prompt += `\n## Menu Engineering Analysis\n`;
            prompt += `Stars (High Profit, High Sales): ${me.stars.map(i => i.name).join(', ')}\n`;
            prompt += `Cash Cows (Low Profit, High Sales): ${me.cashCows.map(i => i.name).join(', ')}\n`;
            prompt += `Puzzles (High Profit, Low Sales): ${me.puzzles.map(i => i.name).join(', ')}\n`;
            prompt += `Dogs (Low Profit, Low Sales): ${me.dogs.map(i => i.name).join(', ')}\n`;
        }

        prompt += `\n## Design Style\n`;
        if (context.originalDesignStyle) {
            prompt += `Style: ${context.originalDesignStyle.type}\n`;
            prompt += `Layout: ${context.originalDesignStyle.layoutType}\n`;
            prompt += `Has Photos: ${context.originalDesignStyle.hasPhotos}\n`;
        }

        prompt += `\n## Color Palette\n`;
        prompt += `Primary: ${context.extractedColors.primary}\n`;
        prompt += `Accent: ${context.extractedColors.accent}\n`;
        prompt += `Scheme: ${context.extractedColors.scheme}\n`;

        return prompt;
    }
}
