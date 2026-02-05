'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'interactive';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
        const paddings = {
            none: '',
            sm: 'p-4',
            md: 'p-6',
            lg: 'p-8',
        };

        return (
            <div
                ref={ref}
                className={clsx(
                    'bg-gray-900 border border-gray-800 rounded-xl',
                    variant === 'interactive' && 'hover:border-gray-700 transition-colors cursor-pointer',
                    paddings[padding],
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

const CardHeader = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={clsx('mb-4', className)} {...props}>
        {children}
    </div>
);

const CardTitle = ({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={clsx('text-lg font-semibold text-white', className)} {...props}>
        {children}
    </h3>
);

const CardDescription = ({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
    <p className={clsx('text-sm text-gray-400 mt-1', className)} {...props}>
        {children}
    </p>
);

const CardContent = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={clsx(className)} {...props}>
        {children}
    </div>
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
