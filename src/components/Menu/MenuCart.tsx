'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react';
import { springs, variants, colors, shadows } from '@/lib/design-system';
import { cn } from '@/lib/utils/helpers';
import { useState } from 'react';
import { MenuItemData, CartItem } from '@/lib/types/menu.types';

// Re-export for convenience
export type { CartItem };

interface MenuCartProps {
    items: CartItem[];
    onUpdateQuantity: (itemId: number, quantity: number) => void;
    onRemoveItem: (itemId: number) => void;
    onCheckout?: () => void;
    showCurrency?: boolean;
}

const formatPrice = (price: number, showCurrency: boolean = false): string => {
    const formatted = price.toFixed(2);
    return showCurrency ? `$${formatted}` : formatted;
};

export function MenuCart({
    items,
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
    showCurrency = false,
}: MenuCartProps) {
    const [isOpen, setIsOpen] = useState(false);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.item.price * item.quantity, 0);

    return (
        <>
            {/* Floating Cart Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className={cn(
                    'fixed bottom-6 right-6 z-30',
                    'w-16 h-16 rounded-full',
                    'bg-neutral-900 text-white',
                    'flex items-center justify-center',
                    'shadow-xl hover:shadow-2xl transition-shadow'
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springs.bouncy}
            >
                <ShoppingCart size={24} />

                {/* Badge */}
                <AnimatePresence>
                    {totalItems > 0 && (
                        <motion.span
                            key={totalItems}
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={springs.bouncy}
                        >
                            {totalItems}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Cart Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            variants={variants.backdrop}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        />

                        {/* Drawer */}
                        <motion.div
                            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={springs.smooth}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <h2 className="text-lg font-semibold text-neutral-900">
                                    Your Order ({totalItems})
                                </h2>
                                <motion.button
                                    onClick={() => setIsOpen(false)}
                                    className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>

                            {/* Items */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                                <AnimatePresence mode="popLayout">
                                    {items.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center py-12 text-neutral-500"
                                        >
                                            <ShoppingCart size={48} className="mx-auto mb-4 opacity-30" />
                                            <p>Your cart is empty</p>
                                        </motion.div>
                                    ) : (
                                        items.map(({ item, quantity }) => (
                                            <motion.div
                                                key={item.id}
                                                layout
                                                variants={variants.slideRight}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                                className="flex gap-3 p-3 rounded-xl bg-neutral-50"
                                            >
                                                {/* Image */}
                                                {item.imageUrl && (
                                                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                )}

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-neutral-900 truncate">
                                                        {item.name}
                                                    </h3>
                                                    <p className="text-sm text-neutral-500">
                                                        {formatPrice(item.price, showCurrency)} each
                                                    </p>

                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <motion.button
                                                            onClick={() => onUpdateQuantity(item.id, Math.max(0, quantity - 1))}
                                                            className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:border-neutral-300 transition-colors"
                                                            whileTap={{ scale: 0.9 }}
                                                        >
                                                            {quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                                                        </motion.button>

                                                        <motion.span
                                                            key={quantity}
                                                            className="w-8 text-center font-medium"
                                                            initial={{ scale: 1.2 }}
                                                            animate={{ scale: 1 }}
                                                        >
                                                            {quantity}
                                                        </motion.span>

                                                        <motion.button
                                                            onClick={() => onUpdateQuantity(item.id, quantity + 1)}
                                                            className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800 transition-colors"
                                                            whileTap={{ scale: 0.9 }}
                                                        >
                                                            <Plus size={14} />
                                                        </motion.button>
                                                    </div>
                                                </div>

                                                {/* Price */}
                                                <div className="text-right">
                                                    <p className="font-semibold text-neutral-900">
                                                        {formatPrice(item.price * quantity, showCurrency)}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Footer */}
                            {items.length > 0 && (
                                <motion.div
                                    className="p-4 border-t bg-white"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-neutral-500">Total</span>
                                        <motion.span
                                            key={totalPrice}
                                            className="text-2xl font-bold text-neutral-900"
                                            initial={{ scale: 1.1 }}
                                            animate={{ scale: 1 }}
                                            transition={springs.snappy}
                                        >
                                            {formatPrice(totalPrice, showCurrency)}
                                        </motion.span>
                                    </div>

                                    <motion.button
                                        onClick={onCheckout}
                                        className="w-full py-4 rounded-xl bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Checkout
                                    </motion.button>
                                </motion.div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

export default MenuCart;
