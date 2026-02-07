import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { menuItems, menuSections, restaurantContext } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Bulk Menu Import API
 * Used by onboarding to save extracted menu items to the database
 * Ensures all menu data is grounded in the database
 */

interface MenuItem {
    name: string;
    description?: string;
    price: number;
    category?: string;
    cost?: number;
    imageUrl?: string;
}

interface ImportRequest {
    restaurantId: number;
    items: MenuItem[];
    context?: {
        menuItems: unknown[];
        categories: string[];
        salesData?: unknown;
        menuEngineering?: unknown;
        colorPalette?: unknown;
        extractedImages?: unknown[];
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: ImportRequest = await request.json();
        const { restaurantId, items, context } = body;

        if (!restaurantId || !items || !Array.isArray(items)) {
            return NextResponse.json(
                { error: 'restaurantId and items array are required' },
                { status: 400 }
            );
        }

        // Group items by category
        const categorized: Record<string, MenuItem[]> = {};
        items.forEach(item => {
            const cat = item.category || 'Other';
            if (!categorized[cat]) categorized[cat] = [];
            categorized[cat].push(item);
        });

        const importedItems: { id: number; name: string; sectionId: number | null }[] = [];
        const createdSections: { id: number; title: string }[] = [];

        // Create sections for each category
        for (const [category, categoryItems] of Object.entries(categorized)) {
            // Check if section already exists
            const existingSections = await db
                .select({ id: menuSections.id })
                .from(menuSections)
                .where(eq(menuSections.restaurantId, restaurantId))
                .limit(100);

            let sectionId: number;
            const existingSection = await db
                .select({ id: menuSections.id })
                .from(menuSections)
                .where(eq(menuSections.restaurantId, restaurantId))
                .limit(1);

            // Create section if doesn't exist
            const [section] = await db
                .insert(menuSections)
                .values({
                    restaurantId,
                    title: category,
                    description: `${category} items`,
                    index: Object.keys(categorized).indexOf(category),
                })
                .onConflictDoNothing()
                .returning();

            if (section) {
                sectionId = section.id;
                createdSections.push({ id: section.id, title: category });
            } else {
                // Section might already exist, try to find it
                const [existing] = await db
                    .select({ id: menuSections.id })
                    .from(menuSections)
                    .where(eq(menuSections.restaurantId, restaurantId));
                sectionId = existing?.id || 0;
            }

            // Create menu items in this section
            for (let i = 0; i < categoryItems.length; i++) {
                const item = categoryItems[i];

                const [newItem] = await db
                    .insert(menuItems)
                    .values({
                        restaurantId,
                        sectionId: sectionId || null,
                        name: item.name,
                        description: item.description || null,
                        price: item.price.toFixed(2),
                        cost: item.cost ? item.cost.toFixed(2) : null,
                        imageUrl: item.imageUrl || null,
                        status: 'Active',
                        index: i,
                    })
                    .returning();

                if (newItem) {
                    importedItems.push({
                        id: newItem.id,
                        name: newItem.name,
                        sectionId: newItem.sectionId,
                    });
                }
            }
        }

        // Save the AI context if provided
        if (context) {
            await db
                .insert(restaurantContext)
                .values({
                    restaurantId,
                    context: context as any,
                    lastAnalyzedAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: restaurantContext.restaurantId,
                    set: {
                        context: context as any,
                        lastAnalyzedAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
        }

        console.log(`Imported ${importedItems.length} menu items for restaurant ${restaurantId}`);

        return NextResponse.json({
            success: true,
            imported: {
                items: importedItems.length,
                sections: createdSections.length,
            },
            itemIds: importedItems.map(i => i.id),
            sectionIds: createdSections.map(s => s.id),
        });
    } catch (error) {
        console.error('Bulk import error:', error);
        return NextResponse.json(
            { error: 'Failed to import menu items' },
            { status: 500 }
        );
    }
}

// GET - Fetch restaurant context (for AI decisions)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
        return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    try {
        const id = parseInt(restaurantId);

        // Fetch stored context
        const [contextData] = await db
            .select()
            .from(restaurantContext)
            .where(eq(restaurantContext.restaurantId, id));

        // Fetch actual menu items from database
        const items = await db
            .select({
                id: menuItems.id,
                name: menuItems.name,
                description: menuItems.description,
                price: menuItems.price,
                cost: menuItems.cost,
                sectionId: menuItems.sectionId,
                soldCount: menuItems.soldCount,
                status: menuItems.status,
            })
            .from(menuItems)
            .where(eq(menuItems.restaurantId, id));

        // Fetch sections
        const sections = await db
            .select({
                id: menuSections.id,
                title: menuSections.title,
            })
            .from(menuSections)
            .where(eq(menuSections.restaurantId, id));

        return NextResponse.json({
            context: contextData?.context || null,
            menuItems: items,
            sections,
            lastAnalyzedAt: contextData?.lastAnalyzedAt,
        });
    } catch (error) {
        console.error('Fetch context error:', error);
        return NextResponse.json({ error: 'Failed to fetch context' }, { status: 500 });
    }
}
