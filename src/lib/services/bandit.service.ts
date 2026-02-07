import { db } from '@/lib/db';
import { offers, offerArms, offerEvents } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface OfferArm {
    id: number;
    offerId: number;
    name: string;
    weight: number;
    impressions: number;
    conversions: number;
    revenue: number;
}

export interface BanditSelection {
    armId: number;
    offerId: number;
    armName: string;
    explorationReason: 'exploit' | 'explore';
}

/**
 * Multi-Armed Bandit service for dynamic offer optimization
 * Uses Epsilon-Greedy strategy with Thompson Sampling fallback
 */
export class BanditService {
    private epsilon: number;

    constructor(epsilon: number = 0.1) {
        // Epsilon controls exploration vs exploitation
        // 0.1 means 10% of the time we explore, 90% we exploit
        this.epsilon = epsilon;
    }

    /**
     * Select the best offer arm using Epsilon-Greedy
     */
    async selectArm(offerId: number): Promise<BanditSelection | null> {
        const arms = await db
            .select()
            .from(offerArms)
            .where(eq(offerArms.offerId, offerId));

        if (arms.length === 0) {
            return null;
        }

        // Epsilon-Greedy: explore with probability epsilon
        const shouldExplore = Math.random() < this.epsilon;

        if (shouldExplore) {
            // Random exploration - pick a random arm
            const randomArm = arms[Math.floor(Math.random() * arms.length)];
            return {
                armId: randomArm.id,
                offerId: randomArm.offerId,
                armName: randomArm.name,
                explorationReason: 'explore',
            };
        } else {
            // Exploitation - pick the arm with highest conversion rate
            const bestArm = this.getBestArm(arms);
            return {
                armId: bestArm.id,
                offerId: bestArm.offerId,
                armName: bestArm.name,
                explorationReason: 'exploit',
            };
        }
    }

    /**
     * Select arm using Thompson Sampling (Bayesian approach)
     */
    async selectArmThompson(offerId: number): Promise<BanditSelection | null> {
        const arms = await db
            .select()
            .from(offerArms)
            .where(eq(offerArms.offerId, offerId));

        if (arms.length === 0) {
            return null;
        }

        // Thompson Sampling: sample from Beta distribution
        let bestArm = arms[0];
        let bestSample = -1;

        for (const arm of arms) {
            const successes = arm.conversions || 0;
            const failures = (arm.impressions || 0) - successes;

            // Sample from Beta(successes + 1, failures + 1)
            const sample = this.sampleBeta(successes + 1, failures + 1);

            if (sample > bestSample) {
                bestSample = sample;
                bestArm = arm;
            }
        }

        return {
            armId: bestArm.id,
            offerId: bestArm.offerId,
            armName: bestArm.name,
            explorationReason: bestSample > 0.5 ? 'exploit' : 'explore',
        };
    }

    /**
     * Record an impression (view) for an arm
     */
    async recordImpression(armId: number, restaurantId: number): Promise<void> {
        // Update impressions count
        await db
            .update(offerArms)
            .set({
                impressions: sql`${offerArms.impressions} + 1`,
            })
            .where(eq(offerArms.id, armId));

        // Get the arm to find offerId
        const [arm] = await db
            .select()
            .from(offerArms)
            .where(eq(offerArms.id, armId));

        if (arm) {
            // Record event
            await db.insert(offerEvents).values({
                offerId: arm.offerId,
                restaurantId,
                eventType: 'impression',
                eventData: { armId },
            });
        }
    }

    /**
     * Record a conversion (click/redemption) for an arm
     */
    async recordConversion(
        armId: number,
        restaurantId: number,
        revenue: number = 0
    ): Promise<void> {
        // Update conversions and revenue
        await db
            .update(offerArms)
            .set({
                conversions: sql`${offerArms.conversions} + 1`,
                revenue: sql`${offerArms.revenue} + ${revenue}`,
            })
            .where(eq(offerArms.id, armId));

        // Get the arm to find offerId
        const [arm] = await db
            .select()
            .from(offerArms)
            .where(eq(offerArms.id, armId));

        if (arm) {
            // Record event
            await db.insert(offerEvents).values({
                offerId: arm.offerId,
                restaurantId,
                eventType: 'conversion',
                eventData: { armId, revenue },
            });
        }
    }

