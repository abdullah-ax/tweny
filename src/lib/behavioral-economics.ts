/**
 * Behavioral Economics Logic for Menu Optimization
 * 
 * This module implements psychological pricing and positioning strategies
 * to maximize conversion rates and profit margins.
 */

import { MenuItemData, MenuSectionData } from '@/lib/types/menu.types';

// Re-export types for convenience
export type { MenuItemData, MenuSectionData };

// ============================================
// Price Neutralization
// ============================================

/**
 * Strips currency symbols from prices for psychological pricing
 * Research shows that removing '$' can increase spending by 8.15%
 */
export function neutralizePrice(price: number): string {
    return price.toFixed(2);
}

// ============================================
// Golden Triangle Logic
// ============================================

/**
 * Eye-tracking research shows customers look at menus in a "golden triangle":
 * 1. Top Right (first attention point)
 * 2. Center (natural resting point)
 * 3. Top Left (final scan)
 * 
 * This function repositions high-margin items to these positions.
 */
export function applyGoldenTriangle(items: MenuItemData[]): MenuItemData[] {
    if (items.length <= 3) return items;

    // Find high margin items
    const highMarginItems = items.filter(item => item.isHighMargin);
    const regularItems = items.filter(item => !item.isHighMargin && !item.isAnchor);
    const anchorItems = items.filter(item => item.isAnchor);

    // Position high margin items strategically
    const positioned: MenuItemData[] = [];

    // Anchor always first (decoy effect)
    if (anchorItems.length > 0) {
        positioned.push({ ...anchorItems[0], position: 'standard' });
    }

    // High margin items get priority positions
    highMarginItems.forEach((item, index) => {
        if (index === 0) {
            positioned.push({ ...item, position: 'top-right' });
        } else if (index === 1) {
            positioned.push({ ...item, position: 'center' });
        } else {
            positioned.push({ ...item, position: 'standard' });
        }
    });

    // Fill remaining slots with regular items
    regularItems.forEach(item => {
        positioned.push({ ...item, position: 'standard' });
    });

    return positioned;
}

// ============================================
// Price Anchoring (Decoy Effect)
// ============================================

/**
 * The first item in a category serves as a "price anchor"
 * It should be slightly overpriced to make other items seem like better value
 */
export function identifyAnchors(sections: MenuSectionData[]): MenuSectionData[] {
    return sections.map(section => {
        if (section.items.length === 0) return section;

        // Sort by price descending to find potential anchors
        const sortedByPrice = [...section.items].sort((a, b) => b.price - a.price);

        // The highest-priced item becomes the anchor (if not already high margin)
        const anchorItem = sortedByPrice.find(item => !item.isHighMargin);

        const markedItems = section.items.map((item, index) => ({
            ...item,
            isAnchor: item.id === anchorItem?.id,
        }));

        return {
            ...section,
            items: markedItems,
        };
    });
}

// ============================================
// Menu Engineering Classification
// ============================================

export type MenuClass = 'star' | 'plow_horse' | 'puzzle' | 'dog';

interface MenuMetrics {
    popularity: number; // Sales volume
    profitability: number; // Contribution margin
}

/**
 * Classifies items based on Menu Engineering matrix:
 * - Star: High popularity + High profitability (promote heavily)
 * - Plow Horse: High popularity + Low profitability (increase price)
 * - Puzzle: Low popularity + High profitability (reposition/promote)
 * - Dog: Low popularity + Low profitability (remove or revamp)
 */
export function classifyItem(metrics: MenuMetrics, avgPopularity: number, avgProfitability: number): MenuClass {
    const isHighPopularity = metrics.popularity >= avgPopularity;
    const isHighProfitability = metrics.profitability >= avgProfitability;

    if (isHighPopularity && isHighProfitability) return 'star';
    if (isHighPopularity && !isHighProfitability) return 'plow_horse';
    if (!isHighPopularity && isHighProfitability) return 'puzzle';
    return 'dog';
}

// ============================================
// Charm Pricing
// ============================================

/**
 * Applies charm pricing (.99 endings) to prices
 * Research shows this can increase sales by up to 24%
 */
export function applyCharmPricing(price: number): number {
    const rounded = Math.floor(price);
    return rounded + 0.99;
}

// ============================================
// Visual Hierarchy Scoring
// ============================================

interface VisualScore {
    itemId: number;
    score: number;
    position: 'featured' | 'prominent' | 'standard' | 'hidden';
}

/**
 * Calculates visual hierarchy score based on multiple factors
 */
