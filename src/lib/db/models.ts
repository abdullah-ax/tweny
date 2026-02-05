import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// User Model
// ============================================
export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    passwordHash: string;
    name?: string;
    role: 'admin' | 'user' | 'viewer';
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, unique: true, lowercase: true },
        passwordHash: { type: String, required: true },
        name: { type: String },
        role: { type: String, enum: ['admin', 'user', 'viewer'], default: 'user' },
    },
    { timestamps: true }
);

// ============================================
// Restaurant Model
// ============================================
export interface IRestaurant extends Document {
    _id: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    cuisine?: string;
    address?: string;
    phone?: string;
    settings?: {
        currency?: string;
        timezone?: string;
        logo?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const RestaurantSchema = new Schema<IRestaurant>(
    {
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        description: { type: String },
        cuisine: { type: String },
        address: { type: String },
        phone: { type: String },
        settings: {
            currency: { type: String, default: 'USD' },
            timezone: { type: String },
            logo: { type: String },
        },
    },
    { timestamps: true }
);

// ============================================
// Menu Section Model
// ============================================
export interface IMenuSection extends Document {
    _id: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    externalId?: number;
    title: string;
    description?: string;
    index: number;
    type: string;
    createdAt: Date;
    updatedAt: Date;
}

const MenuSectionSchema = new Schema<IMenuSection>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
        externalId: { type: Number },
        title: { type: String, required: true },
        description: { type: String },
        index: { type: Number, default: 0 },
        type: { type: String, default: 'Normal' },
    },
    { timestamps: true }
);

// ============================================
// Menu Item Model
// ============================================
export interface IMenuItem extends Document {
    _id: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    sectionId?: mongoose.Types.ObjectId;
    externalId?: number;
    name: string;
    description?: string;
    price: number;
    cost?: number;
    type: string;
    status: 'Active' | 'Inactive' | 'Archived';
    imageUrl?: string;
    rating?: number;
    votes: number;
    index: number;
    createdAt: Date;
    updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
        sectionId: { type: Schema.Types.ObjectId, ref: 'MenuSection' },
        externalId: { type: Number },
        name: { type: String, required: true },
        description: { type: String },
        price: { type: Number, required: true },
        cost: { type: Number },
        type: { type: String, default: 'Normal' },
        status: { type: String, enum: ['Active', 'Inactive', 'Archived'], default: 'Active' },
        imageUrl: { type: String },
        rating: { type: Number },
        votes: { type: Number, default: 0 },
        index: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// ============================================
// Order Item Model
// ============================================
export interface IOrderItem extends Document {
    _id: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    menuItemId?: mongoose.Types.ObjectId;
    externalId?: number;
    externalItemId?: number;
    title?: string;
    price: number;
    cost?: number;
    quantity: number;
    discountAmount: number;
    status: string;
    orderedAt: Date;
    createdAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
        menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
        externalId: { type: Number },
        externalItemId: { type: Number },
        title: { type: String },
        price: { type: Number, required: true },
        cost: { type: Number },
        quantity: { type: Number, default: 1 },
        discountAmount: { type: Number, default: 0 },
        status: { type: String, default: 'Completed' },
        orderedAt: { type: Date, required: true },
    },
    { timestamps: true }
);

// ============================================
// Analytics Model
// ============================================
export interface IAnalytics extends Document {
    _id: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    menuItemId: mongoose.Types.ObjectId;
    periodStart: Date;
    periodEnd: Date;
    totalRevenue: number;
    totalQuantitySold: number;
    averageOrderValue?: number;
    totalCost?: number;
    grossMargin?: number;
    contributionMargin?: number;
    popularityIndex?: number;
    profitabilityIndex?: number;
    bcgQuadrant?: 'star' | 'cash_cow' | 'question_mark' | 'dog';
    menuEngineeringClass?: 'star' | 'plow_horse' | 'puzzle' | 'dog';
    revenueGrowthRate?: number;
    quantityGrowthRate?: number;
    calculatedAt: Date;
}

const AnalyticsSchema = new Schema<IAnalytics>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
        menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        periodStart: { type: Date, required: true },
        periodEnd: { type: Date, required: true },
        totalRevenue: { type: Number, default: 0 },
        totalQuantitySold: { type: Number, default: 0 },
        averageOrderValue: { type: Number },
        totalCost: { type: Number },
        grossMargin: { type: Number },
        contributionMargin: { type: Number },
        popularityIndex: { type: Number },
        profitabilityIndex: { type: Number },
        bcgQuadrant: { type: String, enum: ['star', 'cash_cow', 'question_mark', 'dog'] },
        menuEngineeringClass: { type: String, enum: ['star', 'plow_horse', 'puzzle', 'dog'] },
        revenueGrowthRate: { type: Number },
        quantityGrowthRate: { type: Number },
        calculatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// ============================================
// Layout Model
// ============================================
export interface ILayout extends Document {
    _id: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    strategy?: string;
    config?: {
        sections: Array<{
            id: string;
            name: string;
            items: Array<{
                menuItemId: string;
                position: { x: number; y: number };
                size: { width: number; height: number };
                style?: Record<string, unknown>;
            }>;
        }>;
        canvasSize: { width: number; height: number };
        backgroundColor?: string;
    };
    aiGenerated: boolean;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const LayoutSchema = new Schema<ILayout>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
        name: { type: String, required: true },
        description: { type: String },
        strategy: { type: String },
        config: { type: Schema.Types.Mixed },
        aiGenerated: { type: Boolean, default: false },
        isDefault: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// ============================================
// App Event Model
// ============================================
export interface IAppEvent extends Document {
    _id: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    userId?: number;
    eventType: string;
    eventData?: Record<string, unknown>;
    createdAt: Date;
}

const AppEventSchema = new Schema<IAppEvent>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
        userId: { type: Number },
        eventType: { type: String, required: true },
        eventData: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

// ============================================
// Export Models
// ============================================
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const Restaurant: Model<IRestaurant> = mongoose.models.Restaurant || mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);
export const MenuSection: Model<IMenuSection> = mongoose.models.MenuSection || mongoose.model<IMenuSection>('MenuSection', MenuSectionSchema);
export const MenuItem: Model<IMenuItem> = mongoose.models.MenuItem || mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
export const OrderItem: Model<IOrderItem> = mongoose.models.OrderItem || mongoose.model<IOrderItem>('OrderItem', OrderItemSchema);
export const Analytics: Model<IAnalytics> = mongoose.models.Analytics || mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);
export const Layout: Model<ILayout> = mongoose.models.Layout || mongoose.model<ILayout>('Layout', LayoutSchema);
export const AppEvent: Model<IAppEvent> = mongoose.models.AppEvent || mongoose.model<IAppEvent>('AppEvent', AppEventSchema);
