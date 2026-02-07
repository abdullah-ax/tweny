'use client';

import { useState, useEffect, useRef } from 'react';
import { BuiltLayout } from '@/lib/services/layout-builder.service';
import { LayoutSection, LayoutItem } from '@/lib/services/strategy.service';

// Speech recognition types for browser API
interface SpeechRecognitionResult {
    [index: number]: { transcript: string };
}

interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    length: number;
}

interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

declare global {
    interface Window {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    }
}

interface CartItem extends LayoutItem {
    quantity: number;
}

interface DeployedLayout {
    id: string;
    html: string;
    css: string;
    strategy?: { name?: string };
    menuContext?: unknown;
}

export default function LiveMenuPage() {
    const [layout, setLayout] = useState<BuiltLayout | null>(null);
    const [customLayout, setCustomLayout] = useState<DeployedLayout | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [paymentComplete, setPaymentComplete] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    useEffect(() => {
        // Track menu view
        trackEvent('menu_view');

        // Try to load deployed layout from various sources
        // Priority: sessionStorage > localStorage (for cross-tab support)
        let stored = sessionStorage.getItem('deployedLayout');

        if (!stored) {
            // Try localStorage as fallback (works across tabs/new sessions)
            stored = localStorage.getItem('tweny_deployed_menu');
        }

        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Check if this is a custom HTML/CSS layout
                if (parsed.html && parsed.css) {
                    setCustomLayout(parsed);
                } else if (parsed.sections) {
                    setLayout(parsed);
                } else {
                    createDemoLayout();
                }
            } catch {
                createDemoLayout();
            }
        } else {
            // Create demo layout if none deployed
            createDemoLayout();
        }
    }, []);

    const createDemoLayout = () => {
        const demoSections: LayoutSection[] = [
            {
                id: 'appetizers',
                name: 'Appetizers',
                position: 0,
                items: [
                    { id: '1', name: 'Spring Rolls', description: 'Crispy vegetable rolls', price: 8.99, badges: ['Popular'], isHighlighted: true },
                    { id: '2', name: 'Soup of the Day', description: 'Ask your server', price: 6.99, badges: [], isHighlighted: false },
                    { id: '3', name: 'Bruschetta', description: 'Tomato, basil, garlic', price: 9.99, badges: ["Chef's Pick"], isHighlighted: false },
                ],
            },
            {
                id: 'mains',
                name: 'Main Courses',
                position: 1,
                items: [
                    { id: '4', name: 'Grilled Salmon', description: 'With seasonal vegetables', price: 24.99, badges: ['Premium'], isHighlighted: true, isAnchor: true },
                    { id: '5', name: 'Chicken Alfredo', description: 'Creamy pasta with grilled chicken', price: 18.99, badges: ['Best Value'], isHighlighted: true },
                    { id: '6', name: 'Veggie Bowl', description: 'Quinoa, roasted vegetables, tahini', price: 15.99, badges: [], isHighlighted: false },
                    { id: '7', name: 'Ribeye Steak', description: '12oz prime cut', price: 34.99, badges: ['Limited'], isHighlighted: false },
                ],
            },
            {
                id: 'desserts',
                name: 'Desserts',
                position: 2,
                items: [
                    { id: '8', name: 'Chocolate Lava Cake', description: 'Warm, with vanilla ice cream', price: 9.99, badges: ['Trending'], isHighlighted: true },
                    { id: '9', name: 'Cheesecake', description: 'New York style', price: 8.99, badges: [], isHighlighted: false },
                ],
            },
        ];

        setLayout({
            id: 'demo',
            strategyId: 'golden-triangle',
            strategyName: 'Golden Triangle',
            html: '',
            css: '',
            sections: demoSections,
            metadata: { createdAt: new Date().toISOString(), version: 1 },
        });
    };

    const trackEvent = async (eventType: string, data?: Record<string, unknown>) => {
        try {
            await fetch('/api/public/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: 1,
                    eventType,
                    eventData: data,
                }),
            });
        } catch (e) {
            console.error('Failed to track event:', e);
        }
    };

    const handleItemClick = (item: LayoutItem) => {
        trackEvent('item_click', { itemId: item.id, itemName: item.name, price: item.price });
    };

    const handleAddToCart = (item: LayoutItem) => {
        trackEvent('add_to_cart', { itemId: item.id, itemName: item.name, price: item.price });

        setCart((prev) => {
            const existing = prev.find((i) => i.id === item.id);
            if (existing) {
                return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const handleRemoveFromCart = (itemId: string) => {
        setCart((prev) => prev.filter((i) => i.id !== itemId));
    };

    const handleCheckout = () => {
        trackEvent('checkout', {
            items: cart.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity })),
            total: cartTotal,
        });
        setShowPayment(true);
    };

    const handlePayment = () => {
        trackEvent('payment_complete', { total: cartTotal });
        setPaymentComplete(true);
        setTimeout(() => {
            setShowPayment(false);
            setShowCart(false);
            setCart([]);
            setPaymentComplete(false);
            setShowFeedback(true);
        }, 2000);
    };

    const startVoiceFeedback = () => {
        if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
            alert('Voice recognition not supported in this browser');
            return;
        }

        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionClass) return;

        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            setFeedbackText(transcript);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
    };

    const stopVoiceFeedback = () => {
        recognitionRef.current?.stop();
        setIsRecording(false);
    };

    const submitFeedback = async () => {
        if (!feedbackText.trim()) return;

        try {
            await fetch('/api/public/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: 1,
                    transcript: feedbackText,
                    source: 'voice',
                }),
            });
            trackEvent('voice_feedback', { length: feedbackText.length });
            setShowFeedback(false);
            setFeedbackText('');
        } catch (e) {
            console.error('Failed to submit feedback:', e);
        }
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Loading state
    if (!layout && !customLayout) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    // Render custom HTML/CSS layout (from Figma-style editor)
    if (customLayout && customLayout.html && customLayout.css) {
        return (
            <div className="min-h-screen">
                <style dangerouslySetInnerHTML={{ __html: customLayout.css }} />
                <div
                    dangerouslySetInnerHTML={{ __html: customLayout.html }}
                    onClick={(e) => {
                        // Track clicks on menu items
                        const target = e.target as HTMLElement;
                        const itemEl = target.closest('[data-item-id]');
                        if (itemEl) {
                            const itemId = itemEl.getAttribute('data-item-id');
                            const itemName = itemEl.getAttribute('data-item-name');
                            trackEvent('item_click', { itemId, itemName });
                        }
                    }}
                />
                {/* Floating feedback button */}
                <button
                    onClick={() => setShowFeedback(true)}
                    className="fixed bottom-6 right-6 p-4 bg-blue-500 rounded-full shadow-lg z-50 hover:bg-blue-600 transition-colors"
                    title="Give Feedback"
                >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </button>
                {/* Feedback Modal */}
                {showFeedback && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/70" onClick={() => setShowFeedback(false)} />
                        <div className="relative bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 text-white">
                            <h2 className="text-lg font-semibold mb-4">How was your experience?</h2>
                            <textarea
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Tell us what you think..."
                                className="w-full p-3 bg-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                rows={4}
                            />
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={isRecording ? stopVoiceFeedback : startVoiceFeedback}
                                    className={`p-3 rounded-lg ${isRecording ? 'bg-red-500' : 'bg-gray-700'}`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={submitFeedback}
                                    className="flex-1 px-4 py-3 bg-orange-500 rounded-lg font-medium hover:bg-orange-600 transition"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Fallback: Render structured layout (legacy/demo mode)
    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-gray-800">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Our Menu</h1>
                        <p className="text-xs text-gray-500">{layout?.strategyName || 'Custom'} layout</p>
                    </div>
                    <button
                        onClick={() => setShowCart(true)}
                        className="relative p-2 bg-orange-500 rounded-full"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Menu Content */}
            <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
                {layout?.sections?.map((section) => (
                    <section key={section.id} className="mb-8">
                        <h2 className="text-lg font-semibold text-orange-400 mb-4 border-b border-gray-800 pb-2">
                            {section.name}
                        </h2>
                        <div className="space-y-4">
                            {section.items.map((item) => (
                                <article
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    className={`
                                        p-4 rounded-xl transition-all cursor-pointer
                                        ${item.isHighlighted
                                            ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30'
                                            : 'bg-gray-900 hover:bg-gray-800'}
                                        ${item.isAnchor ? 'ring-2 ring-orange-500' : ''}
                                    `}
                                >
                                    {item.badges.length > 0 && (
                                        <div className="flex gap-2 mb-2">
                                            {item.badges.map((badge, i) => (
                                                <span
                                                    key={i}
                                                    className="text-xs px-2 py-0.5 bg-orange-500/30 text-orange-300 rounded-full"
                                                >
                                                    {badge}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{item.name}</h3>
                                            {item.description && (
                                                <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                                            )}
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="text-lg font-bold text-orange-400">${item.price.toFixed(2)}</p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddToCart(item);
                                                }}
                                                className="mt-2 text-xs px-3 py-1 bg-orange-500 rounded-full hover:bg-orange-600 transition"
                                            >
                                                Add +
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            {/* Feedback Button */}
            <button
                onClick={() => setShowFeedback(true)}
                className="fixed bottom-20 right-4 p-3 bg-blue-500 rounded-full shadow-lg z-30"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </button>

            {/* Cart Drawer */}
            {showCart && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setShowCart(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl max-h-[80vh] overflow-y-auto">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Your Cart</h2>
                            <button onClick={() => setShowCart(false)} className="text-gray-400">✕</button>
                        </div>
                        <div className="p-4">
                            {cart.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Your cart is empty</p>
                            ) : (
                                <>
                                    {cart.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-800">
                                            <div>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                                                <button
                                                    onClick={() => handleRemoveFromCart(item.id)}
                                                    className="text-red-400 text-sm"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="mt-4 pt-4 border-t border-gray-700">
                                        <div className="flex justify-between text-lg font-bold">
                                            <span>Total</span>
                                            <span className="text-orange-400">${cartTotal.toFixed(2)}</span>
                                        </div>
                                        <button
                                            onClick={handleCheckout}
                                            className="w-full mt-4 py-3 bg-orange-500 rounded-xl font-semibold hover:bg-orange-600 transition"
                                        >
                                            Checkout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80" />
                    <div className="relative bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                        {paymentComplete ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold mb-2">Payment Successful!</h2>
                                <p className="text-gray-400">Thank you for your order</p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold mb-4">Mock Payment</h2>
                                <p className="text-gray-400 text-sm mb-4">This is a demo payment screen</p>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Card Number"
                                        defaultValue="4242 4242 4242 4242"
                                        className="w-full p-3 bg-gray-800 rounded-lg text-white"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="MM/YY"
                                            defaultValue="12/25"
                                            className="p-3 bg-gray-800 rounded-lg text-white"
                                        />
                                        <input
                                            type="text"
                                            placeholder="CVC"
                                            defaultValue="123"
                                            className="p-3 bg-gray-800 rounded-lg text-white"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between mt-6 mb-4 text-lg font-bold">
                                    <span>Total</span>
                                    <span className="text-orange-400">${cartTotal.toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={handlePayment}
                                    className="w-full py-3 bg-green-500 rounded-xl font-semibold hover:bg-green-600 transition"
                                >
                                    Pay Now (Mock)
                                </button>
                                <button
                                    onClick={() => setShowPayment(false)}
                                    className="w-full mt-2 py-2 text-gray-400"
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Feedback Modal */}
            {showFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80" onClick={() => setShowFeedback(false)} />
                    <div className="relative bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                        <h2 className="text-xl font-bold mb-2">Share Your Feedback</h2>
                        <p className="text-gray-400 text-sm mb-4">Tap the mic to record voice feedback</p>

                        <button
                            onClick={isRecording ? stopVoiceFeedback : startVoiceFeedback}
                            className={`
                                w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4
                                ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}
                            `}
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>

                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Or type your feedback here..."
                            className="w-full p-3 bg-gray-800 rounded-lg text-white text-sm resize-none"
                            rows={3}
                        />

                        <button
                            onClick={submitFeedback}
                            disabled={!feedbackText.trim()}
                            className="w-full mt-4 py-3 bg-orange-500 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
                        >
                            Submit Feedback
                        </button>
                        <button
                            onClick={() => setShowFeedback(false)}
                            className="w-full mt-2 py-2 text-gray-400"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
