import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/services/auth.service';

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

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Me API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
