'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, Badge, Button, Input } from '@/components/ui';

interface Restaurant {
    id: number;
    name: string;
}

interface OrderItem {
    id: number;
    name: string;
    quantity: number;
    price: number;
}

interface Order {
    id: number;
    sessionId: string;
    totalAmount: number;
    itemCount: number;
    createdAt: string;
    items: OrderItem[];
}

interface TopItem {
    id: number;
    name: string;
    quantity: number;
    revenue: number;
    orderCount: number;
}

interface OrderedTogether {
    item1: string;
    item2: string;
    count: number;
}

interface OrderAnalytics {
    summary: {
        totalOrders: number;
        totalRevenue: number;
        avgOrderValue: number;
    };
    topItems: TopItem[];
    orderedTogether: OrderedTogether[];
    recentOrders: Order[];
}

interface CategorySummary {
    appetizers: number;
    mainCourses: number;
    desserts: number;
    drinks: number;
    other: number;
    totalItems: number;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface AnalyticsItem {
    menuItemId: number;
    itemName: string;
    totalRevenue: number;
    totalQuantitySold: number;
    grossMargin: number;
    bcgQuadrant: string;
}

// SVG Pie Chart Component
function PieChart({ data }: { data: CategorySummary }) {
    const total = data.appetizers + data.mainCourses + data.desserts + data.drinks + data.other;
    if (total === 0) return null;

    const segments = [
        { label: 'Appetizers', value: data.appetizers, color: '#f97316' },  // Orange
        { label: 'Main Courses', value: data.mainCourses, color: '#22c55e' },  // Green
        { label: 'Desserts', value: data.desserts, color: '#ec4899' },  // Pink
        { label: 'Drinks', value: data.drinks, color: '#3b82f6' },  // Blue
        { label: 'Other', value: data.other, color: '#6b7280' },  // Gray
    ].filter(s => s.value > 0);

    let currentAngle = 0;
    const paths: { d: string; color: string; label: string; value: number; percentage: number }[] = [];

    segments.forEach(segment => {
        const percentage = (segment.value / total) * 100;
        const angle = (segment.value / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;

        // Convert to radians
        const startRad = (startAngle - 90) * (Math.PI / 180);
        const endRad = (endAngle - 90) * (Math.PI / 180);

        // Calculate arc points (center at 100,100, radius 80)
        const x1 = 100 + 80 * Math.cos(startRad);
        const y1 = 100 + 80 * Math.sin(startRad);
        const x2 = 100 + 80 * Math.cos(endRad);
        const y2 = 100 + 80 * Math.sin(endRad);

        const largeArc = angle > 180 ? 1 : 0;

        paths.push({
            d: `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`,
            color: segment.color,
            label: segment.label,
            value: segment.value,
            percentage,
        });

        currentAngle = endAngle;
    });

    return (
        <div className="flex flex-col md:flex-row items-center gap-6">
            <svg viewBox="0 0 200 200" className="w-48 h-48 md:w-56 md:h-56">
                {paths.map((path, i) => (
                    <path
                        key={i}
                        d={path.d}
                        fill={path.color}
                        stroke="#1f1f1f"
                        strokeWidth="2"
                        className="transition-opacity hover:opacity-80"
                    />
                ))}
                {/* Center hole for donut effect */}
                <circle cx="100" cy="100" r="40" fill="#1f1f1f" />
                <text x="100" y="95" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
                    {total}
                </text>
                <text x="100" y="115" textAnchor="middle" fill="#9ca3af" fontSize="12">
                    items
                </text>
            </svg>
            <div className="flex flex-col gap-3">
                {paths.map((segment, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: segment.color }}
                        />
                        <div className="flex-1">
                            <div className="text-white font-medium">{segment.label}</div>
                            <div className="text-gray-400 text-sm">
                                {segment.value} items ({segment.percentage.toFixed(0)}%)
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AnalyticsContent() {
    const searchParams = useSearchParams();
    const restaurantId = searchParams.get('restaurant');

    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>(restaurantId || '');
    const [orderAnalytics, setOrderAnalytics] = useState<OrderAnalytics | null>(null);
    const [categoryData, setCategoryData] = useState<CategorySummary | null>(null);
    const [analyticsItems, setAnalyticsItems] = useState<AnalyticsItem[]>([]);
    const [period, setPeriod] = useState<'7d' | '14d' | '30d'>('30d');
    const [loading, setLoading] = useState(true);

    // Chat state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchRestaurants();
    }, []);

    useEffect(() => {
        if (selectedRestaurant) {
            fetchOrderAnalytics();
            fetchCategoryData();
        }
    }, [selectedRestaurant, period]);

    const fetchRestaurants = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/restaurants', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setRestaurants(data.restaurants || []);
                if (!selectedRestaurant && data.restaurants?.length > 0) {
                    setSelectedRestaurant(data.restaurants[0].id.toString());
                }
            }
        } catch (error) {
            console.error('Failed to fetch restaurants:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderAnalytics = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/analytics/orders?restaurantId=${selectedRestaurant}&period=${period}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setOrderAnalytics(data);
            }
        } catch (error) {
            console.error('Failed to fetch order analytics:', error);
        }
    };

