'use client';

import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useState, useCallback, useEffect } from 'react';
import { MenuHeader } from './MenuHeader';
import { MenuGrid } from './MenuGrid';
import { MenuCart } from './MenuCart';
import { springs, variants, colors } from '@/lib/design-system';
import { cn } from '@/lib/utils/helpers';
import { trackEvent, initializeTracking } from '@/lib/analytics';
import { MenuItemData, MenuSectionData, CartItem, TrackingConfig } from '@/lib/types/menu.types';

interface Restaurant {
    id: number;
    name: string;
    description?: string | null;
    cuisine?: string | null;
    logo?: string | null;
}

interface MenuShellProps {
    restaurant: Restaurant;
    sections: MenuSectionData[];
    variant?: 'a' | 'b';
    showCurrency?: boolean;
    trackingConfig?: TrackingConfig;
    className?: string;
}

export function MenuShell({
    restaurant,
    sections,
    variant = 'a',
    showCurrency = false,
    trackingConfig,
    className,
}: MenuShellProps) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize analytics tracking
    useEffect(() => {
        if (trackingConfig) {
            initializeTracking(trackingConfig);

            // Track page view
            trackEvent({
                type: 'menu_view',
                restaurantId: restaurant.id,
                variant,
                metadata: {
                    sectionsCount: sections.length,
                    itemsCount: sections.reduce((sum, s) => sum + s.items.length, 0),
                },
            });
        }

        setIsLoaded(true);
    }, [restaurant.id, variant, sections, trackingConfig]);

    const handleAddToCart = useCallback((item: MenuItemData, quantity: number = 1) => {
        setCart(prev => {
            const existing = prev.find(c => c.item.id === item.id);

            if (existing) {
                return prev.map(c =>
                    c.item.id === item.id
                        ? { ...c, quantity: c.quantity + quantity }
                        : c
                );
            }

            return [...prev, { item, quantity }];
        });

        // Track add to cart event
        trackEvent({
            type: 'add_to_cart',
            restaurantId: restaurant.id,
            itemId: item.id,
            variant,
            metadata: {
                itemName: item.name,
                price: item.price,
                quantity,
                isHighMargin: item.isHighMargin,
                position: item.position,
            },
        });
    }, [restaurant.id, variant]);

    const handleUpdateQuantity = useCallback((itemId: number, quantity: number) => {
        if (quantity <= 0) {
            setCart(prev => prev.filter(c => c.item.id !== itemId));
            trackEvent({
                type: 'remove_from_cart',
                restaurantId: restaurant.id,
                itemId,
                variant,
            });
        } else {
            setCart(prev =>
                prev.map(c =>
                    c.item.id === itemId ? { ...c, quantity } : c
                )
            );
        }
    }, [restaurant.id, variant]);

    const handleRemoveItem = useCallback((itemId: number) => {
        setCart(prev => prev.filter(c => c.item.id !== itemId));
        trackEvent({
            type: 'remove_from_cart',
            restaurantId: restaurant.id,
            itemId,
            variant,
        });
    }, [restaurant.id, variant]);

    const handleCheckout = useCallback(() => {
        const total = cart.reduce((sum, item) => sum + item.item.price * item.quantity, 0);

        trackEvent({
            type: 'checkout_initiated',
            restaurantId: restaurant.id,
            variant,
            metadata: {
                itemCount: cart.length,
                totalQuantity: cart.reduce((sum, item) => sum + item.quantity, 0),
                totalValue: total,
                items: cart.map(c => ({
                    id: c.item.id,
                    name: c.item.name,
                    quantity: c.quantity,
                    price: c.item.price,
                })),
            },
        });

        // Implement checkout flow here
        console.log('Checkout:', cart);
    }, [cart, restaurant.id, variant]);

    return (
        <LayoutGroup>
            <motion.div
                className={cn(
                    'min-h-screen bg-neutral-50',
                    className
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoaded ? 1 : 0 }}
                transition={{ duration: 0.3 }}
            >
                {/* Background Gradient */}
                <div
                    className="fixed inset-0 pointer-events-none opacity-50"
                    style={{
                        background: `radial-gradient(circle at 0% 0%, ${colors.primary[100]} 0%, transparent 50%),
                        radial-gradient(circle at 100% 100%, ${colors.champagne} 0%, transparent 40%)`,
                    }}
                />

                {/* Content */}
                <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 pb-24">
                    {/* Restaurant Header */}
                    <MenuHeader
                        restaurant={{
                            id: restaurant.id,
                            name: restaurant.name,
                            description: restaurant.description,
                            cuisine: restaurant.cuisine,
                            logo: restaurant.logo,
                        }}
                        variant={variant}
                    />

                    {/* Menu Grid */}
                    <MenuGrid
                        sections={sections}
                        variant={variant}
                        onAddToCart={handleAddToCart}
                        showCurrency={showCurrency}
                    />
                </div>

                {/* Shopping Cart */}
                <MenuCart
                    items={cart}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onCheckout={handleCheckout}
                    showCurrency={showCurrency}
                />

                {/* A/B Test Indicator (dev only) */}
                {process.env.NODE_ENV === 'development' && (
                    <motion.div
                        className="fixed top-4 left-4 z-50 px-3 py-1.5 rounded-full text-xs font-mono bg-black text-white opacity-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                    >
                        Variant {variant.toUpperCase()}
                    </motion.div>
                )}
            </motion.div>
        </LayoutGroup>
    );
}

export default MenuShell;
