'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem } from './MenuItem';
import { variants, springs, typography, colors } from '@/lib/design-system';
import { cn } from '@/lib/utils/helpers';
import { MenuItemData } from '@/lib/types/menu.types';

interface MenuSectionProps {
    id: number;
    title: string;
    description?: string | null;
    items: MenuItemData[];
    onItemClick?: (item: MenuItemData) => void;
    onAddToCart?: (item: MenuItemData) => void;
    variant?: 'a' | 'b';
    index?: number;
    showCurrency?: boolean;
}

export function MenuSection({
    id,
    title,
    description,
    items,
    onItemClick,
    onAddToCart,
    variant = 'a',
    index = 0,
    showCurrency = false,
}: MenuSectionProps) {
    // Apply Golden Triangle logic - position high margin items strategically
    const sortedItems = [...items].sort((a, b) => {
        // Anchors always first
        if (a.isAnchor && !b.isAnchor) return -1;
        if (!a.isAnchor && b.isAnchor) return 1;
        // High margin items get priority positions
        if (a.isHighMargin && !b.isHighMargin) return -1;
        if (!a.isHighMargin && b.isHighMargin) return 1;
        return 0;
    });

    return (
        <motion.section
            variants={variants.fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            custom={index}
            className="mb-8"
        >
            {/* Section Header */}
            <motion.header
                className="mb-6"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={springs.smooth}
            >
                <div className="flex items-center gap-3">
                    <motion.div
                        className="w-1 h-8 rounded-full"
                        style={{ backgroundColor: colors.primary[500] }}
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, ...springs.bouncy }}
                    />
                    <h2
                        className="text-2xl font-semibold text-neutral-800"
                        style={{ fontFamily: typography.fonts.display }}
                    >
                        {title}
                    </h2>
                </div>
                {description && (
                    <motion.p
                        className="mt-2 ml-4 text-neutral-500 text-sm max-w-lg"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                    >
                        {description}
                    </motion.p>
                )}
            </motion.header>

            {/* Items Grid/List */}
            <motion.div
                variants={variants.staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={cn(
                    variant === 'a'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                        : 'flex flex-col gap-3'
                )}
            >
                <AnimatePresence mode="popLayout">
                    {sortedItems.map((item, itemIndex) => (
                        <MenuItem
                            key={item.id}
                            item={item}
                            onClick={onItemClick}
                            onAddToCart={onAddToCart}
                            variant={variant}
                            index={itemIndex}
                            showCurrency={showCurrency}
                            layoutId={`section-${id}-item-${item.id}`}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Section Divider */}
            <motion.div
                className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-neutral-200 to-transparent"
                initial={{ scaleX: 0, opacity: 0 }}
                whileInView={{ scaleX: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.8 }}
            />
        </motion.section>
    );
}

export default MenuSection;
