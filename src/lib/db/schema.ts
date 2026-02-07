import {
    pgTable,
    serial,
    varchar,
    text,
    integer,
    decimal,
    timestamp,
    boolean,
    json,
    index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// Users Table (Authentication)
// ============================================
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    role: varchar('role', { length: 50 }).default('user').notNull(), // 'admin', 'user', 'viewer'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
}));

// ============================================
// Restaurants Table
// ============================================
export const restaurants = pgTable('restaurants', {
    id: serial('id').primaryKey(),
    ownerId: integer('owner_id').references(() => users.id).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    cuisine: varchar('cuisine', { length: 100 }),
    address: text('address'),
    phone: varchar('phone', { length: 50 }),
    settings: json('settings').$type<{
        currency?: string;
        timezone?: string;
        logo?: string;
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    ownerIdx: index('restaurants_owner_idx').on(table.ownerId),
}));

// ============================================
// Menu Sections Table
// ============================================
export const menuSections = pgTable('menu_sections', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    externalId: integer('external_id'), // Original ID from CSV
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    index: integer('index').default(0),
    type: varchar('type', { length: 50 }).default('Normal'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    restaurantIdx: index('menu_sections_restaurant_idx').on(table.restaurantId),
}));

// ============================================
// Menu Items Table
// ============================================
export const menuItems = pgTable('menu_items', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    sectionId: integer('section_id').references(() => menuSections.id),
    externalId: integer('external_id'), // Original ID from CSV
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    cost: decimal('cost', { precision: 10, scale: 2 }), // Food cost
    type: varchar('type', { length: 50 }).default('Normal'),
    status: varchar('status', { length: 50 }).default('Active'), // 'Active', 'Inactive', 'Archived'
    imageUrl: text('image_url'),
    rating: decimal('rating', { precision: 3, scale: 1 }),
    votes: integer('votes').default(0),
    soldCount: integer('sold_count').default(0), // Sales count from CSV/orders
    index: integer('index').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    restaurantIdx: index('menu_items_restaurant_idx').on(table.restaurantId),
    sectionIdx: index('menu_items_section_idx').on(table.sectionId),
}));

// ============================================
// Order Items Table (for analytics)
// ============================================
export const orderItems = pgTable('order_items', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    menuItemId: integer('menu_item_id').references(() => menuItems.id),
    externalId: integer('external_id'), // Original order_id from CSV
    externalItemId: integer('external_item_id'), // Original item_id from CSV
    title: varchar('title', { length: 255 }),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    cost: decimal('cost', { precision: 10, scale: 2 }),
    quantity: integer('quantity').default(1).notNull(),
    discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
    status: varchar('status', { length: 50 }).default('Completed'),
    orderedAt: timestamp('ordered_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    restaurantIdx: index('order_items_restaurant_idx').on(table.restaurantId),
    menuItemIdx: index('order_items_menu_item_idx').on(table.menuItemId),
    orderedAtIdx: index('order_items_ordered_at_idx').on(table.orderedAt),
}));

// ============================================
// Analytics Table (Calculated BCG metrics)
// ============================================
export const analytics = pgTable('analytics', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    menuItemId: integer('menu_item_id').references(() => menuItems.id).notNull(),
    periodStart: timestamp('period_start').notNull(),
    periodEnd: timestamp('period_end').notNull(),
    // Revenue metrics
    totalRevenue: decimal('total_revenue', { precision: 12, scale: 2 }).default('0'),
    totalQuantitySold: integer('total_quantity_sold').default(0),
    averageOrderValue: decimal('average_order_value', { precision: 10, scale: 2 }),
    // Cost & Margin metrics
    totalCost: decimal('total_cost', { precision: 12, scale: 2 }),
    grossMargin: decimal('gross_margin', { precision: 5, scale: 2 }), // Percentage
    contributionMargin: decimal('contribution_margin', { precision: 12, scale: 2 }),
    // Menu engineering metrics
    popularityIndex: decimal('popularity_index', { precision: 5, scale: 2 }),
    profitabilityIndex: decimal('profitability_index', { precision: 5, scale: 2 }),
    // BCG Matrix classification
    bcgQuadrant: varchar('bcg_quadrant', { length: 20 }), // 'star', 'cash_cow', 'question_mark', 'dog'
    menuEngineeringClass: varchar('menu_engineering_class', { length: 20 }), // 'star', 'plow_horse', 'puzzle', 'dog'
    // Growth metrics
    revenueGrowthRate: decimal('revenue_growth_rate', { precision: 5, scale: 2 }),
    quantityGrowthRate: decimal('quantity_growth_rate', { precision: 5, scale: 2 }),
    calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
}, (table) => ({
    restaurantIdx: index('analytics_restaurant_idx').on(table.restaurantId),
    menuItemIdx: index('analytics_menu_item_idx').on(table.menuItemId),
    periodIdx: index('analytics_period_idx').on(table.periodStart, table.periodEnd),
}));

