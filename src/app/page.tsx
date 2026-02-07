'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    }, []);

    return (
        <div className="min-h-screen bg-black">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-900">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white tracking-tight">tweny</h1>
                    <div className="flex items-center gap-4">
                        {isLoggedIn ? (
                            <Link
                                href="/dashboard"
                                className="text-sm px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero */}
            <main className="pt-16">
                <section className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        {/* Headline */}
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
                            QR menus that
                            <br />
                            <span className="text-orange-500">actually work.</span>
                        </h2>

                        {/* Subheadline */}
                        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">
                            Upload your menu PDF. Get a mobile-optimized QR menu with built-in ordering, 
                            analytics, and AI-assisted design. No templates, no monthly fees per scan.
                        </p>

                        {/* CTA */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href={isLoggedIn ? "/dashboard" : "/register"}
                                className="w-full sm:w-auto px-8 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition text-center"
                            >
                                Create Your Menu
                            </Link>
                            <Link
                                href="/login"
                                className="w-full sm:w-auto px-8 py-3 bg-gray-900 text-white font-medium rounded-lg border border-gray-800 hover:border-gray-700 transition text-center"
                            >
                                Sign In
                            </Link>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="py-24 px-6 border-t border-gray-900">
                    <div className="max-w-5xl mx-auto">
                        <h3 className="text-2xl font-bold text-white text-center mb-4">
                            How it works
                        </h3>
                        <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
                            From PDF to live QR menu in minutes
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-400 font-bold">
                                    1
                                </div>
                                <h4 className="text-white font-medium mb-2">Upload</h4>
                                <p className="text-gray-500 text-sm">
                                    Drop your menu PDF or image. We extract items, prices, and colors automatically.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-400 font-bold">
                                    2
                                </div>
                                <h4 className="text-white font-medium mb-2">Choose Strategy</h4>
                                <p className="text-gray-500 text-sm">
                                    Pick a layout strategy: Golden Triangle, Price Anchoring, Decoy Pricing, or Social Proof.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-400 font-bold">
                                    3
                                </div>
                                <h4 className="text-white font-medium mb-2">Customize</h4>
                                <p className="text-gray-500 text-sm">
                                    Chat with AI to adjust colors, layout, badges, and descriptions. See changes live.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-400 font-bold">
                                    4
                                </div>
                                <h4 className="text-white font-medium mb-2">Deploy</h4>
                                <p className="text-gray-500 text-sm">
                                    Get your QR code. Customers scan, browse, and order. You see every interaction.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="py-24 px-6 border-t border-gray-900">
                    <div className="max-w-5xl mx-auto">
                        <h3 className="text-2xl font-bold text-white text-center mb-4">
                            What you get
                        </h3>
                        <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
                            Everything built-in, nothing extra to install
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-2">Mobile-First Menus</h4>
                                <p className="text-gray-400 text-sm">
                                    Fast-loading, touch-friendly menus optimized for phones. Cart and checkout included.
                                </p>
                            </div>

                            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-2">AI Design Chat</h4>
                                <p className="text-gray-400 text-sm">
                                    Tell AI what you want: "make it darker", "highlight the steak", "use my brand colors". It happens.
                                </p>
                            </div>

                            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-2">Order Analytics</h4>
                                <p className="text-gray-400 text-sm">
                                    See what sells. Track orders, revenue, and item performance with BCG matrix classification.
                                </p>
                            </div>

                            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-2">Voice Feedback</h4>
                                <p className="text-gray-400 text-sm">
                                    Customers can leave voice feedback before checkout. Hear what they think in their own words.
                                </p>
                            </div>

                            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-2">Menu Engineering</h4>
                                <p className="text-gray-400 text-sm">
                                    Psychology-backed layouts: Golden Triangle, Price Anchoring, Decoy Pricing. Built on real research.
                                </p>
                            </div>

                            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-2">QR Code Ready</h4>
                                <p className="text-gray-400 text-sm">
                                    Download your QR code instantly. Print it, display it, share it. Works everywhere.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 px-6 border-t border-gray-900">
                    <div className="max-w-2xl mx-auto text-center">
                        <h3 className="text-3xl font-bold text-white mb-4">
                            Try it yourself
                        </h3>
                        <p className="text-gray-400 mb-8">
                            Create an account and upload your menu. See what tweny can do.
                        </p>
                        <Link
                            href="/register"
                            className="inline-flex px-8 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition"
                        >
                            Get Started
                        </Link>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-8 px-6 border-t border-gray-900">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                        <p className="text-sm text-gray-600">© 2026 tweny</p>
                        <p className="text-sm text-gray-600">QR menus for restaurants</p>
                    </div>
                </footer>
            </main>
        </div>
    );
}
