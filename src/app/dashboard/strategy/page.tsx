'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button } from '@/components/ui';
import { LayoutSection, LayoutItem } from '@/lib/services/strategy.service';

/**
 * Strategy options based on strategy-context.json menu engineering best practices
 * Each strategy uses proven psychological principles to optimize menu performance
 */
interface Strategy {
    id: string;
    name: string;
    icon: string;
    description: string;
    psychology: string;
    expectedOutcome: string;
    layoutType: string;
    columns: number;
    idealFor: string[];
}

interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
}

const strategies: Strategy[] = [
    {
        id: 'golden-triangle',
        name: 'Golden Triangle',
        icon: '👁️',
        description: 'Places high-profit items where eyes naturally look first',
        psychology: 'Eyes scan middle → top-right → top-left. This captures 70% of attention.',
        expectedOutcome: '+15-20% profit on featured items',
        layoutType: 'magazine',
        columns: 2,
        idealFor: ['Photo-heavy menus', 'Visual items', 'Mid-to-upscale dining'],
    },
    {
        id: 'anchoring',
        name: 'Price Anchoring',
        icon: '💰',
        description: 'High-priced anchor makes other items seem like a deal',
        psychology: 'Seeing a $75 steak first makes a $35 dish feel like a bargain.',
        expectedOutcome: '+10-15% average order value',
        layoutType: 'list',
        columns: 1,
        idealFor: ['Upscale restaurants', 'Wide price ranges', 'Increase AOV'],
    },
    {
        id: 'decoy',
        name: 'Decoy Pricing',
        icon: '🎯',
        description: 'Strategic pricing nudges customers to target items',
        psychology: 'Medium priced close to large makes large look like better value.',
        expectedOutcome: '+25% selection of target items',
        layoutType: 'grid',
        columns: 3,
        idealFor: ['Fast casual', 'Tiered pricing', 'Combo menus'],
    },
    {
        id: 'scarcity',
        name: 'Social Proof',
        icon: '🔥',
        description: 'Popular and limited badges drive decisions',
        psychology: '"Most Popular" and "Limited" badges trigger FOMO and validation.',
        expectedOutcome: '+30% conversion on featured items',
        layoutType: 'grid',
        columns: 2,
        idealFor: ['Trendy spots', 'Limited menus', 'Social media audience'],
    },
];

