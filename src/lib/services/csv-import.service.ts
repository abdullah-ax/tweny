/**
 * CSV Import Service
 * Parses CSV sales data files and integrates with menu context
 */

import { SalesDataContext, ContextMenuItem } from './context.service';

export interface ParsedSalesRow {
    orderId?: number;
    itemId?: number;
    itemName?: string;
    price?: number;
    cost?: number;
    quantity?: number;
    revenue?: number;
    discountAmount?: number;
    orderedAt?: Date;
    status?: string;
}

export interface CSVParseResult {
    success: boolean;
    rows: ParsedSalesRow[];
    headers: string[];
    errors: string[];
    summary: {
        totalRows: number;
        validRows: number;
        dateRange?: { start: Date; end: Date };
    };
}

/**
 * CSV Import Service
 */
export class CSVImportService {
    // Column name mappings to handle various CSV formats
    private static readonly COLUMN_MAPPINGS: Record<string, string[]> = {
        orderId: ['order_id', 'orderid', 'order', 'id', 'order_number'],
        itemId: ['item_id', 'itemid', 'product_id', 'productid', 'menu_item_id'],
        itemName: ['item_name', 'itemname', 'name', 'title', 'product_name', 'menu_item', 'item'],
        price: ['price', 'unit_price', 'item_price', 'sell_price'],
        cost: ['cost', 'food_cost', 'item_cost', 'unit_cost', 'cogs'],
        quantity: ['quantity', 'qty', 'amount', 'count'],
        revenue: ['revenue', 'total', 'total_price', 'subtotal', 'sales'],
        discountAmount: ['discount', 'discount_amount', 'discount_value'],
        orderedAt: ['ordered_at', 'date', 'order_date', 'timestamp', 'created_at', 'time'],
        status: ['status', 'order_status', 'state'],
    };

    /**
     * Parse a CSV file
     */
    static async parseCSV(file: File): Promise<CSVParseResult> {
        const text = await file.text();
        return this.parseCSVText(text);
    }

    /**
     * Parse CSV text content
     */
    static parseCSVText(text: string): CSVParseResult {
        const lines = text.trim().split(/\r?\n/);
        const errors: string[] = [];

        if (lines.length < 2) {
            return {
                success: false,
                rows: [],
                headers: [],
                errors: ['CSV file is empty or has no data rows'],
                summary: { totalRows: 0, validRows: 0 },
            };
        }

        // Parse headers
        const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

        // Map headers to our fields
        const columnMap = this.mapColumns(headers);

        // Parse data rows
        const rows: ParsedSalesRow[] = [];
        let minDate: Date | undefined;
        let maxDate: Date | undefined;

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            try {
                const values = this.parseCSVLine(lines[i]);
                const row = this.mapRowToFields(values, columnMap, headers);

                // Track date range
                if (row.orderedAt) {
                    if (!minDate || row.orderedAt < minDate) minDate = row.orderedAt;
                    if (!maxDate || row.orderedAt > maxDate) maxDate = row.orderedAt;
                }

                rows.push(row);
            } catch (err) {
                errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Parse error'}`);
            }
        }

