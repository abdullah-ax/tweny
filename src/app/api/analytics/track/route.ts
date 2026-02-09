/**
 * Analytics Event Tracking API
 * POST /api/analytics/track
 * 
 * Receives batched analytics events from the client and stores them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appEvents } from '@/lib/db/schema';

interface TrackingEvent {
    type: string;
    restaurantId: number;
    itemId?: number;
    sectionId?: number;
    variant?: 'a' | 'b';
    sessionId?: string;
    timestamp?: string;
    metadata?: Record<string, unknown>;
}

interface TrackRequest {
    events: TrackingEvent[];
}

export async function POST(request: NextRequest) {
    try {
        const body: TrackRequest = await request.json();

        if (!body.events || !Array.isArray(body.events)) {
            return NextResponse.json(
                { error: 'Invalid request: events array required' },
                { status: 400 }
            );
        }

        // Get session from header or body
        const headerSession = request.headers.get('x-tweny-session');

        // Insert events into database
        const insertPromises = body.events.map(event => {
            const sessionId = event.sessionId || headerSession || 'unknown';

            return db.insert(appEvents).values({
                restaurantId: event.restaurantId,
                sessionId,
                eventType: event.type,
                eventData: {
                    variant: event.variant,
                    itemId: event.itemId,
                    sectionId: event.sectionId,
                    ...event.metadata,
                },
                createdAt: event.timestamp ? new Date(event.timestamp) : new Date(),
            });
        });

        await Promise.all(insertPromises);

        return NextResponse.json({
            success: true,
            tracked: body.events.length,
        });

    } catch (error) {
        console.error('Analytics tracking error:', error);
        return NextResponse.json(
            { error: 'Failed to track events' },
            { status: 500 }
        );
    }
}

// GET endpoint for debugging (dev only)
export async function GET(request: NextRequest) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }

    const restaurantId = request.nextUrl.searchParams.get('restaurantId');

    if (!restaurantId) {
        return NextResponse.json({ error: 'restaurantId required' }, { status: 400 });
    }

    // Return recent events for debugging
    const events = await db.query.appEvents.findMany({
        where: (events, { eq }) => eq(events.restaurantId, parseInt(restaurantId)),
        orderBy: (events, { desc }) => [desc(events.createdAt)],
        limit: 100,
    });

    return NextResponse.json({ events });
}
