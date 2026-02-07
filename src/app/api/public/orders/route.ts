import { NextResponse } from 'next/server';

/**
 * Mock Orders API
 * Stores orders in memory (resets on server restart)
 * In production, this would use a real database
 */

export interface OrderItem {
    menuItemId: number;
    name: string;
    price: number;
    quantity: number;
}

export interface Order {
    id: string;
    restaurantId: number;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    status: 'pending' | 'paid' | 'completed';
    paymentMethod: 'card' | 'cash' | 'apple_pay';
    customerName?: string;
    customerEmail?: string;
    menuVersion?: string; // Track which menu version this order was placed on
    createdAt: Date;
    paidAt?: Date;
}

// In-memory store for orders (mock database)
const ordersStore: Map<number, Order[]> = new Map();

// Track menu changes for analytics correlation
const menuChanges: Map<number, { timestamp: Date; description: string }[]> = new Map();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { restaurantId, items, customerName, customerEmail, paymentMethod, menuVersion } = body;

        if (!restaurantId || !items || items.length === 0) {
            return NextResponse.json({ error: 'Restaurant ID and items required' }, { status: 400 });
        }

        // Calculate totals
        const subtotal = items.reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.08; // 8% tax
        const total = subtotal + tax;

        // Create order
        const order: Order = {
            id: `ORD-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            restaurantId: parseInt(restaurantId),
            items,
            subtotal,
            tax,
            total,
            status: 'pending',
            paymentMethod: paymentMethod || 'card',
            customerName,
            customerEmail,
            menuVersion,
            createdAt: new Date(),
        };

        // Store order
        const restaurantOrders = ordersStore.get(order.restaurantId) || [];
        restaurantOrders.push(order);
        ordersStore.set(order.restaurantId, restaurantOrders);

        console.log(`📦 New order ${order.id} for restaurant ${restaurantId}: $${total.toFixed(2)}`);

        return NextResponse.json({
            success: true,
            order: {
                id: order.id,
                total: order.total,
                status: order.status,
            },
        });
    } catch (error) {
        console.error('Order creation error:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
        return NextResponse.json({ error: 'Restaurant ID required' }, { status: 400 });
    }

    const orders = ordersStore.get(parseInt(restaurantId)) || [];

    return NextResponse.json({
        orders,
        total: orders.length,
        revenue: orders.reduce((sum, o) => sum + o.total, 0),
    });
}
