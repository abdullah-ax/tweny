/**
 * A/B Testing Metrics API
 * GET /api/analytics/ab-metrics?restaurantId=1
 * 
 * Returns aggregated metrics for both variants with statistical significance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appEvents } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import {
    calculateVariantMetrics,
    calculateSignificance,
    VariantMetrics
} from '@/lib/analytics';

export async function GET(request: NextRequest) {
    try {
        const restaurantId = request.nextUrl.searchParams.get('restaurantId');
        const daysParam = request.nextUrl.searchParams.get('days');

        if (!restaurantId) {
            return NextResponse.json(
                { error: 'restaurantId query parameter is required' },
                { status: 400 }
            );
        }

        const parsedId = parseInt(restaurantId, 10);
        if (isNaN(parsedId)) {
            return NextResponse.json(
                { error: 'Invalid restaurantId' },
                { status: 400 }
            );
        }

        // Default to 30 days
        const days = daysParam ? parseInt(daysParam, 10) : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Fetch all events for the restaurant within the date range
        const events = await db.query.appEvents.findMany({
            where: and(
                eq(appEvents.restaurantId, parsedId),
                gte(appEvents.createdAt, startDate)
            ),
            orderBy: (events, { desc }) => [desc(events.createdAt)],
        });

        // Transform events into the format expected by calculateVariantMetrics
        const rawEvents = events.map(e => ({
            id: e.id,
            restaurantId: e.restaurantId,
            eventType: e.eventType,
            eventData: e.eventData as Record<string, unknown> | null,
            sessionId: e.sessionId,
            createdAt: e.createdAt,
        }));

        // Calculate metrics for each variant
        const metrics = calculateVariantMetrics(rawEvents);

        // Calculate statistical significance
        const significance = calculateSignificance(metrics.a, metrics.b);

        return NextResponse.json({
            restaurantId: parsedId,
            period: {
                start: startDate.toISOString(),
                end: new Date().toISOString(),
                days,
            },
            a: metrics.a,
            b: metrics.b,
            significance,
            sampleSize: {
                a: metrics.a.viewCount,
                b: metrics.b.viewCount,
                total: metrics.a.viewCount + metrics.b.viewCount,
            },
        });

    } catch (error) {
        console.error('AB Metrics error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch metrics' },
            { status: 500 }
        );
    }
}
