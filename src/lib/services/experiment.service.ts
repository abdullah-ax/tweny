import { db } from '@/lib/db';
import { appEvents, menuItems } from '@/lib/db/schema';
import { eq, and, desc, gte, sql, count } from 'drizzle-orm';

export interface Experiment {
    id: string;
    restaurantId: number;
    name: string;
    hypothesis: string;
    strategyId: string;
    strategyName: string;
    status: 'draft' | 'running' | 'paused' | 'completed';
    startedAt?: string;
    endedAt?: string;
    layoutId: string;
    metrics: ExperimentMetrics;
    insights: string[];
}

export interface ExperimentMetrics {
    views: number;
    itemClicks: number;
    addToCarts: number;
    checkouts: number;
    conversionRate: number;
    avgOrderValue: number;
    topItems: Array<{ name: string; clicks: number; conversions: number }>;
    voiceFeedbackCount: number;
    feedbackSentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
}

export interface ScientificInsight {
    type: 'observation' | 'hypothesis' | 'recommendation';
    title: string;
    description: string;
    confidence: number;
    dataPoints: string[];
}

/**
 * Experiment Service
 * Implements the scientific method for menu optimization
 */
export class ExperimentService {
    /**
     * Create a new experiment
     */
    static createExperiment(
        restaurantId: number,
        name: string,
        hypothesis: string,
        strategyId: string,
        strategyName: string,
        layoutId: string
    ): Experiment {
        return {
            id: `exp-${Date.now()}`,
            restaurantId,
            name,
            hypothesis,
            strategyId,
            strategyName,
            status: 'draft',
            layoutId,
            metrics: {
                views: 0,
                itemClicks: 0,
                addToCarts: 0,
                checkouts: 0,
                conversionRate: 0,
                avgOrderValue: 0,
                topItems: [],
                voiceFeedbackCount: 0,
                feedbackSentiment: 'unknown',
            },
            insights: [],
        };
    }

    /**
     * Calculate metrics for an experiment from database
     */
    static async calculateMetrics(
        restaurantId: number,
        startDate?: Date
    ): Promise<ExperimentMetrics> {
        const dateFilter = startDate ? gte(appEvents.createdAt, startDate) : undefined;

        // Get event counts
        const events = await db
            .select({
                eventType: appEvents.eventType,
                eventCount: count(),
            })
            .from(appEvents)
            .where(
                dateFilter
                    ? and(eq(appEvents.restaurantId, restaurantId), dateFilter)
                    : eq(appEvents.restaurantId, restaurantId)
            )
            .groupBy(appEvents.eventType);

        const eventMap: Record<string, number> = {};
        events.forEach((e) => {
            eventMap[e.eventType] = Number(e.eventCount);
        });

        const views = eventMap['menu_view'] || 0;
        const itemClicks = eventMap['item_click'] || 0;
        const addToCarts = eventMap['add_to_cart'] || 0;
        const checkouts = eventMap['checkout'] || 0;

        // Get top items from event data
        const clickEvents = await db
            .select({ eventData: appEvents.eventData })
            .from(appEvents)
            .where(
                and(
                    eq(appEvents.restaurantId, restaurantId),
                    eq(appEvents.eventType, 'item_click'),
                    dateFilter || sql`TRUE`
                )
            )
            .limit(500);

        const itemCounts: Record<string, { clicks: number; conversions: number }> = {};
        clickEvents.forEach((e) => {
            const data = e.eventData as { itemName?: string } | null;
            if (data?.itemName) {
                if (!itemCounts[data.itemName]) {
                    itemCounts[data.itemName] = { clicks: 0, conversions: 0 };
                }
                itemCounts[data.itemName].clicks++;
            }
        });

        const topItems = Object.entries(itemCounts)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10);

