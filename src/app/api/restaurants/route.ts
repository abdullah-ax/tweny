import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/services/auth.service';
import {
    createRestaurant,
    getRestaurantsByOwner
} from '@/lib/services/restaurant.service';
import { z } from 'zod';

const createRestaurantSchema = z.object({
    name: z.string().min(1, 'Restaurant name is required'),
    description: z.string().optional(),
    cuisine: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
});

// GET /api/restaurants - List user's restaurants
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const restaurants = await getRestaurantsByOwner(user.id);
        return NextResponse.json({ restaurants });
    } catch (error) {
        console.error('Get restaurants error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/restaurants - Create a restaurant
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validation = createRestaurantSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.errors[0].message },
                { status: 400 }
            );
        }

        const restaurant = await createRestaurant({
            ...validation.data,
            ownerId: user.id,
        });

        return NextResponse.json({ restaurant }, { status: 201 });
    } catch (error) {
        console.error('Create restaurant error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