    const fetchCategoryData = async () => {
        try {
            const token = localStorage.getItem('token');
            // Fetch menu sections to categorize items
            const sectionsRes = await fetch(`/api/restaurants/${selectedRestaurant}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            if (sectionsRes.ok) {
                const data = await sectionsRes.json();
                const sections = data.sections || [];
                
                // Count items by category
                const counts: CategorySummary = {
                    appetizers: 0,
                    mainCourses: 0,
                    desserts: 0,
                    drinks: 0,
                    other: 0,
                    totalItems: 0,
                };
                
                sections.forEach((section: { title: string; items: unknown[] }) => {
                    const title = section.title.toLowerCase();
                    const itemCount = section.items?.length || 0;
                    counts.totalItems += itemCount;
                    
                    if (title.includes('appetizer') || title.includes('starter') || title.includes('small')) {
                        counts.appetizers += itemCount;
                    } else if (title.includes('main') || title.includes('entree') || title.includes('course')) {
                        counts.mainCourses += itemCount;
                    } else if (title.includes('dessert') || title.includes('sweet')) {
                        counts.desserts += itemCount;
                    } else if (title.includes('drink') || title.includes('beverage') || title.includes('cocktail') || title.includes('wine') || title.includes('beer')) {
                        counts.drinks += itemCount;
                    } else {
                        counts.other += itemCount;
                    }
                });
                
                setCategoryData(counts);
            }
            
            // Also fetch analytics items for chat context
            const periodDays = period === '7d' ? 7 : period === '14d' ? 14 : 30;
            const analyticsRes = await fetch(`/api/restaurants/${selectedRestaurant}/analytics?period=${periodDays}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json();
                if (analyticsData.items) {
                    setAnalyticsItems(analyticsData.items);
                }
            }
        } catch (error) {
            console.error('Failed to fetch category data:', error);
        }
    };