        return {
            views,
            itemClicks,
            addToCarts,
            checkouts,
            conversionRate: views > 0 ? (checkouts / views) * 100 : 0,
            avgOrderValue: 0, // Would need order data
            topItems,
            voiceFeedbackCount: eventMap['voice_feedback'] || 0,
            feedbackSentiment: 'unknown',
        };
    }

    /**
     * Generate scientific insights from metrics
     */
    static generateInsights(
        metrics: ExperimentMetrics,
        previousMetrics?: ExperimentMetrics
    ): ScientificInsight[] {
        const insights: ScientificInsight[] = [];

        // Observation: Conversion funnel
        const clickRate = metrics.views > 0 ? (metrics.itemClicks / metrics.views) * 100 : 0;
        const cartRate = metrics.itemClicks > 0 ? (metrics.addToCarts / metrics.itemClicks) * 100 : 0;
        const checkoutRate = metrics.addToCarts > 0 ? (metrics.checkouts / metrics.addToCarts) * 100 : 0;

        insights.push({
            type: 'observation',
            title: 'Conversion Funnel Analysis',
            description: `${clickRate.toFixed(1)}% of viewers click items, ${cartRate.toFixed(1)}% add to cart, ${checkoutRate.toFixed(1)}% complete checkout.`,
            confidence: Math.min(metrics.views / 100, 1),
            dataPoints: [
                `${metrics.views} total views`,
                `${metrics.itemClicks} item clicks`,
                `${metrics.addToCarts} add to carts`,
                `${metrics.checkouts} checkouts`,
            ],
        });

        // Observation: Top performing items
        if (metrics.topItems.length > 0) {
            const top3 = metrics.topItems.slice(0, 3);
            insights.push({
                type: 'observation',
                title: 'Top Performing Items',
                description: `"${top3[0]?.name}" leads with ${top3[0]?.clicks} clicks. These items attract the most attention.`,
                confidence: 0.8,
                dataPoints: top3.map((i) => `${i.name}: ${i.clicks} clicks`),
            });
        }

        // Comparison with previous
        if (previousMetrics) {
            const viewChange = ((metrics.views - previousMetrics.views) / Math.max(previousMetrics.views, 1)) * 100;
            const conversionChange = metrics.conversionRate - previousMetrics.conversionRate;

            insights.push({
                type: 'observation',
                title: 'Experiment Progress',
                description: `Views ${viewChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(viewChange).toFixed(1)}%. Conversion rate ${conversionChange >= 0 ? 'improved' : 'declined'} by ${Math.abs(conversionChange).toFixed(2)}%.`,
                confidence: 0.7,
                dataPoints: [
                    `Previous views: ${previousMetrics.views}`,
                    `Current views: ${metrics.views}`,
                    `Previous conversion: ${previousMetrics.conversionRate.toFixed(2)}%`,
                    `Current conversion: ${metrics.conversionRate.toFixed(2)}%`,
                ],
            });
        }

        // Recommendations
        if (clickRate < 20) {
            insights.push({
                type: 'recommendation',
                title: 'Low Engagement Alert',
                description: 'Click-through rate is below 20%. Consider repositioning high-margin items to more prominent positions.',
                confidence: 0.9,
                dataPoints: [`Current CTR: ${clickRate.toFixed(1)}%`, 'Industry benchmark: 25-35%'],
            });
        }

        if (cartRate < 30 && metrics.itemClicks > 10) {
            insights.push({
                type: 'recommendation',
                title: 'Cart Abandonment Issue',
                description: 'Users view items but rarely add to cart. Try adding scarcity badges or simplifying the add-to-cart flow.',
                confidence: 0.85,
                dataPoints: [`Current add-to-cart rate: ${cartRate.toFixed(1)}%`],
            });
        }

        // Hypothesis generation
        if (metrics.topItems.length > 0) {
            const topItem = metrics.topItems[0];
            insights.push({
                type: 'hypothesis',
                title: 'Potential Optimization',
                description: `Hypothesis: Moving "${topItem.name}" to the golden triangle position could increase overall conversions by 10-15%.`,
                confidence: 0.6,
                dataPoints: [`${topItem.name} has ${topItem.clicks} clicks`, 'Based on menu psychology research'],
            });
        }

        return insights;
    }

    /**
     * Get experiment summary for chat context
     */
    static getExperimentSummary(experiment: Experiment): string {
        const { metrics, insights } = experiment;

        return `
**Experiment: ${experiment.name}**
Strategy: ${experiment.strategyName}
Status: ${experiment.status}
Hypothesis: ${experiment.hypothesis}

**Current Metrics:**
- Views: ${metrics.views}
- Item Clicks: ${metrics.itemClicks}
- Add to Carts: ${metrics.addToCarts}
- Checkouts: ${metrics.checkouts}
- Conversion Rate: ${metrics.conversionRate.toFixed(2)}%

**Top Items:**
${metrics.topItems.slice(0, 5).map((i) => `- ${i.name}: ${i.clicks} clicks`).join('\n')}

**Insights:**
${insights.length > 0 ? insights.join('\n') : 'Gathering data...'}
`;
    }
}