// ============================================
// Layouts Table (Menu Editor Layouts)
// ============================================
export const layouts = pgTable('layouts', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    strategy: varchar('strategy', { length: 50 }), // 'star_focused', 'cash_cow_optimizer', etc.
    version: integer('version').default(1),
    status: varchar('status', { length: 20 }).default('draft'), // 'draft', 'published', 'archived'
    source: varchar('source', { length: 50 }).default('manual'), // 'manual', 'agent'
    publishedAt: timestamp('published_at'),
    appliedByUserId: integer('applied_by_user_id').references(() => users.id),
    config: json('config').$type<{
        sections: Array<{
            id: string;
            name: string;
            items: Array<{
                menuItemId: number;
                position: { x: number; y: number };
                size: { width: number; height: number };
                style?: Record<string, unknown>;
            }>;
        }>;
        canvasSize: { width: number; height: number };
        backgroundColor?: string;
    }>(),
    aiGenerated: boolean('ai_generated').default(false),
    isDefault: boolean('is_default').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    restaurantIdx: index('layouts_restaurant_idx').on(table.restaurantId),
}));

// ============================================
// Section Approvals (per-layout, per-section)
// ============================================
export const sectionApprovals = pgTable('section_approvals', {
    id: serial('id').primaryKey(),
    layoutId: integer('layout_id').references(() => layouts.id).notNull(),
    sectionId: integer('section_id').references(() => menuSections.id).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'approved', 'rejected'
    notes: text('notes'),
    approvedAt: timestamp('approved_at'),
    approvedByUserId: integer('approved_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    layoutIdx: index('section_approvals_layout_idx').on(table.layoutId),
    sectionIdx: index('section_approvals_section_idx').on(table.sectionId),
    statusIdx: index('section_approvals_status_idx').on(table.status),
}));

// ============================================
// Feedback (voice/text)
// ============================================
export const feedback = pgTable('feedback', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    layoutId: integer('layout_id').references(() => layouts.id),
    sectionId: integer('section_id').references(() => menuSections.id),
    source: varchar('source', { length: 20 }).default('voice'), // 'voice', 'text'
    transcript: text('transcript'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    restaurantIdx: index('feedback_restaurant_idx').on(table.restaurantId),
    layoutIdx: index('feedback_layout_idx').on(table.layoutId),
}));

// ============================================
// Offers (dynamic promotions)
// ============================================
export const offers = pgTable('offers', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    layoutId: integer('layout_id').references(() => layouts.id),
    sectionId: integer('section_id').references(() => menuSections.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).default('promo'),
    discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }),
    discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }),
    status: varchar('status', { length: 20 }).default('draft'), // 'draft', 'active', 'paused', 'archived'
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    restaurantIdx: index('offers_restaurant_idx').on(table.restaurantId),
    layoutIdx: index('offers_layout_idx').on(table.layoutId),
    sectionIdx: index('offers_section_idx').on(table.sectionId),
}));

