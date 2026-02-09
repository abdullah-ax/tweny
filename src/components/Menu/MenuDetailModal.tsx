'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingCart, Star } from 'lucide-react';
import { springs, variants, colors, shadows } from '@/lib/design-system';
import { cn } from '@/lib/utils/helpers';
import { useState } from 'react';
import { MenuItemData } from '@/lib/types/menu.types';

interface MenuDetailModalProps {
    item: MenuItemData | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart?: (item: MenuItemData, quantity: number) => void;
    showCurrency?: boolean;
}

const formatPrice = (price: number, showCurrency: boolean = false): string => {
    const formatted = price.toFixed(2);
    return showCurrency ? `$${formatted}` : formatted;
};

export function MenuDetailModal({
    item,
    isOpen,
    onClose,
    onAddToCart,
    showCurrency = false,
}: MenuDetailModalProps) {
    const [quantity, setQuantity] = useState(1);

    const handleAddToCart = () => {
        if (item) {
            onAddToCart?.(item, quantity);
            setQuantity(1);
            onClose();
        }
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && item && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        variants={variants.backdrop}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/60"
                        style={{ backdropFilter: 'blur(8px)' }}
                    />

                    {/* Modal */}
                    <motion.div
                        key="modal"
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none"
                    >
                        <motion.article
                            layoutId={`item-${item.id}`}
                            className={cn(
                                'relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden pointer-events-auto',
                                'max-h-[90vh] overflow-y-auto'
                            )}
                            style={{ boxShadow: shadows['2xl'] }}
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            transition={springs.smooth}
                        >
                            {/* Close Button */}
                            <motion.button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-neutral-600 hover:bg-white hover:text-neutral-900 transition-colors"
                                style={{ boxShadow: shadows.md }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <X size={20} />
                            </motion.button>

                            {/* Image */}
                            {item.imageUrl && (
                                <motion.div
                                    className="relative h-64 sm:h-72 overflow-hidden"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <motion.img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        initial={{ scale: 1.1 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                                    {/* Featured Badge */}
                                    {item.isHighMargin && (
                                        <motion.div
                                            className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-semibold"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors.gold}, ${colors.champagne})`,
                                                color: colors.neutral[900],
                                            }}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3, ...springs.bouncy }}
                                        >
                                            ★ Chef's Pick
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}

                            {/* Content */}
                            <div className="p-6">
                                {/* Title & Rating */}
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <motion.h2
                                        layoutId={`title-${item.id}`}
                                        className="text-2xl font-bold text-neutral-900 leading-tight"
                                    >
                                        {item.name}
                                    </motion.h2>

                                    {item.rating && (
                                        <motion.div
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.4 }}
                                        >
                                            <Star size={14} className="text-amber-500 fill-amber-500" />
                                            <span className="text-sm font-semibold text-amber-700">
                                                {item.rating.toFixed(1)}
                                            </span>
                                            {item.votes && (
                                                <span className="text-xs text-amber-600">
                                                    ({item.votes})
                                                </span>
                                            )}
                                        </motion.div>
                                    )}
                                </div>

                                {/* Description */}
                                {item.description && (
                                    <motion.p
                                        className="text-neutral-600 leading-relaxed mb-6"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        {item.description}
                                    </motion.p>
                                )}

                                {/* Price & Quantity */}
                                <motion.div
                                    className="flex items-center justify-between py-4 border-t border-neutral-100"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <div>
                                        <span className="text-sm text-neutral-500">Price</span>
                                        <motion.p
                                            className="text-3xl font-bold text-neutral-900"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.35, ...springs.snappy }}
                                        >
                                            {formatPrice(item.price * quantity, showCurrency)}
                                        </motion.p>
                                    </div>

                                    {/* Quantity Selector */}
                                    <div className="flex items-center gap-3">
                                        <motion.button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            disabled={quantity <= 1}
                                            className={cn(
                                                'w-10 h-10 flex items-center justify-center rounded-full',
                                                'border-2 transition-colors',
                                                quantity <= 1
                                                    ? 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                                                    : 'border-neutral-300 text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50'
                                            )}
                                            whileHover={quantity > 1 ? { scale: 1.05 } : undefined}
                                            whileTap={quantity > 1 ? { scale: 0.95 } : undefined}
                                        >
                                            <Minus size={18} />
                                        </motion.button>

                                        <motion.span
                                            key={quantity}
                                            className="w-8 text-center text-xl font-semibold text-neutral-900"
                                            initial={{ scale: 1.2, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={springs.snappy}
                                        >
                                            {quantity}
                                        </motion.span>

                                        <motion.button
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Plus size={18} />
                                        </motion.button>
                                    </div>
                                </motion.div>

                                {/* Add to Cart Button */}
                                <motion.button
                                    onClick={handleAddToCart}
                                    className={cn(
                                        'w-full mt-4 py-4 px-6 rounded-2xl',
                                        'bg-neutral-900 text-white font-semibold text-lg',
                                        'flex items-center justify-center gap-3',
                                        'hover:bg-neutral-800 transition-colors'
                                    )}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4, ...springs.smooth }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <ShoppingCart size={20} />
                                    <span>Add to Cart</span>
                                    <span className="ml-auto px-3 py-1 rounded-lg bg-white/20 text-sm">
                                        {formatPrice(item.price * quantity, showCurrency)}
                                    </span>
                                </motion.button>
                            </div>
                        </motion.article>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default MenuDetailModal;
