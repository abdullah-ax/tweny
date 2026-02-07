import { db } from '@/lib/db';
import { menuItems, orderItems, analytics, restaurants } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

export interface AnalyticsResult {
    menuItemId: number;
    itemName: string;
    totalRevenue: number;
    totalQuantitySold: number;
    averageOrderValue: number;
    totalCost: number;
    grossMargin: number;
    contributionMargin: number;
    popularityIndex: number;
    profitabilityIndex: number;
    bcgQuadrant: 'star' | 'cash_cow' | 'question_mark' | 'dog';
    menuEngineeringClass: 'star' | 'plow_horse' | 'puzzle' | 'dog';
    revenueGrowthRate: number;
}

export interface AnalyticsSummary {
    totalRevenue: number;
    totalItems: number;
    avgMargin: number;
    stars: number;
    cashCows: number;
    questionMarks: number;
    dogs: number;
    topPerformers: AnalyticsResult[];
    underperformers: AnalyticsResult[];
}

export class AnalyticsEngine {
    /**
     * Calculate BCG matrix and menu engineering metrics for a restaurant
     */
    async calculateForRestaurant(
        restaurantId: number,
        periodDays: number = 90
    ): Promise<AnalyticsResult[]> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // Get all menu items for the restaurant
        const items = await db
            .select()
            .from(menuItems)
            .where(eq(menuItems.restaurantId, restaurantId));

        if (items.length === 0) {
            return [];
        }

        // Get order data grouped by menu item
        const orderData = await db
            .select({
                menuItemId: orderItems.menuItemId,
                totalQuantity: sql<number>`SUM(${orderItems.quantity})`.as('total_quantity'),
                totalRevenue: sql<number>`SUM(${orderItems.price} * ${orderItems.quantity})`.as('total_revenue'),
                totalCost: sql<number>`SUM(COALESCE(${orderItems.cost}, 0) * ${orderItems.quantity})`.as('total_cost'),
                orderCount: sql<number>`COUNT(DISTINCT ${orderItems.externalId})`.as('order_count'),
            })
            .from(orderItems)
            .where(
                and(
                    eq(orderItems.restaurantId, restaurantId),
                    gte(orderItems.orderedAt, startDate),
                    lte(orderItems.orderedAt, endDate)
                )
            )
            .groupBy(orderItems.menuItemId);

        // Calculate averages for BCG classification
        const totalOrders = orderData.reduce((sum, d) => sum + (d.totalQuantity || 0), 0);
        const totalRevenue = orderData.reduce((sum, d) => sum + (d.totalRevenue || 0), 0);
        const avgQuantity = totalOrders / Math.max(items.length, 1);

        // Calculate average contribution margin
        let totalContribution = 0;
        orderData.forEach(d => {
            totalContribution += (d.totalRevenue || 0) - (d.totalCost || 0);
        });
        const avgContribution = totalContribution / Math.max(orderData.length, 1);

        // Build analytics results
        const results: AnalyticsResult[] = items.map(item => {
            const data = orderData.find(d => d.menuItemId === item.id);

            const revenue = data?.totalRevenue || 0;
            const quantity = data?.totalQuantity || 0;
            const cost = data?.totalCost || 0;
            const contribution = revenue - cost;
            const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;

            // Popularity Index: quantity sold / average quantity
            const popularityIndex = avgQuantity > 0 ? (quantity / avgQuantity) * 100 : 0;

            // Profitability Index: contribution margin / average contribution
            const profitabilityIndex = avgContribution > 0 ? (contribution / avgContribution) * 100 : 0;

            // BCG Classification (Market Share vs Growth Rate approximation)
            // Using popularity as market share proxy and margin as growth potential
            const highPopularity = popularityIndex >= 100;
            const highProfitability = profitabilityIndex >= 100;

            let bcgQuadrant: AnalyticsResult['bcgQuadrant'];
            if (highPopularity && highProfitability) {
                bcgQuadrant = 'star';
            } else if (highPopularity && !highProfitability) {
                bcgQuadrant = 'cash_cow'; // High volume, lower margin
            } else if (!highPopularity && highProfitability) {
                bcgQuadrant = 'question_mark'; // Low volume, high margin potential
            } else {
                bcgQuadrant = 'dog';
            }

            // Menu Engineering Classification (Popularity vs Profitability)
            let menuEngineeringClass: AnalyticsResult['menuEngineeringClass'];
            if (highPopularity && highProfitability) {
                menuEngineeringClass = 'star';
            } else if (highPopularity && !highProfitability) {
                menuEngineeringClass = 'plow_horse';
            } else if (!highPopularity && highProfitability) {
                menuEngineeringClass = 'puzzle';
            } else {
                menuEngineeringClass = 'dog';
            }

            return {
                menuItemId: item.id,
                itemName: item.name,
                totalRevenue: revenue,
                totalQuantitySold: quantity,
                averageOrderValue: quantity > 0 ? revenue / quantity : parseFloat(item.price),
                totalCost: cost,
                grossMargin: margin,
                contributionMargin: contribution,
                popularityIndex,
                profitabilityIndex,
                bcgQuadrant,
                menuEngineeringClass,
                revenueGrowthRate: 0, // Would need historical data
            };
        });

