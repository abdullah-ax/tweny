'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
    id: number;
    email: string;
    name: string;
    role: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/login');
            return;
        }

        try {
            setUser(JSON.parse(userData));
        } catch {
            router.push('/login');
        }
        setLoading(false);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-bold text-white">tweny AI</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-300">
                                Welcome, {user?.name || user?.email}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Menu Editor Card */}
                    <Link href="/" className="block">
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition cursor-pointer">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Menu Editor</h3>
                            <p className="text-gray-400 text-sm">
                                Design and optimize your menu layout with AI assistance
                            </p>
                        </div>
                    </Link>

                    {/* Analytics Card */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-green-500 transition cursor-pointer">
                        <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Analytics</h3>
                        <p className="text-gray-400 text-sm">
                            View BCG matrix and menu performance metrics
                        </p>
                        <span className="inline-block mt-3 text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded">Coming Soon</span>
                    </div>

                    {/* Import Data Card */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition cursor-pointer">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Import Data</h3>
                        <p className="text-gray-400 text-sm">
                            Upload CSV files to import menu and sales data
                        </p>
                        <span className="inline-block mt-3 text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded">Coming Soon</span>
                    </div>
                </div>

                {/* Database Status */}
                <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-700/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm">Status</p>
                            <p className="text-2xl font-bold text-green-400">Connected</p>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm">User ID</p>
                            <p className="text-2xl font-bold text-white">{user?.id}</p>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm">Role</p>
                            <p className="text-2xl font-bold text-white capitalize">{user?.role}</p>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm">Database</p>
                            <p className="text-2xl font-bold text-blue-400">Neon</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
