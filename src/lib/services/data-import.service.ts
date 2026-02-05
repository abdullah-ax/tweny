import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { db } from '../db';
import {
    menuSections,
    menuItems,
    orderItems,
    appEvents,
    type NewMenuSection,
    type NewMenuItem,
    type NewOrderItem,
    type NewAppEvent
} from '../db/schema';
import { eq } from 'drizzle-orm';

export interface ImportResult {
    success: boolean;
    imported: number;
    errors: string[];
    duration: number;
}

/**
 * Parse a CSV file and return typed rows
 */
export async function parseCSV<T>(filePath: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const file = fs.readFileSync(filePath, 'utf8');
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                resolve(results.data as T[]);
            },
            error: (error: Error) => {
                reject(error);
            },
        });
    });
}

/**
 * Import menu sections from CSV
 */
export async function importMenuSections(
    restaurantId: number,
    csvPath: string
): Promise<ImportResult> {
    const start = Date.now();
    const errors: string[] = [];
    let imported = 0;

    try {
        interface SectionRow {
            id: number;
            title: string;
            description?: string;
            index?: number;
            type?: string;
        }

        const rows = await parseCSV<SectionRow>(csvPath);
        console.log(`Parsing ${rows.length} sections from ${csvPath}`);

        for (const row of rows) {
            try {
                await db.insert(menuSections).values({
                    restaurantId,
                    externalId: row.id,
                    title: row.title || 'Unnamed Section',
                    description: row.description || null,
                    index: row.index || 0,
                    type: row.type || 'Normal',
                });
                imported++;
            } catch (err: any) {
                errors.push(`Row ${row.id}: ${err.message}`);
            }
        }

        return {
            success: true,
            imported,
            errors,
            duration: Date.now() - start,
        };
    } catch (err: any) {
        return {
            success: false,
            imported,
            errors: [err.message],
            duration: Date.now() - start,
        };
    }
}

/**
 * Import menu items from CSV
 */
export async function importMenuItems(
    restaurantId: number,
    csvPath: string,
    sectionMapping?: Map<number, number> // externalId -> sectionId mapping
): Promise<ImportResult> {
    const start = Date.now();
    const errors: string[] = [];
    let imported = 0;

    try {
        interface MenuItemRow {
            id: number;
            section_id?: number;
            title: string;
            price: number;
            type?: string;
            status?: string;
            rating?: number;
            votes?: number;
            purchases?: number;
            index?: number;
        }

        const rows = await parseCSV<MenuItemRow>(csvPath);
        console.log(`Parsing ${rows.length} menu items from ${csvPath}`);

        // Build section mapping if not provided
        if (!sectionMapping) {
            sectionMapping = new Map();
            const sections = await db.query.menuSections.findMany({
                where: eq(menuSections.restaurantId, restaurantId),
            });
            for (const section of sections) {
                if (section.externalId) {
                    sectionMapping.set(section.externalId, section.id);
                }
            }
        }

        // Batch insert for performance
        const batchSize = 100;
        const batches: NewMenuItem[][] = [];
        let currentBatch: NewMenuItem[] = [];

        for (const row of rows) {
            const sectionId = row.section_id ? sectionMapping.get(row.section_id) : null;

            currentBatch.push({
                restaurantId,
                sectionId: sectionId || null,
                externalId: row.id,
                name: row.title || 'Unnamed Item',
                price: String(row.price || 0),
                type: row.type || 'Normal',
                status: row.status || 'Active',
                rating: row.rating ? String(row.rating) : null,
                votes: row.votes || 0,
                index: row.index || 0,
            });

            if (currentBatch.length >= batchSize) {
                batches.push(currentBatch);
                currentBatch = [];
            }
        }
        if (currentBatch.length > 0) {
            batches.push(currentBatch);
        }

        for (const batch of batches) {
            try {
                await db.insert(menuItems).values(batch);
                imported += batch.length;
            } catch (err: any) {
                errors.push(`Batch insert error: ${err.message}`);
            }
        }

        return {
            success: true,
            imported,
            errors,
            duration: Date.now() - start,
        };
    } catch (err: any) {
        return {
            success: false,
            imported,
            errors: [err.message],
            duration: Date.now() - start,
        };
    }
}

/**
 * Import order items from CSV
 */
