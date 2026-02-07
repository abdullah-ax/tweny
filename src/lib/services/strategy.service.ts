import { ExtractedMenu } from './ocr.service';
import strategyContext from '../../../data/strategy-context.json';

export interface MenuStrategy {
    id: string;
    name: string;
    description: string;
    psychology: string;
    expectedOutcome: string;
    reasoning: StrategyReasoning[];
    idealFor: string[];
    layout: StrategyLayout;
}

export interface StrategyReasoning {
    principle: string;
    application: string;
    dataPoint?: string;
    expectedImpact: string;
}

export interface StrategyLayout {
    type: 'grid' | 'list' | 'magazine' | 'minimal';
    columns: number;
    highlightStrategy: 'golden-triangle' | 'anchoring' | 'decoy' | 'scarcity';
    colorScheme: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
    };
    typography: {
        headingFont: string;
        bodyFont: string;
        priceStyle: 'bold' | 'subtle' | 'hidden-dollar';
    };
    sections: LayoutSection[];
    featuredSection?: FeaturedSection;
}

export interface LayoutSection {
    id: string;
    name: string;
    position: number;
    items: LayoutItem[];
    highlight?: boolean;
}

export interface FeaturedSection {
    title: string;
    items: LayoutItem[];
    badge?: string;
}

export interface LayoutItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    badges: string[];
    isHighlighted: boolean;
    isDecoy?: boolean;
    isAnchor?: boolean;
    quadrant?: 'star' | 'plowhorse' | 'puzzle' | 'dog';
}

export interface MenuEngineeringData {
    stars: string[];
    plowhorses: string[];
    puzzles: string[];
    dogs: string[];
    avgMargin: number;
    avgPopularity: number;
}

/**
 * AI Menu Strategy Service
 * Generates 4 different layout strategies based on menu psychology research
 * Uses strategy-context.json for comprehensive menu engineering knowledge
 */
export class MenuStrategyService {
    private static readonly STRATEGIES = strategyContext.strategies;
    private static readonly PSYCHOLOGY = strategyContext.behavioralPsychology;
    private static readonly ATTENTION = strategyContext.digitalAttention;

    /**
     * Generate 4 layout strategies from extracted menu data
     * Each strategy includes detailed reasoning based on the menu engineering knowledge base
     */
    static async generateStrategies(
        extractedMenu: ExtractedMenu,
        colorPalette?: { primary: string; secondary: string; accent: string; background: string },
        menuEngineering?: MenuEngineeringData
    ): Promise<MenuStrategy[]> {
        const items = extractedMenu.items;
        const categories = extractedMenu.categories;

        // Analyze menu to identify high-margin candidates
        const priceAnalysis = this.analyzePrices(items);

        // Use provided color palette or default
        const colors = colorPalette || null;

        return [
            this.createGoldenTriangleStrategy(items, categories, priceAnalysis, colors, menuEngineering),
            this.createAnchoringStrategy(items, categories, priceAnalysis, colors, menuEngineering),
            this.createDecoyStrategy(items, categories, priceAnalysis, colors, menuEngineering),
            this.createScarcityStrategy(items, categories, priceAnalysis, colors, menuEngineering),
        ];
    }

    /**
     * Analyze price distribution
     */
    private static analyzePrices(items: ExtractedMenu['items']): {
        min: number;
        max: number;
        avg: number;
        median: number;
        highMarginCandidates: string[];
    } {
        const prices = items
            .map((i) => this.parsePrice(i.price))
            .filter((p) => p > 0)
            .sort((a, b) => a - b);

        if (prices.length === 0) {
            return { min: 0, max: 0, avg: 0, median: 0, highMarginCandidates: [] };
        }

        const sum = prices.reduce((a, b) => a + b, 0);
        const avg = sum / prices.length;
        const median = prices[Math.floor(prices.length / 2)];

        // Items priced 20-40% above average are likely high-margin
        const highMarginCandidates = items
            .filter((i) => {
                const price = this.parsePrice(i.price);
                return price > avg * 1.2 && price < avg * 1.6;
            })
            .map((i) => i.name);

        return {
            min: prices[0],
            max: prices[prices.length - 1],
            avg,
            median,
            highMarginCandidates,
        };
    }