export default function StrategyPage() {
    const router = useRouter();
    const [selected, setSelected] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

    useEffect(() => {
        const ctx = sessionStorage.getItem('menuContext');
        if (!ctx) {
            router.push('/dashboard/onboarding');
            return;
        }
        
        // Load menu items from context
        try {
            const parsed = JSON.parse(ctx);
            if (parsed.items && parsed.items.length > 0) {
                setMenuItems(parsed.items);
            }
        } catch (e) {
            console.error('Failed to parse menu context:', e);
        }
        
        setTimeout(() => setLoading(false), 400);
    }, [router]);

    /**
     * Build layout sections from menu items based on strategy
     */
    const buildSections = (items: MenuItem[], strategyId: string): LayoutSection[] => {
        // Group items by category
        const byCategory: Record<string, MenuItem[]> = {};
        items.forEach(item => {
            const cat = item.category || 'Menu';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(item);
        });

        // Sort items by price (descending) for anchoring strategy
        const sortByPrice = strategyId === 'anchoring';

        return Object.entries(byCategory).map(([category, catItems], idx) => {
            // Sort items if needed
            const sortedItems = sortByPrice 
                ? [...catItems].sort((a, b) => b.price - a.price)
                : catItems;

            return {
                id: `section-${idx}`,
                name: category,
                position: idx,
                items: sortedItems.map((item, itemIdx) => {
                    // Apply strategy-specific highlighting
                    const isHighlighted = 
                        (strategyId === 'golden-triangle' && itemIdx === 0) ||
                        (strategyId === 'scarcity' && itemIdx < 2);
                    
                    const isAnchor = strategyId === 'anchoring' && itemIdx === 0;
                    const isDecoy = strategyId === 'decoy' && itemIdx === 1;

                    // Add badges based on strategy
                    const badges: string[] = [];
                    if (strategyId === 'scarcity' && itemIdx === 0) badges.push('🔥 Most Popular');
                    if (strategyId === 'scarcity' && itemIdx === 1) badges.push('⭐ Chef\'s Pick');
                    if (strategyId === 'golden-triangle' && itemIdx === 0) badges.push('⭐ Featured');

                    return {
                        id: item.id || `item-${idx}-${itemIdx}`,
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        badges,
                        isHighlighted,
                        isAnchor,
                        isDecoy,
                    } as LayoutItem;
                }),
            };
        });
    };

    const handleContinue = () => {
        if (selected) {
            const strategy = strategies.find(s => s.id === selected);

            // Get colors from context if available, otherwise use defaults
            const ctx = sessionStorage.getItem('menuContext');
            let extractedColors = null;
            let items: MenuItem[] = menuItems;
            
            if (ctx) {
                try {
                    const parsed = JSON.parse(ctx);
                    extractedColors = parsed.extractedColors;
                    // Also get items from context if not already loaded
                    if (!items.length && parsed.items) {
                        items = parsed.items;
                    }
                } catch (e) {
                    console.error('Failed to parse context:', e);
                }
            }

            // Build sections from actual menu items
            const sections = buildSections(items, selected);

            // Default color scheme (can be customized from extracted colors)
            const colorScheme = {
                primary: extractedColors?.primary || '#1a1a2e',
                secondary: extractedColors?.secondary || '#16213e',
                accent: extractedColors?.accent || '#e94560',
                background: extractedColors?.background || '#0f0f1a',
            };

            sessionStorage.setItem('selectedStrategy', JSON.stringify({
                id: selected,
                name: strategy?.name,
                description: strategy?.description,
                psychology: strategy?.psychology,
                expectedOutcome: strategy?.expectedOutcome,
                idealFor: strategy?.idealFor,
                reasoning: [],
                layout: {
                    type: strategy?.layoutType,
                    columns: strategy?.columns,
                    highlightStrategy: selected,
                    colorScheme,
                    typography: {
                        headingFont: 'Playfair Display',
                        bodyFont: 'Inter',
                        priceStyle: 'bold',
                    },
                    sections,
                },
            }));
            router.push('/dashboard/deploy');
        }
    };

    const selectedStrategy = strategies.find(s => s.id === selected);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin h-10 w-10 border-3 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-400">Analyzing your menu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8">
            {/* Header */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-white">Choose Your Strategy</h1>
                <p className="text-gray-400 mt-2">Each uses proven menu engineering psychology</p>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-center gap-2 text-sm mb-8">
                <span className="px-3 py-1 bg-green-600 text-white rounded-full">✓ Setup</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-orange-500 text-white rounded-full">Strategy</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full">Deploy</span>
            </div>

            {/* Strategy Options */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {strategies.map((strategy) => (
                    <Card
                        key={strategy.id}
                        onClick={() => setSelected(strategy.id)}
                        className={`cursor-pointer transition-all ${selected === strategy.id
                            ? 'ring-2 ring-orange-500 bg-orange-500/10'
                            : 'bg-gray-900 hover:bg-gray-800'
                            }`}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start gap-3">
                                <div className="text-3xl">{strategy.icon}</div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white">{strategy.name}</h3>
                                    <p className="text-sm text-gray-400 mt-1">{strategy.description}</p>
                                    <div className="mt-2 inline-block px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                        {strategy.expectedOutcome}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Selected Strategy Details */}
            {selectedStrategy && (
                <Card className="mb-6 bg-gray-800/50 border-orange-500/30">
                    <CardContent className="p-5">
                        <h3 className="font-semibold text-white mb-2">
                            💡 Why {selectedStrategy.name} Works
                        </h3>
                        <p className="text-gray-300 text-sm mb-3">{selectedStrategy.psychology}</p>
                        <div className="flex flex-wrap gap-2">
                            {selectedStrategy.idealFor.map((item) => (
                                <span key={item} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                                    {item}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex justify-between">
                <Button
                    variant="secondary"
                    onClick={() => router.push('/dashboard/onboarding')}
                >
                    ← Back
                </Button>
                <Button
                    onClick={handleContinue}
                    disabled={!selected}
                >
                    Continue →
                </Button>
            </div>
        </div>
    );
}
