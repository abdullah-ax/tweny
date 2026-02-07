'use client';

import { useState } from 'react';
import { useEditorStore, EditorElement } from '@/lib/store/editor-store';

interface MenuItem {
    id: number;
    name: string;
    description: string | null;
    price: number;
    bcgQuadrant?: string;
}

interface MenuSection {
    id: number;
    title: string;
    items: MenuItem[];
}

interface EditorSidebarProps {
    sections: MenuSection[];
}

export default function EditorSidebar({ sections }: EditorSidebarProps) {
    const { addElement, saveHistory } = useEditorStore();
    const [activeTab, setActiveTab] = useState<'items' | 'elements' | 'templates'>('items');
    const [expandedSection, setExpandedSection] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, item: any, type: string) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ ...item, elementType: type }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const createElement = (type: EditorElement['type'], data?: Record<string, unknown>) => {
        const element: EditorElement = {
            id: `${type}-${Date.now()}`,
            type,
            position: { x: 50, y: 50 },
            size: type === 'menu_item'
                ? { width: 280, height: 140 }
                : type === 'section'
                    ? { width: 300, height: 40 }
                    : type === 'badge'
                        ? { width: 100, height: 30 }
                        : type === 'divider'
                            ? { width: 300, height: 2 }
                            : { width: 200, height: 100 },
            data,
        };
        addElement(element);
        saveHistory();
    };

    const tabs = [
        { id: 'items', label: 'Menu Items', icon: '🍽️' },
        { id: 'elements', label: 'Elements', icon: '🧩' },
        { id: 'templates', label: 'Templates', icon: '📋' },
    ];

    const elementTypes = [
        { type: 'text', label: 'Text', icon: 'T', data: { text: 'New Text' } },
        { type: 'section', label: 'Section Header', icon: '📑', data: { title: 'Section' } },
        { type: 'badge', label: 'Badge', icon: '🏷️', data: { label: 'Popular', variant: 'popular' } },
        { type: 'divider', label: 'Divider', icon: '—', data: {} },
        { type: 'image', label: 'Image', icon: '🖼️', data: {} },
    ];

    const templates = [
        { id: 'grid', label: 'Grid Layout', description: '3-column grid for items' },
        { id: 'list', label: 'List Layout', description: 'Vertical list with large images' },
        { id: 'featured', label: 'Featured + Grid', description: 'Hero item with grid below' },
    ];

    return (
        <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-gray-800">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${activeTab === tab.id
                                ? 'text-white border-b-2 border-orange-500'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <span className="mr-1">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'items' && (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-500 mb-4">
                            Drag items onto the canvas to add them to your layout
                        </p>
                        {sections.map((section) => (
                            <div key={section.id} className="border border-gray-800 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setExpandedSection(
                                        expandedSection === section.id ? null : section.id
                                    )}
                                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/50 hover:bg-gray-800 transition-colors"
                                >
                                    <span className="text-sm font-medium text-white">{section.title}</span>
                                    <span className="text-xs text-gray-500">{section.items.length}</span>
                                </button>

                                {expandedSection === section.id && (
                                    <div className="p-2 space-y-2">
                                        {section.items.map((item) => (
                                            <div
                                                key={item.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, item, 'menu_item')}
                                                className="p-2 bg-gray-800 rounded cursor-grab hover:bg-gray-700 transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-white truncate">{item.name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{item.description}</p>
                                                    </div>
                                                    <span className="text-xs text-orange-400 font-medium ml-2">
                                                        ${Number(item.price).toFixed(0)}
                                                    </span>
                                                </div>
                                                {item.bcgQuadrant && (
                                                    <span className={`inline-block mt-1 px-1.5 py-0.5 text-xs rounded ${item.bcgQuadrant === 'star' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            item.bcgQuadrant === 'cash_cow' ? 'bg-green-500/20 text-green-400' :
                                                                item.bcgQuadrant === 'question_mark' ? 'bg-purple-500/20 text-purple-400' :
                                                                    'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {item.bcgQuadrant}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {sections.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <p className="text-sm">No menu items found</p>
                                <p className="text-xs mt-1">Import data to get started</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'elements' && (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-500 mb-4">
                            Click to add elements to your menu
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {elementTypes.map((el) => (
                                <button
                                    key={el.type}
                                    onClick={() => createElement(el.type as EditorElement['type'], el.data)}
                                    className="p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors text-left"
                                >
                                    <span className="text-xl">{el.icon}</span>
                                    <p className="text-xs text-white mt-1">{el.label}</p>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-800">
                            <h4 className="text-xs font-medium text-gray-400 mb-3">Badges</h4>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: '🔥 Popular', variant: 'popular' },
                                    { label: '🆕 New', variant: 'new' },
                                    { label: '👨‍🍳 Chef\'s Pick', variant: 'chef' },
                                    { label: '🌱 Vegan', variant: 'vegan' },
                                ].map((badge) => (
                                    <button
                                        key={badge.variant}
                                        onClick={() => createElement('badge', badge)}
                                        className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded hover:border-gray-600"
                                    >
                                        {badge.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-500 mb-4">
                            Apply a template to quickly set up your layout
                        </p>
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-orange-500/50 transition-colors text-left"
                            >
                                <h4 className="text-sm font-medium text-white">{template.label}</h4>
                                <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                            </button>
                        ))}

                        <div className="mt-6 pt-4 border-t border-gray-800">
                            <h4 className="text-xs font-medium text-gray-400 mb-3">AI Suggestions</h4>
                            <button className="w-full p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg hover:border-orange-500/50 transition-colors text-left">
                                <h4 className="text-sm font-medium text-orange-400">✨ Generate Optimal Layout</h4>
                                <p className="text-xs text-gray-400 mt-1">
                                    AI will create a layout based on your analytics data
                                </p>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
