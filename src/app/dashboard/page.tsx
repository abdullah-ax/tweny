'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button } from '@/components/ui';

// Clean SVG Icons
function UploadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
    );
}

function RocketIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
    );
}

function ChartIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    );
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
    );
}

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
            title: 'Setup',
            description: 'Upload your menu PDF and sales data',
            href: '/dashboard/onboarding',
            icon: UploadIcon,
            complete: hasExtractedMenu,
        },
        {
            number: 2,
            title: 'Strategy',
            description: 'Choose a menu psychology strategy',
            href: '/dashboard/strategy',
            icon: SparklesIcon,
            complete: hasSelectedStrategy,
        },
        {
            number: 3,
            title: 'Deploy',
            description: 'Customize design and publish your menu',
            href: '/dashboard/deploy',
            icon: RocketIcon,
            complete: !!currentExperiment,
        },
        {
            number: 4,
            title: 'Analytics',
            description: 'Track orders and performance',
            href: '/dashboard/analytics',
            icon: ChartIcon,
            complete: false,
        },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="pt-4">
                <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
                <p className="text-gray-400 mt-1">
                    Create and optimize your QR menu
                </p>
            </div>

            {/* Active Experiment */}
            {currentExperiment && (
                <Card className="border-green-500/20 bg-green-500/5">
                    <CardContent className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-400 font-medium">Active</p>
                            <h2 className="text-lg font-medium text-white">{currentExperiment.name}</h2>
                            <p className="text-gray-400 text-sm">{currentExperiment.strategyName}</p>
                        </div>
                        <Button 
                            variant="secondary" 
                            onClick={() => router.push('/dashboard/analytics')}
                        >
                            View Analytics
                            <ArrowRightIcon className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Steps */}
            <div className="space-y-3">
                {steps.map((step) => (
                    <Card
                        key={step.number}
                        className={`cursor-pointer transition-all hover:bg-gray-900/50 ${
                            step.complete ? 'border-green-500/20' : ''
                        }`}
                        onClick={() => router.push(step.href)}
                    >
                        <CardContent className="flex items-center gap-4 py-4">
                            <div className={`
                                w-10 h-10 rounded-lg flex items-center justify-center
                                ${step.complete ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}
                            `}>
                                {step.complete ? (
                                    <CheckIcon className="w-5 h-5" />
                                ) : (
                                    <step.icon className="w-5 h-5" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-white">{step.title}</h3>
                                    {step.complete && (
                                        <span className="text-xs text-green-400">Done</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">{step.description}</p>
                            </div>
                            <ArrowRightIcon className="w-4 h-4 text-gray-600" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* CTA */}
            {!currentExperiment && (
                <div className="pt-4">
                    <Button 
                        className="w-full" 
                        size="lg" 
                        onClick={() => router.push('/dashboard/onboarding')}
                    >
                        Get Started
                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}
        </div>
    );
}