// ============================================
// Offer Arms (multi-armed bandit)
// ============================================
export const offerArms = pgTable('offer_arms', {
    id: serial('id').primaryKey(),
    offerId: integer('offer_id').references(() => offers.id).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    weight: decimal('weight', { precision: 5, scale: 2 }).default('0'),
    impressions: integer('impressions').default(0),
    conversions: integer('conversions').default(0),
    revenue: decimal('revenue', { precision: 12, scale: 2 }).default('0'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    offerIdx: index('offer_arms_offer_idx').on(table.offerId),
}));

// ============================================
// Offer Events (tracking)
// ============================================
export const offerEvents = pgTable('offer_events', {
    id: serial('id').primaryKey(),
    offerId: integer('offer_id').references(() => offers.id).notNull(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(), // 'impression', 'click', 'redeem'
    eventData: json('event_data'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    offerIdx: index('offer_events_offer_idx').on(table.offerId),
    typeIdx: index('offer_events_type_idx').on(table.eventType),
}));

// ============================================
// App Events Table (User behavior tracking)
// ============================================
export const appEvents = pgTable('app_events', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    userId: integer('user_id'), // External customer user ID
    sessionId: varchar('session_id', { length: 100 }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    eventData: json('event_data'),
    tableNumber: varchar('table_number', { length: 20 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    restaurantIdx: index('app_events_restaurant_idx').on(table.restaurantId),
    eventTypeIdx: index('app_events_type_idx').on(table.eventType),
    sessionIdx: index('app_events_session_idx').on(table.sessionId),
}));

// ============================================
// Customer Orders Table
// ============================================
export const customerOrders = pgTable('customer_orders', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    sessionId: varchar('session_id', { length: 100 }).notNull(),
    tableNumber: varchar('table_number', { length: 20 }),
    status: varchar('status', { length: 50 }).default('pending').notNull(), // 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'
    subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
    discount: decimal('discount', { precision: 10, scale: 2 }).default('0'),
    tax: decimal('tax', { precision: 10, scale: 2 }).default('0'),
    total: decimal('total', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 50 }),
    paymentStatus: varchar('payment_status', { length: 50 }).default('pending'), // 'pending', 'paid', 'failed', 'refunded'
    notes: text('notes'),
    metadata: json('metadata'),
    orderedAt: timestamp('ordered_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
}, (table) => ({
    restaurantIdx: index('customer_orders_restaurant_idx').on(table.restaurantId),
    sessionIdx: index('customer_orders_session_idx').on(table.sessionId),
    statusIdx: index('customer_orders_status_idx').on(table.status),
}));

// ============================================
// Customer Order Items Table
// ============================================
export const customerOrderItems = pgTable('customer_order_items', {
    id: serial('id').primaryKey(),
    orderId: integer('order_id').references(() => customerOrders.id).notNull(),
    menuItemId: integer('menu_item_id').references(() => menuItems.id),
    name: varchar('name', { length: 255 }).notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    quantity: integer('quantity').default(1).notNull(),
    modifiers: json('modifiers'), // Array of modifications
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    orderIdx: index('customer_order_items_order_idx').on(table.orderId),
    menuItemIdx: index('customer_order_items_menu_item_idx').on(table.menuItemId),
}));

// ============================================
// Menu Popups/Promotions Table
// ============================================
export const menuPopups = pgTable('menu_popups', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    layoutId: integer('layout_id').references(() => layouts.id),
    type: varchar('type', { length: 50 }).default('promo').notNull(), // 'welcome', 'promo', 'featured', 'custom'
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    menuItemId: integer('menu_item_id').references(() => menuItems.id),
    discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }),
    discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }),
    cta: varchar('cta', { length: 100 }),
    backgroundColor: varchar('background_color', { length: 20 }),
    status: varchar('status', { length: 20 }).default('active'), // 'active', 'inactive', 'scheduled'
    triggerCondition: varchar('trigger_condition', { length: 50 }).default('on_load'), // 'on_load', 'after_delay', 'on_scroll', 'on_exit'
    triggerDelay: integer('trigger_delay').default(0), // Seconds
    showOnce: boolean('show_once').default(true),
    priority: integer('priority').default(0),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    restaurantIdx: index('menu_popups_restaurant_idx').on(table.restaurantId),
    statusIdx: index('menu_popups_status_idx').on(table.status),
}));

