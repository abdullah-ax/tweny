import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/services/auth.service';
import {
    getRestaurantById,
    updateRestaurant,
    deleteRestaurant,
    getRestaurantStats
} from '@/lib/services/restaurant.service';

// GET /api/restaurants/[id] - Get restaurant details
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

        // Check ownership
        if (restaurant.ownerId !== user.id && user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        const stats = await getRestaurantStats(restaurantId);

        return NextResponse.json({ restaurant, stats });
    } catch (error) {
        console.error('Get restaurant error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH /api/restaurants/[id] - Update restaurant
export async function PATCH(
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

        const existing = await getRestaurantById(restaurantId);
        if (!existing) {
            return NextResponse.json(
                { error: 'Restaurant not found' },
                { status: 404 }
            );
        }

        if (existing.ownerId !== user.id && user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const updated = await updateRestaurant(restaurantId, body);

        return NextResponse.json({ restaurant: updated });
    } catch (error) {
        console.error('Update restaurant error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/restaurants/[id] - Delete restaurant
export async function DELETE(
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

        const existing = await getRestaurantById(restaurantId);
        if (!existing) {
            return NextResponse.json(
                { error: 'Restaurant not found' },
                { status: 404 }
            );
        }

        if (existing.ownerId !== user.id && user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        await deleteRestaurant(restaurantId);

        return NextResponse.json({ message: 'Restaurant deleted' });
    } catch (error) {
        console.error('Delete restaurant error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
