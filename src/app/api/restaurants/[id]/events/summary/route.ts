import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appEvents, menuItems } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { getUserFromToken } from '@/lib/services/auth.service';
import { getRestaurantById } from '@/lib/services/restaurant.service';

// GET /api/restaurants/[id]/events/summary - Get event analytics summary
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

        // Count menu views
        const menuViewsResult = await db
            .select({ count: count() })
            .from(appEvents)
            .where(
                and(
                    eq(appEvents.restaurantId, restaurantId),
                    eq(appEvents.eventType, 'menu_view')
                )
            );

        // Count item clicks
        const itemClicksResult = await db
            .select({ count: count() })
            .from(appEvents)
            .where(
                and(
                    eq(appEvents.restaurantId, restaurantId),
                    eq(appEvents.eventType, 'item_click')
                )
            );

        // Get all item click events to extract item data from eventData JSON
        const itemClickEvents = await db
            .select({
                eventData: appEvents.eventData,
            })
            .from(appEvents)
            .where(
                and(
                    eq(appEvents.restaurantId, restaurantId),
                    eq(appEvents.eventType, 'item_click')
                )
            );

        // Aggregate clicks by item
        const itemClickCounts: Record<string, { name: string; count: number }> = {};
        for (const event of itemClickEvents) {
            const data = event.eventData as { itemId?: number; itemName?: string } | null;
            if (data?.itemId) {
                const key = String(data.itemId);
                if (!itemClickCounts[key]) {
                    itemClickCounts[key] = {
                        name: data.itemName || `Item ${data.itemId}`,
                        count: 0,
                    };
                }
                itemClickCounts[key].count++;
            }
        }

        // Sort and take top 10
        const topClickedItems = Object.values(itemClickCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return NextResponse.json({
            summary: {
                menuViews: Number(menuViewsResult[0]?.count || 0),
                itemClicks: Number(itemClicksResult[0]?.count || 0),
                topClickedItems,
            },
        });
    } catch (error) {
        console.error('Get events summary error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
