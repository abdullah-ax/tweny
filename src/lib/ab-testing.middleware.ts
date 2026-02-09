/**
 * A/B Testing Middleware for Next.js
 * 
 * Automatically assigns visitors to variant A or B and persists
 * the assignment via cookies. All menu accesses are split 50/50.
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

/**
 * A/B Testing Middleware
 */
export function abTestingMiddleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Only apply to menu routes
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

    if (!variant || (variant !== 'a' && variant !== 'b')) {
        // 50/50 random assignment
        variant = Math.random() < 0.5 ? 'a' : 'b';

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
 * Middleware config export
 */
export const config = {
    matcher: ['/menu/:path*'],
};

export default abTestingMiddleware;
