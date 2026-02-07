import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { layouts, restaurants } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Deploy API - Saves menu layouts to database for public access
 * 
 * The deployed menu is:
 * 1. Stored in the layouts table with status='published'
 * 2. HTML/CSS stored in the config JSON field
 * 3. Linked to restaurant for public menu access
 */

interface DeployRequest {
    restaurantId: number;
    html: string;
    css: string;
    strategyName?: string;
    strategyId?: string;
    menuContext?: {
        items?: Array<{ name: string; price: number; category: string }>;
        extractedColors?: Record<string, string>;
    };
}

// POST - Deploy a new menu version
export async function POST(request: NextRequest) {
    try {
        const body: DeployRequest = await request.json();
        const { restaurantId, html, css, strategyName, strategyId, menuContext } = body;

        if (!restaurantId || !html || !css) {
            return NextResponse.json(
                { error: 'restaurantId, html, and css are required' },
                { status: 400 }
            );
        }

        // Verify restaurant exists
        const [restaurant] = await db
            .select({ id: restaurants.id, name: restaurants.name })
            .from(restaurants)
            .where(eq(restaurants.id, restaurantId));

        if (!restaurant) {
            return NextResponse.json(
                { error: 'Restaurant not found' },
                { status: 404 }
            );
        }

        // Unpublish any currently published layouts for this restaurant
        await db
            .update(layouts)
            .set({ status: 'archived', updatedAt: new Date() })
            .where(
                and(
                    eq(layouts.restaurantId, restaurantId),
                    eq(layouts.status, 'published')
                )
            );

        // Get the latest version number for this restaurant
        const [latestLayout] = await db
            .select({ version: layouts.version })
            .from(layouts)
            .where(eq(layouts.restaurantId, restaurantId))
            .orderBy(desc(layouts.version))
            .limit(1);

        const newVersion = (latestLayout?.version || 0) + 1;

        // Create the new published layout
        const [newLayout] = await db
            .insert(layouts)
            .values({
                restaurantId,
                name: `Menu v${newVersion} - ${strategyName || 'Custom'}`,
                description: `Deployed menu using ${strategyName || 'custom'} strategy`,
                strategy: strategyId || 'custom',
                version: newVersion,
                status: 'published',
                source: 'agent',
                publishedAt: new Date(),
                aiGenerated: true,
                config: {
                    html,
                    css,
                    strategyName,
                    menuContext: menuContext ? {
                        itemCount: menuContext.items?.length || 0,
                        categories: [...new Set(menuContext.items?.map(i => i.category) || [])],
                        extractedColors: menuContext.extractedColors,
                    } : null,
                    deployedAt: new Date().toISOString(),
                } as any, // Cast to any since we're extending the config type
            })
            .returning();

        console.log(`📦 Deployed menu v${newVersion} for restaurant ${restaurantId}`);

        return NextResponse.json({
            success: true,
            layoutId: newLayout.id,
            version: newVersion,
            publishedAt: newLayout.publishedAt,
            message: `Menu v${newVersion} deployed successfully`,
        });
    } catch (error) {
        console.error('Deploy error:', error);
        return NextResponse.json(
            { error: 'Failed to deploy menu' },
            { status: 500 }
        );
    }
}

// GET - Fetch the currently published layout for a restaurant
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');

        if (!restaurantId) {
            return NextResponse.json(
                { error: 'restaurantId is required' },
                { status: 400 }
            );
        }

        const id = parseInt(restaurantId);
        if (isNaN(id)) {
            return NextResponse.json(
                { error: 'Invalid restaurantId' },
                { status: 400 }
            );
        }

        // Fetch the currently published layout
        const [publishedLayout] = await db
            .select({
                id: layouts.id,
                name: layouts.name,
                version: layouts.version,
                strategy: layouts.strategy,
                config: layouts.config,
                publishedAt: layouts.publishedAt,
            })
            .from(layouts)
            .where(
                and(
                    eq(layouts.restaurantId, id),
                    eq(layouts.status, 'published')
                )
            )
            .limit(1);

        if (!publishedLayout) {
            return NextResponse.json(
                { error: 'No published menu found', hasPublished: false },
                { status: 404 }
            );
        }

        // Extract HTML/CSS from config
        const config = publishedLayout.config as any;

        return NextResponse.json({
            hasPublished: true,
            layoutId: publishedLayout.id,
            name: publishedLayout.name,
            version: publishedLayout.version,
            strategy: publishedLayout.strategy,
            publishedAt: publishedLayout.publishedAt,
            html: config?.html || '',
            css: config?.css || '',
            menuContext: config?.menuContext || null,
        });
    } catch (error) {
        console.error('Fetch deployed layout error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch deployed menu' },
            { status: 500 }
        );
    }
}
