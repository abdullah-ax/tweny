'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Types
interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    category: string;
    badges?: string[];
    isHighlighted?: boolean;
    isAnchor?: boolean;
}

interface MenuCategory {
    id: string;
    name: string;
    items: MenuItem[];
}

interface Popup {
    id: string;
    type: 'promo' | 'featured' | 'welcome' | 'custom';
    title: string;
    description?: string;
    imageUrl?: string;
    itemId?: string;
    discountPercent?: number;
    cta?: string;
    backgroundColor?: string;
    expiresAt?: Date;
}

interface CartItem extends MenuItem {
    quantity: number;
}

interface ColorScheme {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
}

// Speech recognition types
interface SpeechRecognitionResult {
    [index: number]: { transcript: string };
    isFinal: boolean;
}

interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    length: number;
}

interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
}

interface CustomSpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    start: () => void;
    stop: () => void;
}

type SpeechRecognitionConstructor = new () => CustomSpeechRecognition;

function CustomerMenuContent() {
    const searchParams = useSearchParams();
    const restaurantId = searchParams.get('r') || '1';
    const tableNumber = searchParams.get('t') || '';

    // State
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [colorScheme, setColorScheme] = useState<ColorScheme>({
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#f97316',
        background: '#0f0f1a',
        text: '#ffffff',
    });
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [popup, setPopup] = useState<Popup | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [orderComplete, setOrderComplete] = useState(false);

    const recognitionRef = useRef<CustomSpeechRecognition | null>(null);
    const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Load menu data
    useEffect(() => {
        loadMenuData();
        trackEvent('menu_view');

        // Show welcome popup after short delay
        const timer = setTimeout(() => {
            checkForPopups();
        }, 1500);

        return () => clearTimeout(timer);
    }, [restaurantId]);

    const loadMenuData = async () => {
        try {
            // Try to load from deployed layout first
            const deployedLayout = sessionStorage.getItem('deployedLayout');

            if (deployedLayout) {
                const layout = JSON.parse(deployedLayout);
                loadFromLayout(layout);
            } else {
                // Fallback to demo data
                loadDemoData();
            }
        } catch (error) {
            console.error('Failed to load menu:', error);
            loadDemoData();
        } finally {
            setLoading(false);
        }
    };

    const loadFromLayout = (layout: any) => {
        // Extract categories from layout sections
        const cats: MenuCategory[] = (layout.sections || []).map((section: any) => ({
            id: section.id,
            name: section.name,
            items: section.items.map((item: any) => ({
                id: item.id,
                name: item.name,
                description: item.description,
                price: item.price,
                imageUrl: item.imageUrl,
                category: section.name,
                badges: item.badges || [],
                isHighlighted: item.isHighlighted,
                isAnchor: item.isAnchor,
            })),
        }));

        setCategories(cats);
        if (cats.length > 0) {
            setActiveCategory(cats[0].id);
        }

        // Load color scheme if available
        if (layout.colorScheme) {
            setColorScheme(layout.colorScheme);
        }
    };

    const loadDemoData = () => {
        const demoCategories: MenuCategory[] = [
            {
                id: 'appetizers',
                name: 'Appetizers',
                items: [
                    { id: '1', name: 'Spring Rolls', description: 'Crispy vegetable rolls with sweet chili sauce', price: 8.99, category: 'Appetizers', badges: ['Popular'], isHighlighted: true },
                    { id: '2', name: 'Soup of the Day', description: 'Ask your server for today\'s special', price: 6.99, category: 'Appetizers', badges: [] },
                    { id: '3', name: 'Bruschetta', description: 'Fresh tomato, basil, garlic on toasted bread', price: 9.99, category: 'Appetizers', badges: ["Chef's Pick"] },
                ],
            },
            {
                id: 'mains',
                name: 'Main Courses',
                items: [
                    { id: '4', name: 'Grilled Salmon', description: 'Atlantic salmon with seasonal vegetables', price: 24.99, category: 'Main Courses', badges: ['Premium'], isHighlighted: true, isAnchor: true },
                    { id: '5', name: 'Chicken Alfredo', description: 'Creamy pasta with grilled chicken breast', price: 18.99, category: 'Main Courses', badges: ['Best Value'], isHighlighted: true },
                    { id: '6', name: 'Veggie Buddha Bowl', description: 'Quinoa, roasted vegetables, tahini dressing', price: 15.99, category: 'Main Courses', badges: ['Vegan'] },
                    { id: '7', name: 'Ribeye Steak', description: '12oz prime cut with herb butter', price: 34.99, category: 'Main Courses', badges: ['Limited'] },
                ],
            },
            {
                id: 'desserts',
                name: 'Desserts',
                items: [
                    { id: '8', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center', price: 9.99, category: 'Desserts', badges: ['Trending'], isHighlighted: true },
                    { id: '9', name: 'New York Cheesecake', description: 'Classic style with berry compote', price: 8.99, category: 'Desserts', badges: [] },
                ],
            },
            {
                id: 'drinks',
                name: 'Beverages',
                items: [
                    { id: '10', name: 'Fresh Lemonade', description: 'House-made with fresh lemons', price: 4.99, category: 'Beverages', badges: [] },
                    { id: '11', name: 'Iced Tea', description: 'Sweetened or unsweetened', price: 3.99, category: 'Beverages', badges: [] },
                ],
            },
        ];

        setCategories(demoCategories);
        setActiveCategory('appetizers');
    };

    const checkForPopups = () => {
        // Check for stored popups or promotions
        const promos = sessionStorage.getItem('activePromos');

        if (promos) {
            const promoList = JSON.parse(promos);
            if (promoList.length > 0) {
                setPopup(promoList[0]);
                return;
            }
        }

        // Default welcome popup
        setPopup({
            id: 'welcome',
            type: 'welcome',
            title: 'Welcome!',
            description: tableNumber
                ? `Table ${tableNumber} - Browse our menu and add items to your order.`
                : 'Browse our menu and discover today\'s specials.',
            cta: 'Start Browsing',
            backgroundColor: colorScheme.accent,
        });
    };

    const trackEvent = async (eventType: string, eventData?: Record<string, any>) => {
        try {
            await fetch('/api/public/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: parseInt(restaurantId),
                    sessionId: getSessionId(),
                    eventType,
                    eventData: { ...eventData, tableNumber },
                }),
            });
        } catch (error) {
            console.error('Event tracking error:', error);
        }
    };

    const getSessionId = () => {
        let sessionId = sessionStorage.getItem('menuSessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('menuSessionId', sessionId);
        }
        return sessionId;
    };

    const handleCategoryClick = (categoryId: string) => {
        setActiveCategory(categoryId);
        trackEvent('category_click', { categoryId });

        // Scroll to category
        const element = categoryRefs.current[categoryId];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleItemClick = (item: MenuItem) => {
        setSelectedItem(item);
        trackEvent('item_view', { itemId: item.id, itemName: item.name });
    };

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
        trackEvent('add_to_cart', { itemId: item.id, itemName: item.name, price: item.price });
    };

    const updateCartQuantity = (itemId: string, delta: number) => {
        setCart(prev => {
            const updated = prev.map(item => {
                if (item.id === itemId) {
                    const newQty = item.quantity + delta;
                    return newQty > 0 ? { ...item, quantity: newQty } : item;
                }
                return item;
            }).filter(item => item.quantity > 0);
            return updated;
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(i => i.id !== itemId));
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Voice feedback handling (bilingual Arabic/English)
    const startVoiceRecording = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const windowAny = window as any;
        if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            alert('Voice recognition is not supported in this browser');
            return;
        }

        const SpeechRecognitionClass: SpeechRecognitionConstructor = windowAny.SpeechRecognition || windowAny.webkitSpeechRecognition;
        const recognition = new SpeechRecognitionClass();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;

        // Support both Arabic and English
        recognition.lang = 'ar-SA'; // Start with Arabic

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript + ' ';
            }
            setFeedbackText(transcript.trim());
        };

        recognition.onend = () => {
            // Try English if no Arabic detected
            if (recognitionRef.current && feedbackText.length < 5) {
                recognitionRef.current.lang = 'en-US';
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    setIsRecording(false);
                }
            } else {
                setIsRecording(false);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
        };

        try {
            recognition.start();
            setIsRecording(true);
        } catch (e) {
            console.error('Failed to start speech recognition:', e);
        }
    };

    const stopVoiceRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
        }
    };

    const submitFeedback = async () => {
        if (!feedbackText.trim()) return;

        try {
            await fetch('/api/public/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: parseInt(restaurantId),
                    sessionId: getSessionId(),
                    feedback: feedbackText,
                    source: 'voice',
                    tableNumber,
                }),
            });
            trackEvent('feedback_submitted', { length: feedbackText.length });
        } catch (error) {
            console.error('Failed to submit feedback:', error);
        }

        setFeedbackText('');
        setShowFeedback(false);
    };

    const proceedToCheckout = () => {
        setShowCart(false);
        setShowCheckout(true);
        setShowFeedback(true); // Show voice feedback before payment
        trackEvent('checkout_started', { cartTotal, itemCount: cartCount });
    };

    const completeOrder = () => {
        trackEvent('order_completed', {
            cartTotal,
            itemCount: cartCount,
            items: cart.map(i => ({ id: i.id, name: i.name, qty: i.quantity })),
            tableNumber,
        });
        setOrderComplete(true);
        setShowCheckout(false);
        setShowFeedback(false);
        setCart([]);
    };

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: colorScheme.background }}
            >
                <div className="text-center">
                    <div
                        className="animate-spin h-10 w-10 border-3 rounded-full mx-auto mb-4"
                        style={{ borderColor: colorScheme.accent, borderTopColor: 'transparent' }}
                    />
                    <p style={{ color: colorScheme.text }} className="opacity-70">Loading menu...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen pb-24"
            style={{ backgroundColor: colorScheme.background, color: colorScheme.text }}
        >
            {/* Header */}
            <header
                className="sticky top-0 z-40 px-4 py-3"
                style={{ backgroundColor: colorScheme.primary }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">Menu</h1>
                        {tableNumber && (
                            <p className="text-xs opacity-70">Table {tableNumber}</p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowCart(true)}
                        className="relative p-2 rounded-full"
                        style={{ backgroundColor: colorScheme.secondary }}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {cartCount > 0 && (
                            <span
                                className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full"
                                style={{ backgroundColor: colorScheme.accent }}
                            >
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Category Tabs */}
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.id)}
                            className={`
                                flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                            `}
                            style={{
                                backgroundColor: activeCategory === cat.id ? colorScheme.accent : colorScheme.secondary,
                                color: colorScheme.text,
                            }}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </header>

            {/* Menu Content */}
            <main className="px-4 py-4 space-y-6">
                {categories.map(category => (
                    <div
                        key={category.id}
                        ref={el => { categoryRefs.current[category.id] = el; }}
                        className="scroll-mt-32"
                    >
                        <h2 className="text-lg font-bold mb-3">{category.name}</h2>
                        <div className="space-y-3">
                            {category.items.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    className={`
                                        rounded-xl p-3 cursor-pointer transition-all
                                        ${item.isHighlighted ? 'ring-2' : ''}
                                    `}
                                    style={{
                                        backgroundColor: colorScheme.secondary,
                                        // Use CSS custom property for ring color
                                        ['--tw-ring-color' as string]: item.isHighlighted ? colorScheme.accent : undefined,
                                    }}
                                >
                                    <div className="flex gap-3">
                                        {/* Item Image */}
                                        {item.imageUrl && (
                                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            </div>
                                        )}

                                        {/* Item Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-semibold truncate">{item.name}</h3>
                                                <span
                                                    className="font-bold flex-shrink-0"
                                                    style={{ color: colorScheme.accent }}
                                                >
                                                    ${item.price.toFixed(2)}
                                                </span>
                                            </div>
                                            {item.description && (
                                                <p className="text-sm opacity-70 mt-1 line-clamp-2">{item.description}</p>
                                            )}

                                            {/* Badges */}
                                            {item.badges && item.badges.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {item.badges.map((badge, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-xs px-2 py-0.5 rounded-full"
                                                            style={{ backgroundColor: colorScheme.accent + '30', color: colorScheme.accent }}
                                                        >
                                                            {badge}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Add Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart(item);
                                        }}
                                        className="w-full mt-3 py-2 rounded-lg font-medium text-sm transition-colors"
                                        style={{ backgroundColor: colorScheme.accent }}
                                    >
                                        Add to Order
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </main>

            {/* Welcome/Promo Popup */}
            {popup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                    <div
                        className="w-full max-w-sm rounded-2xl p-6 text-center animate-scale-in"
                        style={{ backgroundColor: colorScheme.primary }}
                    >
                        {popup.imageUrl && (
                            <img
                                src={popup.imageUrl}
                                alt=""
                                className="w-full h-40 object-cover rounded-xl mb-4"
                            />
                        )}
                        <h2 className="text-xl font-bold mb-2">{popup.title}</h2>
                        {popup.description && (
                            <p className="text-sm opacity-70 mb-4">{popup.description}</p>
                        )}
                        {popup.discountPercent && (
                            <div
                                className="inline-block px-4 py-2 rounded-full font-bold text-lg mb-4"
                                style={{ backgroundColor: colorScheme.accent }}
                            >
                                {popup.discountPercent}% OFF
                            </div>
                        )}
                        <button
                            onClick={() => {
                                setPopup(null);
                                trackEvent('popup_dismissed', { popupId: popup.id, popupType: popup.type });
                            }}
                            className="w-full py-3 rounded-xl font-semibold"
                            style={{ backgroundColor: colorScheme.accent }}
                        >
                            {popup.cta || 'Got It!'}
                        </button>
                    </div>
                </div>
            )}

            {/* Item Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setSelectedItem(null)}>
                    <div
                        className="w-full rounded-t-3xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto"
                        style={{ backgroundColor: colorScheme.primary }}
                        onClick={e => e.stopPropagation()}
                    >
                        {selectedItem.imageUrl && (
                            <img
                                src={selectedItem.imageUrl}
                                alt={selectedItem.name}
                                className="w-full h-48 object-cover rounded-xl mb-4"
                            />
                        )}

                        <div className="flex items-start justify-between mb-2">
                            <h2 className="text-xl font-bold">{selectedItem.name}</h2>
                            <span className="text-xl font-bold" style={{ color: colorScheme.accent }}>
                                ${selectedItem.price.toFixed(2)}
                            </span>
                        </div>

                        {selectedItem.description && (
                            <p className="text-sm opacity-70 mb-4">{selectedItem.description}</p>
                        )}

                        {selectedItem.badges && selectedItem.badges.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {selectedItem.badges.map((badge, idx) => (
                                    <span
                                        key={idx}
                                        className="text-xs px-3 py-1 rounded-full"
                                        style={{ backgroundColor: colorScheme.accent + '30', color: colorScheme.accent }}
                                    >
                                        {badge}
                                    </span>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                addToCart(selectedItem);
                                setSelectedItem(null);
                            }}
                            className="w-full py-4 rounded-xl font-bold text-lg"
                            style={{ backgroundColor: colorScheme.accent }}
                        >
                            Add to Order - ${selectedItem.price.toFixed(2)}
                        </button>

                        <button
                            onClick={() => setSelectedItem(null)}
                            className="w-full py-3 mt-2 rounded-xl font-medium opacity-70"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            {showCart && (
                <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setShowCart(false)}>
                    <div
                        className="w-full rounded-t-3xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto"
                        style={{ backgroundColor: colorScheme.primary }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold mb-4">Your Order</h2>

                        {cart.length === 0 ? (
                            <p className="text-center py-8 opacity-70">Your cart is empty</p>
                        ) : (
                            <>
                                <div className="space-y-3 mb-6">
                                    {cart.map(item => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 p-3 rounded-xl"
                                            style={{ backgroundColor: colorScheme.secondary }}
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-sm" style={{ color: colorScheme.accent }}>
                                                    ${item.price.toFixed(2)}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateCartQuantity(item.id, -1)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: colorScheme.accent + '30' }}
                                                >
                                                    -
                                                </button>
                                                <span className="w-6 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateCartQuantity(item.id, 1)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: colorScheme.accent }}
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="p-2 opacity-50 hover:opacity-100"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t pt-4 mb-4" style={{ borderColor: colorScheme.secondary }}>
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span style={{ color: colorScheme.accent }}>${cartTotal.toFixed(2)}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={proceedToCheckout}
                                    className="w-full py-4 rounded-xl font-bold text-lg"
                                    style={{ backgroundColor: colorScheme.accent }}
                                >
                                    Proceed to Checkout
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => setShowCart(false)}
                            className="w-full py-3 mt-2 rounded-xl font-medium opacity-70"
                        >
                            Continue Browsing
                        </button>
                    </div>
                </div>
            )}

            {/* Pre-Payment Voice Feedback */}
            {showFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                    <div
                        className="w-full max-w-sm rounded-2xl p-6 text-center"
                        style={{ backgroundColor: colorScheme.primary }}
                    >
                        <h2 className="text-xl font-bold mb-2">Quick Feedback 🎤</h2>
                        <p className="text-sm opacity-70 mb-4">
                            Share your experience with us! You can speak in Arabic or English.
                            <br />
                            <span className="text-xs">شاركنا رأيك بالعربي أو الإنجليزي</span>
                        </p>

                        {/* Voice Recording Button */}
                        <button
                            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                            className={`
                                w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center
                                transition-all ${isRecording ? 'animate-pulse' : ''}
                            `}
                            style={{
                                backgroundColor: isRecording ? '#ef4444' : colorScheme.accent,
                            }}
                        >
                            {isRecording ? (
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                    <rect x="6" y="6" width="12" height="12" rx="2" />
                                </svg>
                            ) : (
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            )}
                        </button>
                        <p className="text-xs opacity-70 mb-4">
                            {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
                        </p>

                        {/* Text Input Fallback */}
                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Or type your feedback here..."
                            className="w-full p-3 rounded-xl text-sm mb-4"
                            style={{ backgroundColor: colorScheme.secondary, color: colorScheme.text }}
                            rows={3}
                        />

                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setShowFeedback(false);
                                    setShowCheckout(true);
                                }}
                                className="flex-1 py-3 rounded-xl font-medium opacity-70"
                                style={{ backgroundColor: colorScheme.secondary }}
                            >
                                Skip
                            </button>
                            <button
                                onClick={() => {
                                    submitFeedback();
                                    setShowCheckout(true);
                                }}
                                className="flex-1 py-3 rounded-xl font-medium"
                                style={{ backgroundColor: colorScheme.accent }}
                                disabled={!feedbackText.trim()}
                            >
                                Submit & Pay
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout */}
            {showCheckout && !showFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                    <div
                        className="w-full max-w-sm rounded-2xl p-6"
                        style={{ backgroundColor: colorScheme.primary }}
                    >
                        <h2 className="text-xl font-bold mb-4 text-center">Payment</h2>

                        <div className="space-y-2 mb-6 p-4 rounded-xl" style={{ backgroundColor: colorScheme.secondary }}>
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="border-t pt-2 mt-2 flex justify-between font-bold" style={{ borderColor: colorScheme.primary }}>
                                <span>Total</span>
                                <span style={{ color: colorScheme.accent }}>${cartTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Mock Payment Options */}
                        <div className="space-y-2 mb-6">
                            <button
                                className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                                style={{ backgroundColor: colorScheme.secondary }}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2" /><path d="M2 10h20" strokeWidth="2" /></svg> Credit Card
                            </button>
                            <button
                                className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                                style={{ backgroundColor: colorScheme.secondary }}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="5" y="2" width="14" height="20" rx="2" strokeWidth="2" /><circle cx="12" cy="18" r="1" fill="currentColor" /></svg> Apple Pay
                            </button>
                            <button
                                className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                                style={{ backgroundColor: colorScheme.secondary }}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="1" y="6" width="22" height="12" rx="1" strokeWidth="2" /><circle cx="12" cy="12" r="3" strokeWidth="2" /></svg> Cash on Table
                            </button>
                        </div>

                        <button
                            onClick={completeOrder}
                            className="w-full py-4 rounded-xl font-bold text-lg"
                            style={{ backgroundColor: colorScheme.accent }}
                        >
                            Complete Order
                        </button>

                        <button
                            onClick={() => {
                                setShowCheckout(false);
                                setShowCart(true);
                            }}
                            className="w-full py-3 mt-2 rounded-xl font-medium opacity-70"
                        >
                            Back to Cart
                        </button>
                    </div>
                </div>
            )}

            {/* Order Complete */}
            {orderComplete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                    <div
                        className="w-full max-w-sm rounded-2xl p-6 text-center"
                        style={{ backgroundColor: colorScheme.primary }}
                    >
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: '#22c55e' }}>
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h2 className="text-xl font-bold mb-2">Order Confirmed!</h2>
                        <p className="text-sm opacity-70 mb-6">
                            Your order has been received. We'll prepare it right away!
                            {tableNumber && <><br />It will be served at Table {tableNumber}.</>}
                        </p>

                        <button
                            onClick={() => setOrderComplete(false)}
                            className="w-full py-3 rounded-xl font-medium"
                            style={{ backgroundColor: colorScheme.accent }}
                        >
                            Browse More
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Cart Button */}
            {cartCount > 0 && !showCart && !showCheckout && !showFeedback && !orderComplete && (
                <div className="fixed bottom-4 left-4 right-4 z-40">
                    <button
                        onClick={() => setShowCart(true)}
                        className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-between px-6 shadow-lg"
                        style={{ backgroundColor: colorScheme.accent }}
                    >
                        <span>View Cart ({cartCount})</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </button>
                </div>
            )}

            {/* Custom CSS */}
            <style jsx global>{`
                @keyframes scale-in {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-scale-in { animation: scale-in 0.3s ease-out; }
                .animate-slide-up { animation: slide-up 0.3s ease-out; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}

// Wrap in Suspense for useSearchParams
export default function CustomerMenuPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
            </div>
        }>
            <CustomerMenuContent />
        </Suspense>
    );
}
