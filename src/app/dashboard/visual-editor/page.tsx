'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, Badge } from '@/components/ui';
import { useEditorStore, EditorElement } from '@/lib/store/editor-store';
import { MenuStrategy, LayoutItem, LayoutSection } from '@/lib/services/strategy.service';
import EditorCanvas from '@/components/editor/EditorCanvas';
import EditorSidebar from '@/components/editor/EditorSidebar';
import EditorToolbar from '@/components/editor/EditorToolbar';
import PropertiesPanel from '@/components/editor/PropertiesPanel';

interface Restaurant {
    id: number;
    name: string;
}

interface MenuItem {
    id: number;
    name: string;
    description: string | null;
    price: number;
    cost: number | null;
    sectionId: number | null;
    bcgQuadrant?: string;
}

interface MenuSection {
    id: number;
    title: string;
    items: MenuItem[];
}

interface Layout {
    id: number;
    name: string;
    status: string;
    version: number;
    config: any;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function VisualEditorPage() {
    const router = useRouter();
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
    const [sections, setSections] = useState<MenuSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [currentLayout, setCurrentLayout] = useState<Layout | null>(null);

    // Strategy from previous step
    const [selectedStrategy, setSelectedStrategy] = useState<MenuStrategy | null>(null);

    // Chat state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showChat, setShowChat] = useState(true);

    const { elements, loadElements, addElement, saveHistory, clear } = useEditorStore();

    useEffect(() => {
        // Load strategy from session storage
        const storedStrategy = sessionStorage.getItem('selectedStrategy');
        if (storedStrategy) {
            const strategy = JSON.parse(storedStrategy) as MenuStrategy;
            setSelectedStrategy(strategy);

            // Add welcome message explaining the strategy
            setChatMessages([{
                id: '0',
                role: 'assistant',
                content: `I've applied the **${strategy.name}** strategy to your menu. This layout uses ${strategy.psychology.toLowerCase()}

**What you can ask me:**
• "Make the description more appetizing for [item]"
• "Why is [item] positioned here?"
• "Change the highlight color"
• "Move [item] to a more prominent position"
• "Explain the psychology behind this layout"

What would you like to adjust?`,
                timestamp: new Date(),
            }]);
        }

        fetchRestaurants();
    }, []);

    useEffect(() => {
        if (selectedRestaurant) {
            fetchData();
        }
    }, [selectedRestaurant]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const fetchRestaurants = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/restaurants', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401) {
                window.location.href = '/auth/login';
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setRestaurants(data.restaurants || []);
                if (data.restaurants?.length > 0) {
                    setSelectedRestaurant(data.restaurants[0].id.toString());
                }
            }
        } catch (error) {
            console.error('Failed to fetch restaurants:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');

            // Fetch menu items and sections
            const [itemsRes, sectionsRes, analyticsRes, layoutRes] = await Promise.all([
                fetch(`/api/restaurants/${selectedRestaurant}/menu`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`/api/restaurants/${selectedRestaurant}/sections`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`/api/restaurants/${selectedRestaurant}/analytics`, {
                    headers: { Authorization: `Bearer ${token}` },
                }).catch(() => null),
                fetch(`/api/restaurants/${selectedRestaurant}/layouts?latest=1`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            // Parse responses
            const itemsData = itemsRes.ok ? await itemsRes.json() : { items: [] };
            const sectionsData = sectionsRes.ok ? await sectionsRes.json() : { sections: [] };
            const analyticsData = analyticsRes?.ok ? await analyticsRes.json() : { items: [] };
            const layoutData = layoutRes.ok ? await layoutRes.json() : null;

            // Build analytics map
            const analyticsMap = new Map<number, any>();
            (analyticsData.items || []).forEach((item: any) => {
                analyticsMap.set(item.menuItemId, item);
            });

            // Map items with analytics
            const items: MenuItem[] = (itemsData.items || []).map((item: any) => {
                const analytics = analyticsMap.get(item.id);
                return {
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    price: parseFloat(item.price) || 0,
                    cost: item.cost ? parseFloat(item.cost) : null,
                    sectionId: item.sectionId,
                    bcgQuadrant: analytics?.bcgQuadrant,
                };
            });

            // Group by section
            const sectionList: MenuSection[] = (sectionsData.sections || []).map((section: any) => ({
                id: section.id,
                title: section.title,
                items: items.filter(item => item.sectionId === section.id),
            }));

            setSections(sectionList);

            // Load existing layout
            if (layoutData?.layout) {
                setCurrentLayout(layoutData.layout);
                if (layoutData.layout.config?.elements) {
                    loadElements(layoutData.layout.config.elements);
                } else {
                    clear();
                }
            } else {
                // Create new layout
                await createNewLayout();
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    };

    const createNewLayout = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/restaurants/${selectedRestaurant}/layouts`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: 'Visual Layout',
                    strategy: 'manual',
                    config: { elements: [], canvasSize: { width: 800, height: 1000 } },
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setCurrentLayout(data.layout);
                clear();
            }
        } catch (error) {
            console.error('Failed to create layout:', error);
        }
    };

    const handleDrop = (item: any, position: { x: number; y: number }) => {
        const element: EditorElement = {
            id: `menu_item-${item.id}-${Date.now()}`,
            type: 'menu_item',
            position,
            size: { width: 280, height: 140 },
            data: {
                id: item.id,
                name: item.name,
                description: item.description,
                price: item.price,
                bcgQuadrant: item.bcgQuadrant,
            },
        };
        addElement(element);
        saveHistory();
    };

    const handleSave = async () => {
        if (!currentLayout) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/restaurants/${selectedRestaurant}/layouts/${currentLayout.id}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    config: {
                        elements,
                        canvasSize: { width: 800, height: 1000 },
                    },
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setCurrentLayout(data.layout);
            }
        } catch (error) {
            console.error('Failed to save layout:', error);
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!currentLayout) return;

        setPublishing(true);
        try {
            const token = localStorage.getItem('token');

            // First save current state
            await handleSave();

            // Then publish
            const res = await fetch(`/api/restaurants/${selectedRestaurant}/layouts/${currentLayout.id}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'published',
                    publishedAt: new Date().toISOString(),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setCurrentLayout(data.layout);
            }
        } catch (error) {
            console.error('Failed to publish layout:', error);
        } finally {
            setPublishing(false);
        }
    };

    const sendMessage = async (message: string) => {
        if (!message.trim() || isTyping) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: message,
            timestamp: new Date(),
        };

        setChatMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsTyping(true);

        try {
            const response = await fetch('/api/strategy/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    context: {
                        strategy: selectedStrategy,
                        elements,
                        sections,
                    },
                    history: chatMessages.slice(-10).map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            const data = await response.json();

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || 'I can help you adjust the menu layout. What would you like to change?',
                timestamp: new Date(),
            };

            setChatMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            setChatMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date(),
            }]);
        } finally {
            setIsTyping(false);
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
        <div className="h-[calc(100vh-4rem)] flex flex-col -m-6">
            {/* Top Bar */}
            <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-semibold text-white">Visual Editor</h1>
                    {selectedStrategy && (
                        <Badge variant="info" className="text-xs">
                            {selectedStrategy.name} Strategy
                        </Badge>
                    )}
                    <select
                        value={selectedRestaurant}
                        onChange={(e) => setSelectedRestaurant(e.target.value)}
                        className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                        {restaurants.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                    {currentLayout && (
                        <span className="text-xs text-gray-500">
                            Layout: {currentLayout.name} (v{currentLayout.version})
                            {currentLayout.status === 'published' && (
                                <span className="ml-2 px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                                    Published
                                </span>
                            )}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowChat(!showChat)}
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        {showChat ? 'Hide' : 'Show'} AI Chat
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/menu/${selectedRestaurant}`, '_blank')}
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSave}
                        loading={saving}
                    >
                        Save Draft
                    </Button>
                    <Button
                        size="sm"
                        onClick={handlePublish}
                        loading={publishing}
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Publish
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <EditorToolbar />

            {/* Main Editor with Chat */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Items */}
                <EditorSidebar sections={sections} />

                {/* Canvas */}
                <div className={`flex-1 flex ${showChat ? '' : ''}`}>
                    <div className={`${showChat ? 'flex-1' : 'flex-1'}`}>
                        <EditorCanvas onDrop={handleDrop} />
                    </div>

                    {/* AI Chat Panel */}
                    {showChat && (
                        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
                            {/* Chat Header */}
                            <div className="px-4 py-3 border-b border-gray-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">AI</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white text-sm">Menu Design Assistant</h3>
                                        <p className="text-xs text-green-500">Online • Ready to help</p>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {chatMessages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[90%] rounded-2xl px-3 py-2 ${msg.role === 'user'
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-gray-800 text-gray-200'
                                                }`}
                                        >
                                            <div
                                                className="text-sm prose prose-invert prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{
                                                    __html: msg.content
                                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                        .replace(/\n/g, '<br/>')
                                                        .replace(/• /g, '&bull; ')
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-800 rounded-2xl px-3 py-2">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={chatEndRef} />
                            </div>

                            {/* Quick Suggestions */}
                            {chatMessages.length < 3 && (
                                <div className="px-3 py-2 border-t border-gray-800">
                                    <div className="flex flex-wrap gap-1">
                                        {[
                                            'Explain this layout',
                                            'Change highlight color',
                                            'Improve descriptions',
                                        ].map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => sendMessage(suggestion)}
                                                className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input */}
                            <div className="p-3 border-t border-gray-800">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputMessage)}
                                        placeholder="Ask about the design..."
                                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-full text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
                                        disabled={isTyping}
                                    />
                                    <button
                                        onClick={() => sendMessage(inputMessage)}
                                        disabled={!inputMessage.trim() || isTyping}
                                        className="p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Properties */}
                <PropertiesPanel />
            </div>
        </div>
    );
}
