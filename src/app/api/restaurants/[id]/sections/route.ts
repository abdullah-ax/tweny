import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/services/auth.service';
import { getRestaurantById, getMenuSections } from '@/lib/services/restaurant.service';

// GET /api/restaurants/[id]/sections - Get menu sections
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

        const sections = await getMenuSections(restaurantId);
        return NextResponse.json({ sections });
    } catch (error) {
        console.error('Get sections error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
