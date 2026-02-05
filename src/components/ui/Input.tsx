'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, hint, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1.5">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={clsx(
                        'w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500',
                        'focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30',
                        'transition-all duration-150',
                        error ? 'border-red-500' : 'border-gray-700',
                        className
                    )}
                    {...props}
                />
                {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
                {hint && !error && <p className="mt-1.5 text-sm text-gray-500">{hint}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
export default Input;
