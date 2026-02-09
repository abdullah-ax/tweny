/**
 * Shared types for Menu components and services
 * This file breaks circular dependencies between components and utilities
 */

// ============================================
// Menu Item Types
// ============================================

export interface MenuItemData {
    id: number;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    rating: number | null;
    votes: number | null;
    isHighMargin?: boolean;
    isAnchor?: boolean;
    position?: 'top-right' | 'center' | 'standard';
}

export interface MenuSectionData {
    id: number;
    title: string;
    description?: string | null;
    items: MenuItemData[];
}

// ============================================
// Cart Types
// ============================================

export interface CartItem {
    item: MenuItemData;
    quantity: number;
}

// ============================================
// Restaurant Types
// ============================================

export interface Restaurant {
    id: number;
    name: string;
    description?: string | null;
    cuisine?: string | null;
    logo?: string | null;
}

// ============================================
// Analytics Types
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
