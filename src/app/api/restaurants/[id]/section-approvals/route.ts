import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sectionApprovals, layouts } from '@/lib/db/schema';
import { getUserFromToken } from '@/lib/services/auth.service';
import { getRestaurantById } from '@/lib/services/restaurant.service';
import { eq, and } from 'drizzle-orm';

const upsertSchema = z.object({
    layoutId: z.number(),
    sectionId: z.number(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    notes: z.string().optional(),
});

const updateSchema = z.object({
    approvalId: z.number(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    notes: z.string().optional(),
});

// GET /api/restaurants/[id]/section-approvals?layoutId=123
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

        const layoutIdParam = request.nextUrl.searchParams.get('layoutId');
        if (!layoutIdParam) {
            return NextResponse.json({ error: 'layoutId is required' }, { status: 400 });
        }

        const layoutId = parseInt(layoutIdParam);
        if (isNaN(layoutId)) {
            return NextResponse.json({ error: 'Invalid layoutId' }, { status: 400 });
        }

        const layout = await db.query.layouts.findFirst({
            where: and(eq(layouts.id, layoutId), eq(layouts.restaurantId, restaurantId)),
        });

        if (!layout) {
            return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
        }

        const approvals = await db.query.sectionApprovals.findMany({
            where: eq(sectionApprovals.layoutId, layoutId),
        });

        return NextResponse.json({ approvals });
    } catch (error) {
        console.error('Get section approvals error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/restaurants/[id]/section-approvals (upsert)
export async function POST(
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

        const body = upsertSchema.parse(await request.json());
        const status = body.status ?? 'pending';

        const layout = await db.query.layouts.findFirst({
            where: and(eq(layouts.id, body.layoutId), eq(layouts.restaurantId, restaurantId)),
        });

        if (!layout) {
            return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
        }

        const existing = await db.query.sectionApprovals.findFirst({
            where: and(
                eq(sectionApprovals.layoutId, body.layoutId),
                eq(sectionApprovals.sectionId, body.sectionId)
            ),
        });

        if (existing) {
            const [updated] = await db
                .update(sectionApprovals)
                .set({
                    status,
                    notes: body.notes,
                    approvedAt: status === 'approved' ? new Date() : null,
                    approvedByUserId: status === 'approved' ? user.id : null,
                })
                .where(eq(sectionApprovals.id, existing.id))
                .returning();

            return NextResponse.json({ approval: updated });
        }

        const [created] = await db
            .insert(sectionApprovals)
            .values({
                layoutId: body.layoutId,
                sectionId: body.sectionId,
                status,
                notes: body.notes,
                approvedAt: status === 'approved' ? new Date() : null,
                approvedByUserId: status === 'approved' ? user.id : null,
            })
            .returning();

        return NextResponse.json({ approval: created }, { status: 201 });
    } catch (error) {
        console.error('Upsert section approval error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/restaurants/[id]/section-approvals
export async function PATCH(
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

        const body = updateSchema.parse(await request.json());
        const status = body.status;

        const existing = await db.query.sectionApprovals.findFirst({
            where: eq(sectionApprovals.id, body.approvalId),
            with: {
                layout: true,
            },
        });

        if (!existing || existing.layout?.restaurantId !== restaurantId) {
            return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
        }

        const [updated] = await db
            .update(sectionApprovals)
            .set({
                status: status ?? existing.status,
                notes: body.notes ?? existing.notes,
                approvedAt: status === 'approved' ? new Date() : existing.approvedAt,
                approvedByUserId: status === 'approved' ? user.id : existing.approvedByUserId,
            })
            .where(eq(sectionApprovals.id, body.approvalId))
            .returning();

        return NextResponse.json({ approval: updated });
    } catch (error) {
        console.error('Update section approval error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