        return {
            success: rows.length > 0,
            rows,
            headers,
            errors,
            summary: {
                totalRows: lines.length - 1,
                validRows: rows.length,
                dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : undefined,
            },
        };
    }

    /**
     * Parse a single CSV line (handles quoted values)
     */
    private static parseCSVLine(line: string): string[] {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        values.push(current.trim());
        return values;
    }

    /**
     * Map CSV headers to our field names
     */
    private static mapColumns(headers: string[]): Record<string, number> {
        const columnMap: Record<string, number> = {};

        for (const [field, aliases] of Object.entries(this.COLUMN_MAPPINGS)) {
            const index = headers.findIndex(h =>
                aliases.some(alias => h.includes(alias))
            );
            if (index !== -1) {
                columnMap[field] = index;
            }
        }

        return columnMap;
    }

    /**
     * Map a CSV row to our field structure
     */
    private static mapRowToFields(
        values: string[],
        columnMap: Record<string, number>,
        headers: string[]
    ): ParsedSalesRow {
        const row: ParsedSalesRow = {};

        const getVal = (field: string) => {
            const idx = columnMap[field];
            return idx !== undefined ? values[idx] : undefined;
        };

        const parseNum = (val: string | undefined) => {
            if (!val) return undefined;
            const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
            return isNaN(num) ? undefined : num;
        };

        const parseDate = (val: string | undefined) => {
            if (!val) return undefined;

            // Try parsing as Unix timestamp
            const timestamp = parseInt(val);
            if (!isNaN(timestamp) && timestamp > 1000000000) {
                return new Date(timestamp * 1000);
            }

            // Try standard date parsing
            const date = new Date(val);
            return isNaN(date.getTime()) ? undefined : date;
        };

        row.orderId = parseNum(getVal('orderId'));
        row.itemId = parseNum(getVal('itemId'));
        row.itemName = getVal('itemName');
        row.price = parseNum(getVal('price'));
        row.cost = parseNum(getVal('cost'));
        row.quantity = parseNum(getVal('quantity')) || 1;
        row.revenue = parseNum(getVal('revenue'));
        row.discountAmount = parseNum(getVal('discountAmount'));
        row.orderedAt = parseDate(getVal('orderedAt'));
        row.status = getVal('status');

        // Calculate revenue if not present
        if (!row.revenue && row.price && row.quantity) {
            row.revenue = row.price * row.quantity;
        }

        return row;
    }

    /**
     * Aggregate sales data into context-ready format
     */
    static aggregateSalesData(rows: ParsedSalesRow[]): SalesDataContext {
        // Group by item
        const itemStats = new Map<string, {
            name: string;
            totalQuantity: number;
            totalRevenue: number;
            totalCost: number;
        }>();

        let totalRevenue = 0;
        let totalOrders = new Set<number>();
        let minDate: Date | undefined;
        let maxDate: Date | undefined;

        // Track hourly distribution
        const hourCounts: number[] = new Array(24).fill(0);

        rows.forEach(row => {
            // Track orders
            if (row.orderId) totalOrders.add(row.orderId);

            // Track revenue
            const revenue = row.revenue || (row.price || 0) * (row.quantity || 1);
            totalRevenue += revenue;

            // Track item stats
            const itemKey = row.itemName || `item_${row.itemId}`;
            const existing = itemStats.get(itemKey) || {
                name: itemKey,
                totalQuantity: 0,
                totalRevenue: 0,
                totalCost: 0,
            };

            existing.totalQuantity += row.quantity || 1;
            existing.totalRevenue += revenue;
            existing.totalCost += (row.cost || 0) * (row.quantity || 1);
            itemStats.set(itemKey, existing);

            // Track dates
            if (row.orderedAt) {
                if (!minDate || row.orderedAt < minDate) minDate = row.orderedAt;
                if (!maxDate || row.orderedAt > maxDate) maxDate = row.orderedAt;

                // Track peak hours
                const hour = row.orderedAt.getHours();
                hourCounts[hour]++;
            }
        });

        // Sort items by quantity
        const sortedItems = Array.from(itemStats.values())
            .sort((a, b) => b.totalQuantity - a.totalQuantity);

        const topSellers = sortedItems.slice(0, 10).map(i => ({
            itemId: i.name,
            name: i.name,
            quantity: i.totalQuantity,
        }));

        const lowPerformers = sortedItems.slice(-5).reverse().map(i => ({
            itemId: i.name,
            name: i.name,
            quantity: i.totalQuantity,
        }));

        // Find peak hours (top 3 hours by order count)
        const peakHours = hourCounts
            .map((count, hour) => ({ hour, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(h => h.hour);

        // Category breakdown (approximate from item names)
        const categoryBreakdown = this.estimateCategoryBreakdown(sortedItems, totalRevenue);

        return {
            periodStart: minDate?.toISOString() || new Date().toISOString(),
            periodEnd: maxDate?.toISOString() || new Date().toISOString(),
            totalRevenue,
            totalOrders: totalOrders.size,
            averageOrderValue: totalOrders.size > 0 ? totalRevenue / totalOrders.size : 0,
            topSellers,
            lowPerformers,
            peakHours,
            categoryBreakdown,
        };
    }

    /**
     * Estimate category breakdown from item names
     */
    private static estimateCategoryBreakdown(
        items: Array<{ name: string; totalRevenue: number }>,
        totalRevenue: number
    ): Array<{ category: string; revenue: number; percentage: number }> {
        const categoryKeywords: Record<string, string[]> = {
            'Appetizers': ['appetizer', 'starter', 'soup', 'salad', 'wings', 'nachos'],
            'Main Courses': ['chicken', 'beef', 'fish', 'steak', 'salmon', 'pasta', 'burger', 'pizza'],
            'Desserts': ['dessert', 'cake', 'ice cream', 'brownie', 'pie', 'cheesecake'],
            'Beverages': ['drink', 'soda', 'juice', 'coffee', 'tea', 'water', 'beer', 'wine'],
            'Sides': ['fries', 'side', 'rice', 'bread', 'vegetables'],
        };

        const categoryRevenue = new Map<string, number>();

        items.forEach(item => {
            const name = item.name.toLowerCase();
            let matched = false;

            for (const [category, keywords] of Object.entries(categoryKeywords)) {
                if (keywords.some(kw => name.includes(kw))) {
                    categoryRevenue.set(category, (categoryRevenue.get(category) || 0) + item.totalRevenue);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                categoryRevenue.set('Other', (categoryRevenue.get('Other') || 0) + item.totalRevenue);
            }
        });

        return Array.from(categoryRevenue.entries())
            .map(([category, revenue]) => ({
                category,
                revenue,
                percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
            }))
            .sort((a, b) => b.revenue - a.revenue);
    }

    /**
     * Enrich menu items with sales data
     */
    static enrichMenuItems(
        menuItems: ContextMenuItem[],
        salesData: ParsedSalesRow[]
    ): ContextMenuItem[] {
        // Build item stats map
        const itemStats = new Map<string, {
            totalQuantity: number;
            totalRevenue: number;
            totalCost: number;
        }>();

        salesData.forEach(row => {
            const key = row.itemName?.toLowerCase() || '';
            if (!key) return;

            const existing = itemStats.get(key) || {
                totalQuantity: 0,
                totalRevenue: 0,
                totalCost: 0,
            };

            existing.totalQuantity += row.quantity || 1;
            existing.totalRevenue += row.revenue || (row.price || 0) * (row.quantity || 1);
            existing.totalCost += (row.cost || 0) * (row.quantity || 1);
            itemStats.set(key, existing);
        });

        // Enrich menu items
        return menuItems.map(item => {
            const key = item.name.toLowerCase();
            const stats = itemStats.get(key);

            if (stats) {
                const margin = stats.totalRevenue > 0
                    ? ((stats.totalRevenue - stats.totalCost) / stats.totalRevenue) * 100
                    : undefined;

                return {
                    ...item,
                    salesVolume: stats.totalQuantity,
                    revenue: stats.totalRevenue,
                    margin,
                };
            }

            return item;
        });
    }
}
