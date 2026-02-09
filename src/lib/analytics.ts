/**
 * Analytics Tracking Library for Menu A/B Testing
 * 
 * Tracks view_count, item_click_rate, and order_conversion_value per variant.
 */

// ============================================
// Types
// ============================================

export type EventType =
    | 'menu_view'
    | 'section_view'
    | 'item_view'
    | 'item_click'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'checkout_initiated'
    | 'checkout_completed'
    | 'payment_success'
    | 'payment_failed';

export interface AnalyticsEvent {
    type: EventType;
    restaurantId: number;
    itemId?: number;
    sectionId?: number;
    variant?: 'a' | 'b';
    sessionId?: string;
    timestamp?: Date;
    metadata?: Record<string, unknown>;
}

export interface TrackingConfig {
    restaurantId: number;
    variant: 'a' | 'b';
    sessionId: string;
    enableRealtime?: boolean;
    batchSize?: number;
    flushInterval?: number;
}

export interface VariantMetrics {
    variant: 'a' | 'b';
    viewCount: number;
    uniqueVisitors: number;
    itemClickCount: number;
    itemClickRate: number;
    addToCartCount: number;
    addToCartRate: number;
    checkoutCount: number;
    checkoutRate: number;
    orderCount: number;
    conversionRate: number;
    totalRevenue: number;
    averageOrderValue: number;
    revenuePerVisitor: number;
}

// ============================================
// Session Management
// ============================================

let currentConfig: TrackingConfig | null = null;
let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Generates a unique session ID
 */
