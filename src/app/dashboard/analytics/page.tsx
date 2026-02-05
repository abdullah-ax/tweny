'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, Badge } from '@/components/ui';

interface MenuItem {
    id: number;
    name: string;
    price: string;
    cost: string | null;
    popularity?: number;
    profitability?: number;
    category?: 'star' | 'workhorse' | 'puzzle' | 'dog';
}

interface Restaurant {
    id: number;
    name: string;
}

export default function AnalyticsPage() {
    const searchParams = useSearchParams();
    const restaurantId = searchParams.get('restaurant');

    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>(restaurantId || '');
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRestaurants();
    }, []);

    useEffect(() => {
        if (selectedRestaurant) {
            fetchMenuItems();
        }
    }, [selectedRestaurant]);

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

    const fetchMenuItems = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/restaurants/${selectedRestaurant}/menu`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                // Add mock BCG categories for demo
                const items = (data.items || []).map((item: MenuItem, i: number) => ({
                    ...item,
                    popularity: Math.random() * 100,
                    profitability: item.cost
                        ? ((parseFloat(item.price) - parseFloat(item.cost)) / parseFloat(item.price)) * 100
                        : Math.random() * 100,
                    category: ['star', 'workhorse', 'puzzle', 'dog'][i % 4] as MenuItem['category'],
                }));
                setMenuItems(items);
            }
        } catch (error) {
            console.error('Failed to fetch menu items:', error);
        }
    };

    const categorizeItem = (popularity: number, profitability: number): MenuItem['category'] => {
        const highPop = popularity > 50;
        const highProfit = profitability > 50;

        if (highPop && highProfit) return 'star';
        if (highPop && !highProfit) return 'workhorse';
        if (!highPop && highProfit) return 'puzzle';
        return 'dog';
    };

    const stars = menuItems.filter(i => i.category === 'star');
    const workhorses = menuItems.filter(i => i.category === 'workhorse');
    const puzzles = menuItems.filter(i => i.category === 'puzzle');
    const dogs = menuItems.filter(i => i.category === 'dog');

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
                    <h1 className="text-2xl font-bold text-white">Analytics</h1>
                    <p className="text-gray-400 mt-1">BCG Matrix analysis for menu optimization</p>
                </div>
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

            {!selectedRestaurant ? (
                <Card>
                    <CardContent>
                        <div className="text-center py-12">
                            <p className="text-gray-400">Select a restaurant to view analytics</p>
                        </div>
                    </CardContent>
                </Card>
            ) : menuItems.length === 0 ? (
                <Card>
                    <CardContent>
                        <div className="text-center py-12">
                            <p className="text-gray-400">No menu items found. Import data to see analytics.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* BCG Matrix Visualization */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Matrix Grid */}
                        <Card className="lg:col-span-2">
                            <CardContent>
                                <h3 className="text-lg font-semibold text-white mb-6">BCG Matrix</h3>
                                <div className="grid grid-cols-2 gap-4 h-96">
                                    {/* Stars - High Popularity, High Profitability */}
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 relative overflow-hidden">
                                        <div className="absolute top-2 left-3">
                                            <span className="text-yellow-400 text-xs font-medium uppercase tracking-wider">Stars</span>
                                        </div>
                                        <div className="absolute top-2 right-3">
                                            <Badge variant="warning" size="sm">{stars.length}</Badge>
                                        </div>
                                        <div className="mt-8 space-y-2 max-h-36 overflow-y-auto">
                                            {stars.slice(0, 5).map((item) => (
                                                <div key={item.id} className="flex items-center justify-between text-sm">
                                                    <span className="text-white truncate">{item.name}</span>
                                                    <span className="text-yellow-400">${parseFloat(item.price).toFixed(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="absolute bottom-3 left-3 text-xs text-yellow-400/60">
                                            High popularity & profit → Promote heavily
                                        </p>
                                    </div>

                                    {/* Puzzles - Low Popularity, High Profitability */}
                                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 relative overflow-hidden">
                                        <div className="absolute top-2 left-3">
                                            <span className="text-purple-400 text-xs font-medium uppercase tracking-wider">Puzzles</span>
                                        </div>
                                        <div className="absolute top-2 right-3">
                                            <Badge variant="info" size="sm">{puzzles.length}</Badge>
                                        </div>
                                        <div className="mt-8 space-y-2 max-h-36 overflow-y-auto">
                                            {puzzles.slice(0, 5).map((item) => (
                                                <div key={item.id} className="flex items-center justify-between text-sm">
                                                    <span className="text-white truncate">{item.name}</span>
                                                    <span className="text-purple-400">${parseFloat(item.price).toFixed(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="absolute bottom-3 left-3 text-xs text-purple-400/60">
                                            High profit, low sales → Needs marketing
                                        </p>
                                    </div>

                                    {/* Workhorses - High Popularity, Low Profitability */}
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 relative overflow-hidden">
                                        <div className="absolute top-2 left-3">
                                            <span className="text-blue-400 text-xs font-medium uppercase tracking-wider">Workhorses</span>
                                        </div>
                                        <div className="absolute top-2 right-3">
                                            <Badge variant="info" size="sm">{workhorses.length}</Badge>
                                        </div>
                                        <div className="mt-8 space-y-2 max-h-36 overflow-y-auto">
                                            {workhorses.slice(0, 5).map((item) => (
                                                <div key={item.id} className="flex items-center justify-between text-sm">
                                                    <span className="text-white truncate">{item.name}</span>
                                                    <span className="text-blue-400">${parseFloat(item.price).toFixed(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="absolute bottom-3 left-3 text-xs text-blue-400/60">
                                            Popular but low margin → Optimize cost
                                        </p>
                                    </div>

                                    {/* Dogs - Low Popularity, Low Profitability */}
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 relative overflow-hidden">
                                        <div className="absolute top-2 left-3">
                                            <span className="text-red-400 text-xs font-medium uppercase tracking-wider">Dogs</span>
                                        </div>
                                        <div className="absolute top-2 right-3">
                                            <Badge variant="danger" size="sm">{dogs.length}</Badge>
                                        </div>
                                        <div className="mt-8 space-y-2 max-h-36 overflow-y-auto">
                                            {dogs.slice(0, 5).map((item) => (
                                                <div key={item.id} className="flex items-center justify-between text-sm">
                                                    <span className="text-white truncate">{item.name}</span>
                                                    <span className="text-red-400">${parseFloat(item.price).toFixed(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="absolute bottom-3 left-3 text-xs text-red-400/60">
                                            Low performance → Consider removing
                                        </p>
                                    </div>
                                </div>

                                {/* Axis labels */}
                                <div className="mt-4 flex justify-between text-xs text-gray-500">
                                    <span>← Low Popularity</span>
                                    <span>High Popularity →</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Summary Stats */}
                        <Card>
                            <CardContent>
                                <h3 className="text-lg font-semibold text-white mb-4">Summary</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Total Items</span>
                                        <span className="text-white font-medium">{menuItems.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Stars</span>
                                        <span className="text-yellow-400 font-medium">{stars.length} ({Math.round(stars.length / menuItems.length * 100)}%)</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Workhorses</span>
                                        <span className="text-blue-400 font-medium">{workhorses.length} ({Math.round(workhorses.length / menuItems.length * 100)}%)</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Puzzles</span>
                                        <span className="text-purple-400 font-medium">{puzzles.length} ({Math.round(puzzles.length / menuItems.length * 100)}%)</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Dogs</span>
                                        <span className="text-red-400 font-medium">{dogs.length} ({Math.round(dogs.length / menuItems.length * 100)}%)</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recommendations */}
                        <Card>
                            <CardContent>
                                <h3 className="text-lg font-semibold text-white mb-4">AI Recommendations</h3>
                                <div className="space-y-3">
                                    {stars.length > 0 && (
                                        <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                                            <p className="text-sm text-yellow-200">
                                                <span className="font-medium">Promote Stars:</span> Feature {stars[0]?.name} prominently on your menu
                                            </p>
                                        </div>
                                    )}
                                    {dogs.length > 0 && (
                                        <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                                            <p className="text-sm text-red-200">
                                                <span className="font-medium">Review Dogs:</span> Consider removing or repricing {dogs[0]?.name}
                                            </p>
                                        </div>
                                    )}
                                    {puzzles.length > 0 && (
                                        <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                                            <p className="text-sm text-purple-200">
                                                <span className="font-medium">Market Puzzles:</span> Increase visibility of {puzzles[0]?.name}
                                            </p>
                                        </div>
                                    )}
                                    {workhorses.length > 0 && (
                                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                                            <p className="text-sm text-blue-200">
                                                <span className="font-medium">Optimize Costs:</span> Review ingredient costs for {workhorses[0]?.name}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
