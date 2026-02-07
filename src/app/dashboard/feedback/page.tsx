'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, Badge } from '@/components/ui';

interface Restaurant {
    id: number;
    name: string;
}

interface FeedbackItem {
    id: number;
    source: string;
    transcript: string;
    createdAt: string;
    metadata?: {
        sessionId?: string;
    };
}

interface EventSummary {
    menuViews: number;
    itemClicks: number;
    feedbackCount: number;
    topClickedItems: Array<{ name: string; count: number }>;
}

function FeedbackContent() {
    const searchParams = useSearchParams();
    const preselectedRestaurant = searchParams.get('restaurant');

    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>(preselectedRestaurant || '');
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [eventSummary, setEventSummary] = useState<EventSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiInsights, setAiInsights] = useState<string | null>(null);

    useEffect(() => {
        fetchRestaurants();
    }, []);

    useEffect(() => {
        if (selectedRestaurant) {
            fetchFeedbackData();
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

    const fetchFeedbackData = async () => {
        try {
            const token = localStorage.getItem('token');

            // Fetch feedback
            const feedbackRes = await fetch(`/api/restaurants/${selectedRestaurant}/feedback`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (feedbackRes.ok) {
                const data = await feedbackRes.json();
                setFeedback(data.feedback || []);
            }

            // Fetch event summary
            const eventsRes = await fetch(`/api/restaurants/${selectedRestaurant}/events/summary`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (eventsRes.ok) {
                const data = await eventsRes.json();
                setEventSummary(data.summary);
            }
        } catch (error) {
            console.error('Failed to fetch feedback data:', error);
        }
    };

    const analyzeWithAI = async () => {
        if (feedback.length === 0) return;

        setAnalyzing(true);
        try {
            const token = localStorage.getItem('token');

            // Compile feedback for analysis
            const feedbackText = feedback.map(f => f.transcript).join('\n');
            const message = `Analyze this customer feedback and provide actionable insights for menu optimization:\n\n${feedbackText}\n\nProvide specific recommendations based on the feedback themes.`;

            const res = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    restaurantId: Number(selectedRestaurant),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setAiInsights(data.response);
            }
        } catch (error) {
            console.error('Failed to analyze feedback:', error);
        } finally {
            setAnalyzing(false);
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
                    <h1 className="text-2xl font-bold text-white">Customer Feedback</h1>
                    <p className="text-gray-400 mt-1">Voice feedback and menu analytics from QR code menus</p>
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
                            <p className="text-gray-400">Select a restaurant to view feedback</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Event Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card padding="sm">
                            <CardContent>
                                <p className="text-sm text-gray-400">Menu Views</p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    {eventSummary?.menuViews || 0}
                                </p>
                            </CardContent>
                        </Card>
                        <Card padding="sm">
                            <CardContent>
                                <p className="text-sm text-gray-400">Item Clicks</p>
                                <p className="text-2xl font-bold text-blue-400 mt-1">
                                    {eventSummary?.itemClicks || 0}
                                </p>
                            </CardContent>
                        </Card>
                        <Card padding="sm">
                            <CardContent>
                                <p className="text-sm text-gray-400">Feedback Received</p>
                                <p className="text-2xl font-bold text-orange-400 mt-1">
                                    {feedback.length}
                                </p>
                            </CardContent>
                        </Card>
                        <Card padding="sm">
                            <CardContent>
                                <p className="text-sm text-gray-400">Engagement Rate</p>
                                <p className="text-2xl font-bold text-green-400 mt-1">
                                    {eventSummary?.menuViews
                                        ? `${((eventSummary.itemClicks / eventSummary.menuViews) * 100).toFixed(1)}%`
                                        : '0%'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Feedback List */}
                        <Card>
                            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                                <h3 className="font-semibold text-white">Recent Feedback</h3>
                                <Badge variant="info">{feedback.length} total</Badge>
                            </div>
                            <CardContent className="max-h-96 overflow-y-auto">
                                {feedback.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No feedback yet</p>
                                        <p className="text-xs mt-1">Feedback from QR code menus will appear here</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {feedback.map((item) => (
                                            <div
                                                key={item.id}
                                                className="p-3 bg-gray-800/50 rounded-lg"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <Badge variant={item.source === 'voice' ? 'warning' : 'default'}>
                                                        {item.source === 'voice' ? '🎙️ Voice' : '💬 Text'}
                                                    </Badge>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-300">{item.transcript}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* AI Insights */}
                        <Card>
                            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                                <h3 className="font-semibold text-white">AI Insights</h3>
                                <Button
                                    size="sm"
                                    onClick={analyzeWithAI}
                                    loading={analyzing}
                                    disabled={feedback.length === 0}
                                >
                                    ✨ Analyze Feedback
                                </Button>
                            </div>
                            <CardContent>
                                {aiInsights ? (
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
                                            <p className="text-gray-300 whitespace-pre-wrap">{aiInsights}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>Click "Analyze Feedback" to get AI-powered insights</p>
                                        <p className="text-xs mt-1">The AI will analyze themes and suggest menu optimizations</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top Clicked Items */}
                    {eventSummary?.topClickedItems && eventSummary.topClickedItems.length > 0 && (
                        <Card>
                            <div className="p-4 border-b border-gray-800">
                                <h3 className="font-semibold text-white">Most Clicked Items</h3>
                            </div>
                            <CardContent>
                                <div className="space-y-3">
                                    {eventSummary.topClickedItems.map((item, index) => (
                                        <div
                                            key={item.name}
                                            className="flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500 text-sm w-6">{index + 1}.</span>
                                                <span className="text-white">{item.name}</span>
                                            </div>
                                            <span className="text-gray-400">{item.count} clicks</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
export default function FeedbackPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" /></div>}>
            <FeedbackContent />
        </Suspense>
    );
}