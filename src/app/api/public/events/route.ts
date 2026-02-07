import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appEvents } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { restaurantId, sessionId, eventType, eventData } = body;

        if (!restaurantId || !eventType) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Store the event
        await db.insert(appEvents).values({
            restaurantId,
            eventType,
            eventData: {
                ...eventData,
                sessionId,
                timestamp: new Date().toISOString(),
                userAgent: request.headers.get('user-agent') || 'unknown',
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Event tracking error:', error);
        return NextResponse.json(
            { error: 'Failed to track event' },
            { status: 500 }
        );
    }
}
