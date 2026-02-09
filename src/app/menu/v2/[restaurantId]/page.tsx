'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { MenuShell } from '@/components/Menu';
import { getAssignedVariant, getSessionId } from '@/lib/analytics';
import { RefreshCw } from 'lucide-react';
import { springs } from '@/lib/design-system';
import { MenuSectionData, TrackingConfig } from '@/lib/types/menu.types';

interface Restaurant {
    id: number;
    name: string;
    description: string | null;
    cuisine: string | null;
    settings?: {
        logo?: string;
        currency?: string;
    };
}

interface MenuItem {
    id: number;
    name: string;
    description: string | null;
    price: string;
    imageUrl: string | null;
    rating: string | null;
    votes: number | null;
    soldCount: number | null;
    cost: string | null;
}

interface MenuSection {
    id: number;
    title: string;
    description: string | null;
    items: MenuItem[];
}

interface MenuData {
    restaurant: Restaurant;
    sections: MenuSection[];
}

export default function ModernMenuPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const restaurantId = params.restaurantId as string;

    const [menuData, setMenuData] = useState<MenuData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [variant, setVariant] = useState<'a' | 'b'>('a');
    const [sessionId, setSessionId] = useState<string>('');

    useEffect(() => {
        // Get variant from URL param (preview) or cookies
        const urlVariant = searchParams.get('variant') as 'a' | 'b' | null;
        const assignedVariant = urlVariant || getAssignedVariant(parseInt(restaurantId));
        setVariant(assignedVariant);

        // Get session ID
        setSessionId(getSessionId());
    }, [restaurantId, searchParams]);

    useEffect(() => {
        async function fetchMenu() {
            try {
                const response = await fetch(`/api/public/menu?restaurantId=${restaurantId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch menu');
                }
                const data = await response.json();
                setMenuData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load menu');
            } finally {
                setLoading(false);
            }
        }

        if (restaurantId) {
            fetchMenu();
        }
    }, [restaurantId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <RefreshCw className="w-8 h-8 animate-spin text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-500">Loading menu...</p>
                </motion.div>
            </div>
        );
    }

    if (error || !menuData) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center p-8"
                >
                    <h1 className="text-2xl font-bold text-neutral-900 mb-2">Menu Not Found</h1>
                    <p className="text-neutral-500">{error || 'Unable to load the menu'}</p>
                </motion.div>
            </div>
        );
    }

    // Transform data for the MenuShell component
    const transformedSections: MenuSectionData[] = menuData.sections.map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        items: section.items.map(item => {
            const price = parseFloat(item.price);
            const cost = item.cost ? parseFloat(item.cost) : null;
            const margin = cost ? (price - cost) / price : null;

            // Mark high-margin items (margin > 60%)
            const isHighMargin = margin !== null && margin > 0.6;

            return {
                id: item.id,
                name: item.name,
                description: item.description,
                price,
                imageUrl: item.imageUrl,
                rating: item.rating ? parseFloat(item.rating) : null,
                votes: item.votes,
                isHighMargin,
                isAnchor: false, // Will be set by behavioral economics
            };
        }),
    }));

    // Build tracking config
    const trackingConfig: TrackingConfig = {
        restaurantId: parseInt(restaurantId),
        variant,
        sessionId,
        enableRealtime: true,
        batchSize: 5,
        flushInterval: 10000, // 10 seconds
    };

    return (
        <MenuShell
            restaurant={{
                id: menuData.restaurant.id,
                name: menuData.restaurant.name,
                description: menuData.restaurant.description,
                cuisine: menuData.restaurant.cuisine,
                logo: menuData.restaurant.settings?.logo,
            }}
            sections={transformedSections}
            variant={variant}
            showCurrency={false} // Price neutralization
            trackingConfig={trackingConfig}
        />
    );
}
