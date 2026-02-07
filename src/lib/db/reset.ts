/**
 * Database reset script
 * Clears all data and re-seeds with demo data
 * 
 * Usage: npx tsx src/lib/db/reset.ts
 */

import { config } from 'dotenv';
// Load .env.local before anything else
config({ path: '.env.local' });

import { db } from './index';
import { sql } from 'drizzle-orm';

async function reset() {
    console.log('🗑️  Starting database reset...\n');

    try {
        // Delete all data in reverse dependency order using raw SQL for safety
        console.log('Truncating tables...');
        
        await db.execute(sql`TRUNCATE TABLE analytics_events CASCADE`).catch(() => console.log('  - analytics_events: skipped'));
        await db.execute(sql`TRUNCATE TABLE section_approvals CASCADE`).catch(() => console.log('  - section_approvals: skipped'));
        await db.execute(sql`TRUNCATE TABLE analytics CASCADE`).catch(() => console.log('  - analytics: skipped'));
        await db.execute(sql`TRUNCATE TABLE order_items CASCADE`).catch(() => console.log('  - order_items: skipped'));
        await db.execute(sql`TRUNCATE TABLE offers CASCADE`).catch(() => console.log('  - offers: skipped'));
        await db.execute(sql`TRUNCATE TABLE layouts CASCADE`).catch(() => console.log('  - layouts: skipped'));
        await db.execute(sql`TRUNCATE TABLE restaurant_context CASCADE`).catch(() => console.log('  - restaurant_context: skipped'));
        await db.execute(sql`TRUNCATE TABLE menu_items CASCADE`).catch(() => console.log('  - menu_items: skipped'));
        await db.execute(sql`TRUNCATE TABLE menu_sections CASCADE`).catch(() => console.log('  - menu_sections: skipped'));
        await db.execute(sql`TRUNCATE TABLE restaurants CASCADE`).catch(() => console.log('  - restaurants: skipped'));
        await db.execute(sql`TRUNCATE TABLE users CASCADE`).catch(() => console.log('  - users: skipped'));

        console.log('\n✅ Database reset complete!');
        console.log('\n🌱 Run `npm run db:seed` to create demo data');

    } catch (error) {
        console.error('❌ Reset error:', error);
        process.exit(1);
    }

    process.exit(0);
}

reset();
