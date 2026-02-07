import { NextRequest, NextResponse } from 'next/server';
import { analyticsEngine } from '@/lib/services/analytics.engine';
import { getUserFromToken } from '@/lib/services/auth.service';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Verify auth
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

        const { searchParams } = new URL(request.url);
        const period = parseInt(searchParams.get('period') || '90');
        const quadrant = searchParams.get('quadrant') as 'star' | 'cash_cow' | 'question_mark' | 'dog' | null;

        let data;

        if (quadrant) {
            data = await analyticsEngine.getByQuadrant(restaurantId, quadrant);
        } else {
            data = await analyticsEngine.calculateForRestaurant(restaurantId, period);
        }

        const summary = await analyticsEngine.getSummary(restaurantId, period);
        const recommendations = await analyticsEngine.getRecommendations(restaurantId);

        return NextResponse.json({
            items: data,
            summary,
            recommendations,
        });
    } catch (error: any) {
        console.error('Analytics error:', error);
        return NextResponse.json({ error: 'Failed to calculate analytics' }, { status: 500 });
    }
}
