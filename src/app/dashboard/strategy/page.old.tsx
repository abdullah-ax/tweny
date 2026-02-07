'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { MenuStrategyService, MenuStrategy } from '@/lib/services/strategy.service';
import { ExtractedMenu } from '@/lib/services/ocr.service';

export default function StrategyPage() {
    const router = useRouter();
    const [extractedMenu, setExtractedMenu] = useState<ExtractedMenu | null>(null);
    const [strategies, setStrategies] = useState<MenuStrategy[]>([]);
    const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        // Load extracted menu from session
        const stored = sessionStorage.getItem('extractedMenu');
        if (stored) {
            const menu = JSON.parse(stored) as ExtractedMenu;
            setExtractedMenu(menu);
            generateStrategies(menu);
        } else {
            // No menu data, redirect to upload
            router.push('/dashboard/upload');
        }
    }, [router]);

    const generateStrategies = async (menu: ExtractedMenu) => {
        setGenerating(true);
        try {
            const generatedStrategies = await MenuStrategyService.generateStrategies(menu);
            setStrategies(generatedStrategies);
        } catch (error) {
            console.error('Failed to generate strategies:', error);
        } finally {
            setGenerating(false);
            setLoading(false);
        }
    };

    const handleSelectStrategy = (strategyId: string) => {
        setSelectedStrategy(strategyId);
    };

    const handleContinue = () => {
        if (selectedStrategy) {
            const strategy = strategies.find((s) => s.id === selectedStrategy);
            if (strategy) {
                sessionStorage.setItem('selectedStrategy', JSON.stringify(strategy));
                router.push('/dashboard/deploy');
            }
        }
    };

    const getLayoutPreview = (strategy: MenuStrategy) => {
        const { layout } = strategy;
        const cols = layout.columns;
        const type = layout.type;

        return (
            <div
                className="aspect-[3/4] rounded-lg overflow-hidden p-3"
                style={{ background: layout.colorScheme.background }}
            >
                {/* Mini header */}
                <div className="text-center mb-2">
                    <div
                        className="h-2 w-16 mx-auto rounded"
                        style={{ background: layout.colorScheme.accent }}
                    />
                </div>

                {/* Mini items grid */}
                <div
                    className={`grid gap-1 ${cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
                >
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className={`
                                rounded p-1
                                ${type === 'magazine' && i === 0 ? 'col-span-2 row-span-2' : ''}
                            `}
                            style={{
                                background: i % 3 === 0 ? layout.colorScheme.accent + '30' : layout.colorScheme.primary,
                            }}
                        >
                            <div className="h-1.5 w-3/4 rounded bg-white/30 mb-1" />
                            <div className="h-1 w-1/2 rounded bg-white/20" />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-400">Generating AI strategies...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Choose Your Strategy</h1>
                <p className="text-gray-400 mt-1">
                    Our AI analyzed your menu and generated 4 optimized layouts based on menu psychology research.
                </p>
            </div>

            {/* Pipeline Progress */}
            <div className="flex items-center gap-2 text-sm">
                <span className="px-3 py-1 bg-green-600 text-white rounded-full">✓ Upload</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-orange-500 text-white rounded-full">2. Strategy</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full">3. Deploy</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full">4. Optimize</span>
            </div>

            {/* Menu Summary */}
            {extractedMenu && (
                <Card>
                    <CardContent className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Analyzing menu with</p>
                            <p className="text-white font-semibold">
                                {extractedMenu.items.length} items in {extractedMenu.categories.length} categories
                            </p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => router.push('/dashboard/upload')}>
                            Change Menu
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Strategy Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {strategies.map((strategy) => (
                    <Card
                        key={strategy.id}
                        className={`
                            cursor-pointer transition-all
                            ${selectedStrategy === strategy.id
                                ? 'ring-2 ring-orange-500 scale-[1.02]'
                                : 'hover:ring-1 hover:ring-gray-700'}
                        `}
                        onClick={() => handleSelectStrategy(strategy.id)}
                    >
                        <CardContent>
                            <div className="flex gap-4">
                                {/* Layout Preview */}
                                <div className="w-32 flex-shrink-0">{getLayoutPreview(strategy)}</div>

                                {/* Strategy Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-white">{strategy.name}</h3>
                                        {selectedStrategy === strategy.id && (
                                            <Badge variant="success">Selected</Badge>
                                        )}
                                    </div>

                                    <p className="text-gray-400 text-sm mb-3">{strategy.description}</p>

                                    <div className="bg-gray-800/50 rounded-lg p-2 mb-3">
                                        <p className="text-xs text-gray-500 mb-1">Psychology</p>
                                        <p className="text-xs text-gray-300 line-clamp-2">{strategy.psychology}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge variant="info">{strategy.layout.type}</Badge>
                                        <Badge variant="warning">{strategy.expectedOutcome}</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Strategy Details */}
            {selectedStrategy && (
                <Card>
                    <CardContent>
                        <h3 className="font-semibold text-white mb-3">Strategy Details</h3>
                        {(() => {
                            const strategy = strategies.find((s) => s.id === selectedStrategy);
                            if (!strategy) return null;

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Layout Type</p>
                                        <p className="text-white capitalize">{strategy.layout.type}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Columns</p>
                                        <p className="text-white">{strategy.layout.columns}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Highlight Strategy</p>
                                        <p className="text-white capitalize">
                                            {strategy.layout.highlightStrategy.replace('-', ' ')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Typography</p>
                                        <p className="text-white">{strategy.layout.typography.headingFont}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Price Display</p>
                                        <p className="text-white capitalize">
                                            {strategy.layout.typography.priceStyle.replace('-', ' ')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Color Scheme</p>
                                        <div className="flex gap-1">
                                            {Object.values(strategy.layout.colorScheme).map((color, i) => (
                                                <div
                                                    key={i}
                                                    className="w-5 h-5 rounded"
                                                    style={{ background: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>
            )}

            {/* Continue Button */}
            <div className="flex justify-end">
                <Button onClick={handleContinue} disabled={!selectedStrategy} size="lg">
                    Build & Deploy Layout →
                </Button>
            </div>
        </div>
    );
}