// ============================================
// Restaurant Context Table (AI Context Storage)
// ============================================
export const restaurantContext = pgTable('restaurant_context', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull().unique(),
    context: json('context').$type<{
        menuItems: unknown[];
        categories: string[];
        salesData?: unknown;
        menuEngineering?: unknown;
        colorPalette?: unknown;
        extractedImages?: unknown[];
    }>(),
    lastAnalyzedAt: timestamp('last_analyzed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    restaurantIdx: index('restaurant_context_restaurant_idx').on(table.restaurantId),
}));

// ============================================
// Restaurant Documents Table (Uploaded files)
// ============================================
export const restaurantDocuments = pgTable('restaurant_documents', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'menu_pdf', 'menu_image', 'logo', 'sales_data', 'other'
    mimeType: varchar('mime_type', { length: 100 }),
    fileSize: integer('file_size'), // bytes
    storageUrl: text('storage_url'), // URL or base64 data
    thumbnailUrl: text('thumbnail_url'),
    extractedData: json('extracted_data').$type<{
        menuItems?: unknown[];
        colors?: unknown;
        text?: string;
        pageCount?: number;
    }>(),
    status: varchar('status', { length: 20 }).default('processed'), // 'uploading', 'processing', 'processed', 'error'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    restaurantIdx: index('restaurant_documents_restaurant_idx').on(table.restaurantId),
    typeIdx: index('restaurant_documents_type_idx').on(table.type),
}));

// ============================================
// Relations
// ============================================
export const usersRelations = relations(users, ({ many }) => ({
    restaurants: many(restaurants),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
    owner: one(users, {
        fields: [restaurants.ownerId],
        references: [users.id],
    }),
    menuSections: many(menuSections),
    menuItems: many(menuItems),
    orderItems: many(orderItems),
    analytics: many(analytics),
    layouts: many(layouts),
    appEvents: many(appEvents),
    feedback: many(feedback),
    offers: many(offers),
    offerEvents: many(offerEvents),
}));

export const menuSectionsRelations = relations(menuSections, ({ one, many }) => ({
    restaurant: one(restaurants, {
        fields: [menuSections.restaurantId],
        references: [restaurants.id],
    }),
    menuItems: many(menuItems),
    approvals: many(sectionApprovals),
    offers: many(offers),
    feedback: many(feedback),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
    restaurant: one(restaurants, {
        fields: [menuItems.restaurantId],
        references: [restaurants.id],
    }),
    section: one(menuSections, {
        fields: [menuItems.sectionId],
        references: [menuSections.id],
    }),
    orderItems: many(orderItems),
    analytics: many(analytics),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    restaurant: one(restaurants, {
        fields: [orderItems.restaurantId],
        references: [restaurants.id],
    }),
    menuItem: one(menuItems, {
        fields: [orderItems.menuItemId],
        references: [menuItems.id],
    }),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
    restaurant: one(restaurants, {
        fields: [analytics.restaurantId],
        references: [restaurants.id],
    }),
    menuItem: one(menuItems, {
        fields: [analytics.menuItemId],
        references: [menuItems.id],
    }),
}));

export const layoutsRelations = relations(layouts, ({ one }) => ({
    restaurant: one(restaurants, {
        fields: [layouts.restaurantId],
        references: [restaurants.id],
    }),
    appliedByUser: one(users, {
        fields: [layouts.appliedByUserId],
        references: [users.id],
    }),
}));