export function generateSessionId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `sess-${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
}

/**
 * Gets or creates a session ID from cookies
 */
export function getSessionId(): string {
    if (typeof document === 'undefined') return generateSessionId();

    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith('tweny_session='));

    if (sessionCookie) {
        return sessionCookie.split('=')[1];
    }

    const newSessionId = generateSessionId();
    document.cookie = `tweny_session=${newSessionId}; path=/; max-age=86400; SameSite=Lax`;
    return newSessionId;
}

// ============================================
// A/B Variant Assignment
// ============================================

/**
 * Assigns a variant (A or B) based on session ID or cookie
 * Uses cookie persistence to ensure consistent experience
 */
export function getAssignedVariant(restaurantId: number): 'a' | 'b' {
    if (typeof document === 'undefined') {
        // Server-side: use random assignment
        return Math.random() < 0.5 ? 'a' : 'b';
    }

    const cookieName = `tweny_variant_${restaurantId}`;
    const cookies = document.cookie.split(';');
    const variantCookie = cookies.find(c => c.trim().startsWith(`${cookieName}=`));

    if (variantCookie) {
        const value = variantCookie.split('=')[1]?.trim();
        if (value === 'a' || value === 'b') return value;
    }

    // Random assignment with 50/50 split
    const variant: 'a' | 'b' = Math.random() < 0.5 ? 'a' : 'b';

    // Persist for 30 days
    document.cookie = `${cookieName}=${variant}; path=/; max-age=2592000; SameSite=Lax`;

    return variant;
}

/**
 * Forces a specific variant (for testing/preview)
 */
export function setVariant(restaurantId: number, variant: 'a' | 'b'): void {
    if (typeof document === 'undefined') return;

    const cookieName = `tweny_variant_${restaurantId}`;
    document.cookie = `${cookieName}=${variant}; path=/; max-age=2592000; SameSite=Lax`;
}

// ============================================
// Event Tracking
// ============================================

/**
 * Initializes the analytics tracking system
 */
export function initializeTracking(config: TrackingConfig): void {
    currentConfig = config;

    // Start batch flush timer
    if (config.enableRealtime && config.flushInterval) {
        if (flushTimer) clearInterval(flushTimer);
        flushTimer = setInterval(() => flushEvents(), config.flushInterval);
    }
}

/**
 * Tracks an analytics event
 */
export function trackEvent(event: AnalyticsEvent): void {
    const enrichedEvent: AnalyticsEvent = {
        ...event,
        sessionId: event.sessionId || currentConfig?.sessionId || getSessionId(),
        variant: event.variant || currentConfig?.variant,
        timestamp: new Date(),
    };

    eventQueue.push(enrichedEvent);

    // Immediate flush for critical events
    const criticalEvents: EventType[] = ['checkout_completed', 'payment_success'];
    if (criticalEvents.includes(event.type)) {
        flushEvents();
        return;
    }

    // Batch flush when queue is full
    const batchSize = currentConfig?.batchSize || 10;
    if (eventQueue.length >= batchSize) {
        flushEvents();
    }
}

/**
 * Flushes queued events to the server
 */
async function flushEvents(): Promise<void> {
    if (eventQueue.length === 0) return;

    const eventsToSend = [...eventQueue];
    eventQueue = [];

    try {
        const response = await fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: eventsToSend }),
        });

        if (!response.ok) {
            // Re-queue failed events
            eventQueue = [...eventsToSend, ...eventQueue];
            console.error('Failed to track events:', response.statusText);
        }
    } catch (error) {
        // Re-queue failed events
        eventQueue = [...eventsToSend, ...eventQueue];
        console.error('Failed to track events:', error);
    }
}

// ============================================
// Convenience Tracking Functions
// ============================================

export function trackMenuView(restaurantId: number, variant: 'a' | 'b'): void {
    trackEvent({
        type: 'menu_view',
        restaurantId,
        variant,
    });
}

export function trackItemClick(
    restaurantId: number,
    itemId: number,
    variant: 'a' | 'b',
    metadata?: Record<string, unknown>
): void {
    trackEvent({
        type: 'item_click',
        restaurantId,
        itemId,
        variant,
        metadata,
    });
}

export function trackAddToCart(
    restaurantId: number,
    itemId: number,
    variant: 'a' | 'b',
    metadata?: Record<string, unknown>
): void {
    trackEvent({
        type: 'add_to_cart',
        restaurantId,
        itemId,
        variant,
        metadata,
    });
}

export function trackCheckout(
    restaurantId: number,
    variant: 'a' | 'b',
    metadata?: Record<string, unknown>
): void {
    trackEvent({
        type: 'checkout_initiated',
        restaurantId,
        variant,
        metadata,
    });
}

export function trackOrderComplete(
    restaurantId: number,
    variant: 'a' | 'b',
    orderValue: number,
    metadata?: Record<string, unknown>
): void {
    trackEvent({
        type: 'checkout_completed',
        restaurantId,
        variant,
        metadata: {
            ...metadata,
            orderValue,
        },
    });
}

// ============================================
// Analytics Aggregation (Server-side)
// ============================================

export interface RawEventData {
    id: number;
    restaurantId: number;
    eventType: string;
    eventData: Record<string, unknown> | null;
    sessionId: string | null;
    createdAt: Date;
}

/**
 * Calculates metrics for each variant from raw events
 */
export function calculateVariantMetrics(events: RawEventData[]): {
    a: VariantMetrics;
    b: VariantMetrics;
} {
    const variantA = events.filter(e => e.eventData?.variant === 'a');
    const variantB = events.filter(e => e.eventData?.variant === 'b');

    return {
        a: aggregateMetrics(variantA, 'a'),
        b: aggregateMetrics(variantB, 'b'),
    };
}

function aggregateMetrics(events: RawEventData[], variant: 'a' | 'b'): VariantMetrics {
    const uniqueSessions = new Set(events.map(e => e.sessionId).filter(Boolean));

    const menuViews = events.filter(e => e.eventType === 'menu_view');
    const itemClicks = events.filter(e => e.eventType === 'item_click');
    const addToCarts = events.filter(e => e.eventType === 'add_to_cart');
    const checkouts = events.filter(e => e.eventType === 'checkout_initiated');
    const completedOrders = events.filter(e => e.eventType === 'checkout_completed');

    const totalRevenue = completedOrders.reduce(
        (sum, e) => sum + (Number(e.eventData?.orderValue) || 0),
        0
    );

    const viewCount = menuViews.length;
    const uniqueVisitors = uniqueSessions.size;

    return {
        variant,
        viewCount,
        uniqueVisitors,
        itemClickCount: itemClicks.length,
        itemClickRate: viewCount > 0 ? itemClicks.length / viewCount : 0,
        addToCartCount: addToCarts.length,
        addToCartRate: viewCount > 0 ? addToCarts.length / viewCount : 0,
        checkoutCount: checkouts.length,
        checkoutRate: viewCount > 0 ? checkouts.length / viewCount : 0,
        orderCount: completedOrders.length,
        conversionRate: viewCount > 0 ? completedOrders.length / viewCount : 0,
        totalRevenue,
        averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
        revenuePerVisitor: uniqueVisitors > 0 ? totalRevenue / uniqueVisitors : 0,
    };
}

// ============================================
// Statistical Significance
// ============================================

/**
 * Calculates statistical significance between two variants
 * using a simplified Z-test for proportions
 */
export function calculateSignificance(
    metricsA: VariantMetrics,
    metricsB: VariantMetrics
): {
    isSignificant: boolean;
    confidenceLevel: number;
    winner: 'a' | 'b' | 'tie';
    lift: number;
} {
    const n1 = metricsA.viewCount;
    const n2 = metricsB.viewCount;
    const p1 = metricsA.conversionRate;
    const p2 = metricsB.conversionRate;

    if (n1 < 30 || n2 < 30) {
        return {
            isSignificant: false,
            confidenceLevel: 0,
            winner: 'tie',
            lift: 0,
        };
    }

    // Pooled proportion
    const p = (p1 * n1 + p2 * n2) / (n1 + n2);

    // Standard error
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));

    // Z-score
    const z = se > 0 ? (p1 - p2) / se : 0;

    // Convert to confidence level (approximate)
    const absZ = Math.abs(z);
    let confidenceLevel = 0;
    if (absZ >= 2.576) confidenceLevel = 99;
    else if (absZ >= 1.96) confidenceLevel = 95;
    else if (absZ >= 1.645) confidenceLevel = 90;
    else confidenceLevel = Math.min(89, Math.round(absZ / 1.645 * 90));

    const isSignificant = confidenceLevel >= 95;
    const winner = !isSignificant ? 'tie' : p1 > p2 ? 'a' : 'b';
    const lift = p2 > 0 ? ((p1 - p2) / p2) * 100 : 0;

    return {
        isSignificant,
        confidenceLevel,
        winner,
        lift,
    };
}

// ============================================
// Cleanup
// ============================================

export function cleanup(): void {
    if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
    }
    flushEvents();
    currentConfig = null;
}

// Flush on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        flushEvents();
    });
}

export default {
    generateSessionId,
    getSessionId,
    getAssignedVariant,
    setVariant,
    initializeTracking,
    trackEvent,
    trackMenuView,
    trackItemClick,
    trackAddToCart,
    trackCheckout,
    trackOrderComplete,
    calculateVariantMetrics,
    calculateSignificance,
    cleanup,
};