        // Sort by revenue descending
        results.sort((a, b) => b.totalRevenue - a.totalRevenue);

        // Store in analytics table
        await this.saveAnalytics(restaurantId, results, startDate, endDate);

        return results;
    }

    /**
     * Get summary statistics
     */
    async getSummary(restaurantId: number, periodDays: number = 90): Promise<AnalyticsSummary> {
        const results = await this.calculateForRestaurant(restaurantId, periodDays);

        const totalRevenue = results.reduce((sum, r) => sum + r.totalRevenue, 0);
        const avgMargin = results.length > 0
            ? results.reduce((sum, r) => sum + r.grossMargin, 0) / results.length
            : 0;

        return {
            totalRevenue,
            totalItems: results.length,
            avgMargin,
            stars: results.filter(r => r.bcgQuadrant === 'star').length,
            cashCows: results.filter(r => r.bcgQuadrant === 'cash_cow').length,
            questionMarks: results.filter(r => r.bcgQuadrant === 'question_mark').length,
            dogs: results.filter(r => r.bcgQuadrant === 'dog').length,
            topPerformers: results.slice(0, 5),
            underperformers: results.slice(-5).reverse(),
        };
    }

    /**
     * Get items by BCG quadrant
     */
    async getByQuadrant(
        restaurantId: number,
        quadrant: 'star' | 'cash_cow' | 'question_mark' | 'dog'
    ): Promise<AnalyticsResult[]> {
        const results = await this.calculateForRestaurant(restaurantId);
        return results.filter(r => r.bcgQuadrant === quadrant);
    }

    /**
     * Generate optimization recommendations
     */
    async getRecommendations(restaurantId: number): Promise<Array<{
        type: string;
        priority: 'high' | 'medium' | 'low';
        item: string;
        action: string;
        impact: string;
    }>> {
        const results = await this.calculateForRestaurant(restaurantId);
        const recommendations: Array<{
            type: string;
            priority: 'high' | 'medium' | 'low';
            item: string;
            action: string;
            impact: string;
        }> = [];

        // Stars - Promote
        const stars = results.filter(r => r.bcgQuadrant === 'star');
        stars.slice(0, 3).forEach(item => {
            recommendations.push({
                type: 'promote',
                priority: 'high',
                item: item.itemName,
                action: 'Feature prominently on menu and train staff to recommend',
                impact: `High performer with $${item.totalRevenue.toFixed(0)} revenue and ${item.grossMargin.toFixed(0)}% margin`,
            });
        });

        // Dogs - Consider removing
        const dogs = results.filter(r => r.bcgQuadrant === 'dog');
        dogs.slice(0, 3).forEach(item => {
            recommendations.push({
                type: 'remove',
                priority: 'medium',
                item: item.itemName,
                action: 'Consider removing from menu or rebranding',
                impact: `Low performer - only $${item.totalRevenue.toFixed(0)} revenue with ${item.grossMargin.toFixed(0)}% margin`,
            });
        });

        // Puzzles - Marketing needed
        const puzzles = results.filter(r => r.bcgQuadrant === 'question_mark');
        puzzles.slice(0, 2).forEach(item => {
            recommendations.push({
                type: 'market',
                priority: 'medium',
                item: item.itemName,
                action: 'Increase visibility - high margin but low orders',
                impact: `${item.grossMargin.toFixed(0)}% margin - could boost revenue with better placement`,
            });
        });

        // Cash Cows - Optimize costs
        const cashCows = results.filter(r => r.bcgQuadrant === 'cash_cow');
        cashCows.slice(0, 2).forEach(item => {
            recommendations.push({
                type: 'optimize',
                priority: 'low',
                item: item.itemName,
                action: 'Review ingredient costs to improve margin',
                impact: `Popular item (${item.totalQuantitySold} sold) but only ${item.grossMargin.toFixed(0)}% margin`,
            });
        });

        return recommendations;
    }

    /**
     * Save analytics to database
     */
    private async saveAnalytics(
        restaurantId: number,
        results: AnalyticsResult[],
        periodStart: Date,
        periodEnd: Date
    ): Promise<void> {
        // Delete existing analytics for this period
        await db.delete(analytics).where(
            and(
                eq(analytics.restaurantId, restaurantId),
                eq(analytics.periodStart, periodStart),
                eq(analytics.periodEnd, periodEnd)
            )
        );

        // Insert new analytics
        for (const result of results) {
            await db.insert(analytics).values({
                restaurantId,
                menuItemId: result.menuItemId,
                periodStart,
                periodEnd,
                totalRevenue: result.totalRevenue.toString(),
                totalQuantitySold: result.totalQuantitySold,
                averageOrderValue: result.averageOrderValue.toString(),
                totalCost: result.totalCost.toString(),
                grossMargin: result.grossMargin.toString(),
                contributionMargin: result.contributionMargin.toString(),
                popularityIndex: result.popularityIndex.toString(),
                profitabilityIndex: result.profitabilityIndex.toString(),
                bcgQuadrant: result.bcgQuadrant,
                menuEngineeringClass: result.menuEngineeringClass,
                revenueGrowthRate: result.revenueGrowthRate.toString(),
            });
        }
    }
}

// Export singleton instance
export const analyticsEngine = new AnalyticsEngine();
