import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { restaurantDocuments, restaurants } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { verifyToken } from '@/lib/services/auth.service';

// GET /api/restaurants/[id]/documents - Get all documents for a restaurant
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const restaurantId = parseInt(id);

        if (isNaN(restaurantId)) {
            return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
        }

        // Verify user owns this restaurant
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const user = await verifyToken(token);
        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Check restaurant ownership
        const restaurant = await db.query.restaurants.findFirst({
            where: and(
                eq(restaurants.id, restaurantId),
                eq(restaurants.ownerId, user.id)
            ),
        });

        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        // Get all documents for this restaurant
        const documents = await db
            .select()
            .from(restaurantDocuments)
            .where(eq(restaurantDocuments.restaurantId, restaurantId))
            .orderBy(desc(restaurantDocuments.createdAt));

        return NextResponse.json({ documents });
    } catch (error) {
        console.error('Error fetching documents:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/restaurants/[id]/documents - Upload a new document
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const restaurantId = parseInt(id);

        if (isNaN(restaurantId)) {
            return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
        }

        // Verify user owns this restaurant
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const user = await verifyToken(token);
        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Check restaurant ownership
        const restaurant = await db.query.restaurants.findFirst({
            where: and(
                eq(restaurants.id, restaurantId),
                eq(restaurants.ownerId, user.id)
            ),
        });

        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        const body = await request.json();
        const { name, type, mimeType, fileSize, storageUrl, thumbnailUrl, extractedData } = body;

        if (!name || !type) {
            return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
        }

        // Insert the document
        const [newDocument] = await db
            .insert(restaurantDocuments)
            .values({
                restaurantId,
                name,
                type,
                mimeType,
                fileSize,
                storageUrl,
                thumbnailUrl,
                extractedData,
                status: 'processed',
            })
            .returning();

        return NextResponse.json({ document: newDocument });
    } catch (error) {
        console.error('Error creating document:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/restaurants/[id]/documents - Delete a document
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const restaurantId = parseInt(id);

        if (isNaN(restaurantId)) {
            return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
        }

        // Verify user owns this restaurant
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const user = await verifyToken(token);
        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Check restaurant ownership
        const restaurant = await db.query.restaurants.findFirst({
            where: and(
                eq(restaurants.id, restaurantId),
                eq(restaurants.ownerId, user.id)
            ),
        });

        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const documentId = parseInt(searchParams.get('documentId') || '');

        if (isNaN(documentId)) {
            return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
        }

        // Delete the document
        await db
            .delete(restaurantDocuments)
            .where(
                and(
                    eq(restaurantDocuments.id, documentId),
                    eq(restaurantDocuments.restaurantId, restaurantId)
                )
            );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
