'use client';

import { Fragment, ReactNode } from 'react';
import { clsx } from 'clsx';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div 
                    className={clsx(
                        'relative w-full bg-gray-900 border border-gray-800 rounded-xl shadow-2xl',
                        sizes[size]
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    {(title || description) && (
                        <div className="px-6 pt-6 pb-4 border-b border-gray-800">
                            {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
                            {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
                        </div>
                    )}
                    
                    {/* Content */}
                    <div className="px-6 py-4">
                        {children}
                    </div>
                    
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