    /**
     * Get statistics for all arms of an offer
     */
    async getArmStats(offerId: number): Promise<Array<{
        arm: OfferArm;
        conversionRate: number;
        confidence: number;
        revenuePerImpression: number;
    }>> {
        const arms = await db
            .select()
            .from(offerArms)
            .where(eq(offerArms.offerId, offerId));

        return arms.map(arm => {
            const impressions = arm.impressions || 0;
            const conversions = arm.conversions || 0;
            const revenue = parseFloat(arm.revenue?.toString() || '0');

            const conversionRate = impressions > 0 ? conversions / impressions : 0;
            const revenuePerImpression = impressions > 0 ? revenue / impressions : 0;

            // Calculate confidence (Wilson score interval lower bound)
            const confidence = impressions > 0
                ? this.wilsonScore(conversions, impressions)
                : 0;

            return {
                arm: {
                    id: arm.id,
                    offerId: arm.offerId,
                    name: arm.name,
                    weight: parseFloat(arm.weight?.toString() || '0'),
                    impressions,
                    conversions,
                    revenue,
                },
                conversionRate,
                confidence,
                revenuePerImpression,
            };
        });
    }

    /**
     * Create a new A/B test with multiple arms
     */
    async createTest(
        offerId: number,
        armNames: string[]
    ): Promise<OfferArm[]> {
        const createdArms: OfferArm[] = [];

        for (const name of armNames) {
            const [arm] = await db
                .insert(offerArms)
                .values({
                    offerId,
                    name,
                    weight: '0',
                    impressions: 0,
                    conversions: 0,
                    revenue: '0',
                })
                .returning();

            createdArms.push({
                id: arm.id,
                offerId: arm.offerId,
                name: arm.name,
                weight: parseFloat(arm.weight?.toString() || '0'),
                impressions: arm.impressions || 0,
                conversions: arm.conversions || 0,
                revenue: parseFloat(arm.revenue?.toString() || '0'),
            });
        }

        return createdArms;
    }

    /**
     * Get the best performing arm based on conversion rate
     */
    private getBestArm(arms: any[]): any {
        let bestArm = arms[0];
        let bestRate = 0;

        for (const arm of arms) {
            const impressions = arm.impressions || 0;
            const conversions = arm.conversions || 0;
            const rate = impressions > 0 ? conversions / impressions : 0;

            if (rate > bestRate) {
                bestRate = rate;
                bestArm = arm;
            }
        }

        return bestArm;
    }

    /**
     * Sample from Beta distribution using Box-Muller transform
     */
    private sampleBeta(alpha: number, beta: number): number {
        // Use gamma distribution sampling
        const gammaA = this.sampleGamma(alpha);
        const gammaB = this.sampleGamma(beta);
        return gammaA / (gammaA + gammaB);
    }

    /**
     * Sample from Gamma distribution
     */
    private sampleGamma(shape: number): number {
        if (shape < 1) {
            return this.sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
        }

        const d = shape - 1 / 3;
        const c = 1 / Math.sqrt(9 * d);

        while (true) {
            let x: number;
            let v: number;

            do {
                x = this.sampleNormal();
                v = 1 + c * x;
            } while (v <= 0);

            v = v * v * v;
            const u = Math.random();

            if (u < 1 - 0.0331 * (x * x) * (x * x)) {
                return d * v;
            }

            if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
                return d * v;
            }
        }
    }

    /**
     * Sample from standard normal distribution (Box-Muller)
     */
    private sampleNormal(): number {
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    /**
     * Calculate Wilson score confidence interval lower bound
     */
    private wilsonScore(successes: number, total: number): number {
        if (total === 0) return 0;

        const z = 1.96; // 95% confidence
        const p = successes / total;
        const denominator = 1 + z * z / total;
        const centre = p + z * z / (2 * total);
        const adjustment = z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total);

        return (centre - adjustment) / denominator;
    }
}

// Export singleton instance
export const banditService = new BanditService(0.1);
