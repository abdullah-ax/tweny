import { db } from '../db';
import { restaurants, menuSections, menuItems, type Restaurant, type NewRestaurant, type MenuSection, type MenuItem } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface RestaurantWithDetails extends Restaurant {
    sections?: MenuSection[];
    items?: MenuItem[];
}

/**
 * Create a new restaurant
 */
export async function createRestaurant(data: NewRestaurant): Promise<Restaurant> {
    const [restaurant] = await db.insert(restaurants).values(data).returning();
    return restaurant;
}

/**
 * Get restaurant by ID
 */
export async function getRestaurantById(id: number): Promise<RestaurantWithDetails | null> {
    const restaurant = await db.query.restaurants.findFirst({
        where: eq(restaurants.id, id),
        with: {
            menuSections: true,
            menuItems: true,
        },
    });
    return restaurant || null;
}

/**
 * Get restaurants by owner ID
 */
export async function getRestaurantsByOwner(ownerId: number): Promise<Restaurant[]> {
    return db.query.restaurants.findMany({
        where: eq(restaurants.ownerId, ownerId),
        orderBy: (restaurants, { desc }) => [desc(restaurants.createdAt)],
    });
}

/**
 * Update restaurant
 */
export async function updateRestaurant(
    id: number,
    data: Partial<Omit<Restaurant, 'id' | 'createdAt'>>
): Promise<Restaurant | null> {
    const [updated] = await db
        .update(restaurants)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(restaurants.id, id))
        .returning();
    return updated || null;
}

/**
 * Delete restaurant
 */
export async function deleteRestaurant(id: number): Promise<boolean> {
    const result = await db.delete(restaurants).where(eq(restaurants.id, id));
    return true;
}

/**
 * Create menu section
 */
export async function createMenuSection(
    restaurantId: number,
    title: string,
    options?: { description?: string; index?: number; externalId?: number }
): Promise<MenuSection> {
    const [section] = await db.insert(menuSections).values({
        restaurantId,
        title,
        description: options?.description,
        index: options?.index ?? 0,
        externalId: options?.externalId,
    }).returning();
    return section;
}

/**
 * Get menu sections for a restaurant
 */
export async function getMenuSections(restaurantId: number): Promise<MenuSection[]> {
    return db.query.menuSections.findMany({
        where: eq(menuSections.restaurantId, restaurantId),
        orderBy: (menuSections, { asc }) => [asc(menuSections.index)],
    });
}

/**
 * Create menu item
 */
export async function createMenuItem(data: {
    restaurantId: number;
    sectionId?: number;
    name: string;
    price: string;
    description?: string;
    cost?: string;
    type?: string;
    status?: string;
    imageUrl?: string;
    rating?: string;
    votes?: number;
    index?: number;
    externalId?: number;
}): Promise<MenuItem> {
    const [item] = await db.insert(menuItems).values({
        restaurantId: data.restaurantId,
        sectionId: data.sectionId,
        name: data.name,
        price: data.price,
        description: data.description,
        cost: data.cost,
        type: data.type ?? 'Normal',
        status: data.status ?? 'Active',
        imageUrl: data.imageUrl,
        rating: data.rating,
        votes: data.votes ?? 0,
        index: data.index ?? 0,
        externalId: data.externalId,
    }).returning();
    return item;
}

/**
 * Get menu items for a restaurant
 */
export async function getMenuItems(
    restaurantId: number,
    options?: { sectionId?: number; status?: string }
): Promise<MenuItem[]> {
    const items = await db.query.menuItems.findMany({
        where: eq(menuItems.restaurantId, restaurantId),
        orderBy: (menuItems, { asc }) => [asc(menuItems.index)],
    });

    let filtered = items;
    if (options?.sectionId) {
        filtered = filtered.filter(item => item.sectionId === options.sectionId);
    }
    if (options?.status) {
        filtered = filtered.filter(item => item.status === options.status);
    }

    return filtered;
}

/**
 * Update menu item
 */
export async function updateMenuItem(
    id: number,
    data: Partial<Omit<MenuItem, 'id' | 'createdAt'>>
): Promise<MenuItem | null> {
    const [updated] = await db
        .update(menuItems)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(menuItems.id, id))
        .returning();
    return updated || null;
}

/**
 * Delete menu item
 */
export async function deleteMenuItem(id: number): Promise<boolean> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
    return true;
}

/**
 * Get restaurant statistics
 */
export async function getRestaurantStats(restaurantId: number) {
    const items = await db.query.menuItems.findMany({
        where: eq(menuItems.restaurantId, restaurantId),
    });

    const sections = await db.query.menuSections.findMany({
        where: eq(menuSections.restaurantId, restaurantId),
    });

    const activeItems = items.filter(i => i.status === 'Active');
    const avgPrice = activeItems.length > 0
        ? activeItems.reduce((sum, i) => sum + parseFloat(i.price), 0) / activeItems.length
        : 0;

    return {
        totalItems: items.length,
        activeItems: activeItems.length,
        totalSections: sections.length,
        averagePrice: avgPrice.toFixed(2),
    };
}
