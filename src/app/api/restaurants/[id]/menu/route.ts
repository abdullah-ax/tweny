import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/services/auth.service';
import {
    getRestaurantById,
    getMenuItems,
    createMenuItem
} from '@/lib/services/restaurant.service';
import { z } from 'zod';

const createMenuItemSchema = z.object({
    name: z.string().min(1, 'Item name is required'),
    price: z.string().or(z.number()).transform(String),
    description: z.string().optional(),
    cost: z.string().or(z.number()).transform(String).optional(),
    sectionId: z.number().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    imageUrl: z.string().optional(),
});

// GET /api/restaurants/[id]/menu - Get menu items
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const restaurantId = parseInt(id);
        if (isNaN(restaurantId)) {
            return NextResponse.json(
                { error: 'Invalid restaurant ID' },
                { status: 400 }
            );
        }

        const restaurant = await getRestaurantById(restaurantId);
        if (!restaurant) {
            return NextResponse.json(
                { error: 'Restaurant not found' },
                { status: 404 }
            );
        }

        if (restaurant.ownerId !== user.id && user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        // Get query params for filtering
        const { searchParams } = new URL(request.url);
        const sectionId = searchParams.get('sectionId');
        const status = searchParams.get('status');

        const items = await getMenuItems(restaurantId, {
            sectionId: sectionId ? parseInt(sectionId) : undefined,
            status: status || undefined,
        });

        return NextResponse.json({ items });
    } catch (error) {
        console.error('Get menu items error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/restaurants/[id]/menu - Create menu item
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const restaurantId = parseInt(id);
        if (isNaN(restaurantId)) {
            return NextResponse.json(
                { error: 'Invalid restaurant ID' },
                { status: 400 }
            );
        }

        const restaurant = await getRestaurantById(restaurantId);
        if (!restaurant) {
            return NextResponse.json(
                { error: 'Restaurant not found' },
                { status: 404 }
            );
        }

        if (restaurant.ownerId !== user.id && user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validation = createMenuItemSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.errors[0].message },
                { status: 400 }
            );
        }

        const item = await createMenuItem({
            ...validation.data,
            restaurantId,
        });

        return NextResponse.json({ item }, { status: 201 });
    } catch (error) {
        console.error('Create menu item error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