export async function importOrderItems(
    restaurantId: number,
    csvPath: string,
    menuItemMapping?: Map<number, number> // externalItemId -> menuItemId
): Promise<ImportResult> {
    const start = Date.now();
    const errors: string[] = [];
    let imported = 0;

    try {
        interface OrderItemRow {
            id: number;
            order_id?: number;
            item_id?: number;
            title?: string;
            price: number;
            cost?: number;
            quantity?: number;
            discount_amount?: number;
            status?: string;
            created: number; // Unix timestamp
        }

        const rows = await parseCSV<OrderItemRow>(csvPath);
        console.log(`Parsing ${rows.length} order items from ${csvPath}`);

        // Build menu item mapping if not provided
        if (!menuItemMapping) {
            menuItemMapping = new Map();
            const items = await db.query.menuItems.findMany({
                where: eq(menuItems.restaurantId, restaurantId),
            });
            for (const item of items) {
                if (item.externalId) {
                    menuItemMapping.set(item.externalId, item.id);
                }
            }
        }

        // Batch insert for performance
        const batchSize = 500;
        const batches: NewOrderItem[][] = [];
        let currentBatch: NewOrderItem[] = [];

        for (const row of rows) {
            const menuItemId = row.item_id ? menuItemMapping.get(row.item_id) : null;

            currentBatch.push({
                restaurantId,
                menuItemId: menuItemId || null,
                externalId: row.order_id || row.id,
                externalItemId: row.item_id || null,
                title: row.title || null,
                price: String(row.price || 0),
                cost: row.cost ? String(row.cost) : null,
                quantity: row.quantity || 1,
                discountAmount: row.discount_amount ? String(row.discount_amount) : '0',
                status: row.status || 'Completed',
                orderedAt: row.created ? new Date(row.created * 1000) : new Date(),
            });

            if (currentBatch.length >= batchSize) {
                batches.push(currentBatch);
                currentBatch = [];
            }
        }
        if (currentBatch.length > 0) {
            batches.push(currentBatch);
        }

        for (const batch of batches) {
            try {
                await db.insert(orderItems).values(batch);
                imported += batch.length;
            } catch (err: any) {
                errors.push(`Batch insert error: ${err.message}`);
            }
        }

        return {
            success: true,
            imported,
            errors,
            duration: Date.now() - start,
        };
    } catch (err: any) {
        return {
            success: false,
            imported,
            errors: [err.message],
            duration: Date.now() - start,
        };
    }
}

/**
 * Import app events from CSV
 */
export async function importAppEvents(
    restaurantId: number,
    csvPath: string
): Promise<ImportResult> {
    const start = Date.now();
    const errors: string[] = [];
    let imported = 0;

    try {
        interface EventRow {
            id: number;
            user_id?: number;
            event?: string;
            type?: string;
            created: number;
            data?: string;
        }

        const rows = await parseCSV<EventRow>(csvPath);
        console.log(`Parsing ${rows.length} events from ${csvPath}`);

        // Batch insert
        const batchSize = 1000;
        const batches: NewAppEvent[][] = [];
        let currentBatch: NewAppEvent[] = [];

        for (const row of rows) {
            let eventData = null;
            if (row.data) {
                try {
                    eventData = JSON.parse(row.data);
                } catch {
                    eventData = { raw: row.data };
                }
            }

            currentBatch.push({
                restaurantId,
                userId: row.user_id || null,
                eventType: row.event || row.type || 'unknown',
                eventData,
                createdAt: row.created ? new Date(row.created * 1000) : new Date(),
            });

            if (currentBatch.length >= batchSize) {
                batches.push(currentBatch);
                currentBatch = [];
            }
        }
        if (currentBatch.length > 0) {
            batches.push(currentBatch);
        }

        for (const batch of batches) {
            try {
                await db.insert(appEvents).values(batch);
                imported += batch.length;
            } catch (err: any) {
                errors.push(`Batch insert error: ${err.message}`);
            }
        }

        return {
            success: true,
            imported,
            errors,
            duration: Date.now() - start,
        };
    } catch (err: any) {
        return {
            success: false,
            imported,
            errors: [err.message],
            duration: Date.now() - start,
        };
    }
}

/**
 * Full data import from the Menu Engineering dataset
 */
export async function importMenuEngineeringData(
    restaurantId: number,
    dataDir: string
): Promise<{
    sections: ImportResult;
    menuItems: ImportResult;
    orderItems: ImportResult;
    appEvents: ImportResult;
    total: { imported: number; errors: number; duration: number };
}> {
    const results = {
        sections: { success: false, imported: 0, errors: [] as string[], duration: 0 },
        menuItems: { success: false, imported: 0, errors: [] as string[], duration: 0 },
        orderItems: { success: false, imported: 0, errors: [] as string[], duration: 0 },
        appEvents: { success: false, imported: 0, errors: [] as string[], duration: 0 },
        total: { imported: 0, errors: 0, duration: 0 },
    };

    const startTotal = Date.now();

    // Import sections
    const sectionsPath = path.join(dataDir, 'Menu Engineering Part 2', 'dim_sections.csv');
    if (fs.existsSync(sectionsPath)) {
        results.sections = await importMenuSections(restaurantId, sectionsPath);
        console.log(`Sections: ${results.sections.imported} imported`);
    }

    // Import menu items
    const menuItemsPath = path.join(dataDir, 'Menu Engineering Part 2', 'dim_menu_items.csv');
    if (fs.existsSync(menuItemsPath)) {
        results.menuItems = await importMenuItems(restaurantId, menuItemsPath);
        console.log(`Menu items: ${results.menuItems.imported} imported`);
    }

    // Import order items
    const orderItemsPath = path.join(dataDir, 'Menu Engineering Part 1', 'fct_order_items.csv');
    if (fs.existsSync(orderItemsPath)) {
        results.orderItems = await importOrderItems(restaurantId, orderItemsPath);
        console.log(`Order items: ${results.orderItems.imported} imported`);
    }

    // Import app events
    const eventsPath = path.join(dataDir, 'Menu Engineering Part 2', 'fct_app_event.csv');
    if (fs.existsSync(eventsPath)) {
        results.appEvents = await importAppEvents(restaurantId, eventsPath);
        console.log(`App events: ${results.appEvents.imported} imported`);
    }

    results.total.duration = Date.now() - startTotal;
    results.total.imported =
        results.sections.imported +
        results.menuItems.imported +
        results.orderItems.imported +
        results.appEvents.imported;
    results.total.errors =
        results.sections.errors.length +
        results.menuItems.errors.length +
        results.orderItems.errors.length +
        results.appEvents.errors.length;

    return results;
}
