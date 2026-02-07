'use client';

import { useEffect, useState } from 'react';
import { Button, Card, CardContent, Badge, Input } from '@/components/ui';

interface Restaurant {
    id: number;
    name: string;
}

interface MenuItem {
    id: number;
    name: string;
    price: number;
    foodCost: number | null;
    category: string;
    sectionId?: number | null;
}

interface MenuSection {
    id: number;
    name: string;
    items: MenuItem[];
}

interface SectionApproval {
    id: number;
    sectionId: number;
    status: 'pending' | 'approved' | 'rejected';
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    bullets?: string[];
    citations?: Array<{ label: string; value: string }>;
    explanation?: string;
    showExplanation?: boolean;
}

export default function EditorPage() {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
    const [sections, setSections] = useState<MenuSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [layoutId, setLayoutId] = useState<number | null>(null);
    const [approvals, setApprovals] = useState<Record<number, SectionApproval>>({});
    const [approvalsLoading, setApprovalsLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        fetchRestaurants();
    }, []);

    useEffect(() => {
        if (selectedRestaurant) {
            initializeEditor();
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

    const fetchMenuData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [itemsRes, sectionsRes] = await Promise.all([
                fetch(`/api/restaurants/${selectedRestaurant}/menu`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`/api/restaurants/${selectedRestaurant}/sections`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            if (!itemsRes.ok || !sectionsRes.ok) return;

            const itemsData = await itemsRes.json();
            const sectionsData = await sectionsRes.json();

            const items: MenuItem[] = (itemsData.items || []).map((item: any) => ({
                ...item,
                price: item.price ? Number(item.price) : 0,
                foodCost: item.cost ? Number(item.cost) : null,
                category: item.type ?? 'Uncategorized',
            }));

            const sectionList: MenuSection[] = (sectionsData.sections || []).map((section: any) => ({
                id: section.id,
                name: section.title,
                items: [],
            }));

            const sectionMap = new Map<number, MenuSection>();
            sectionList.forEach(section => sectionMap.set(section.id, section));

            items.forEach(item => {
                if (item.sectionId && sectionMap.has(item.sectionId)) {
                    sectionMap.get(item.sectionId)!.items.push(item);
                }
            });

            setSections(Array.from(sectionMap.values()));
        } catch (error) {
            console.error('Failed to fetch menu items:', error);
        }
    };

    const initializeEditor = async () => {
        await fetchMenuData();
        await ensureLayout();
    };

    const ensureLayout = async () => {
        try {
            const token = localStorage.getItem('token');
            const latestRes = await fetch(`/api/restaurants/${selectedRestaurant}/layouts?latest=1`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (latestRes.ok) {
                const latest = await latestRes.json();
                if (latest.layout?.id) {
                    setLayoutId(latest.layout.id);
                    await fetchApprovals(latest.layout.id);
                    return;
                }
            }

            const createRes = await fetch(`/api/restaurants/${selectedRestaurant}/layouts`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: 'Draft Layout',
                    strategy: 'manual',
                    config: { sections: [], canvasSize: { width: 1200, height: 800 } },
                }),
            });

            if (createRes.ok) {
                const created = await createRes.json();
                if (created.layout?.id) {
                    setLayoutId(created.layout.id);
                    await fetchApprovals(created.layout.id);
                }
            }
        } catch (error) {
            console.error('Failed to initialize layout:', error);
        }
    };

    const fetchApprovals = async (layout: number) => {
        try {
            setApprovalsLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/restaurants/${selectedRestaurant}/section-approvals?layoutId=${layout}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) return;
            const data = await res.json();
            const approvalMap: Record<number, SectionApproval> = {};
            (data.approvals || []).forEach((approval: SectionApproval) => {
                approvalMap[approval.sectionId] = approval;
            });
            setApprovals(approvalMap);
        } catch (error) {
            console.error('Failed to fetch approvals:', error);
        } finally {
            setApprovalsLoading(false);
        }
    };

    const updateApproval = async (sectionId: number, status: 'approved' | 'rejected' | 'pending') => {
        if (!layoutId) return;
        try {
            setApprovalsLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/restaurants/${selectedRestaurant}/section-approvals`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    layoutId,
                    sectionId,
                    status,
                }),
            });

            if (!res.ok) return;
            const data = await res.json();
            if (data.approval) {
                setApprovals((prev) => ({
                    ...prev,
                    [sectionId]: data.approval,
                }));
            }
        } catch (error) {
            console.error('Failed to update approval:', error);
        } finally {
            setApprovalsLoading(false);
        }
    };

    const getApprovalStatus = (sectionId: number) => {
        return approvals[sectionId]?.status ?? 'pending';
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !selectedRestaurant) return;

        const userMessage: ChatMessage = {
            id: `${Date.now()}-user`,
            role: 'user',
            content: chatInput.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setChatInput('');
        setChatLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    restaurantId: Number(selectedRestaurant),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            const assistantMessage: ChatMessage = {
                id: `${Date.now()}-assistant`,
                role: 'assistant',
                content: data.response,
                bullets: data.bullets,
                citations: data.citations,
                explanation: data.explanation,
                showExplanation: false,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            const assistantMessage: ChatMessage = {
                id: `${Date.now()}-assistant-error`,
                role: 'assistant',
                content: 'Sorry, I could not generate a response. Please try again.',
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } finally {
            setChatLoading(false);
        }
    };

    const toggleExplanation = (id: string) => {
        setMessages((prev) =>
            prev.map((msg) =>
                msg.id === id ? { ...msg, showExplanation: !msg.showExplanation } : msg
            )
        );
    };


    const handleDragStart = (itemId: string) => {
        setDraggedItem(itemId);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    const getMarginClass = (item: MenuItem) => {
        if (!item.foodCost || !item.price) return '';
        const margin = ((item.price - item.foodCost) / item.price) * 100;
        if (margin >= 70) return 'border-l-green-500';
        if (margin >= 50) return 'border-l-yellow-500';
        return 'border-l-red-500';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Menu Editor</h1>
                    <p className="text-gray-400 mt-1">Drag and drop to organize your menu</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedRestaurant}
                        onChange={(e) => setSelectedRestaurant(e.target.value)}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                        {restaurants.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                    <Button variant="secondary">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset
                    </Button>
                    <Button>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* Sections Panel */}
                <div className="lg:col-span-2 overflow-auto">
                    {sections.length === 0 ? (
                        <Card className="h-full">
                            <CardContent className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">No Menu Items</h3>
                                <p className="text-gray-400 mb-4 max-w-xs">
                                    Import menu data or add items manually to get started with the visual editor
                                </p>
                                <Button onClick={() => window.location.href = '/dashboard/import'}>
                                    Import Data
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {sections.map((section) => (
                                <Card key={section.id}>
                                    <div className="p-4 border-b border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <button className="text-gray-500 hover:text-white cursor-grab">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                                    </svg>
                                                </button>
                                                <h3 className="font-semibold text-white">{section.name}</h3>
                                                <Badge variant="info">{section.items.length} items</Badge>
                                                {getApprovalStatus(section.id) === 'approved' && (
                                                    <Badge variant="success">Approved</Badge>
                                                )}
                                                {getApprovalStatus(section.id) === 'rejected' && (
                                                    <Badge variant="danger">Rejected</Badge>
                                                )}
                                                {getApprovalStatus(section.id) === 'pending' && (
                                                    <Badge variant="warning">Pending</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={approvalsLoading || !layoutId}
                                                    onClick={() => updateApproval(section.id, 'approved')}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={approvalsLoading || !layoutId}
                                                    onClick={() => updateApproval(section.id, 'rejected')}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-gray-800">
                                            {section.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    draggable
                                                    onDragStart={() => handleDragStart(item.id.toString())}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={() => setSelectedItem(item)}
                                                    className={`p-4 flex items-center gap-4 cursor-pointer transition-colors hover:bg-gray-800/50 border-l-4 ${getMarginClass(item)} ${selectedItem?.id === item.id ? 'bg-gray-800/50' : ''
                                                        } ${draggedItem === item.id.toString() ? 'opacity-50' : ''}`}
                                                >
                                                    <button className="text-gray-600 hover:text-white cursor-grab">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                                        </svg>
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-medium truncate">{item.name}</p>
                                                        <p className="text-sm text-gray-500">{item.category}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-white font-medium">${item.price?.toFixed(2)}</p>
                                                        {item.foodCost && (
                                                            <p className="text-xs text-gray-500">
                                                                {(((item.price - item.foodCost) / item.price) * 100).toFixed(0)}% margin
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Properties + AI Panel */}
                <div className="overflow-auto space-y-6">
                    <Card>
                        <div className="p-4 border-b border-gray-800">
                            <h3 className="font-semibold text-white">Item Properties</h3>
                        </div>
                        <CardContent>
                            {selectedItem ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={selectedItem.name}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                            readOnly
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Price</label>
                                            <input
                                                type="text"
                                                value={`$${selectedItem.price?.toFixed(2) || '0.00'}`}
                                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Cost</label>
                                            <input
                                                type="text"
                                                value={selectedItem.foodCost ? `$${selectedItem.foodCost.toFixed(2)}` : 'N/A'}
                                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Category</label>
                                        <input
                                            type="text"
                                            value={selectedItem.category || 'Uncategorized'}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                            readOnly
                                        />
                                    </div>

                                    {selectedItem.foodCost && selectedItem.price && (
                                        <div className="p-4 bg-gray-800/50 rounded-lg">
                                            <p className="text-sm text-gray-400 mb-2">Margin Analysis</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                                                        style={{
                                                            width: `${((selectedItem.price - selectedItem.foodCost) / selectedItem.price) * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-white font-medium text-sm">
                                                    {(((selectedItem.price - selectedItem.foodCost) / selectedItem.price) * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                Profit: ${(selectedItem.price - selectedItem.foodCost).toFixed(2)} per item
                                            </p>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-gray-800">
                                        <p className="text-sm text-gray-400 mb-3">AI Suggestions</p>
                                        <div className="space-y-2">
                                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                                <p className="text-sm text-blue-300">
                                                    Consider adding a photo to increase visibility
                                                </p>
                                            </div>
                                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                                <p className="text-sm text-yellow-300">
                                                    This item performs well in the dinner slot
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-400 text-sm">
                                        Select an item to view properties
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <div className="p-4 border-b border-gray-800">
                            <h3 className="font-semibold text-white">AI Assistant</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Ask for layout ideas or pricing suggestions
                            </p>
                        </div>
                        <CardContent className="space-y-4">
                            <div className="space-y-3 max-h-72 overflow-auto pr-2">
                                {messages.length === 0 && (
                                    <div className="text-sm text-gray-500">
                                        Try: “Optimize my appetizers section.”
                                    </div>
                                )}
                                {messages.map((msg) => (
                                    <div key={msg.id} className={msg.role === 'user' ? 'text-right' : ''}>
                                        <div className={msg.role === 'user'
                                            ? 'inline-block bg-white text-black text-sm px-3 py-2 rounded-lg'
                                            : 'bg-gray-800 text-white text-sm px-3 py-2 rounded-lg'
                                        }>
                                            {msg.content}
                                        </div>
                                        {msg.role === 'assistant' && msg.bullets && (
                                            <div className="mt-2 space-y-2 text-sm text-gray-300">
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {msg.bullets.map((bullet, index) => (
                                                        <li key={index}>{bullet}</li>
                                                    ))}
                                                </ul>
                                                {msg.citations && (
                                                    <div className="text-xs text-gray-500 space-y-1">
                                                        {msg.citations.map((citation, index) => (
                                                            <div key={index}>
                                                                {citation.label}: {citation.value}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {msg.explanation && (
                                                    <button
                                                        onClick={() => toggleExplanation(msg.id)}
                                                        className="text-xs text-white/70 hover:text-white"
                                                    >
                                                        {msg.showExplanation ? 'Hide explanation' : 'More explanation'}
                                                    </button>
                                                )}
                                                {msg.showExplanation && msg.explanation && (
                                                    <p className="text-xs text-gray-400">{msg.explanation}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <Input
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Ask the assistant..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <Button
                                    onClick={handleSendMessage}
                                    loading={chatLoading}
                                    disabled={!chatInput.trim() || chatLoading}
                                >
                                    Send
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
