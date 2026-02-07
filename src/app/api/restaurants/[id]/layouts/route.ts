import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { layouts } from '@/lib/db/schema';
import { getUserFromToken } from '@/lib/services/auth.service';
import { getRestaurantById } from '@/lib/services/restaurant.service';
import { eq, desc } from 'drizzle-orm';

const createSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    strategy: z.string().optional(),
    config: z.object({
        sections: z.array(z.any()).default([]),
        canvasSize: z.object({
            width: z.number(),
            height: z.number(),
        }),
        backgroundColor: z.string().optional(),
    }),
});

// GET /api/restaurants/[id]/layouts?latest=1
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

        const latestOnly = request.nextUrl.searchParams.get('latest');
        if (latestOnly) {
            const layout = await db.query.layouts.findFirst({
                where: eq(layouts.restaurantId, restaurantId),
                orderBy: (layouts, { desc }) => [desc(layouts.createdAt)],
            });
            return NextResponse.json({ layout });
        }

        const list = await db.query.layouts.findMany({
            where: eq(layouts.restaurantId, restaurantId),
            orderBy: (layouts, { desc }) => [desc(layouts.createdAt)],
        });

        return NextResponse.json({ layouts: list });
    } catch (error) {
        console.error('Get layouts error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/restaurants/[id]/layouts
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

        const body = createSchema.parse(await request.json());

        const [layout] = await db
            .insert(layouts)
            .values({
                restaurantId,
                name: body.name,
                description: body.description,
                strategy: body.strategy,
                config: body.config,
                aiGenerated: false,
                isDefault: false,
                source: 'manual',
                status: 'draft',
            })
            .returning();

        return NextResponse.json({ layout }, { status: 201 });
    } catch (error) {
        console.error('Create layout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
