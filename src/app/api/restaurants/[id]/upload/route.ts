import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/services/auth.service';
import { getRestaurantById } from '@/lib/services/restaurant.service';
import {
    importMenuSections,
    importMenuItems,
    importOrderItems,
    parseCSV
} from '@/lib/services/data-import.service';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import os from 'os';

// POST /api/restaurants/[id]/upload - Upload and import CSV
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const restaurantId = parseInt(id);
        if (isNaN(restaurantId)) {
            return NextResponse.json(
                { error: 'Invalid restaurant ID' },
                { status: 400 }
            );
        }

        const restaurant = await getRestaurantById(restaurantId);
        if (!restaurant) {
            return NextResponse.json(
                { error: 'Restaurant not found' },
                { status: 404 }
            );
        }

        if (restaurant.ownerId !== user.id && user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        // Handle file upload
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const dataType = formData.get('type') as string; // 'sections', 'menuItems', 'orderItems'

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!file.name.endsWith('.csv')) {
            return NextResponse.json(
                { error: 'Only CSV files are supported' },
                { status: 400 }
            );
        }

        // Save file to temp directory
        const tempDir = path.join(os.tmpdir(), 'tweny-uploads');
        await mkdir(tempDir, { recursive: true });

        const tempPath = path.join(tempDir, `${Date.now()}-${file.name}`);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(tempPath, buffer);

        // Import based on type
        let result;
        switch (dataType) {
            case 'sections':
                result = await importMenuSections(restaurantId, tempPath);
                break;
            case 'menuItems':
                result = await importMenuItems(restaurantId, tempPath);
                break;
            case 'orderItems':
                result = await importOrderItems(restaurantId, tempPath);
                break;
            default:
                // Try to detect based on filename
                if (file.name.includes('section')) {
                    result = await importMenuSections(restaurantId, tempPath);
                } else if (file.name.includes('menu') || file.name.includes('item')) {
                    result = await importMenuItems(restaurantId, tempPath);
                } else if (file.name.includes('order')) {
                    result = await importOrderItems(restaurantId, tempPath);
                } else {
                    return NextResponse.json(
                        { error: 'Could not determine data type. Please specify type parameter.' },
                        { status: 400 }
                    );
                }
        }

        return NextResponse.json({
            message: 'Upload and import completed',
            result,
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
