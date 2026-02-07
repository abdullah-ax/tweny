import { NextResponse } from 'next/server';

/**
 * Mock Payment Processing API
 * Simulates card payment with mock success/failure
 */

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, paymentMethod, cardNumber, expiryDate, cvv, amount } = body;

        if (!orderId || !amount) {
            return NextResponse.json({ error: 'Order ID and amount required' }, { status: 400 });
        }

        // Simulate payment processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock validation - card ending in 0000 always fails
        if (cardNumber?.endsWith('0000')) {
            return NextResponse.json({
                success: false,
                error: 'Payment declined. Please try a different card.',
            }, { status: 402 });
        }

        // Generate mock payment confirmation
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        console.log(`💳 Payment processed: ${transactionId} for order ${orderId} - $${amount.toFixed(2)}`);

        return NextResponse.json({
            success: true,
            transactionId,
            orderId,
            amount,
            paymentMethod: paymentMethod || 'card',
            timestamp: new Date().toISOString(),
            message: 'Payment successful! Your order has been confirmed.',
        });
    } catch (error) {
        console.error('Payment processing error:', error);
        return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
    }
}
