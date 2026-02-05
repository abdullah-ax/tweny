import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/services/auth.service';
import { getRestaurantById } from '@/lib/services/restaurant.service';
import {
    importMenuSections,
    importMenuItems,
    importOrderItems,
    importAppEvents,
    importMenuEngineeringData,
    parseCSV
} from '@/lib/services/data-import.service';
import path from 'path';

// POST /api/restaurants/[id]/import - Import data from CSVs
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const restaurantId = parseInt(params.id);
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
        const { type, dataDir } = body;

        // Default to the local data directory
        const dataDirectory = dataDir || path.join(process.cwd(), 'data');

        if (type === 'full') {
            // Import all Menu Engineering data
            const results = await importMenuEngineeringData(restaurantId, dataDirectory);

            return NextResponse.json({
                message: 'Data import completed',
                results,
            });
        }

        // Handle individual imports
        const results: Record<string, any> = {};

        if (type === 'sections' || type === 'all') {
            const csvPath = path.join(dataDirectory, 'Menu Engineering Part 2', 'dim_sections.csv');
            results.sections = await importMenuSections(restaurantId, csvPath);
        }

        if (type === 'menuItems' || type === 'all') {
            const csvPath = path.join(dataDirectory, 'Menu Engineering Part 2', 'dim_menu_items.csv');
            results.menuItems = await importMenuItems(restaurantId, csvPath);
        }

        if (type === 'orderItems' || type === 'all') {
            const csvPath = path.join(dataDirectory, 'Menu Engineering Part 1', 'fct_order_items.csv');
            results.orderItems = await importOrderItems(restaurantId, csvPath);
        }

        if (type === 'appEvents' || type === 'all') {
            const csvPath = path.join(dataDirectory, 'Menu Engineering Part 2', 'fct_app_event.csv');
            results.appEvents = await importAppEvents(restaurantId, csvPath);
        }

        return NextResponse.json({
            message: 'Import completed',
            results,
        });
    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
