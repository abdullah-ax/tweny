import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    users,
    restaurants,
    menuSections,
    menuItems,
    orderItems,
    analytics,
    layouts,
    sectionApprovals,
    offers,
    offerArms,
    offerEvents,
    feedback,
    appEvents,
    customerOrders,
    customerOrderItems,
    menuPopups,
    restaurantContext
} from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

/**
 * POST /api/admin/reset
 * Resets the database to a clean state for fresh testing
 * WARNING: This deletes ALL data!
 */
export async function POST(request: NextRequest) {
    try {
        // Optional: require a secret key for safety
        const { searchParams } = new URL(request.url);
        const confirmKey = searchParams.get('confirm');

        if (confirmKey !== 'yes-reset-everything') {
            return NextResponse.json({
                error: 'Add ?confirm=yes-reset-everything to confirm database reset'
            }, { status: 400 });
        }

        console.log('Starting database reset...');

        // Delete in order of dependencies (children first)
        await db.delete(appEvents);
        console.log('  ✓ Deleted app events');

        await db.delete(feedback);
        console.log('  ✓ Deleted feedback');

        await db.delete(analytics);
        console.log('  ✓ Deleted analytics');

        await db.delete(orderItems);
        console.log('  ✓ Deleted order items');

        await db.delete(customerOrderItems);
        console.log('  ✓ Deleted customer order items');

        await db.delete(customerOrders);
        console.log('  ✓ Deleted customer orders');

        await db.delete(sectionApprovals);
        console.log('  ✓ Deleted section approvals');

        await db.delete(layouts);
        console.log('  ✓ Deleted layouts');

        await db.delete(offerEvents);
        console.log('  ✓ Deleted offer events');

        await db.delete(offerArms);
        console.log('  ✓ Deleted offer arms');

        await db.delete(offers);
        console.log('  ✓ Deleted offers');

        await db.delete(menuPopups);
        console.log('  ✓ Deleted menu popups');

        await db.delete(menuItems);
        console.log('  ✓ Deleted menu items');

        await db.delete(menuSections);
        console.log('  ✓ Deleted menu sections');

        await db.delete(restaurantContext);
        console.log('  ✓ Deleted restaurant context');

        await db.delete(restaurants);
        console.log('  ✓ Deleted restaurants');

        await db.delete(users);
        console.log('  ✓ Deleted users');

        // Reset sequences (PostgreSQL)
        const tables = [
            'app_events', 'feedback', 'analytics', 'order_items',
            'customer_order_items', 'customer_orders', 'section_approvals',
            'layouts', 'offer_events', 'offer_arms', 'offers',
            'menu_popups', 'menu_items', 'menu_sections',
            'restaurant_context', 'restaurants', 'users'
        ];

        for (const table of tables) {
            try {
                await db.execute(sql.raw(`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1`));
            } catch (e) {
                // Sequence might not exist, that's okay
            }
        }

        console.log('Database reset complete!');

        return NextResponse.json({
            success: true,
            message: 'Database has been reset. All data deleted.',
            tablesCleared: tables.length
        });
    } catch (error: any) {
        console.error('Database reset error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/admin/reset
 * Returns current database stats
 */
export async function GET() {
    try {
        const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
        const [restaurantCount] = await db.select({ count: sql<number>`count(*)` }).from(restaurants);
        const [itemCount] = await db.select({ count: sql<number>`count(*)` }).from(menuItems);
        const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orderItems);

        return NextResponse.json({
            stats: {
                users: userCount.count,
                restaurants: restaurantCount.count,
                menuItems: itemCount.count,
                orderItems: orderCount.count,
            },
            resetEndpoint: 'POST /api/admin/reset?confirm=yes-reset-everything'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