export function calculateVisualScore(
    item: MenuItemData,
    metrics?: { profitMargin?: number; popularity?: number }
): VisualScore {
    let score = 0;

    // Profit margin weight (40%)
    if (metrics?.profitMargin) {
        score += metrics.profitMargin * 0.4;
    }

    // Popularity weight (30%)
    if (metrics?.popularity) {
        score += metrics.popularity * 0.3;
    }

    // Image presence (15%)
    if (item.imageUrl) {
        score += 15;
    }

    // Rating (15%)
    if (item.rating && item.rating >= 4.5) {
        score += 15;
    } else if (item.rating && item.rating >= 4.0) {
        score += 10;
    }

    // Determine position based on score
    let position: VisualScore['position'];
    if (score >= 70) position = 'featured';
    else if (score >= 50) position = 'prominent';
    else if (score >= 30) position = 'standard';
    else position = 'hidden';

    return {
        itemId: item.id,
        score,
        position,
    };
}

// ============================================
// Bundle Detection
// ============================================

interface BundleSuggestion {
    items: MenuItemData[];
    savings: number;
    name: string;
}

/**
 * Identifies items that are commonly ordered together
 * and suggests bundle pricing
 */
export function suggestBundles(
    items: MenuItemData[],
    orderHistory: Array<{ items: number[] }>
): BundleSuggestion[] {
    // Find frequently co-occurring items
    const coOccurrence: Map<string, number> = new Map();

    orderHistory.forEach(order => {
        for (let i = 0; i < order.items.length; i++) {
            for (let j = i + 1; j < order.items.length; j++) {
                const key = [order.items[i], order.items[j]].sort().join('-');
                coOccurrence.set(key, (coOccurrence.get(key) || 0) + 1);
            }
        }
    });

    // Filter for significant co-occurrences
    const bundles: BundleSuggestion[] = [];
    const threshold = orderHistory.length * 0.1; // 10% threshold

    coOccurrence.forEach((count, key) => {
        if (count >= threshold) {
            const [id1, id2] = key.split('-').map(Number);
            const item1 = items.find(i => i.id === id1);
            const item2 = items.find(i => i.id === id2);

            if (item1 && item2) {
                const totalPrice = item1.price + item2.price;
                const bundlePrice = totalPrice * 0.9; // 10% discount

                bundles.push({
                    items: [item1, item2],
                    savings: totalPrice - bundlePrice,
                    name: `${item1.name} + ${item2.name}`,
                });
            }
        }
    });

    return bundles;
}

// ============================================
// Main Optimization Function
// ============================================

/**
 * Applies all behavioral economics optimizations to menu sections
 */
export function applyBehavioralEconomics(sections: MenuSectionData[]): MenuSectionData[] {
    // Step 1: Identify anchors
    const withAnchors = identifyAnchors(sections);

    // Step 2: Apply Golden Triangle to each section
    const optimized = withAnchors.map(section => ({
        ...section,
        items: applyGoldenTriangle(section.items),
    }));

    return optimized;
}

// ============================================
// Analytics Integration
// ============================================

export interface BehavioralMetrics {
    anchorEffectiveness: number; // How often anchor leads to other purchases
    goldenTriangleConversion: number; // CTR on top-right/center items
    priceNeutralizationImpact: number; // A/B test result
    averageOrderValue: number;
}

/**
 * Calculates behavioral economics effectiveness metrics
 */
export function calculateBehavioralMetrics(
    events: Array<{
        type: string;
        itemId: number;
        position?: string;
        timestamp: Date;
        sessionId: string;
    }>,
    items: MenuItemData[]
): BehavioralMetrics {
    const sessions = new Set(events.map(e => e.sessionId));
    let anchorViews = 0;
    let subsequentPurchases = 0;
    let goldenTriangleClicks = 0;
    let totalClicks = 0;

    events.forEach(event => {
        if (event.type === 'view') {
            const item = items.find(i => i.id === event.itemId);
            if (item?.isAnchor) anchorViews++;
        }

        if (event.type === 'click') {
            totalClicks++;
            if (event.position === 'top-right' || event.position === 'center') {
                goldenTriangleClicks++;
            }
        }
    });

    return {
        anchorEffectiveness: anchorViews > 0 ? subsequentPurchases / anchorViews : 0,
        goldenTriangleConversion: totalClicks > 0 ? goldenTriangleClicks / totalClicks : 0,
        priceNeutralizationImpact: 0, // Requires A/B test data
        averageOrderValue: 0, // Requires order data
    };
}

export default {
    applyBehavioralEconomics,
    applyGoldenTriangle,
    identifyAnchors,
    neutralizePrice,
    applyCharmPricing,
    classifyItem,
    calculateVisualScore,
    suggestBundles,
    calculateBehavioralMetrics,
};
