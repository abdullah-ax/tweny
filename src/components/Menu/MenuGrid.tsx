'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { MenuSection } from './MenuSection';
import { MenuDetailModal } from './MenuDetailModal';
import { variants, springs } from '@/lib/design-system';
import { cn } from '@/lib/utils/helpers';
// import { applyBehavioralEconomics } from '@/lib/behavioral-economics';
import { MenuItemData, MenuSectionData } from '@/lib/types/menu.types';

interface MenuGridProps {
    sections: MenuSectionData[];
    variant?: 'a' | 'b';
    onAddToCart?: (item: MenuItemData, quantity: number) => void;
    showCurrency?: boolean;
    className?: string;
}

export function MenuGrid({
    sections,
    variant = 'a',
    onAddToCart,
    showCurrency = false,
    className,
}: MenuGridProps) {
    const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);
    const [activeCategory, setActiveCategory] = useState<number | null>(null);

    // Use sections directly (no behavioral economics transformation)
    const optimizedSections = useMemo(() => {
        return sections;
    }, [sections]);

    const handleItemClick = (item: MenuItemData) => {
        setSelectedItem(item);
    };

    const handleCloseModal = () => {
        setSelectedItem(null);
    };

    const handleAddToCart = (item: MenuItemData, quantity: number) => {
        onAddToCart?.(item, quantity);
    };

    return (
        <>
            {/* Category Quick Nav */}
            <motion.nav
                className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-neutral-100 -mx-4 px-4 py-3 mb-6"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={springs.smooth}
            >
                <motion.div
                    className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
                    variants={variants.staggerContainer}
                    initial="hidden"
                    animate="visible"
                >
                    {optimizedSections.map((section: MenuSectionData, index: number) => (
                        <motion.button
                            key={section.id}
                            variants={variants.fadeUp}
                            onClick={() => {
                                setActiveCategory(section.id);
                                document.getElementById(`section-${section.id}`)?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start',
                                });
                            }}
                            className={cn(
                                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                                activeCategory === section.id
                                    ? 'bg-neutral-900 text-white'
                                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {section.title}
                        </motion.button>
                    ))}
                </motion.div>
            </motion.nav>

            {/* Menu Content */}
            <motion.div
                className={cn('space-y-8', className)}
                variants={variants.staggerContainer}
                initial="hidden"
                animate="visible"
            >
                <AnimatePresence>
                    {optimizedSections.map((section: MenuSectionData, index: number) => (
                        <div key={section.id} id={`section-${section.id}`}>
                            <MenuSection
                                id={section.id}
                                title={section.title}
                                description={section.description}
                                items={section.items}
                                onItemClick={handleItemClick}
                                onAddToCart={(item) => handleAddToCart(item, 1)}
                                variant={variant}
                                index={index}
                                showCurrency={showCurrency}
                            />
                        </div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Detail Modal */}
            <MenuDetailModal
                item={selectedItem}
                isOpen={!!selectedItem}
                onClose={handleCloseModal}
                onAddToCart={handleAddToCart}
                showCurrency={showCurrency}
            />
        </>
    );
}

export default MenuGrid;
