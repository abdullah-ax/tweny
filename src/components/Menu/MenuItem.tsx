'use client';

import { motion, MotionStyle } from 'framer-motion';
import { springs, variants, colors, shadows, radii } from '@/lib/design-system';
import { cn } from '@/lib/utils/helpers';
import { MenuItemData } from '@/lib/types/menu.types';

// Re-export for convenience
export type { MenuItemData };

interface MenuItemProps {
    item: MenuItemData;
    onClick?: (item: MenuItemData) => void;
    onAddToCart?: (item: MenuItemData) => void;
    variant?: 'a' | 'b';
    layoutId?: string;
    index?: number;
    showCurrency?: boolean;
}

// Price formatting without currency symbol (behavioral economics)
const formatPrice = (price: number, showCurrency: boolean = false): string => {
    const formatted = price.toFixed(2);
    return showCurrency ? `$${formatted}` : formatted;
};

export function MenuItem({
    item,
    onClick,
    onAddToCart,
    variant = 'a',
    layoutId,
    index = 0,
    showCurrency = false,
}: MenuItemProps) {
    const isHighMargin = item.isHighMargin || item.position === 'top-right' || item.position === 'center';
    const isAnchor = item.isAnchor;

    // Variant A: Elegant card with image
    if (variant === 'a') {
        return (
            <motion.article
                layoutId={layoutId || `item-${item.id}`}
                variants={variants.fadeUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                whileHover="hover"
                whileTap="tap"
                custom={index}
                onClick={() => onClick?.(item)}
                className={cn(
                    'group relative overflow-hidden rounded-2xl bg-white cursor-pointer',
                    'border border-neutral-100 transition-colors',
                    isHighMargin && 'ring-2 ring-amber-400/50',
                    isAnchor && 'opacity-90'
                )}
                style={{
                    boxShadow: shadows.md,
                    minHeight: '160px',
                }}
            >
                {/* Featured Badge */}
                {isHighMargin && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={springs.bouncy}
                        className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                            background: `linear-gradient(135deg, ${colors.gold}, ${colors.champagne})`,
                            color: colors.neutral[900],
                        }}
                    >
                        Chef's Pick
                    </motion.div>
                )}

                {/* Image Section */}
                {item.imageUrl && (
                    <motion.div
                        className="relative h-36 overflow-hidden"
                    >
                        <motion.img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            whileHover={{ scale: 1.05 }}
                            transition={springs.smooth}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </motion.div>
                )}

                {/* Content */}
                <div className="p-4">
                    <motion.h3
                        className="font-semibold text-neutral-900 text-lg leading-tight mb-1"
                        layoutId={`title-${item.id}`}
                    >
                        {item.name}
                    </motion.h3>

                    {item.description && (
                        <motion.p
                            className="text-sm text-neutral-500 line-clamp-2 mb-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            {item.description}
                        </motion.p>
                    )}

                    <div className="flex items-center justify-between mt-auto">
                        <motion.span
                            variants={variants.priceReveal}
                            className="text-xl font-bold text-neutral-900 tracking-tight"
                        >
                            {formatPrice(item.price, showCurrency)}
                        </motion.span>

                        {/* Add to Cart Button */}
                        <motion.button
                            variants={variants.buttonPress}
                            initial="rest"
                            whileHover="hover"
                            whileTap="tap"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart?.(item);
                            }}
                            className={cn(
                                'px-4 py-2 rounded-xl text-sm font-medium',
                                'bg-neutral-900 text-white',
                                'hover:bg-neutral-800 transition-colors'
                            )}
                        >
                            Add
                        </motion.button>
                    </div>

                    {/* Rating */}
                    {item.rating && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-1 mt-2 text-sm text-neutral-500"
                        >
                            <span className="text-amber-500">★</span>
                            <span>{item.rating.toFixed(1)}</span>
                            {item.votes && <span>({item.votes})</span>}
                        </motion.div>
                    )}
                </div>

                {/* Hover Overlay */}
                <motion.div
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"
                />
            </motion.article>
        );
    }

    // Variant B: Minimal horizontal card
    return (
        <motion.article
            layoutId={layoutId || `item-${item.id}`}
            variants={variants.slideRight}
            initial="hidden"
            animate="visible"
            exit="exit"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            custom={index}
            onClick={() => onClick?.(item)}
            className={cn(
                'group relative flex items-center gap-4 p-4 rounded-xl bg-white cursor-pointer',
                'border border-neutral-100 hover:border-neutral-200 transition-all',
                isHighMargin && 'bg-amber-50/50 border-amber-200'
            )}
            style={{ boxShadow: shadows.sm }}
        >
            {/* Small Image */}
            {item.imageUrl && (
                <motion.div
                    className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                    transition={springs.snappy}
                >
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                    />
                </motion.div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <motion.h3
                            className="font-medium text-neutral-900 leading-tight"
                            layoutId={`title-${item.id}`}
                        >
                            {item.name}
                            {isHighMargin && (
                                <span className="ml-2 text-xs text-amber-600 font-semibold">★ Popular</span>
                            )}
                        </motion.h3>
                        {item.description && (
                            <p className="text-sm text-neutral-500 line-clamp-1 mt-0.5">
                                {item.description}
                            </p>
                        )}
                    </div>
                    <motion.span
                        variants={variants.priceReveal}
                        className="font-semibold text-neutral-900 whitespace-nowrap"
                    >
                        {formatPrice(item.price, showCurrency)}
                    </motion.span>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between mt-2">
                    {item.rating && (
                        <span className="text-xs text-neutral-400 flex items-center gap-1">
                            <span className="text-amber-500">★</span>
                            {item.rating.toFixed(1)}
                        </span>
                    )}
                    <motion.button
                        variants={variants.buttonPress}
                        initial="rest"
                        whileHover="hover"
                        whileTap="tap"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart?.(item);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                    >
                        + Add
                    </motion.button>
                </div>
            </div>
        </motion.article>
    );
}

export default MenuItem;
