'use client';

import { motion } from 'framer-motion';
import { springs, variants, colors, typography } from '@/lib/design-system';
import { cn } from '@/lib/utils/helpers';

interface MenuHeaderProps {
    restaurant: {
        id: number;
        name: string;
        description?: string | null;
        cuisine?: string | null;
        logo?: string | null;
    };
    variant?: 'a' | 'b';
    className?: string;
}

export function MenuHeader({ restaurant, variant = 'a', className }: MenuHeaderProps) {
    // Variant A: Hero header with gradient
    if (variant === 'a') {
        return (
            <motion.header
                className={cn('relative overflow-hidden rounded-3xl bg-neutral-900 p-8 mb-8', className)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springs.smooth}
            >
                {/* Background Pattern */}
                <motion.div
                    className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: `radial-gradient(circle at 20% 80%, ${colors.primary[600]} 0%, transparent 50%),
                             radial-gradient(circle at 80% 20%, ${colors.gold} 0%, transparent 40%)`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    transition={{ duration: 1.5 }}
                />

                {/* Animated Particles */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-white/20"
                        style={{
                            left: `${15 + i * 15}%`,
                            top: `${20 + (i % 3) * 25}%`,
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: [0, 0.5, 0],
                            scale: [0, 1, 0.5],
                            y: [0, -20, -40],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: i * 0.5,
                            ease: 'easeOut',
                        }}
                    />
                ))}

                <div className="relative z-10">
                    {/* Logo */}
                    {restaurant.logo && (
                        <motion.div
                            className="w-20 h-20 rounded-2xl overflow-hidden mb-4 border-2 border-white/20"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, ...springs.bouncy }}
                        >
                            <img
                                src={restaurant.logo}
                                alt={restaurant.name}
                                className="w-full h-full object-cover"
                            />
                        </motion.div>
                    )}

                    {/* Restaurant Name */}
                    <motion.h1
                        className="text-4xl sm:text-5xl font-bold text-white mb-2"
                        style={{ fontFamily: typography.fonts.display }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, ...springs.smooth }}
                    >
                        {restaurant.name}
                    </motion.h1>

                    {/* Cuisine Badge */}
                    {restaurant.cuisine && (
                        <motion.span
                            className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-white/10 text-white/80 mb-3"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            {restaurant.cuisine}
                        </motion.span>
                    )}

                    {/* Description */}
                    {restaurant.description && (
                        <motion.p
                            className="text-white/70 max-w-lg leading-relaxed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            {restaurant.description}
                        </motion.p>
                    )}
                </div>

                {/* Decorative Bottom Border */}
                <motion.div
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{
                        background: `linear-gradient(90deg, ${colors.primary[500]}, ${colors.gold}, ${colors.primary[500]})`,
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
                />
            </motion.header>
        );
    }

    // Variant B: Minimal header
    return (
        <motion.header
            className={cn('pb-6 mb-6 border-b border-neutral-200', className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={springs.smooth}
        >
            <div className="flex items-center gap-4">
                {restaurant.logo && (
                    <motion.div
                        className="w-16 h-16 rounded-xl overflow-hidden"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, ...springs.snappy }}
                    >
                        <img
                            src={restaurant.logo}
                            alt={restaurant.name}
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                )}

                <div>
                    <motion.h1
                        className="text-2xl font-bold text-neutral-900"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        {restaurant.name}
                    </motion.h1>

                    {restaurant.cuisine && (
                        <motion.span
                            className="text-sm text-neutral-500"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            {restaurant.cuisine}
                        </motion.span>
                    )}
                </div>
            </div>

            {restaurant.description && (
                <motion.p
                    className="mt-3 text-neutral-600 text-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    {restaurant.description}
                </motion.p>
            )}
        </motion.header>
    );
}

export default MenuHeader;
