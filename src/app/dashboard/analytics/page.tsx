'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, Badge } from '@/components/ui';

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

interface OrderAnalytics {
    summary: {
        totalOrders: number;
        totalRevenue: number;
        avgOrderValue: number;
    };
    topItems: TopItem[];
    recentOrders: Order[];
}

export default function AnalyticsPage() {
    const searchParams = useSearchParams();
    const restaurantId = searchParams.get('restaurant');

    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>(restaurantId || '');
    const [orderAnalytics, setOrderAnalytics] = useState<OrderAnalytics | null>(null);
    const [period, setPeriod] = useState<'7d' | '14d' | '30d'>('30d');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRestaurants();
    }, []);

    useEffect(() => {
        if (selectedRestaurant) {
            fetchOrderAnalytics();
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
            const res = await fetch(`/api/analytics/orders?restaurantId=${selectedRestaurant}&period=${period}`);
            if (res.ok) {
                const data = await res.json();
                setOrderAnalytics(data);
            }
        } catch (error) {
            console.error('Failed to fetch order analytics:', error);
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

                    {/* Top Items - What's selling */}
                    <Card>
                        <CardContent>
                            <h3 className="text-lg font-semibold text-white mb-4">🔥 What's Selling</h3>
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

                    {/* Recent Orders */}
                    <Card>
                        <CardContent>
                            <h3 className="text-lg font-semibold text-white mb-4">📋 Recent Orders</h3>
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
