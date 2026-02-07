import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { offers, offerArms } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserFromToken } from '@/lib/services/auth.service';
import { banditService } from '@/lib/services/bandit.service';

// GET /api/restaurants/[id]/offers - List offers
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const restaurantId = parseInt(id);

        if (isNaN(restaurantId)) {
            return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
        }

        const offersList = await db
            .select()
            .from(offers)
            .where(eq(offers.restaurantId, restaurantId));

        // Get arms for each offer
        const offersWithArms = await Promise.all(
            offersList.map(async (offer) => {
                const stats = await banditService.getArmStats(offer.id);
                return {
                    ...offer,
                    arms: stats,
                };
            })
        );

        return NextResponse.json({ offers: offersWithArms });
    } catch (error: any) {
        console.error('Get offers error:', error);
        return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
    }
}

// POST /api/restaurants/[id]/offers - Create offer with A/B test
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const restaurantId = parseInt(id);

        if (isNaN(restaurantId)) {
            return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
        }

        const body = await request.json();
        const { title, description, type, discountPercent, discountAmount, variants, sectionId, layoutId } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // Create offer
        const [newOffer] = await db.insert(offers).values({
            restaurantId,
            title,
            description,
            type: type || 'promo',
            discountPercent: discountPercent?.toString(),
            discountAmount: discountAmount?.toString(),
            sectionId,
            layoutId,
            status: 'draft',
        }).returning();

        // Create A/B test variants
        let arms: any[] = [];
        if (variants && Array.isArray(variants) && variants.length > 0) {
            arms = await banditService.createTest(newOffer.id, variants);
        } else {
            // Create default control and treatment
            arms = await banditService.createTest(newOffer.id, ['Control', 'Treatment A']);
        }

        return NextResponse.json({
            offer: newOffer,
            arms,
        });
    } catch (error: any) {
        console.error('Create offer error:', error);
        return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
    }
}
