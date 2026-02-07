'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { Experiment, ScientificInsight, generateInsights } from '@/lib/services/experiment.types';

export default function ExperimentsPage() {
    const router = useRouter();
    const [experiment, setExperiment] = useState<Experiment | null>(null);
    const [insights, setInsights] = useState<ScientificInsight[]>([]);
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const stored = sessionStorage.getItem('currentExperiment');
        if (stored) {
            const exp = JSON.parse(stored) as Experiment;
            setExperiment(exp);
            // Generate initial insights
            const initialInsights = generateInsights(exp.metrics);
            setInsights(initialInsights);
        }
    }, []);

    const handleSendMessage = async () => {
        if (!chatMessage.trim() || !experiment) return;

        const userMessage = chatMessage;
        setChatMessage('');
        setChatHistory((prev) => [...prev, { role: 'user', content: userMessage }]);

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const contextMessage = `
Context: Running experiment "${experiment.name}" with ${experiment.strategyName} strategy.
Hypothesis: ${experiment.hypothesis}
Current metrics: ${JSON.stringify(experiment.metrics)}

User question: ${userMessage}

Provide actionable advice for menu optimization based on the scientific method.`;

            const res = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: contextMessage,
                    restaurantId: experiment.restaurantId,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setChatHistory((prev) => [...prev, { role: 'ai', content: data.response }]);
            } else {
                setChatHistory((prev) => [
                    ...prev,
                    { role: 'ai', content: 'Sorry, I could not process that. Please try again.' },
                ]);
            }
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewExperiment = () => {
        sessionStorage.removeItem('currentExperiment');
        sessionStorage.removeItem('selectedStrategy');
        sessionStorage.removeItem('extractedMenu');
        router.push('/dashboard/upload');
    };

    const MetricCard = ({ label, value, change }: { label: string; value: string | number; change?: string }) => (
        <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {change && <p className={`text-xs ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{change}</p>}
        </div>
    );

    if (!experiment) {
        return (
            <div className="max-w-4xl mx-auto">
                <Card>
                    <CardContent className="text-center py-12">
                        <p className="text-gray-400 mb-4">No active experiment</p>
                        <Button onClick={() => router.push('/dashboard/upload')}>Start New Experiment</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Experiment Dashboard</h1>
                    <p className="text-gray-400 mt-1">Track, analyze, and iterate on your menu optimization</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handleNewExperiment}>
                        New Experiment
                    </Button>
                </div>
            </div>

            {/* Pipeline Progress */}
            <div className="flex items-center gap-2 text-sm">
                <span className="px-3 py-1 bg-green-600 text-white rounded-full">✓ Upload</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-green-600 text-white rounded-full">✓ Strategy</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-green-600 text-white rounded-full">✓ Deploy</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-orange-500 text-white rounded-full">4. Optimize</span>
            </div>

            {/* Experiment Info */}
            <Card>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-xl font-semibold text-white">{experiment.name}</h2>
                                <Badge variant={experiment.status === 'running' ? 'success' : 'warning'}>
                                    {experiment.status}
                                </Badge>
                            </div>
                            <p className="text-gray-400">{experiment.hypothesis}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Strategy</p>
                            <p className="text-orange-400 font-semibold">{experiment.strategyName}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Menu Views" value={experiment.metrics.views} />
                <MetricCard label="Item Clicks" value={experiment.metrics.itemClicks} />
                <MetricCard label="Add to Cart" value={experiment.metrics.addToCarts} />
                <MetricCard
                    label="Conversion Rate"
                    value={`${experiment.metrics.conversionRate.toFixed(1)}%`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Scientific Insights */}
                <Card>
                    <div className="p-4 border-b border-gray-800">
                        <h3 className="font-semibold text-white">Scientific Insights</h3>
                    </div>
                    <CardContent className="max-h-96 overflow-y-auto">
                        {insights.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Gathering data...</p>
                        ) : (
                            <div className="space-y-4">
                                {insights.map((insight, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg border ${insight.type === 'recommendation'
                                            ? 'bg-orange-500/10 border-orange-500/30'
                                            : insight.type === 'hypothesis'
                                                ? 'bg-blue-500/10 border-blue-500/30'
                                                : 'bg-gray-800/50 border-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded ${insight.type === 'recommendation'
                                                    ? 'bg-orange-500/20 text-orange-400'
                                                    : insight.type === 'hypothesis'
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : 'bg-gray-700 text-gray-400'
                                                    }`}
                                            >
                                                {insight.type}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {Math.round(insight.confidence * 100)}% confidence
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-white text-sm mb-1">{insight.title}</h4>
                                        <p className="text-gray-400 text-sm">{insight.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* AI Chat */}
                <Card>
                    <div className="p-4 border-b border-gray-800">
                        <h3 className="font-semibold text-white">AI Assistant</h3>
                        <p className="text-xs text-gray-500">Ask questions about your experiment</p>
                    </div>
                    <CardContent>
                        {/* Chat Messages */}
                        <div className="h-64 overflow-y-auto mb-4 space-y-3">
                            {chatHistory.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    <p className="text-sm">Ask me about:</p>
                                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                                        {['Why is conversion low?', 'How to improve clicks?', 'Suggest next experiment'].map(
                                            (q) => (
                                                <button
                                                    key={q}
                                                    onClick={() => setChatMessage(q)}
                                                    className="text-xs px-2 py-1 bg-gray-800 rounded-full text-gray-400 hover:text-white"
                                                >
                                                    {q}
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            ) : (
                                chatHistory.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg ${msg.role === 'user'
                                            ? 'bg-orange-500/20 ml-8'
                                            : 'bg-gray-800/50 mr-8'
                                            }`}
                                    >
                                        <p className="text-xs text-gray-500 mb-1">
                                            {msg.role === 'user' ? 'You' : 'AI'}
                                        </p>
                                        <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                ))
                            )}
                            {loading && (
                                <div className="p-3 rounded-lg bg-gray-800/50 mr-8">
                                    <p className="text-xs text-gray-500 mb-1">AI</p>
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Ask about your experiment..."
                                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            />
                            <Button onClick={handleSendMessage} disabled={loading || !chatMessage.trim()}>
                                Send
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            <Card>
                <CardContent>
                    <h3 className="font-semibold text-white mb-4">Experiment Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button variant="secondary" onClick={handleNewExperiment}>
                            Try New Strategy
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => window.open('/menu/live', '_blank')}
                        >
                            Preview Live Menu
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
