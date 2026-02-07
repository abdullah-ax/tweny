import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { offers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserFromToken } from '@/lib/services/auth.service';
import { banditService } from '@/lib/services/bandit.service';

// GET /api/restaurants/[id]/offers/[offerId] - Get offer details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; offerId: string }> }
) {
    try {
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, offerId } = await params;
        const restaurantId = parseInt(id);
        const offerIdNum = parseInt(offerId);

        if (isNaN(restaurantId) || isNaN(offerIdNum)) {
            return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
        }

        const [offer] = await db
            .select()
            .from(offers)
            .where(and(eq(offers.id, offerIdNum), eq(offers.restaurantId, restaurantId)));

        if (!offer) {
            return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
        }

        const stats = await banditService.getArmStats(offerIdNum);

        return NextResponse.json({
            offer,
            arms: stats,
        });
    } catch (error: any) {
        console.error('Get offer error:', error);
        return NextResponse.json({ error: 'Failed to fetch offer' }, { status: 500 });
    }
}

// PATCH /api/restaurants/[id]/offers/[offerId] - Update offer
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; offerId: string }> }
) {
    try {
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, offerId } = await params;
        const restaurantId = parseInt(id);
        const offerIdNum = parseInt(offerId);

        if (isNaN(restaurantId) || isNaN(offerIdNum)) {
            return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
        }

        const body = await request.json();
        const { status, title, description, discountPercent, discountAmount } = body;

        const updates: any = { updatedAt: new Date() };
        if (status) updates.status = status;
        if (title) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (discountPercent !== undefined) updates.discountPercent = discountPercent?.toString();
        if (discountAmount !== undefined) updates.discountAmount = discountAmount?.toString();

        const [updated] = await db
            .update(offers)
            .set(updates)
            .where(and(eq(offers.id, offerIdNum), eq(offers.restaurantId, restaurantId)))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
        }

        return NextResponse.json({ offer: updated });
    } catch (error: any) {
        console.error('Update offer error:', error);
        return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 });
    }
}

// DELETE /api/restaurants/[id]/offers/[offerId] - Delete offer
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; offerId: string }> }
) {
    try {
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, offerId } = await params;
        const restaurantId = parseInt(id);
        const offerIdNum = parseInt(offerId);

        if (isNaN(restaurantId) || isNaN(offerIdNum)) {
            return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
        }

        await db
            .delete(offers)
            .where(and(eq(offers.id, offerIdNum), eq(offers.restaurantId, restaurantId)));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete offer error:', error);
        return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 });
    }
}