export const sectionApprovalsRelations = relations(sectionApprovals, ({ one }) => ({
    layout: one(layouts, {
        fields: [sectionApprovals.layoutId],
        references: [layouts.id],
    }),
    section: one(menuSections, {
        fields: [sectionApprovals.sectionId],
        references: [menuSections.id],
    }),
    approvedByUser: one(users, {
        fields: [sectionApprovals.approvedByUserId],
        references: [users.id],
    }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
    restaurant: one(restaurants, {
        fields: [feedback.restaurantId],
        references: [restaurants.id],
    }),
    layout: one(layouts, {
        fields: [feedback.layoutId],
        references: [layouts.id],
    }),
    section: one(menuSections, {
        fields: [feedback.sectionId],
        references: [menuSections.id],
    }),
}));

export const offersRelations = relations(offers, ({ one, many }) => ({
    restaurant: one(restaurants, {
        fields: [offers.restaurantId],
        references: [restaurants.id],
    }),
    layout: one(layouts, {
        fields: [offers.layoutId],
        references: [layouts.id],
    }),
    section: one(menuSections, {
        fields: [offers.sectionId],
        references: [menuSections.id],
    }),
    arms: many(offerArms),
    events: many(offerEvents),
}));

export const offerArmsRelations = relations(offerArms, ({ one }) => ({
    offer: one(offers, {
        fields: [offerArms.offerId],
        references: [offers.id],
    }),
}));

export const offerEventsRelations = relations(offerEvents, ({ one }) => ({
    offer: one(offers, {
        fields: [offerEvents.offerId],
        references: [offers.id],
    }),
    restaurant: one(restaurants, {
        fields: [offerEvents.restaurantId],
        references: [restaurants.id],
    }),
}));

export const customerOrdersRelations = relations(customerOrders, ({ one, many }) => ({
    restaurant: one(restaurants, {
        fields: [customerOrders.restaurantId],
        references: [restaurants.id],
    }),
    items: many(customerOrderItems),
}));

export const customerOrderItemsRelations = relations(customerOrderItems, ({ one }) => ({
    order: one(customerOrders, {
        fields: [customerOrderItems.orderId],
        references: [customerOrders.id],
    }),
    menuItem: one(menuItems, {
        fields: [customerOrderItems.menuItemId],
        references: [menuItems.id],
    }),
}));

export const menuPopupsRelations = relations(menuPopups, ({ one }) => ({
    restaurant: one(restaurants, {
        fields: [menuPopups.restaurantId],
        references: [restaurants.id],
    }),
    layout: one(layouts, {
        fields: [menuPopups.layoutId],
        references: [layouts.id],
    }),
    menuItem: one(menuItems, {
        fields: [menuPopups.menuItemId],
        references: [menuItems.id],
    }),
}));

export const restaurantContextRelations = relations(restaurantContext, ({ one }) => ({
    restaurant: one(restaurants, {
        fields: [restaurantContext.restaurantId],
        references: [restaurants.id],
    }),
}));

// ============================================
// Type Exports
// ============================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;

export type MenuSection = typeof menuSections.$inferSelect;
export type NewMenuSection = typeof menuSections.$inferInsert;

export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type Analytics = typeof analytics.$inferSelect;
export type NewAnalytics = typeof analytics.$inferInsert;

export type Layout = typeof layouts.$inferSelect;
export type NewLayout = typeof layouts.$inferInsert;

export type AppEvent = typeof appEvents.$inferSelect;
export type NewAppEvent = typeof appEvents.$inferInsert;

export type SectionApproval = typeof sectionApprovals.$inferSelect;
export type NewSectionApproval = typeof sectionApprovals.$inferInsert;

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;

export type OfferArm = typeof offerArms.$inferSelect;
export type NewOfferArm = typeof offerArms.$inferInsert;

export type OfferEvent = typeof offerEvents.$inferSelect;
export type NewOfferEvent = typeof offerEvents.$inferInsert;

export type CustomerOrder = typeof customerOrders.$inferSelect;
export type NewCustomerOrder = typeof customerOrders.$inferInsert;

export type CustomerOrderItem = typeof customerOrderItems.$inferSelect;
export type NewCustomerOrderItem = typeof customerOrderItems.$inferInsert;

export type MenuPopup = typeof menuPopups.$inferSelect;
export type NewMenuPopup = typeof menuPopups.$inferInsert;

export type RestaurantContext = typeof restaurantContext.$inferSelect;
export type NewRestaurantContext = typeof restaurantContext.$inferInsert;
