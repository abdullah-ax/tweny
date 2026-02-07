'use client';

import { MenuStrategy, LayoutSection, LayoutItem } from '@/lib/services/strategy.service';

interface StrategyLayoutPreviewProps {
    strategy: MenuStrategy;
    size?: 'small' | 'medium' | 'large';
    showItems?: boolean;
    onClick?: () => void;
    isSelected?: boolean;
}

export function StrategyLayoutPreview({
    strategy,
    size = 'medium',
    showItems = false,
    onClick,
    isSelected = false,
}: StrategyLayoutPreviewProps) {
    const { layout } = strategy;
    const { colorScheme, type, columns } = layout;

    const sizeClasses = {
        small: 'w-20 h-28',
        medium: 'w-32 h-44',
        large: 'w-full h-64',
    };

    const itemSizeClasses = {
        small: { box: 'h-2', text: 'h-0.5', price: 'h-0.5' },
        medium: { box: 'h-4', text: 'h-1', price: 'h-0.5' },
        large: { box: 'h-8', text: 'h-2', price: 'h-1' },
    };

    const renderMiniLayout = () => {
        // Render a mini representation of the layout
        const itemCount = type === 'list' ? 4 : 6;
        const gridCols = type === 'list' ? 1 : columns;

        return (
            <div className="h-full flex flex-col p-1.5 gap-1">
                {/* Header */}
                <div className="flex items-center justify-center mb-0.5">
                    <div
                        className="h-1.5 w-12 rounded-sm"
                        style={{ background: colorScheme.accent }}
                    />
                </div>

                {/* Featured Section (for magazine layout) */}
                {type === 'magazine' && (
                    <div
                        className="rounded-sm p-1 mb-0.5"
                        style={{ background: `${colorScheme.accent}30` }}
                    >
                        <div className="flex gap-0.5">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="flex-1 h-3 rounded-xs"
                                    style={{ background: colorScheme.secondary }}
                                >
                                    <div
                                        className="h-0.5 w-2/3 rounded-xs mx-auto mt-1"
                                        style={{ background: `${colorScheme.accent}60` }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Items Grid */}
                <div
                    className={`grid gap-0.5 flex-1`}
                    style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
                >
                    {Array.from({ length: itemCount }).map((_, i) => {
                        const isHighlighted = i === 0 || (type === 'magazine' && i < 2);
                        const isAnchor = type === 'list' && i === 0;
                        const isDecoy = type === 'grid' && columns === 3 && i === 1;

                        return (
                            <div
                                key={i}
                                className="rounded-sm p-0.5 relative overflow-hidden"
                                style={{
                                    background: isHighlighted
                                        ? `${colorScheme.accent}25`
                                        : colorScheme.primary,
                                    border: isHighlighted ? `1px solid ${colorScheme.accent}50` : 'none',
                                }}
                            >
                                {/* Item representation */}
                                <div
                                    className={`${itemSizeClasses[size].box} rounded-xs mb-0.5`}
                                    style={{ background: colorScheme.secondary }}
                                />
                                <div
                                    className={`${itemSizeClasses[size].text} w-3/4 rounded-xs mb-0.5`}
                                    style={{ background: `${colorScheme.accent}40` }}
                                />
                                <div
                                    className={`${itemSizeClasses[size].price} w-1/3 rounded-xs`}
                                    style={{ background: `${colorScheme.accent}60` }}
                                />

                                {/* Badge indicators */}
                                {isAnchor && (
                                    <div
                                        className="absolute top-0 right-0 w-2 h-2 rounded-bl-sm"
                                        style={{ background: colorScheme.accent }}
                                    />
                                )}
                                {isDecoy && (
                                    <div
                                        className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                                        style={{ background: colorScheme.accent }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDetailedLayout = () => {
        const sections = layout.sections.slice(0, 2);

        return (
            <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
                {/* Header */}
                <div className="text-center">
                    <div
                        className="h-3 w-24 mx-auto rounded"
                        style={{ background: colorScheme.accent }}
                    />
                </div>

                {/* Featured Section */}
                {layout.featuredSection && (
                    <div
                        className="rounded-lg p-2"
                        style={{ background: `${colorScheme.accent}15` }}
                    >
                        <div
                            className="text-xs font-medium mb-1"
                            style={{ color: colorScheme.accent }}
                        >
                            {layout.featuredSection.title}
                        </div>
                        <div className="flex gap-1">
                            {layout.featuredSection.items.slice(0, 3).map((item, i) => (
                                <div
                                    key={i}
                                    className="flex-1 rounded p-1"
                                    style={{ background: colorScheme.secondary }}
                                >
                                    <div className="h-8 rounded bg-black/20 mb-1" />
                                    <div
                                        className="h-1.5 w-3/4 rounded"
                                        style={{ background: `${colorScheme.accent}50` }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Categories */}
                {sections.map((section) => (
                    <div key={section.id} className="flex-1 min-h-0">
                        <div
                            className="text-xs font-medium mb-1 truncate"
                            style={{ color: colorScheme.accent }}
                        >
                            {section.name}
                        </div>
                        <div
                            className={`grid gap-1`}
                            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                        >
                            {section.items.slice(0, columns * 2).map((item, i) => (
                                <div
                                    key={item.id}
                                    className="rounded p-1"
                                    style={{
                                        background: item.isHighlighted
                                            ? `${colorScheme.accent}20`
                                            : colorScheme.primary,
                                    }}
                                >
                                    <div className="h-6 rounded bg-black/20 mb-0.5" />
                                    <div
                                        className="h-1 w-2/3 rounded"
                                        style={{ background: `${colorScheme.accent}40` }}
                                    />
                                    {item.badges.length > 0 && (
                                        <div
                                            className="h-1 w-1/3 rounded mt-0.5"
                                            style={{ background: colorScheme.accent }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div
            onClick={onClick}
            className={`
                ${sizeClasses[size]} 
                rounded-lg overflow-hidden cursor-pointer transition-all duration-200
                ${isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900' : 'hover:scale-105'}
            `}
            style={{
                background: colorScheme.background,
                borderColor: isSelected ? colorScheme.accent : 'transparent',
                boxShadow: isSelected ? `0 0 20px ${colorScheme.accent}40` : 'none',
            }}
        >
            {size === 'large' ? renderDetailedLayout() : renderMiniLayout()}
        </div>
    );
}

interface StrategyReasoningCardProps {
    strategy: MenuStrategy;
    expanded?: boolean;
}

export function StrategyReasoningCard({ strategy, expanded = false }: StrategyReasoningCardProps) {
    const { reasoning, idealFor, expectedOutcome, psychology } = strategy;

    return (
        <div className="space-y-3">
            {/* Psychology */}
            <div className="bg-gray-800/50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-orange-400 mb-1">💭 Psychology</h4>
                <p className="text-sm text-gray-300">{psychology}</p>
            </div>

            {/* Reasoning Points */}
            {expanded && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-white">🎯 How It Works For Your Menu</h4>
                    {reasoning.map((r, i) => (
                        <div key={i} className="bg-gray-800/30 rounded-lg p-2 border-l-2 border-orange-500/50">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <span className="text-xs font-medium text-orange-300">{r.principle}</span>
                                    <p className="text-xs text-gray-400 mt-0.5">{r.application}</p>
                                </div>
                                {r.dataPoint && (
                                    <span className="text-xs bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded whitespace-nowrap">
                                        {r.dataPoint}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-green-400 mt-1">→ {r.expectedImpact}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Expected Outcome */}
            <div className="flex items-center gap-2 bg-green-500/10 rounded-lg p-2 border border-green-500/30">
                <span className="text-lg">📈</span>
                <div>
                    <span className="text-xs text-green-400">Expected Outcome</span>
                    <p className="text-sm font-medium text-white">{expectedOutcome}</p>
                </div>
            </div>

            {/* Ideal For */}
            <div>
                <span className="text-xs text-gray-500">Ideal for:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                    {idealFor.map((item, i) => (
                        <span
                            key={i}
                            className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded"
                        >
                            {item}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
