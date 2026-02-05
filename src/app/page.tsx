'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            router.push('/dashboard');
        } else {
            setIsChecking(false);
        }
    }, [router]);

    // Show nothing while checking auth - prevents flash
    if (isChecking) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-900">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white tracking-tight">tweny</h1>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-sm text-gray-400 hover:text-white transition"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/register"
                            className="text-sm px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <main className="pt-16">
                <section className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900 border border-gray-800 rounded-full text-xs text-gray-400 mb-8">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            AI-Powered Menu Optimization
                        </div>

                        {/* Headline */}
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
                            Optimize your menu.
                            <br />
                            <span className="text-gray-500">Maximize your profit.</span>
                        </h2>

                        {/* Subheadline */}
                        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">
                            tweny uses AI to analyze your menu performance, identify opportunities,
                            and suggest data-driven optimizations to increase revenue.
                        </p>

                        {/* CTA */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto px-8 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition text-center"
                            >
                                Start Free Trial
                            </Link>
                            <Link
                                href="/login"
                                className="w-full sm:w-auto px-8 py-3 bg-gray-900 text-white font-medium rounded-lg border border-gray-800 hover:border-gray-700 transition text-center"
                            >
                                Sign In
                            </Link>
                        </div>

                        {/* Social Proof */}
                        <p className="mt-10 text-sm text-gray-600">
                            Trusted by restaurants optimizing $10M+ in annual revenue
                        </p>
                    </div>
                </section>

                {/* Features */}
                <section className="py-24 px-6 border-t border-gray-900">
                    <div className="max-w-5xl mx-auto">
                        <h3 className="text-2xl font-bold text-white text-center mb-16">
                            Everything you need to optimize
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-2">BCG Matrix Analysis</h4>
                                <p className="text-gray-400 text-sm">
                                    Automatically categorize menu items as Stars, Workhorses, Puzzles, or Dogs based on popularity and profitability.
                                </p>
                            </div>

                            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-2">AI Recommendations</h4>
                                <p className="text-gray-400 text-sm">
                                    Get intelligent suggestions for pricing adjustments, menu positioning, and item promotion strategies.
                                </p>
                            </div>

                            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-2">Visual Menu Editor</h4>
                                <p className="text-gray-400 text-sm">
                                    Drag-and-drop interface to reorganize menu sections and items with real-time profitability indicators.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 px-6 border-t border-gray-900">
                    <div className="max-w-2xl mx-auto text-center">
                        <h3 className="text-3xl font-bold text-white mb-4">
                            Ready to optimize your menu?
                        </h3>
                        <p className="text-gray-400 mb-8">
                            Start your free trial today. No credit card required.
                        </p>
                        <Link
                            href="/register"
                            className="inline-flex px-8 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition"
                        >
                            Get Started Free
                        </Link>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-8 px-6 border-t border-gray-900">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                        <p className="text-sm text-gray-600">© 2024 tweny. All rights reserved.</p>
                        <p className="text-sm text-gray-600">Built for restaurants 🍽️</p>
                    </div>
                </footer>
            </main>
        </div>
    );
}
