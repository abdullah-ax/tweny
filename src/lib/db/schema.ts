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
// App Events Table (User behavior tracking)
// ============================================
export const appEvents = pgTable('app_events', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
    userId: integer('user_id'), // External customer user ID
    eventType: varchar('event_type', { length: 100 }).notNull(),
    eventData: json('event_data'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    restaurantIdx: index('app_events_restaurant_idx').on(table.restaurantId),
    eventTypeIdx: index('app_events_type_idx').on(table.eventType),
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
}));

export const menuSectionsRelations = relations(menuSections, ({ one, many }) => ({
    restaurant: one(restaurants, {
        fields: [menuSections.restaurantId],
        references: [restaurants.id],
    }),
    menuItems: many(menuItems),
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
