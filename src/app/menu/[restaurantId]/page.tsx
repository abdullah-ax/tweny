'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

interface MenuItem {
    id: number;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    rating: number | null;
    votes: number | null;
}

interface MenuSection {
    id: number;
    title: string;
    description: string | null;
    items: MenuItem[];
}

interface Restaurant {
    id: number;
    name: string;
    description: string | null;
    cuisine: string | null;
}

interface Offer {
    id: number;
    title: string;
    description: string | null;
    discountPercent: number | null;
    discountAmount: number | null;
}

interface CartItem {
    menuItem: MenuItem;
    quantity: number;
}

interface DeployedMenu {
    layoutId: number;
    version: number;
    strategy: string;
    html: string;
    css: string;
    publishedAt: string;
}

export default function PublicMenuPage() {
    const params = useParams();
    const restaurantId = params.restaurantId as string;

    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [sections, setSections] = useState<MenuSection[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [deployedMenu, setDeployedMenu] = useState<DeployedMenu | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);

    // Voice feedback state
    const [isListening, setIsListening] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const [voiceError, setVoiceError] = useState<string | null>(null);
    const [feedbackTranscript, setFeedbackTranscript] = useState('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    const recognitionRef = useRef<any>(null);
    const sessionIdRef = useRef<string>('');

    // Generate session ID on mount (crypto.randomUUID not available in all browsers)
    useEffect(() => {
        if (!sessionIdRef.current) {
            sessionIdRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'sess-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        }
    }, []);

    useEffect(() => {
        // Check for Web Speech API support
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            setVoiceSupported(!!SpeechRecognition);

            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = Array.from(event.results)
                        .map((result: any) => result[0].transcript)
                        .join('');
                    setFeedbackTranscript(transcript);
                };

                recognitionRef.current.onerror = (event: any) => {
                    setVoiceError(`Voice error: ${event.error}`);
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
    }, []);

    useEffect(() => {
        if (restaurantId) {
            fetchMenuData();
            trackEvent('menu_view', {});
        }
    }, [restaurantId]);

    const fetchMenuData = async () => {
        try {
            const res = await fetch(`/api/public/menu/${restaurantId}`);
            if (!res.ok) {
                throw new Error('Failed to load menu');
            }
            const data = await res.json();
            setRestaurant(data.restaurant);
            setSections(data.sections);
            setOffers(data.offers || []);
            // Check if there's a deployed custom menu design
            if (data.deployedMenu) {
                setDeployedMenu(data.deployedMenu);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const trackEvent = async (eventType: string, eventData: Record<string, any>) => {
        try {
            await fetch(`/api/public/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: parseInt(restaurantId),
                    sessionId: sessionIdRef.current,
                    eventType,
                    eventData,
                }),
            });
        } catch (err) {
            console.error('Failed to track event:', err);
        }
    };

    const trackItemClick = (item: MenuItem) => {
        trackEvent('item_click', { itemId: item.id, itemName: item.name });
    };

    // Cart calculations
    const cartSubtotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
    const cartTax = cartSubtotal * 0.08;
    const cartTotal = cartSubtotal + cartTax;
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(c => c.menuItem.id === item.id);
            if (existing) {
                return prev.map(c =>
                    c.menuItem.id === item.id
                        ? { ...c, quantity: c.quantity + 1 }
                        : c
                );
            }
            return [...prev, { menuItem: item, quantity: 1 }];
        });
        trackEvent('add_to_cart', { itemId: item.id, itemName: item.name, price: item.price });
    };

    const removeFromCart = (itemId: number) => {
        setCart(prev => {
            const existing = prev.find(c => c.menuItem.id === itemId);
            if (existing && existing.quantity > 1) {
                return prev.map(c =>
                    c.menuItem.id === itemId
                        ? { ...c, quantity: c.quantity - 1 }
                        : c
                );
            }
            return prev.filter(c => c.menuItem.id !== itemId);
        });
    };

    const processPayment = async () => {
        setIsProcessingPayment(true);
        try {
            const orderItems = cart.map(item => ({
                menuItemId: item.menuItem.id,
                name: item.menuItem.name,
                price: item.menuItem.price,
                quantity: item.quantity,
            }));

            // Process mock payment
            const paymentRes = await fetch('/api/public/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: `ORD-${Date.now()}`,
                    amount: cartTotal,
                    paymentMethod: 'card',
                    cardNumber: '4242424242424242',
                }),
            });

            if (!paymentRes.ok) throw new Error('Payment failed');
            const paymentData = await paymentRes.json();

            // Record order for analytics
            const analyticsRes = await fetch('/api/analytics/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: parseInt(restaurantId),
                    items: orderItems,
                    total: cartTotal,
                    menuVersion: 'current',
                }),
            });

            if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json();
                setOrderId(analyticsData.orderId || paymentData.transactionId);
            }

            trackEvent('checkout_complete', { orderId: paymentData.transactionId, total: cartTotal, itemCount: cartItemCount });
            setPaymentSuccess(true);
            setCart([]);

            setTimeout(() => {
                setShowCheckout(false);
                setPaymentSuccess(false);
                setOrderId(null);
            }, 5000);
        } catch (err) {
            console.error('Payment error:', err);
            alert('Payment failed. Please try again.');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const startVoiceCapture = () => {
        if (!recognitionRef.current) return;

        setVoiceError(null);
        setFeedbackTranscript('');

        try {
            recognitionRef.current.start();
            setIsListening(true);
        } catch (err: any) {
            setVoiceError('Failed to start voice capture');
        }
    };

    const stopVoiceCapture = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    };

    const submitFeedback = async () => {
        if (!feedbackTranscript.trim()) return;

        try {
            await fetch(`/api/public/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: parseInt(restaurantId),
                    sessionId: sessionIdRef.current,
                    source: 'voice',
                    transcript: feedbackTranscript,
                }),
            });

            trackEvent('feedback_submitted', { source: 'voice', length: feedbackTranscript.length });
            setFeedbackSubmitted(true);
            setFeedbackTranscript('');

            setTimeout(() => {
                setShowFeedbackModal(false);
                setFeedbackSubmitted(false);
            }, 2000);
        } catch (err) {
            setVoiceError('Failed to submit feedback');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (error || !restaurant) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Menu Not Found</h1>
                    <p className="text-gray-400">{error || 'This menu is not available.'}</p>
                </div>
            </div>
        );
    }

    // If there's a deployed custom design, render it with order functionality
    if (deployedMenu) {
        const deployedMenuHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&family=Cormorant+Garamond:wght@400;600&family=Lato:wght@400;700&family=Montserrat:wght@400;600&family=Open+Sans:wght@400;600&family=Poppins:wght@400;600&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, sans-serif; }
        ${deployedMenu.css}
        /* Cart overlay styles */
        .tweny-cart-overlay { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.95); backdrop-filter: blur(10px); border-top: 1px solid #333; padding: 16px; z-index: 1000; transform: translateY(0); transition: transform 0.3s ease; }
        .tweny-cart-overlay.hidden { transform: translateY(100%); }
        .tweny-cart-btn { width: 100%; background: linear-gradient(135deg, #f97316, #ef4444); color: white; border: none; padding: 16px 24px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .tweny-cart-count { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; margin-right: 8px; }
        .tweny-add-btn { background: #f97316; color: white; border: none; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
        .tweny-add-btn:hover { background: #ea580c; }
        .tweny-qty-control { display: flex; align-items: center; gap: 8px; background: #1f2937; border-radius: 20px; padding: 4px; }
        .tweny-qty-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: #374151; color: white; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
        .tweny-qty-btn.plus { background: #f97316; }
    </style>
</head>
<body>
    ${deployedMenu.html}
    <div id="tweny-cart-overlay" class="tweny-cart-overlay hidden">
        <button id="tweny-view-cart" class="tweny-cart-btn">
            <span><span id="tweny-cart-count" class="tweny-cart-count">0</span> View Cart</span>
            <span id="tweny-cart-total">$0.00</span>
        </button>
    </div>
    <script>
        (function() {
            const cart = new Map();
            const TAX_RATE = 0.08;
            
            function updateCartUI() {
                let total = 0, count = 0;
                cart.forEach((qty, item) => { total += item.price * qty; count += qty; });
                const overlay = document.getElementById('tweny-cart-overlay');
                const countEl = document.getElementById('tweny-cart-count');
                const totalEl = document.getElementById('tweny-cart-total');
                if (count > 0) {
                    overlay.classList.remove('hidden');
                    countEl.textContent = count;
                    totalEl.textContent = '$' + (total * (1 + TAX_RATE)).toFixed(2);
                } else {
                    overlay.classList.add('hidden');
                }
            }
            
            function addToCart(item) {
                const current = cart.get(item) || 0;
                cart.set(item, current + 1);
                updateCartUI();
                updateItemButtons(item);
                // Track event
                fetch('/api/public/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ restaurantId: ${restaurantId}, eventType: 'add_to_cart', eventData: { itemName: item.name, price: item.price } })
                }).catch(() => {});
            }
            
            function removeFromCart(item) {
                const current = cart.get(item) || 0;
                if (current > 1) cart.set(item, current - 1);
                else cart.delete(item);
                updateCartUI();
                updateItemButtons(item);
            }
            
            function updateItemButtons(item) {
                const qty = cart.get(item) || 0;
                const container = document.querySelector('[data-item-id="' + item.id + '"] .tweny-cart-actions');
                if (!container) return;
                if (qty > 0) {
                    container.innerHTML = '<div class="tweny-qty-control"><button class="tweny-qty-btn minus">−</button><span style="color:white;min-width:24px;text-align:center">' + qty + '</span><button class="tweny-qty-btn plus">+</button></div>';
                    container.querySelector('.minus').onclick = (e) => { e.stopPropagation(); removeFromCart(item); };
                    container.querySelector('.plus').onclick = (e) => { e.stopPropagation(); addToCart(item); };
                } else {
                    container.innerHTML = '<button class="tweny-add-btn">Add</button>';
                    container.querySelector('.tweny-add-btn').onclick = (e) => { e.stopPropagation(); addToCart(item); };
                }
            }
            
            // Initialize add buttons for all items with data-item-id
            document.querySelectorAll('[data-item-id]').forEach(el => {
                const itemId = el.getAttribute('data-item-id');
                const name = el.getAttribute('data-name') || el.querySelector('.item-name')?.textContent || el.querySelector('h3')?.textContent || 'Item';
                const priceStr = el.getAttribute('data-price') || el.querySelector('[data-price]')?.getAttribute('data-price') || '0';
                const price = parseFloat(priceStr) || 0;
                const item = { id: itemId, name, price };
                
                // Add cart actions container if not exists
                let actionsContainer = el.querySelector('.tweny-cart-actions');
                if (!actionsContainer) {
                    actionsContainer = document.createElement('div');
                    actionsContainer.className = 'tweny-cart-actions';
                    actionsContainer.style.marginTop = '8px';
                    el.appendChild(actionsContainer);
                }
                actionsContainer.innerHTML = '<button class="tweny-add-btn">Add</button>';
                actionsContainer.querySelector('.tweny-add-btn').onclick = (e) => { e.stopPropagation(); addToCart(item); };
            });
            
            // View cart button
            document.getElementById('tweny-view-cart').onclick = function() {
                let items = [];
                let subtotal = 0;
                cart.forEach((qty, item) => {
                    items.push(item.name + ' x' + qty + ' = $' + (item.price * qty).toFixed(2));
                    subtotal += item.price * qty;
                });
                const tax = subtotal * TAX_RATE;
                const total = subtotal + tax;
                const msg = 'Your Order:\\n\\n' + items.join('\\n') + '\\n\\nSubtotal: $' + subtotal.toFixed(2) + '\\nTax (8%): $' + tax.toFixed(2) + '\\nTotal: $' + total.toFixed(2) + '\\n\\n(Demo mode - tap OK to simulate checkout)';
                if (confirm(msg)) {
                    // Track checkout
                    fetch('/api/analytics/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ restaurantId: ${restaurantId}, items: Array.from(cart.entries()).map(([item, qty]) => ({ name: item.name, price: item.price, quantity: qty })), total: total, menuVersion: '${deployedMenu.version}' })
                    }).then(() => {
                        alert('Order placed! (Demo)\\n\\nThis order is now tracked in analytics.');
                        cart.clear();
                        updateCartUI();
                        document.querySelectorAll('.tweny-cart-actions').forEach(el => {
                            el.innerHTML = '<button class="tweny-add-btn">Add</button>';
                        });
                    }).catch(() => alert('Order failed'));
                }
            };
            
            // Track menu view
            fetch('/api/public/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId: ${restaurantId}, eventType: 'menu_view', eventData: { menuVersion: '${deployedMenu.version}' } })
            }).catch(() => {});
        })();
    </script>
</body>
</html>`;

        return (
            <iframe
                srcDoc={deployedMenuHtml}
                className="w-full h-screen border-0"
                title="Menu"
            />
        );
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-lg border-b border-gray-800">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
                        {restaurant.cuisine && (
                            <p className="text-sm text-gray-400">{restaurant.cuisine}</p>
                        )}
                    </div>
                    {cartItemCount > 0 && (
                        <button
                            onClick={() => setShowCart(true)}
                            className="relative bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-medium transition-colors"
                        >
                            🛒 ${cartTotal.toFixed(2)}
                            <span className="absolute -top-1 -right-1 bg-white text-orange-500 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                {cartItemCount}
                            </span>
                        </button>
                    )}
                </div>
            </header>

            {/* Active Offers */}
            {offers.length > 0 && (
                <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-b border-orange-500/30">
                    <div className="max-w-2xl mx-auto px-4 py-3">
                        <div className="flex items-center gap-2 text-orange-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                            </svg>
                            <span className="font-semibold">{offers[0].title}</span>
                            {offers[0].discountPercent && (
                                <span className="ml-auto text-sm bg-orange-500/20 px-2 py-0.5 rounded">
                                    {offers[0].discountPercent}% OFF
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Menu Sections */}
            <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
                {sections.map((section) => (
                    <section key={section.id} className="mb-8">
                        <h2 className="text-xl font-bold text-white mb-1">{section.title}</h2>
                        {section.description && (
                            <p className="text-sm text-gray-400 mb-4">{section.description}</p>
                        )}

                        <div className="space-y-3">
                            {section.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors cursor-pointer"
                                    onClick={() => trackItemClick(item)}
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white truncate">{item.name}</h3>
                                            {item.description && (
                                                <p className="text-sm text-gray-400 line-clamp-2 mt-1">{item.description}</p>
                                            )}
                                            {item.rating && (
                                                <div className="flex items-center gap-1 mt-2 text-yellow-500 text-sm">
                                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                    <span>{Number(item.rating).toFixed(1)}</span>
                                                    {item.votes && <span className="text-gray-500">({item.votes})</span>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                            <span className="text-lg font-bold text-white">
                                                ${Number(item.price).toFixed(2)}
                                            </span>
                                            {item.imageUrl && (
                                                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-800">
                                                    <img
                                                        src={item.imageUrl}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            {/* Add to Cart Button */}
                                            {(() => {
                                                const cartItem = cart.find(c => c.menuItem.id === item.id);
                                                return cartItem ? (
                                                    <div className="flex items-center gap-2 bg-gray-800 rounded-full px-2 py-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                                                            className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
                                                        >
                                                            −
                                                        </button>
                                                        <span className="text-white font-medium w-6 text-center">{cartItem.quantity}</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                                            className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                                                    >
                                                        Add
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            {/* Floating Cart Bar */}
            {cartItemCount > 0 && !showCart && !showCheckout && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg border-t border-gray-800 p-4">
                    <div className="max-w-2xl mx-auto">
                        <button
                            onClick={() => setShowCart(true)}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-semibold flex items-center justify-between px-6 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <span className="bg-orange-600 px-2 py-0.5 rounded text-sm">{cartItemCount}</span>
                                View Cart
                            </span>
                            <span>${cartTotal.toFixed(2)}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            {showCart && (
                <div className="fixed inset-0 z-50 bg-black/80" onClick={() => setShowCart(false)}>
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-800">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white">Your Order</h2>
                                <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-white">✕</button>
                            </div>
                        </div>
                        <div className="p-4 space-y-3">
                            {cart.map(({ menuItem, quantity }) => (
                                <div key={menuItem.id} className="flex items-center justify-between bg-gray-800 rounded-xl p-3">
                                    <div className="flex-1">
                                        <h3 className="text-white font-medium">{menuItem.name}</h3>
                                        <p className="text-gray-400 text-sm">${Number(menuItem.price).toFixed(2)} each</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 bg-gray-700 rounded-full px-2 py-1">
                                            <button onClick={() => removeFromCart(menuItem.id)} className="w-7 h-7 rounded-full bg-gray-600 hover:bg-gray-500 text-white flex items-center justify-center">−</button>
                                            <span className="text-white font-medium w-6 text-center">{quantity}</span>
                                            <button onClick={() => addToCart(menuItem)} className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center">+</button>
                                        </div>
                                        <span className="text-white font-semibold w-16 text-right">${(menuItem.price * quantity).toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-800 space-y-2">
                            <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>${cartSubtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between text-gray-400"><span>Tax (8%)</span><span>${cartTax.toFixed(2)}</span></div>
                            <div className="flex justify-between text-white text-lg font-bold pt-2 border-t border-gray-700"><span>Total</span><span>${cartTotal.toFixed(2)}</span></div>
                        </div>
                        <div className="p-4">
                            <button onClick={() => { setShowCart(false); setShowCheckout(true); }} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-semibold text-lg transition-colors">
                                Proceed to Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden">
                        {paymentSuccess ? (
                            <div className="p-8 text-center">
                                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
                                <p className="text-gray-400 mb-4">Your order has been placed.</p>
                                {orderId && <p className="text-sm text-gray-500">Order ID: {orderId}</p>}
                                <div className="mt-6 p-4 bg-gray-800 rounded-xl">
                                    <p className="text-orange-400 text-sm">📊 This order is now tracked in analytics!</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-white">Checkout</h2>
                                    <button onClick={() => setShowCheckout(false)} className="text-gray-400 hover:text-white">✕</button>
                                </div>
                                <div className="p-4">
                                    <div className="bg-gray-800 rounded-xl p-4 mb-4">
                                        <h3 className="text-white font-medium mb-2">Order Summary</h3>
                                        {cart.map(({ menuItem, quantity }) => (
                                            <div key={menuItem.id} className="flex justify-between text-sm text-gray-400 mb-1">
                                                <span>{quantity}x {menuItem.name}</span>
                                                <span>${(menuItem.price * quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                        <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between text-white font-bold">
                                            <span>Total</span><span>${cartTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-white font-medium">Payment Details</h3>
                                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                            <div className="flex items-center gap-3 text-green-400 text-sm mb-3">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                                <span>Mock Payment (Demo Mode)</span>
                                            </div>
                                            <div className="space-y-3">
                                                <input type="text" defaultValue="4242 4242 4242 4242" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white" disabled />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input type="text" defaultValue="12/28" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white" disabled />
                                                    <input type="text" defaultValue="123" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white" disabled />
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={processPayment} disabled={isProcessingPayment} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 text-white py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2">
                                            {isProcessingPayment ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>) : (<>💳 Pay ${cartTotal.toFixed(2)}</>)}
                                        </button>
                                        <p className="text-center text-xs text-gray-500">This is a demo. No real payment will be processed.</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Feedback Button */}
            {!showCart && !showCheckout && (
                <div className="fixed bottom-24 right-6 z-30">
                    <button
                        onClick={() => setShowFeedbackModal(true)}
                        className="bg-gray-800 hover:bg-gray-700 text-white rounded-full p-3 shadow-lg transition-all hover:scale-105"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 animate-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Share Your Feedback</h3>
                            <button
                                onClick={() => setShowFeedbackModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {feedbackSubmitted ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-white font-medium">Thank you for your feedback!</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-gray-400 text-sm mb-6">
                                    Tell us about your experience. Your feedback helps us improve!
                                </p>

                                {/* Voice Feedback */}
                                {voiceSupported ? (
                                    <div className="text-center mb-6">
                                        <button
                                            onClick={isListening ? stopVoiceCapture : startVoiceCapture}
                                            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all ${isListening
                                                ? 'bg-red-500 animate-pulse'
                                                : 'bg-orange-500 hover:bg-orange-600'
                                                }`}
                                        >
                                            {isListening ? (
                                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <rect x="6" y="4" width="3" height="12" rx="1" />
                                                    <rect x="11" y="4" width="3" height="12" rx="1" />
                                                </svg>
                                            ) : (
                                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                                </svg>
                                            )}
                                        </button>
                                        <p className="text-sm text-gray-400 mt-2">
                                            {isListening ? 'Listening... Tap to stop' : 'Tap to start speaking'}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-yellow-500 text-sm text-center mb-4">
                                        Voice feedback not supported in this browser
                                    </p>
                                )}

                                {voiceError && (
                                    <p className="text-red-400 text-sm text-center mb-4">{voiceError}</p>
                                )}

                                {/* Transcript or Text Input */}
                                <div className="mb-4">
                                    <textarea
                                        value={feedbackTranscript}
                                        onChange={(e) => setFeedbackTranscript(e.target.value)}
                                        placeholder="Your feedback will appear here, or type directly..."
                                        className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>

                                <button
                                    onClick={submitFeedback}
                                    disabled={!feedbackTranscript.trim()}
                                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 rounded-lg transition-colors"
                                >
                                    Submit Feedback
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
