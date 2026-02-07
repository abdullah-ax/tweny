'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button } from '@/components/ui';

interface Experiment {
    id: string;
    name: string;
    strategyName: string;
    status: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [currentExperiment, setCurrentExperiment] = useState<Experiment | null>(null);
    const [hasExtractedMenu, setHasExtractedMenu] = useState(false);
    const [hasSelectedStrategy, setHasSelectedStrategy] = useState(false);

    useEffect(() => {
        // Check for existing experiment or extracted menu
        const experiment = sessionStorage.getItem('currentExperiment');
        const extractedMenu = sessionStorage.getItem('extractedMenu');
        const selectedStrategy = sessionStorage.getItem('selectedStrategy');

        if (experiment) {
            setCurrentExperiment(JSON.parse(experiment));
        }
        if (extractedMenu) {
            setHasExtractedMenu(true);
        }
        if (selectedStrategy) {
            setHasSelectedStrategy(true);
        }
    }, []);

    const steps = [
        {
            number: 1,
            title: 'Upload Menu',
            description: 'Take a photo or upload your menu. Our AI will extract items, prices, and layout.',
            href: '/dashboard/upload',
            icon: '📷',
            complete: hasExtractedMenu,
        },
        {
            number: 2,
            title: 'Choose Strategy',
            description: 'AI generates 4 optimized layouts based on menu psychology research.',
            href: '/dashboard/strategy',
            icon: '🎯',
            complete: hasSelectedStrategy,
        },
        {
            number: 3,
            title: 'Deploy & Track',
            description: 'Generate QR code and start tracking customer behavior in real-time.',
            href: '/dashboard/deploy',
            icon: '🚀',
            complete: !!currentExperiment,
        },
        {
            number: 4,
            title: 'Optimize',
            description: 'Use AI insights to iterate and find your optimal menu configuration.',
            href: '/dashboard/experiments',
            icon: '📊',
            complete: false,
        },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero */}
            <div className="text-center py-8">
                <h1 className="text-4xl font-bold text-white mb-4">
                    AI-Powered Menu Optimization
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Upload your menu, let AI generate optimized layouts, deploy via QR code,
                    and iterate using real customer data.
                </p>
            </div>

            {/* Current Experiment Status */}
            {currentExperiment && (
                <Card className="border-green-500/30 bg-green-500/5">
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-400">Active Experiment</p>
                                <h2 className="text-xl font-semibold text-white">{currentExperiment.name}</h2>
                                <p className="text-gray-400 text-sm">{currentExperiment.strategyName} strategy</p>
                            </div>
                            <Button onClick={() => router.push('/dashboard/experiments')}>
                                View Results →
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pipeline Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {steps.map((step) => (
                    <Card
                        key={step.number}
                        className={`cursor-pointer transition-all hover:ring-1 hover:ring-orange-500/50 ${step.complete ? 'border-green-500/30' : ''
                            }`}
                        onClick={() => router.push(step.href)}
                    >
                        <CardContent>
                            <div className="flex items-start gap-4">
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center text-2xl
                                    ${step.complete ? 'bg-green-500/20' : 'bg-gray-800'}
                                `}>
                                    {step.complete ? '✓' : step.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-gray-500">Step {step.number}</span>
                                        {step.complete && (
                                            <span className="text-xs text-green-400">Complete</span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-white">{step.title}</h3>
                                    <p className="text-sm text-gray-400 mt-1">{step.description}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Start */}
            {!currentExperiment && (
                <div className="text-center pt-4">
                    <Button size="lg" onClick={() => router.push('/dashboard/upload')}>
                        🚀 Start New Experiment
                    </Button>
                </div>
            )}

            {/* Features */}
            <Card>
                <CardContent>
                    <h3 className="font-semibold text-white mb-4">Powered By</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-3">
                            <div className="text-2xl mb-2">🔍</div>
                            <p className="text-sm text-gray-400">Tesseract OCR</p>
                            <p className="text-xs text-gray-500">Multilingual extraction</p>
                        </div>
                        <div className="p-3">
                            <div className="text-2xl mb-2">🧠</div>
                            <p className="text-sm text-gray-400">Menu Psychology</p>
                            <p className="text-xs text-gray-500">Research-backed strategies</p>
                        </div>
                        <div className="p-3">
                            <div className="text-2xl mb-2">🎙️</div>
                            <p className="text-sm text-gray-400">Voice Feedback</p>
                            <p className="text-xs text-gray-500">Customer insights</p>
                        </div>
                        <div className="p-3">
                            <div className="text-2xl mb-2">📈</div>
                            <p className="text-sm text-gray-400">Real-time Analytics</p>
                            <p className="text-xs text-gray-500">Scientific method</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
