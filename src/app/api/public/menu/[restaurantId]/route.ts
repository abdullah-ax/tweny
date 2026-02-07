import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { restaurants, menuSections, menuItems, offers, layouts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ restaurantId: string }> }
) {
    try {
        const { restaurantId } = await params;
        const id = parseInt(restaurantId);

        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
        }

        // Fetch restaurant
        const [restaurant] = await db
            .select({
                id: restaurants.id,
                name: restaurants.name,
                description: restaurants.description,
                cuisine: restaurants.cuisine,
            })
            .from(restaurants)
            .where(eq(restaurants.id, id));

        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        // Fetch sections
        const sectionsData = await db
            .select({
                id: menuSections.id,
                title: menuSections.title,
                description: menuSections.description,
                index: menuSections.index,
            })
            .from(menuSections)
            .where(eq(menuSections.restaurantId, id))
            .orderBy(menuSections.index);

        // Fetch all menu items for this restaurant
        const itemsData = await db
            .select({
                id: menuItems.id,
                name: menuItems.name,
                description: menuItems.description,
                price: menuItems.price,
                imageUrl: menuItems.imageUrl,
                rating: menuItems.rating,
                votes: menuItems.votes,
                sectionId: menuItems.sectionId,
                index: menuItems.index,
            })
            .from(menuItems)
            .where(and(
                eq(menuItems.restaurantId, id),
                eq(menuItems.status, 'Active')
            ))
            .orderBy(menuItems.index);

        // Group items by section
        const sections = sectionsData.map(section => ({
            ...section,
            items: itemsData
                .filter(item => item.sectionId === section.id)
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    imageUrl: item.imageUrl,
                    rating: item.rating,
                    votes: item.votes,
                })),
        }));

        // Fetch active offers
        const activeOffers = await db
            .select({
                id: offers.id,
                title: offers.title,
                description: offers.description,
                discountPercent: offers.discountPercent,
                discountAmount: offers.discountAmount,
            })
            .from(offers)
            .where(and(
                eq(offers.restaurantId, id),
                eq(offers.status, 'active')
            ));

        // Check for a published custom layout (deployed from design editor)
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
            .where(and(
                eq(layouts.restaurantId, id),
                eq(layouts.status, 'published')
            ))
            .limit(1);

        // Extract deployed HTML/CSS if available
        let deployedMenu = null;
        if (publishedLayout) {
            const config = publishedLayout.config as any;
            if (config?.html && config?.css) {
                deployedMenu = {
                    layoutId: publishedLayout.id,
                    version: publishedLayout.version,
                    strategy: publishedLayout.strategy,
                    html: config.html,
                    css: config.css,
                    publishedAt: publishedLayout.publishedAt,
                };
            }
        }

        return NextResponse.json({
            restaurant,
            sections,
            offers: activeOffers,
            deployedMenu, // Include deployed custom design if available
        });
    } catch (error: any) {
        console.error('Public menu fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
    }
}
