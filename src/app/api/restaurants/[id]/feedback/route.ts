import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { feedback } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUserFromToken } from '@/lib/services/auth.service';
import { getRestaurantById } from '@/lib/services/restaurant.service';

const feedbackSchema = z.object({
    transcript: z.string().min(1),
    source: z.enum(['voice', 'text']).default('text'),
    sectionId: z.number().optional(),
    layoutId: z.number().optional(),
});

// POST /api/restaurants/[id]/feedback
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const restaurantId = parseInt(id);
        if (isNaN(restaurantId)) {
            return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
        }

        const restaurant = await getRestaurantById(restaurantId);
        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        if (restaurant.ownerId !== user.id && user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = feedbackSchema.parse(await request.json());

        const [created] = await db.insert(feedback).values({
            restaurantId,
            layoutId: body.layoutId,
            sectionId: body.sectionId,
            source: body.source,
            transcript: body.transcript,
        }).returning();

        return NextResponse.json({ feedback: created }, { status: 201 });
    } catch (error) {
        console.error('Create feedback error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/restaurants/[id]/feedback - List all feedback
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const restaurantId = parseInt(id);
        if (isNaN(restaurantId)) {
            return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
        }

        const restaurant = await getRestaurantById(restaurantId);
        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        if (restaurant.ownerId !== user.id && user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get all feedback for the restaurant
        const feedbackList = await db
            .select()
            .from(feedback)
            .where(eq(feedback.restaurantId, restaurantId))
            .orderBy(desc(feedback.createdAt))
            .limit(100);

        return NextResponse.json({ feedback: feedbackList });
    } catch (error) {
        console.error('Get feedback error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
