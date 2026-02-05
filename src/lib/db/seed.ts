/**
 * Database seed script
 * Creates a demo user, restaurant, and optionally imports Menu Engineering data
 * 
 * Usage: npm run db:seed
 */

import { config } from 'dotenv';
// Load .env.local before anything else
config({ path: '.env.local' });

import { db } from './index';
import { users, restaurants, menuSections, menuItems } from './schema';
import { hashPassword } from '../services/auth.service';

async function seed() {
    console.log('🌱 Starting database seed...\n');

    try {
        // Create demo user
        console.log('Creating demo user...');
        const passwordHash = await hashPassword('demo1234');

        const [demoUser] = await db.insert(users).values({
            email: 'demo@tweny.ai',
            passwordHash,
            name: 'Demo User',
            role: 'user',
        }).onConflictDoNothing().returning();

        if (demoUser) {
            console.log(`✅ Created user: ${demoUser.email} (ID: ${demoUser.id})`);
        } else {
            console.log('ℹ️  Demo user already exists');
            const existingUser = await db.query.users.findFirst({
                where: (users, { eq }) => eq(users.email, 'demo@tweny.ai'),
            });
            if (!existingUser) {
                throw new Error('Could not find or create demo user');
            }
        }

        // Get the user ID
        const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, 'demo@tweny.ai'),
        });

        if (!user) {
            throw new Error('Demo user not found');
        }

        // Create demo restaurant
        console.log('\nCreating demo restaurant...');
        const [demoRestaurant] = await db.insert(restaurants).values({
            ownerId: user.id,
            name: 'Demo Restaurant',
            description: 'A demo restaurant for testing tweny AI',
            cuisine: 'International',
            address: '123 Demo Street, Copenhagen',
            phone: '+45 12 34 56 78',
            settings: {
                currency: 'DKK',
                timezone: 'Europe/Copenhagen',
            },
        }).onConflictDoNothing().returning();

        if (demoRestaurant) {
            console.log(`✅ Created restaurant: ${demoRestaurant.name} (ID: ${demoRestaurant.id})`);
        } else {
            console.log('ℹ️  Demo restaurant might already exist');
        }

        // Get the restaurant ID
        const restaurant = await db.query.restaurants.findFirst({
            where: (restaurants, { eq }) => eq(restaurants.ownerId, user.id),
        });

        if (!restaurant) {
            throw new Error('Demo restaurant not found');
        }

        // Create some sample menu sections
        console.log('\nCreating sample menu sections...');
        const sectionData = [
            { title: 'Appetizers', index: 0 },
            { title: 'Main Courses', index: 1 },
            { title: 'Desserts', index: 2 },
            { title: 'Beverages', index: 3 },
        ];

        for (const section of sectionData) {
            await db.insert(menuSections).values({
                restaurantId: restaurant.id,
                ...section,
            }).onConflictDoNothing();
        }
        console.log(`✅ Created ${sectionData.length} menu sections`);

        // Create some sample menu items
        console.log('\nCreating sample menu items...');
        const sections = await db.query.menuSections.findMany({
            where: (menuSections, { eq }) => eq(menuSections.restaurantId, restaurant.id),
        });

        const sampleItems = [
            // Appetizers
            { name: 'Bruschetta', price: '89.00', cost: '25.00', sectionTitle: 'Appetizers' },
            { name: 'Caesar Salad', price: '109.00', cost: '35.00', sectionTitle: 'Appetizers' },
            { name: 'Soup of the Day', price: '79.00', cost: '20.00', sectionTitle: 'Appetizers' },
            // Main Courses
            { name: 'Grilled Salmon', price: '249.00', cost: '95.00', sectionTitle: 'Main Courses' },
            { name: 'Beef Tenderloin', price: '299.00', cost: '120.00', sectionTitle: 'Main Courses' },
            { name: 'Mushroom Risotto', price: '189.00', cost: '55.00', sectionTitle: 'Main Courses' },
            { name: 'Chicken Parmesan', price: '199.00', cost: '70.00', sectionTitle: 'Main Courses' },
            // Desserts
            { name: 'Tiramisu', price: '89.00', cost: '25.00', sectionTitle: 'Desserts' },
            { name: 'Chocolate Cake', price: '79.00', cost: '22.00', sectionTitle: 'Desserts' },
            // Beverages
            { name: 'House Wine (Glass)', price: '69.00', cost: '20.00', sectionTitle: 'Beverages' },
            { name: 'Craft Beer', price: '59.00', cost: '18.00', sectionTitle: 'Beverages' },
            { name: 'Fresh Juice', price: '49.00', cost: '12.00', sectionTitle: 'Beverages' },
        ];

        let itemCount = 0;
        for (const item of sampleItems) {
            const section = sections.find(s => s.title === item.sectionTitle);
            if (section) {
                await db.insert(menuItems).values({
                    restaurantId: restaurant.id,
                    sectionId: section.id,
                    name: item.name,
                    price: item.price,
                    cost: item.cost,
                    status: 'Active',
                    index: itemCount++,
                }).onConflictDoNothing();
            }
        }
        console.log(`✅ Created ${sampleItems.length} menu items`);

        console.log('\n🎉 Database seed completed successfully!');
        console.log('\n📝 Demo credentials:');
        console.log('   Email: demo@tweny.ai');
        console.log('   Password: demo1234');

    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }

    process.exit(0);
}

seed();
