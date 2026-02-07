import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { layouts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserFromToken } from '@/lib/services/auth.service';

// GET /api/restaurants/[id]/layouts/[layoutId] - Get layout details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; layoutId: string }> }
) {
    try {
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, layoutId } = await params;
        const restaurantId = parseInt(id);
        const layoutIdNum = parseInt(layoutId);

        if (isNaN(restaurantId) || isNaN(layoutIdNum)) {
            return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
        }

        const [layout] = await db
            .select()
            .from(layouts)
            .where(and(eq(layouts.id, layoutIdNum), eq(layouts.restaurantId, restaurantId)));

        if (!layout) {
            return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
        }

        return NextResponse.json({ layout });
    } catch (error: any) {
        console.error('Get layout error:', error);
        return NextResponse.json({ error: 'Failed to fetch layout' }, { status: 500 });
    }
}

// PATCH /api/restaurants/[id]/layouts/[layoutId] - Update layout
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; layoutId: string }> }
) {
    try {
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, layoutId } = await params;
        const restaurantId = parseInt(id);
        const layoutIdNum = parseInt(layoutId);

        if (isNaN(restaurantId) || isNaN(layoutIdNum)) {
            return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
        }

        const body = await request.json();
        const { name, description, config, status, publishedAt } = body;

        // Get current layout to increment version
        const [currentLayout] = await db
            .select()
            .from(layouts)
            .where(and(eq(layouts.id, layoutIdNum), eq(layouts.restaurantId, restaurantId)));

        if (!currentLayout) {
            return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
        }

        const updates: any = { updatedAt: new Date() };
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (config !== undefined) {
            updates.config = config;
            updates.version = (currentLayout.version || 1) + 1;
        }
        if (status !== undefined) {
            updates.status = status;
            if (status === 'published') {
                updates.publishedAt = publishedAt || new Date();
                updates.appliedByUserId = user.id;
            }
        }

        const [updated] = await db
            .update(layouts)
            .set(updates)
            .where(and(eq(layouts.id, layoutIdNum), eq(layouts.restaurantId, restaurantId)))
            .returning();

        return NextResponse.json({ layout: updated });
    } catch (error: any) {
        console.error('Update layout error:', error);
        return NextResponse.json({ error: 'Failed to update layout' }, { status: 500 });
    }
}

// DELETE /api/restaurants/[id]/layouts/[layoutId] - Delete layout
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; layoutId: string }> }
) {
    try {
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, layoutId } = await params;
        const restaurantId = parseInt(id);
        const layoutIdNum = parseInt(layoutId);

        if (isNaN(restaurantId) || isNaN(layoutIdNum)) {
            return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
        }

        await db
            .delete(layouts)
            .where(and(eq(layouts.id, layoutIdNum), eq(layouts.restaurantId, restaurantId)));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete layout error:', error);
        return NextResponse.json({ error: 'Failed to delete layout' }, { status: 500 });
    }
}
