/**
 * Next.js Middleware
 * 
 * Handles A/B testing assignment for menu routes
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VARIANT_COOKIE_PREFIX = 'tweny_variant_';
const SESSION_COOKIE = 'tweny_session';

/**
 * Generates a session ID
 */
function generateSessionId(): string {
    return `sess-${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
}

/**
 * Extracts restaurant ID from the URL path
 */
function extractRestaurantId(pathname: string): string | null {
    // Match /menu/[restaurantId] or /menu/live/[restaurantId]
    const menuMatch = pathname.match(/\/menu\/(?:live\/)?(\d+)/);
    if (menuMatch) return menuMatch[1];

    return null;
}

export function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Only apply A/B testing to menu routes
    if (!pathname.startsWith('/menu/')) {
        return NextResponse.next();
    }

    const response = NextResponse.next();
    const restaurantId = extractRestaurantId(pathname);

    if (!restaurantId) {
        return response;
    }

    // Get or create session ID
    let sessionId = request.cookies.get(SESSION_COOKIE)?.value;
    if (!sessionId) {
        sessionId = generateSessionId();
        response.cookies.set(SESSION_COOKIE, sessionId, {
            path: '/',
            maxAge: 86400, // 24 hours
            sameSite: 'lax',
        });
    }

    // Get or assign variant
    const variantCookie = `${VARIANT_COOKIE_PREFIX}${restaurantId}`;
    let variant = request.cookies.get(variantCookie)?.value as 'a' | 'b' | undefined;

    // Check for preview mode (forced variant via query param)
    const previewVariant = request.nextUrl.searchParams.get('variant');
    if (previewVariant === 'a' || previewVariant === 'b') {
        variant = previewVariant;
    }

    if (!variant || (variant !== 'a' && variant !== 'b')) {
        // 50/50 random assignment using deterministic hash for consistency
        const hash = hashString(`${sessionId}-${restaurantId}`);
        variant = hash % 2 === 0 ? 'a' : 'b';

        response.cookies.set(variantCookie, variant, {
            path: '/',
            maxAge: 2592000, // 30 days
            sameSite: 'lax',
        });
    }

    // Add variant to request headers for server components
    response.headers.set('x-tweny-variant', variant);
    response.headers.set('x-tweny-session', sessionId);
    response.headers.set('x-tweny-restaurant', restaurantId);

    return response;
}

/**
 * Simple hash function for deterministic variant assignment
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

export const config = {
    matcher: [
        '/menu/:path*',
    ],
};