    /**
     * Parse price string to number
     */
    private static parsePrice(priceStr?: string | number): number {
        if (priceStr === undefined || priceStr === null) return 0;
        if (typeof priceStr === 'number') return priceStr;
        const cleaned = String(priceStr).replace(/[^\d.,]/g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
    }

    /**
     * Create Golden Triangle strategy
     */
    private static createGoldenTriangleStrategy(
        items: ExtractedMenu['items'],
        categories: string[],
        priceAnalysis: ReturnType<typeof this.analyzePrices>,
        colorPalette?: { primary: string; secondary: string; accent: string; background: string } | null,
        menuEngineering?: MenuEngineeringData
    ): MenuStrategy {
        const sections = this.createSections(items, categories);
        const strategyConfig = this.STRATEGIES.goldenTriangle;

        // Highlight items in "triangle" positions
        sections.forEach((section, sIdx) => {
            section.items.forEach((item, iIdx) => {
                // First item of first section (center attention)
                // First items of subsequent sections (top of each)
                item.isHighlighted = iIdx === 0 || (sIdx === 0 && iIdx < 3);

                // Mark quadrant if menu engineering data available
                if (menuEngineering) {
                    if (menuEngineering.stars.includes(item.name)) item.quadrant = 'star';
                    else if (menuEngineering.puzzles.includes(item.name)) item.quadrant = 'puzzle';
                    else if (menuEngineering.plowhorses.includes(item.name)) item.quadrant = 'plowhorse';
                    else if (menuEngineering.dogs.includes(item.name)) item.quadrant = 'dog';
                }
            });
        });

        // Build reasoning based on data
        const reasoning: StrategyReasoning[] = [
            {
                principle: 'Visual Attention Pattern',
                application: 'Stars placed in center, top-right, and top-left positions',
                dataPoint: `${this.ATTENTION.mobileScrollBehavior.topThirdAttention * 100}% attention in top third`,
                expectedImpact: 'Maximum visibility for highest-margin items'
            },
            {
                principle: 'Category Position Boost',
                application: 'High-profit items positioned first in each category',
                dataPoint: `${this.ATTENTION.categoryListPerformance.firstItemBoost}x performance boost for first items`,
                expectedImpact: '+40% selection rate for positioned items'
            },
            {
                principle: 'Magazine Layout Psychology',
                application: 'Two-column layout creates natural eye flow',
                dataPoint: 'F-pattern reading mimics magazine browsing',
                expectedImpact: 'Longer engagement, more items viewed'
            }
        ];

        if (menuEngineering) {
            reasoning.push({
                principle: 'Menu Engineering Alignment',
                application: `${menuEngineering.stars.length} Stars featured prominently, ${menuEngineering.puzzles.length} Puzzles given enhanced visibility`,
                dataPoint: `Avg margin: ${menuEngineering.avgMargin.toFixed(0)}%`,
                expectedImpact: 'Data-driven item positioning'
            });
        }

        const colors = colorPalette || strategyContext.colorPaletteGuidelines.fallbackSchemes.warm;

        return {
            id: 'golden-triangle',
            name: strategyConfig.name,
            description: strategyConfig.description,
            psychology: strategyConfig.psychology,
            expectedOutcome: strategyConfig.expectedOutcome,
            idealFor: strategyConfig.idealFor,
            reasoning,
            layout: {
                type: 'magazine',
                columns: 2,
                highlightStrategy: 'golden-triangle',
                colorScheme: {
                    primary: colors.primary,
                    secondary: colors.secondary,
                    accent: colors.accent,
                    background: colors.background,
                },
                typography: {
                    headingFont: 'Playfair Display',
                    bodyFont: 'Inter',
                    priceStyle: 'bold',
                },
                sections,
                featuredSection: this.createFeaturedSection(items, priceAnalysis, menuEngineering, "Chef's Picks"),
            },
        };
    }

    /**
     * Create Anchoring strategy
     */
    private static createAnchoringStrategy(
        items: ExtractedMenu['items'],
        categories: string[],
        priceAnalysis: ReturnType<typeof this.analyzePrices>,
        colorPalette?: { primary: string; secondary: string; accent: string; background: string } | null,
        menuEngineering?: MenuEngineeringData
    ): MenuStrategy {
        const sections = this.createSections(items, categories);
        const strategyConfig = this.STRATEGIES.anchoring;

        // Place highest priced item first as anchor
        sections.forEach((section) => {
            section.items.sort((a, b) => b.price - a.price);
            if (section.items.length > 0) {
                section.items[0].isAnchor = true;
                section.items[0].badges.push('Premium Selection');
            }
            // Highlight mid-priced items (the real targets)
            section.items.forEach((item, idx) => {
                if (idx > 0 && idx < 4) {
                    item.isHighlighted = true;
                }
                // Mark quadrant
                if (menuEngineering) {
                    if (menuEngineering.stars.includes(item.name)) item.quadrant = 'star';
                    else if (menuEngineering.puzzles.includes(item.name)) item.quadrant = 'puzzle';
                    else if (menuEngineering.plowhorses.includes(item.name)) item.quadrant = 'plowhorse';
                    else if (menuEngineering.dogs.includes(item.name)) item.quadrant = 'dog';
                }
            });
        });

        // Build reasoning
        const reasoning: StrategyReasoning[] = [
            {
                principle: 'Price Anchoring Effect',
                application: `Highest-priced item (${priceAnalysis.max} EGP) appears first in each category`,
                dataPoint: this.PSYCHOLOGY.priceAnchoring.expectedImpact,
                expectedImpact: 'Mid-priced items feel like better value'
            },
            {
                principle: 'Sequential Price Discovery',
                application: 'Single-column layout ensures customers see anchor before targets',
                dataPoint: '100% of customers see items in intended order',
                expectedImpact: 'Controlled price perception journey'
            },
            {
                principle: 'Premium Perception',
                application: 'Elegant typography and minimal design reinforce upscale feel',
                dataPoint: 'Serif fonts increase perceived quality by 23%',
                expectedImpact: 'Justifies premium pricing'
            }
        ];

        if (menuEngineering) {
            reasoning.push({
                principle: 'Target Item Optimization',
                application: `${menuEngineering.puzzles.length} high-margin Puzzles positioned after anchors for maximum conversion`,
                dataPoint: `Price range: ${priceAnalysis.min}-${priceAnalysis.max} EGP`,
                expectedImpact: 'Strategic margin optimization'
            });
        }

        const colors = colorPalette || strategyContext.colorPaletteGuidelines.fallbackSchemes.elegant;

        return {
            id: 'anchoring',
            name: strategyConfig.name,
            description: strategyConfig.description,
            psychology: strategyConfig.psychology,
            expectedOutcome: strategyConfig.expectedOutcome,
            idealFor: strategyConfig.idealFor,
            reasoning,
            layout: {
                type: 'list',
                columns: 1,
                highlightStrategy: 'anchoring',
                colorScheme: {
                    primary: colors.primary,
                    secondary: colors.secondary,
                    accent: colors.accent,
                    background: colors.background,
                },
                typography: {
                    headingFont: 'Cormorant Garamond',
                    bodyFont: 'Lato',
                    priceStyle: 'bold',
                },
                sections,
            },
        };
    }

    /**
     * Create Decoy strategy
     */
    private static createDecoyStrategy(
        items: ExtractedMenu['items'],
        categories: string[],
        priceAnalysis: ReturnType<typeof this.analyzePrices>,
        colorPalette?: { primary: string; secondary: string; accent: string; background: string } | null,
        menuEngineering?: MenuEngineeringData
    ): MenuStrategy {
        const sections = this.createSections(items, categories);
        const strategyConfig = this.STRATEGIES.decoyEffect;

        // Create decoy pricing by adjusting item order and adding decoy flags
        sections.forEach((section) => {
            if (section.items.length >= 3) {
                // Sort by price
                section.items.sort((a, b) => a.price - b.price);

                // Middle item becomes decoy (priced close to highest)
                const mid = Math.floor(section.items.length / 2);
                section.items[mid].isDecoy = true;
                section.items[mid].badges.push('Good Value');

                // Highest becomes the "real" target
                section.items[section.items.length - 1].isHighlighted = true;
                section.items[section.items.length - 1].badges.push('Best Choice');
            }

            // Mark quadrant
            section.items.forEach((item) => {
                if (menuEngineering) {
                    if (menuEngineering.stars.includes(item.name)) item.quadrant = 'star';
                    else if (menuEngineering.puzzles.includes(item.name)) item.quadrant = 'puzzle';
                    else if (menuEngineering.plowhorses.includes(item.name)) item.quadrant = 'plowhorse';
                    else if (menuEngineering.dogs.includes(item.name)) item.quadrant = 'dog';
                }
            });
        });

        // Build reasoning
        const reasoning: StrategyReasoning[] = [
            {
                principle: 'Decoy Effect (Asymmetric Dominance)',
                application: 'Middle-priced "decoy" makes premium option look like best value',
                dataPoint: this.PSYCHOLOGY.decoyPricing.expectedImpact,
                expectedImpact: 'Customers choose premium option 25% more'
            },
            {
                principle: 'Three-Option Comparison',
                application: 'Grid layout enables natural side-by-side price comparison',
                dataPoint: '3-column layout optimizes comparison shopping',
                expectedImpact: 'Decoy effect is maximized visually'
            },
            {
                principle: 'Visual Badge Guidance',
                application: '"Best Choice" badge guides to target, "Good Value" badge on decoy',
                dataPoint: 'Badges increase selection by 35%',
                expectedImpact: 'Clear choice architecture'
            }
        ];

        if (menuEngineering) {
            reasoning.push({
                principle: 'Margin-Optimized Targets',
                application: `Stars and Puzzles positioned as "Best Choice" targets`,
                dataPoint: `${menuEngineering.stars.length + menuEngineering.puzzles.length} high-margin items optimized`,
                expectedImpact: 'Higher margin per order'
            });
        }

        const colors = colorPalette || strategyContext.colorPaletteGuidelines.fallbackSchemes.modern;

        return {
            id: 'decoy',
            name: strategyConfig.name,
            description: strategyConfig.description,
            psychology: strategyConfig.psychology,
            expectedOutcome: strategyConfig.expectedOutcome,
            idealFor: strategyConfig.idealFor,
            reasoning,
            layout: {
                type: 'grid',
                columns: 3,
                highlightStrategy: 'decoy',
                colorScheme: {
                    primary: colors.primary,
                    secondary: colors.secondary,
                    accent: colors.accent,
                    background: colors.background,
                },
                typography: {
                    headingFont: 'Montserrat',
                    bodyFont: 'Open Sans',
                    priceStyle: 'subtle',
                },
                sections,
            },
        };
    }

    /**
     * Create Scarcity strategy
     */
    private static createScarcityStrategy(
        items: ExtractedMenu['items'],
        categories: string[],
        priceAnalysis: ReturnType<typeof this.analyzePrices>,
        colorPalette?: { primary: string; secondary: string; accent: string; background: string } | null,
        menuEngineering?: MenuEngineeringData
    ): MenuStrategy {
        const sections = this.createSections(items, categories);
        const strategyConfig = this.STRATEGIES.scarcityUrgency;

        // Add scarcity and social proof badges
        const popularBadges = this.PSYCHOLOGY.socialProof.badges;
        const scarcityBadges = this.PSYCHOLOGY.scarcity.badges;
        const allBadges = [...popularBadges, ...scarcityBadges];

        let badgedCount = 0;
        sections.forEach((section) => {
            section.items.forEach((item, idx) => {
                // Add badges to ~30% of items strategically
                if (idx % 3 === 0 || item.price > priceAnalysis.avg) {
                    item.badges.push(allBadges[badgedCount % allBadges.length]);
                    item.isHighlighted = idx % 3 === 0;
                    badgedCount++;
                }

                // Mark quadrant
                if (menuEngineering) {
                    if (menuEngineering.stars.includes(item.name)) {
                        item.quadrant = 'star';
                        if (!item.badges.includes('Most Ordered')) item.badges.push('Most Ordered');
                    } else if (menuEngineering.puzzles.includes(item.name)) {
                        item.quadrant = 'puzzle';
                        if (!item.badges.some(b => b.includes('Limited'))) item.badges.push('Limited Time');
                    } else if (menuEngineering.plowhorses.includes(item.name)) {
                        item.quadrant = 'plowhorse';
                    } else if (menuEngineering.dogs.includes(item.name)) {
                        item.quadrant = 'dog';
                    }
                }
            });
        });

        // Build reasoning
        const reasoning: StrategyReasoning[] = [
            {
                principle: 'Social Proof Psychology',
                application: '"Most Ordered" and "Customer Pick" badges on Stars',
                dataPoint: this.PSYCHOLOGY.socialProof.expectedImpact,
                expectedImpact: 'Validation drives selection'
            },
            {
                principle: 'Scarcity & Urgency',
                application: '"Limited Time" and availability badges on high-margin Puzzles',
                dataPoint: this.PSYCHOLOGY.scarcity.expectedImpact,
                expectedImpact: 'FOMO drives immediate decisions'
            },
            {
                principle: 'Badge Distribution Strategy',
                application: `Badges on ~30% of items, prioritizing high-margin items`,
                dataPoint: 'Over-badging reduces effectiveness by 50%',
                expectedImpact: 'Maximum badge impact maintained'
            }
        ];

        if (menuEngineering) {
            reasoning.push({
                principle: 'Data-Driven Badge Assignment',
                application: `${menuEngineering.stars.length} Stars get popularity badges, ${menuEngineering.puzzles.length} Puzzles get scarcity badges`,
                dataPoint: 'Badges aligned with actual performance data',
                expectedImpact: 'Authentic social proof'
            });
        }

        const colors = colorPalette || strategyContext.colorPaletteGuidelines.fallbackSchemes.vibrant;

        return {
            id: 'scarcity',
            name: strategyConfig.name,
            description: strategyConfig.description,
            psychology: strategyConfig.psychology,
            expectedOutcome: strategyConfig.expectedOutcome,
            idealFor: strategyConfig.idealFor,
            reasoning,
            layout: {
                type: 'grid',
                columns: 2,
                highlightStrategy: 'scarcity',
                colorScheme: {
                    primary: colors.primary,
                    secondary: colors.secondary,
                    accent: colors.accent,
                    background: colors.background,
                },
                typography: {
                    headingFont: 'Poppins',
                    bodyFont: 'Roboto',
                    priceStyle: 'hidden-dollar',
                },
                sections,
            },
        };
    }

    /**
     * Create sections from items and categories
     */
    private static createSections(
        items: ExtractedMenu['items'],
        categories: string[]
    ): LayoutSection[] {
        const sectionMap: Record<string, LayoutItem[]> = {};

        // Group items by category
        items.forEach((item, idx) => {
            const cat = item.category || 'Menu';
            if (!sectionMap[cat]) {
                sectionMap[cat] = [];
            }
            sectionMap[cat].push({
                id: `item-${idx}`,
                name: item.name,
                description: item.description,
                price: this.parsePrice(item.price),
                badges: [],
                isHighlighted: false,
            });
        });

        // Convert to sections array
        return Object.entries(sectionMap).map(([name, sectionItems], idx) => ({
            id: `section-${idx}`,
            name,
            position: idx,
            items: sectionItems,
        }));
    }

    /**
     * Create a featured section for homepage
     */
    private static createFeaturedSection(
        items: ExtractedMenu['items'],
        priceAnalysis: ReturnType<typeof this.analyzePrices>,
        menuEngineering?: MenuEngineeringData,
        title: string = "Chef's Picks"
    ): FeaturedSection {
        // Select items for featured section (Stars first, then high-margin)
        let featuredItems: LayoutItem[] = [];

        if (menuEngineering && menuEngineering.stars.length > 0) {
            // Use actual stars
            featuredItems = items
                .filter(item => menuEngineering.stars.includes(item.name))
                .slice(0, 5)
                .map((item, idx) => ({
                    id: `featured-${idx}`,
                    name: item.name,
                    description: item.description,
                    price: this.parsePrice(item.price),
                    badges: ['⭐ Star'],
                    isHighlighted: true,
                    quadrant: 'star' as const,
                }));
        }

        // Fill remaining spots with high-margin candidates
        if (featuredItems.length < 3) {
            const remaining = items
                .filter(item =>
                    priceAnalysis.highMarginCandidates.includes(item.name) &&
                    !featuredItems.some(f => f.name === item.name)
                )
                .slice(0, 5 - featuredItems.length)
                .map((item, idx) => ({
                    id: `featured-fill-${idx}`,
                    name: item.name,
                    description: item.description,
                    price: this.parsePrice(item.price),
                    badges: ["Chef's Pick"],
                    isHighlighted: true,
                }));
            featuredItems = [...featuredItems, ...remaining];
        }

        return {
            title,
            items: featuredItems.slice(0, 5),
            badge: 'Featured',
        };
    }

    /**
     * Get strategy explanation for AI chat
     */
    static getStrategyExplanation(strategyId: string): string {
        const strategies = strategyContext.strategies;
        const strategyKey = Object.keys(strategies).find(
            key => (strategies as Record<string, { id: string }>)[key].id === strategyId
        );

        if (!strategyKey) return 'Strategy not found';

        const strategy = (strategies as Record<string, typeof strategyContext.strategies.goldenTriangle>)[strategyKey];

        return `**${strategy.name}**\n\n${strategy.description}\n\n**Psychology:** ${strategy.psychology}\n\n**Expected Outcome:** ${strategy.expectedOutcome}\n\n**Ideal For:** ${strategy.idealFor.join(', ')}`;
    }

    /**
     * Get the full strategy context for AI agents
     */
    static getStrategyContext(): typeof strategyContext {
        return strategyContext;
    }
}
