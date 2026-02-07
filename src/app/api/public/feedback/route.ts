import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { feedback, appEvents } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { restaurantId, sessionId, source, transcript, sectionId, layoutId } = body;

        if (!restaurantId || !transcript) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Store the feedback
        const [newFeedback] = await db.insert(feedback).values({
            restaurantId,
            source: source || 'text',
            transcript,
            sectionId: sectionId || null,
            layoutId: layoutId || null,
            metadata: {
                sessionId,
                userAgent: request.headers.get('user-agent') || 'unknown',
            },
        }).returning();

        // Also track as event for analytics
        await db.insert(appEvents).values({
            restaurantId,
            eventType: 'feedback_submitted',
            eventData: {
                feedbackId: newFeedback.id,
                source,
                sessionId,
                transcriptLength: transcript.length,
            },
        });

        return NextResponse.json({
            success: true,
            feedbackId: newFeedback.id
        });
    } catch (error: any) {
        console.error('Feedback submission error:', error);
        return NextResponse.json(
            { error: 'Failed to submit feedback' },
            { status: 500 }
        );
    }
}
