'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui';

interface Restaurant {
    id: number;
    name: string;
}

interface Stats {
    totalRestaurants: number;
    totalMenuItems: number;
    totalOrders: number;
}

export default function DashboardOverview() {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [stats, setStats] = useState<Stats>({ totalRestaurants: 0, totalMenuItems: 0, totalOrders: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/restaurants', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setRestaurants(data.restaurants || []);
                setStats({
                    totalRestaurants: data.restaurants?.length || 0,
                    totalMenuItems: 0,
                    totalOrders: 0,
                });
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
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
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-400 mt-1">Welcome back. Here's what's happening with your restaurants.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Restaurants</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats.totalRestaurants}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Menu Items</p>
                                <p className="text-3xl font-bold text-white mt-1">—</p>
                            </div>
                            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">AI Optimizations</p>
                                <p className="text-3xl font-bold text-white mt-1">—</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link href="/dashboard/restaurants">
                        <Card variant="interactive" className="h-full">
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Add Restaurant</p>
                                        <p className="text-xs text-gray-500">Create new restaurant</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/dashboard/import">
                        <Card variant="interactive" className="h-full">
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Import Data</p>
                                        <p className="text-xs text-gray-500">Upload CSV files</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/dashboard/analytics">
                        <Card variant="interactive" className="h-full">
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">View Analytics</p>
                                        <p className="text-xs text-gray-500">BCG matrix & metrics</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/dashboard/editor">
                        <Card variant="interactive" className="h-full">
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">AI Editor</p>
                                        <p className="text-xs text-gray-500">Optimize with AI</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>

            {/* Recent Restaurants */}
            {restaurants.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">Your Restaurants</h2>
                        <Link href="/dashboard/restaurants" className="text-sm text-gray-400 hover:text-white transition-colors">
                            View all →
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {restaurants.slice(0, 3).map((restaurant) => (
                            <Link key={restaurant.id} href={`/dashboard/restaurants/${restaurant.id}`}>
                                <Card variant="interactive">
                                    <CardContent>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                                                <span className="text-white font-semibold text-sm">
                                                    {restaurant.name[0]}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{restaurant.name}</p>
                                                <p className="text-xs text-gray-500">View details</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {restaurants.length === 0 && (
                <Card>
                    <CardContent>
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No restaurants yet</h3>
                            <p className="text-gray-400 mb-6">Get started by adding your first restaurant</p>
                            <Link 
                                href="/dashboard/restaurants"
                                className="inline-flex items-center px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                Add Restaurant
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