    // Chat functionality
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const sendChatMessage = async () => {
        if (!chatInput.trim() || chatLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: chatInput.trim(),
            timestamp: new Date(),
        };

        setChatMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setChatLoading(true);

        try {
            const token = localStorage.getItem('token');

            // Build context for AI with real analytics data
            const analyticsContext = {
                summary: orderAnalytics?.summary,
                categories: categoryData,
                topItems: orderAnalytics?.topItems?.slice(0, 5),
                itemDetails: analyticsItems.slice(0, 20).map(item => ({
                    name: item.itemName,
                    revenue: item.totalRevenue,
                    quantity: item.totalQuantitySold,
                    margin: item.grossMargin,
                })),
                period,
            };

            const prompt = `You are an analytics assistant for a restaurant. You have access to the following real data:

ANALYTICS DATA:
${JSON.stringify(analyticsContext, null, 2)}

Answer the user's question based on this data. Be specific and reference actual items/numbers when possible. The categories show menu composition: appetizers, main courses, desserts, drinks.

User question: ${chatInput}`;

            const res = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: prompt,
                    restaurantId: Number(selectedRestaurant),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const assistantMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.response || 'Sorry, I could not process your request.',
                    timestamp: new Date(),
                };
                setChatMessages(prev => [...prev, assistantMessage]);
            } else {
                throw new Error('Failed to get response');
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, there was an error processing your question. Please try again.',
                timestamp: new Date(),
            };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setChatLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Orders</h1>
                    <p className="text-gray-400 mt-1">See what customers are ordering</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as '7d' | '14d' | '30d')}
                        className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="14d">Last 14 days</option>
                        <option value="30d">Last 30 days</option>
                    </select>
                    <select
                        value={selectedRestaurant}
                        onChange={(e) => setSelectedRestaurant(e.target.value)}
                        className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                        <option value="">Select restaurant</option>
                        {restaurants.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedRestaurant ? (
                <Card>
                    <CardContent>
                        <div className="text-center py-12">
                            <p className="text-gray-400">Select a restaurant to view orders</p>
                        </div>
                    </CardContent>
                </Card>
            ) : orderAnalytics ? (
                <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent>
                                <div className="text-gray-400 text-sm mb-1">Total Orders</div>
                                <div className="text-3xl font-bold text-white">{orderAnalytics.summary.totalOrders}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent>
                                <div className="text-gray-400 text-sm mb-1">Total Revenue</div>
                                <div className="text-3xl font-bold text-white">${orderAnalytics.summary.totalRevenue.toFixed(2)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent>
                                <div className="text-gray-400 text-sm mb-1">Avg Order</div>
                                <div className="text-3xl font-bold text-white">${orderAnalytics.summary.avgOrderValue.toFixed(2)}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Menu Items by Category Pie Chart */}
                    {categoryData && categoryData.totalItems > 0 && (
                        <Card>
                            <CardContent>
                                <h3 className="text-lg font-semibold text-white mb-4">Menu Items by Category</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Distribution of your menu items across categories
                                </p>
                                <PieChart data={categoryData} />
                                <div className="mt-6 pt-4 border-t border-gray-800">
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                                        <div>
                                            <div className="text-orange-400 font-bold text-xl">{categoryData.appetizers}</div>
                                            <div className="text-gray-400 text-sm">Appetizers</div>
                                        </div>
                                        <div>
                                            <div className="text-green-400 font-bold text-xl">{categoryData.mainCourses}</div>
                                            <div className="text-gray-400 text-sm">Main Courses</div>
                                        </div>
                                        <div>
                                            <div className="text-pink-400 font-bold text-xl">{categoryData.desserts}</div>
                                            <div className="text-gray-400 text-sm">Desserts</div>
                                        </div>
                                        <div>
                                            <div className="text-blue-400 font-bold text-xl">{categoryData.drinks}</div>
                                            <div className="text-gray-400 text-sm">Drinks</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 font-bold text-xl">{categoryData.other}</div>
                                            <div className="text-gray-400 text-sm">Other</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Top Items - What's selling */}
                    <Card>
                        <CardContent>
                            <h3 className="text-lg font-semibold text-white mb-4">What's Selling</h3>
                            {orderAnalytics.topItems.length > 0 ? (
                                <div className="space-y-3">
                                    {orderAnalytics.topItems.slice(0, 10).map((item, idx) => (
                                        <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-yellow-500 text-black' :
                                                idx === 1 ? 'bg-gray-300 text-black' :
                                                    idx === 2 ? 'bg-orange-600 text-white' :
                                                        'bg-gray-700 text-gray-300'
                                                }`}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-white font-medium">{item.name}</div>
                                                <div className="text-sm text-gray-400">
                                                    {item.quantity} sold • {item.orderCount} orders
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-green-400">${item.revenue.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    No orders yet. Share your QR code to start getting orders!
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Ordered Together */}
                    <Card>
                        <CardContent>
                            <h3 className="text-lg font-semibold text-white mb-4">🔗 Frequently Ordered Together</h3>
                            {orderAnalytics.orderedTogether && orderAnalytics.orderedTogether.length > 0 ? (
                                <div className="space-y-3">
                                    {orderAnalytics.orderedTogether.slice(0, 10).map((pair, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-purple-500 text-white' :
                                                idx === 1 ? 'bg-pink-500 text-white' :
                                                    idx === 2 ? 'bg-indigo-500 text-white' :
                                                        'bg-gray-700 text-gray-300'
                                                }`}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-white font-medium">
                                                    <span className="text-blue-400">{pair.item1}</span>
                                                    <span className="mx-2 text-gray-400">+</span>
                                                    <span className="text-blue-400">{pair.item2}</span>
                                                </div>
                                                <div className="text-sm text-gray-400">
                                                    Ordered together {pair.count} time{pair.count !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-purple-400">{pair.count}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    Not enough order data yet. Need at least 2 orders with the same item combination.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Orders */}
                    <Card>
                        <CardContent>
                            <h3 className="text-lg font-semibold text-white mb-4">Recent Orders</h3>
                            {orderAnalytics.recentOrders && orderAnalytics.recentOrders.length > 0 ? (
                                <div className="space-y-4">
                                    {orderAnalytics.recentOrders.slice(0, 10).map((order) => (
                                        <div key={order.id} className="p-4 bg-gray-800/50 rounded-lg">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="info">Order #{order.id}</Badge>
                                                    <span className="text-gray-400 text-sm">
                                                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="text-lg font-bold text-white">
                                                    ${order.totalAmount.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {order.items.map((item, i) => (
                                                    <span key={i} className="px-3 py-1 bg-gray-700 rounded-full text-sm text-white">
                                                        {item.quantity}x {item.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    No orders yet
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Analytics Chat */}
                    <Card>
                        <CardContent>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">Ask About Your Data</h3>
                                <Button
                                    variant={showChat ? 'primary' : 'secondary'}
                                    onClick={() => setShowChat(!showChat)}
                                >
                                    {showChat ? 'Hide Chat' : 'Open Chat'}
                                </Button>
                            </div>

                            {showChat && (
                                <div className="border border-gray-800 rounded-lg overflow-hidden">
                                    {/* Chat Messages */}
                                    <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-900/50">
                                        {chatMessages.length === 0 ? (
                                            <div className="text-center text-gray-400 py-8">
                                                <p className="mb-2">Ask questions about your analytics data:</p>
                                                <div className="space-y-2 text-sm">
                                                    <p className="text-gray-500">"What are my best selling items?"</p>
                                                    <p className="text-gray-500">"Which items should I promote more?"</p>
                                                    <p className="text-gray-500">"What items have the highest profit margin?"</p>
                                                    <p className="text-gray-500">"How can I improve my Dogs category?"</p>
                                                </div>
                                            </div>
                                        ) : (
                                            chatMessages.map((msg) => (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user'
                                                                ? 'bg-white text-black'
                                                                : 'bg-gray-800 text-white'
                                                            }`}
                                                    >
                                                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                                        <p className="text-xs mt-1 opacity-50">
                                                            {msg.timestamp.toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {chatLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-gray-800 p-3 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                        <span className="text-sm text-gray-400">Analyzing...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Chat Input */}
                                    <div className="p-3 border-t border-gray-800 bg-gray-900">
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                sendChatMessage();
                                            }}
                                            className="flex gap-2"
                                        >
                                            <Input
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                placeholder="Ask about your analytics data..."
                                                disabled={chatLoading}
                                                className="flex-1"
                                            />
                                            <Button
                                                type="submit"
                                                disabled={!chatInput.trim() || chatLoading}
                                            >
                                                Send
                                            </Button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card>
                    <CardContent>
                        <div className="text-center py-12">
                            <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-gray-400">Loading orders...</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" /></div>}>
            <AnalyticsContent />
        </Suspense>
    );
}
