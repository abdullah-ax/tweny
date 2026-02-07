'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui';

interface Restaurant {
    id: number;
    name: string;
}

export default function QRCodePage() {
    const searchParams = useSearchParams();
    const preselectedRestaurant = searchParams.get('restaurant');

    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>(preselectedRestaurant || '');
    const [loading, setLoading] = useState(true);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [menuUrl, setMenuUrl] = useState<string>('');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchRestaurants();
    }, []);

    useEffect(() => {
        if (selectedRestaurant) {
            generateQRCode();
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

    const generateQRCode = async () => {
        if (!selectedRestaurant) return;

        setGenerating(true);

        // Generate menu URL
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const url = `${baseUrl}/menu/${selectedRestaurant}`;
        setMenuUrl(url);

        // Generate QR code using a simple SVG-based approach
        try {
            // Use QR Server API for simplicity (can be replaced with local library)
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&bgcolor=000000&color=FFFFFF`;
            setQrDataUrl(qrApiUrl);
        } catch (error) {
            console.error('Failed to generate QR code:', error);
        } finally {
            setGenerating(false);
        }
    };

    const downloadQRCode = async () => {
        if (!qrDataUrl) return;

        try {
            const response = await fetch(qrDataUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `menu-qr-${selectedRestaurant}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download QR code:', error);
        }
    };

    const copyMenuUrl = () => {
        navigator.clipboard.writeText(menuUrl);
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
            <div>
                <h1 className="text-2xl font-bold text-white">QR Code Generator</h1>
                <p className="text-gray-400 mt-1">Generate QR codes for your digital menu</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Settings */}
                <Card>
                    <CardContent>
                        <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Restaurant
                                </label>
                                <select
                                    value={selectedRestaurant}
                                    onChange={(e) => setSelectedRestaurant(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                >
                                    <option value="">Select a restaurant...</option>
                                    {restaurants.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {menuUrl && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Menu URL
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={menuUrl}
                                            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm"
                                        />
                                        <Button variant="secondary" onClick={copyMenuUrl}>
                                            Copy
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-800">
                                <h4 className="text-sm font-medium text-gray-300 mb-3">Features</h4>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Voice feedback collection
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Item click tracking
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Active offers display
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Mobile-optimized design
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* QR Code Preview */}
                <Card>
                    <CardContent>
                        <h3 className="text-lg font-semibold text-white mb-4">QR Code</h3>

                        {!selectedRestaurant ? (
                            <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-700 rounded-xl">
                                <p className="text-gray-500">Select a restaurant to generate QR code</p>
                            </div>
                        ) : generating ? (
                            <div className="h-80 flex items-center justify-center">
                                <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
                            </div>
                        ) : qrDataUrl ? (
                            <div className="space-y-4">
                                <div className="bg-white p-6 rounded-xl flex items-center justify-center">
                                    <img
                                        src={qrDataUrl}
                                        alt="QR Code"
                                        className="max-w-[300px]"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button onClick={downloadQRCode} className="flex-1">
                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download PNG
                                    </Button>
                                    <Button variant="secondary" onClick={() => window.open(menuUrl, '_blank')}>
                                        Preview Menu
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>

            {/* Usage Tips */}
            <Card>
                <CardContent>
                    <h3 className="text-lg font-semibold text-white mb-4">Usage Tips</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                                <span className="text-xl">🪧</span>
                            </div>
                            <h4 className="font-medium text-white">Table Tents</h4>
                            <p className="text-sm text-gray-400">
                                Print QR codes on table tents for easy access. Customers can scan to browse your menu.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                <span className="text-xl">🧾</span>
                            </div>
                            <h4 className="font-medium text-white">Receipts</h4>
                            <p className="text-sm text-gray-400">
                                Add QR code to receipts to encourage feedback and repeat visits.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                                <span className="text-xl">📱</span>
                            </div>
                            <h4 className="font-medium text-white">Social Media</h4>
                            <p className="text-sm text-gray-400">
                                Share the menu link on social media to let customers browse before visiting.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
