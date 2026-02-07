'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { MenuStrategy } from '@/lib/services/strategy.service';
import { LayoutBuilderAgent, BuiltLayout } from '@/lib/services/layout-builder.service';
import { createExperiment } from '@/lib/services/experiment.types';
import { MenuContext } from '@/lib/services/context.service';

interface DesignChange {
    type: 'html' | 'css' | 'both';
    description: string;
    reasoning: string;
    status?: 'pending' | 'applying' | 'done';
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    changes?: DesignChange[];
    isStreaming?: boolean;
    mode?: 'clarify' | 'plan' | 'execute';
}

// History state for undo functionality
interface HistoryState {
    html: string;
    css: string;
    timestamp: Date;
    description: string;
}

export default function DeployPage() {
    const router = useRouter();
    const chatEndRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const [strategy, setStrategy] = useState<MenuStrategy | null>(null);
    const [currentHtml, setCurrentHtml] = useState<string>('');
    const [currentCss, setCurrentCss] = useState<string>('');
    const [layoutId, setLayoutId] = useState<string>('');

    const [deploying, setDeploying] = useState(false);
    const [deployed, setDeployed] = useState(false);
    const [qrUrl, setQrUrl] = useState<string | null>(null);

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Session context from onboarding (PDF, sales data, etc.)
    const [menuContext, setMenuContext] = useState<MenuContext | null>(null);

    // Undo/History functionality
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Save state to history before changes
    const saveToHistory = useCallback((description: string) => {
        setHistory(prev => {
            // Remove any forward history if we're not at the end
            const newHistory = prev.slice(0, historyIndex + 1);
            return [...newHistory, {
                html: currentHtml,
                css: currentCss,
                timestamp: new Date(),
                description,
            }];
        });
        setHistoryIndex(prev => prev + 1);
    }, [currentHtml, currentCss, historyIndex]);

    // Undo function
    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setCurrentHtml(prevState.html);
            setCurrentCss(prevState.css);
            setHistoryIndex(prev => prev - 1);
            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `↩️ **Undone:** Reverted to "${prevState.description}"`,
                timestamp: new Date(),
            }]);
        }
    }, [history, historyIndex]);

    // Redo function
    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setCurrentHtml(nextState.html);
            setCurrentCss(nextState.css);
            setHistoryIndex(prev => prev + 1);
            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `↪️ **Redone:** Applied "${nextState.description}"`,
                timestamp: new Date(),
            }]);
        }
    }, [history, historyIndex]);

    // Initialize from strategy and load session context
    useEffect(() => {
        const stored = sessionStorage.getItem('selectedStrategy');
        if (stored) {
            const strat = JSON.parse(stored) as MenuStrategy;
            setStrategy(strat);
            initializeLayout(strat);
        } else {
            router.push('/dashboard/strategy');
        }

        // Load menu context from onboarding (PDF data, sales data, colors)
        const contextStored = sessionStorage.getItem('menuContext');
        if (contextStored) {
            try {
                const ctx = JSON.parse(contextStored) as MenuContext;
                setMenuContext(ctx);
            } catch (e) {
                console.error('Failed to parse menu context:', e);
            }
        } else {
            // Try to load from database if not in sessionStorage
            loadContextFromDatabase();
        }
    }, [router]);

    // Load context from database if not available in sessionStorage
    const loadContextFromDatabase = async () => {
        try {
            const token = localStorage.getItem('token');
            // First get the restaurant ID
            const restaurantsRes = await fetch('/api/restaurants', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!restaurantsRes.ok) return;

            const { restaurants } = await restaurantsRes.json();
            if (!restaurants?.length) return;

            const restaurantId = restaurants[0].id;

            // Fetch context from database
            const contextRes = await fetch(`/api/menu/import?restaurantId=${restaurantId}`);
            if (!contextRes.ok) return;

            const data = await contextRes.json();
            if (data.context || data.menuItems?.length) {
                const ctx: MenuContext = {
                    items: data.menuItems?.map((item: { id: number; name: string; description?: string; price: string; cost?: string; sectionId?: number }) => ({
                        id: item.id.toString(),
                        name: item.name,
                        description: item.description,
                        price: parseFloat(item.price),
                        category: 'Other',
                    })) || [],
                    ...data.context,
                    restaurantId,
                };
                setMenuContext(ctx as any);
                sessionStorage.setItem('menuContext', JSON.stringify(ctx));
                console.log('📥 Loaded context from database');
            }
        } catch (e) {
            console.error('Failed to load context from database:', e);
        }
    };

    const initializeLayout = async (strat: MenuStrategy) => {
        const layout = await LayoutBuilderAgent.buildLayout(strat);
        setCurrentHtml(layout.html);
        setCurrentCss(layout.css);
        setLayoutId(layout.id);

        // Save initial state to history
        setHistory([{
            html: layout.html,
            css: layout.css,
            timestamp: new Date(),
            description: 'Initial layout',
        }]);
        setHistoryIndex(0);

        // Load context for welcome message
        const contextStored = sessionStorage.getItem('menuContext');
        let welcomeContext = '';
        if (contextStored) {
            try {
                const ctx = JSON.parse(contextStored) as MenuContext;
                setMenuContext(ctx);
                welcomeContext = `\n\n**📊 I have access to your data:**\n• ${ctx.items?.length || 0} menu items from your PDF\n• ${ctx.salesData ? `Sales data (${ctx.salesData.totalOrders} orders, $${ctx.salesData.totalRevenue?.toFixed(0)} revenue)` : 'No sales data uploaded'}\n• ${ctx.extractedColors ? `Original colors: ${ctx.extractedColors.dominant}` : 'Default colors'}\n• ${ctx.menuEngineering ? `Menu engineering: ${ctx.menuEngineering.stars?.length || 0} stars, ${ctx.menuEngineering.dogs?.length || 0} dogs` : ''}\n\nI'll use this data to make smart design suggestions!`;
            } catch (e) {
                console.error('Failed to parse context:', e);
            }
        }

        setChatMessages([{
            id: '0',
            role: 'assistant',
            content: `🍽️ **Welcome to the Menu Design Studio!**

I'm your AI menu engineering specialist. I'll help you create a **mobile-optimized, high-converting menu** with built-in ordering functionality.${welcomeContext}

**📱 What makes this menu special:**
• Optimized for phones (touch-friendly, fast loading)
• Built-in cart & checkout functionality
• Menu engineering principles applied automatically
• Highlights your most profitable items

**💡 How I work:**
1. I'll ask clarifying questions to understand your vision
2. I'll propose a plan for your approval
3. Once approved, I'll implement the changes

**🔧 You can always undo changes** using the ↩️ button!

Tell me what you'd like to change about your menu design.`,
            timestamp: new Date(),
        }]);
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Update preview when HTML/CSS changes - includes order functionality for testing
    const previewSrc = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&family=Cormorant+Garamond:wght@400;600&family=Lato:wght@400;700&family=Montserrat:wght@400;600&family=Open+Sans:wght@400;600&family=Poppins:wght@400;600&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; }
        ${currentCss}
        /* Cart overlay styles for preview */
        .tweny-cart-overlay { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.95); backdrop-filter: blur(10px); border-top: 1px solid #333; padding: 12px; z-index: 1000; transform: translateY(0); transition: transform 0.3s ease; }
        .tweny-cart-overlay.hidden { transform: translateY(100%); }
        .tweny-cart-btn { width: 100%; background: linear-gradient(135deg, #f97316, #ef4444); color: white; border: none; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .tweny-cart-count { background: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 20px; margin-right: 6px; font-size: 12px; }
        .tweny-add-btn { background: #f97316; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
        .tweny-add-btn:hover { background: #ea580c; }
        .tweny-qty-control { display: inline-flex; align-items: center; gap: 6px; background: #1f2937; border-radius: 20px; padding: 3px; }
        .tweny-qty-btn { width: 24px; height: 24px; border-radius: 50%; border: none; background: #374151; color: white; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
        .tweny-qty-btn.plus { background: #f97316; }
        .tweny-cart-actions { margin-top: 6px; }
        .tweny-preview-badge { position: fixed; top: 8px; right: 8px; background: #f97316; color: white; font-size: 10px; padding: 4px 8px; border-radius: 4px; z-index: 1001; }
    </style>
</head>
<body>
    <div class="tweny-preview-badge">🛒 Order Preview</div>
    ${currentHtml}
    <div id="tweny-cart-overlay" class="tweny-cart-overlay hidden">
        <button id="tweny-view-cart" class="tweny-cart-btn">
            <span><span id="tweny-cart-count" class="tweny-cart-count">0</span> View Cart</span>
            <span id="tweny-cart-total">$0.00</span>
        </button>
    </div>
    <script>
        (function() {
            const cart = new Map();
            const TAX_RATE = 0.08;
            
            function updateCartUI() {
                let total = 0, count = 0;
                cart.forEach((qty, item) => { total += item.price * qty; count += qty; });
                const overlay = document.getElementById('tweny-cart-overlay');
                const countEl = document.getElementById('tweny-cart-count');
                const totalEl = document.getElementById('tweny-cart-total');
                if (count > 0) {
                    overlay.classList.remove('hidden');
                    countEl.textContent = count;
                    totalEl.textContent = '$' + (total * (1 + TAX_RATE)).toFixed(2);
                } else {
                    overlay.classList.add('hidden');
                }
            }
            
            function addToCart(item) {
                const current = cart.get(item) || 0;
                cart.set(item, current + 1);
                updateCartUI();
                updateItemButtons(item);
            }
            
            function removeFromCart(item) {
                const current = cart.get(item) || 0;
                if (current > 1) cart.set(item, current - 1);
                else cart.delete(item);
                updateCartUI();
                updateItemButtons(item);
            }
            
            function updateItemButtons(item) {
                const qty = cart.get(item) || 0;
                const container = document.querySelector('[data-item-id="' + item.id + '"] .tweny-cart-actions');
                if (!container) return;
                if (qty > 0) {
                    container.innerHTML = '<div class="tweny-qty-control"><button class="tweny-qty-btn minus">−</button><span style="color:white;min-width:20px;text-align:center;font-size:12px">' + qty + '</span><button class="tweny-qty-btn plus">+</button></div>';
                    container.querySelector('.minus').onclick = (e) => { e.stopPropagation(); removeFromCart(item); };
                    container.querySelector('.plus').onclick = (e) => { e.stopPropagation(); addToCart(item); };
                } else {
                    container.innerHTML = '<button class="tweny-add-btn">Add</button>';
                    container.querySelector('.tweny-add-btn').onclick = (e) => { e.stopPropagation(); addToCart(item); };
                }
            }
            
            // Initialize add buttons for all items with data-item-id
            document.querySelectorAll('[data-item-id]').forEach(el => {
                const itemId = el.getAttribute('data-item-id');
                const name = el.getAttribute('data-name') || el.querySelector('[data-name]')?.getAttribute('data-name') || 'Item';
                const priceStr = el.getAttribute('data-price') || el.querySelector('[data-price]')?.getAttribute('data-price') || '0';
                const price = parseFloat(priceStr) || 0;
                const item = { id: itemId, name, price };
                
                let actionsContainer = el.querySelector('.tweny-cart-actions');
                if (!actionsContainer) {
                    actionsContainer = document.createElement('div');
                    actionsContainer.className = 'tweny-cart-actions';
                    el.appendChild(actionsContainer);
                }
                actionsContainer.innerHTML = '<button class="tweny-add-btn">Add</button>';
                actionsContainer.querySelector('.tweny-add-btn').onclick = (e) => { e.stopPropagation(); addToCart(item); };
            });
            
            document.getElementById('tweny-view-cart').onclick = function() {
                let items = [];
                let subtotal = 0;
                cart.forEach((qty, item) => {
                    items.push(item.name + ' x' + qty + ' = $' + (item.price * qty).toFixed(2));
                    subtotal += item.price * qty;
                });
                const tax = subtotal * TAX_RATE;
                const total = subtotal + tax;
                alert('Preview Order Summary:\\n\\n' + items.join('\\n') + '\\n\\nSubtotal: $' + subtotal.toFixed(2) + '\\nTax: $' + tax.toFixed(2) + '\\nTotal: $' + total.toFixed(2) + '\\n\\n(This is a preview - deploy to enable real orders)');
            };
        })();
    </script>
</body>
</html>`;

    const sendMessage = useCallback(async (message: string) => {
        if (!message.trim() || isProcessing) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: message,
            timestamp: new Date(),
        };

        setChatMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsProcessing(true);
        setStatusMessage('Analyzing your request...');

        const assistantMessageId = (Date.now() + 1).toString();
        setChatMessages(prev => [...prev, {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            changes: [],
            isStreaming: true,
        }]);

        try {
            const response = await fetch('/api/design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    currentHtml,
                    currentCss,
                    strategy,
                    menuContext, // Include full session context (PDF, sales, colors)
                    history: chatMessages.slice(-8).map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            if (!response.ok) throw new Error('Request failed');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;

                    const eventMatch = line.match(/^event: (\w+)/);
                    const dataMatch = line.match(/data: (.+)$/m);

                    if (eventMatch && dataMatch) {
                        const eventType = eventMatch[1];
                        const data = JSON.parse(dataMatch[1]);

                        switch (eventType) {
                            case 'status':
                                setStatusMessage(data.message);
                                break;

                            case 'change':
                                setChatMessages(prev => prev.map(msg =>
                                    msg.id === assistantMessageId
                                        ? {
                                            ...msg,
                                            changes: [...(msg.changes || []), { ...data, status: 'applying' }],
                                        }
                                        : msg
                                ));
                                // Flash effect
                                setTimeout(() => {
                                    setChatMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? {
                                                ...msg,
                                                changes: msg.changes?.map((c, i) =>
                                                    i === (msg.changes?.length || 0) - 1 ? { ...c, status: 'done' } : c
                                                ),
                                            }
                                            : msg
                                    ));
                                }, 300);
                                break;

                            case 'clarify':
                            case 'plan':
                                // Questions or plan - no HTML/CSS changes yet
                                setChatMessages(prev => prev.map(msg =>
                                    msg.id === assistantMessageId
                                        ? {
                                            ...msg,
                                            mode: eventType as 'clarify' | 'plan',
                                        }
                                        : msg
                                ));
                                break;

                            case 'complete':
                                // Only save to history and apply changes on execute mode
                                if (data.mode === 'execute' && data.updatedHtml && data.updatedCss) {
                                    // Save current state to history before applying changes
                                    saveToHistory(message.slice(0, 50) + (message.length > 50 ? '...' : ''));
                                    setCurrentHtml(data.updatedHtml);
                                    setCurrentCss(data.updatedCss);
                                }
                                setChatMessages(prev => prev.map(msg =>
                                    msg.id === assistantMessageId
                                        ? {
                                            ...msg,
                                            content: data.summary || 'Changes applied!',
                                            isStreaming: false,
                                            mode: data.mode,
                                        }
                                        : msg
                                ));
                                break;

                            case 'error':
                                setChatMessages(prev => prev.map(msg =>
                                    msg.id === assistantMessageId
                                        ? {
                                            ...msg,
                                            content: data.message || 'Something went wrong',
                                            isStreaming: false,
                                        }
                                        : msg
                                ));
                                break;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Design error:', error);
            setChatMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                    ? { ...msg, content: 'Error processing request. Please try again.', isStreaming: false }
                    : msg
            ));
        } finally {
            setIsProcessing(false);
            setStatusMessage(null);
        }
    }, [currentHtml, currentCss, strategy, isProcessing, chatMessages, menuContext, saveToHistory]);

    const handleDeploy = async () => {
        if (!strategy) return;

        setDeploying(true);
        try {
            // Get restaurant ID from context or use default
            const restaurantId = (menuContext as any)?.restaurantId || 1;

            // Save to database for persistence
            const deployRes = await fetch('/api/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId,
                    html: currentHtml,
                    css: currentCss,
                    strategyName: strategy.name,
                    strategyId: strategy.id,
                    menuContext: menuContext ? {
                        items: menuContext.items,
                        extractedColors: menuContext.extractedColors,
                    } : undefined,
                }),
            });

            const deployData = await deployRes.json();
            if (!deployRes.ok) {
                throw new Error(deployData.error || 'Deploy failed');
            }

            const experiment = createExperiment(
                restaurantId, `${strategy.name} Test`,
                `Testing ${strategy.name} strategy`,
                strategy.id, strategy.name, deployData.layoutId?.toString() || layoutId
            );
            experiment.status = 'running';
            experiment.startedAt = new Date().toISOString();

            // Save all data needed for the live menu (also keep local storage as fallback)
            sessionStorage.setItem('currentExperiment', JSON.stringify(experiment));
            sessionStorage.setItem('deployedLayout', JSON.stringify({
                id: deployData.layoutId || layoutId,
                html: currentHtml,
                css: currentCss,
                strategy: strategy,
                menuContext: menuContext,
            }));

            // Also save to localStorage for persistence across tabs/sessions
            localStorage.setItem('tweny_deployed_menu', JSON.stringify({
                id: deployData.layoutId || layoutId,
                html: currentHtml,
                css: currentCss,
                strategy: strategy,
                menuContext: menuContext,
                deployedAt: new Date().toISOString(),
                version: deployData.version,
            }));

            // QR code now points to the restaurant-specific URL for DB-backed menu
            const menuUrl = `${window.location.origin}/menu/${restaurantId}`;
            setQrUrl(menuUrl);
            setDeployed(true);

            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `🚀 **Menu deployed!** (v${deployData.version})\n\nYour QR code is ready. Customers can now scan it to view your custom-designed menu.\n\n**Deployed to database:**\n• Layout ID: ${deployData.layoutId}\n• Version: ${deployData.version}\n• ${menuContext?.items?.length || 0} menu items\n• ${menuContext?.salesData ? 'Sales analytics active' : 'No sales data'}\n• ${menuContext?.extractedColors ? 'Original colors preserved' : 'Default colors'}\n\n📊 All orders will be tracked against this menu version for analytics!`,
                timestamp: new Date(),
            }]);
        } catch (error) {
            console.error('Deploy error:', error);
            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `❌ **Deploy failed**\n\n${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
                timestamp: new Date(),
            }]);
        } finally {
            setDeploying(false);
        }
    };

    // Dynamic quick prompts based on available context - focused on menu engineering
    const basePrompts = [
        { icon: '📱', text: 'Optimize for mobile ordering' },
        { icon: '⭐', text: 'Highlight profitable items' },
        { icon: '💰', text: 'Apply decoy pricing layout' },
        { icon: '👁️', text: 'Use Golden Triangle placement' },
    ];

    const quickPrompts = [
        ...basePrompts,
        // Add context-aware prompts
        ...(menuContext?.extractedColors ? [{ icon: '🎨', text: 'Use my brand colors' }] : []),
        ...(menuContext?.menuEngineering?.stars?.length ? [{ icon: '🌟', text: 'Feature my star items' }] : []),
        ...(menuContext?.salesData ? [{ icon: '📊', text: 'Optimize based on sales' }] : []),
    ].slice(0, 6); // Max 6 prompts

    if (!strategy) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                            <span className="text-sm">�️</span>
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-white">Menu Engineering Studio</h1>
                            <p className="text-xs text-gray-500">Mobile-first • Order-ready</p>
                        </div>
                    </div>
                    <Badge variant="info" className="text-xs">{strategy.name}</Badge>

                    {/* Undo/Redo buttons */}
                    <div className="flex items-center gap-1 ml-4 border-l border-gray-700 pl-4">
                        <button
                            onClick={handleUndo}
                            disabled={historyIndex <= 0}
                            className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all group"
                            title={`Undo (${historyIndex} changes)`}
                        >
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                        </button>
                        <button
                            onClick={handleRedo}
                            disabled={historyIndex >= history.length - 1}
                            className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all group"
                            title="Redo"
                        >
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                            </svg>
                        </button>
                        {historyIndex > 0 && (
                            <span className="text-xs text-gray-500 ml-1">{historyIndex} change{historyIndex !== 1 ? 's' : ''}</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {deployed && qrUrl ? (
                        <>
                            <Button variant="secondary" size="sm" onClick={() => window.open(qrUrl, '_blank')}>
                                Preview Live
                            </Button>
                            <Button size="sm" onClick={() => router.push('/dashboard/analytics')}>
                                View Analytics →
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleDeploy} loading={deploying} size="sm">
                            🚀 Deploy Menu
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Live Preview */}
                <div className="flex-1 flex flex-col bg-gray-950">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <span className="text-xs text-gray-500 ml-2">Live Preview</span>
                        </div>
                        {isProcessing && (
                            <div className="flex items-center gap-2 text-xs text-orange-400">
                                <div className="animate-spin w-3 h-3 border border-orange-400 border-t-transparent rounded-full" />
                                Updating...
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                        <div className="mx-auto max-w-md bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
                            <iframe
                                ref={iframeRef}
                                srcDoc={previewSrc}
                                className="w-full h-[600px] border-0"
                                title="Menu Preview"
                            />
                        </div>
                    </div>

                    {/* QR Code (if deployed) */}
                    {deployed && qrUrl && (
                        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                            <div className="flex items-center justify-center gap-4">
                                <div className="bg-white p-2 rounded-lg">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrUrl)}`}
                                        alt="QR Code"
                                        className="w-20 h-20"
                                    />
                                </div>
                                <div>
                                    <Badge variant="success" className="mb-1">Deployed</Badge>
                                    <p className="text-xs text-gray-400">Scan to view menu</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: AI Chat */}
                <div className="w-[400px] flex flex-col border-l border-gray-800 bg-gray-900">
                    {/* Chat Header */}
                    <div className="px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-orange-500/10 to-red-500/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-sm">
                                        🍽️
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-gray-900" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-white">Menu Engineer</h3>
                                    <p className="text-xs text-green-400">Mobile • Orders • Payments</p>
                                </div>
                            </div>
                            {/* History indicator */}
                            {history.length > 1 && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {history.length - 1} edits
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatMessages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-br-md'
                                    : msg.mode === 'plan'
                                        ? 'bg-blue-900/50 text-gray-200 rounded-bl-md border border-blue-500/30'
                                        : msg.mode === 'clarify'
                                            ? 'bg-yellow-900/30 text-gray-200 rounded-bl-md border border-yellow-500/30'
                                            : 'bg-gray-800 text-gray-200 rounded-bl-md'
                                    }`}>
                                    {/* Mode indicator */}
                                    {msg.mode === 'plan' && (
                                        <div className="flex items-center gap-1 text-xs text-blue-400 mb-2">
                                            <span>📋</span> Proposed Plan - Say "yes" to apply
                                        </div>
                                    )}
                                    {msg.mode === 'clarify' && (
                                        <div className="flex items-center gap-1 text-xs text-yellow-400 mb-2">
                                            <span>❓</span> Clarifying Questions
                                        </div>
                                    )}

                                    {/* Changes display */}
                                    {msg.changes && msg.changes.length > 0 && (
                                        <div className="mb-3 space-y-1.5">
                                            {msg.changes.map((change, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-all ${change.status === 'applying'
                                                        ? 'bg-orange-500/20 border border-orange-500/40 animate-pulse'
                                                        : 'bg-green-500/20 border border-green-500/40'
                                                        }`}
                                                >
                                                    <span>{change.status === 'applying' ? '⚙️' : '✓'}</span>
                                                    <span className="flex-1">{change.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Message content */}
                                    {msg.isStreaming && !msg.content ? (
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full" />
                                            <span className="text-sm">{statusMessage || 'Designing...'}</span>
                                        </div>
                                    ) : (
                                        <div
                                            className="text-sm prose prose-invert prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{
                                                __html: msg.content
                                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                    .replace(/\n/g, '<br/>')
                                                    .replace(/• /g, '&bull; '),
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Quick Prompts */}
                    {chatMessages.length < 3 && (
                        <div className="px-4 py-3 border-t border-gray-800/50">
                            <p className="text-xs text-gray-500 mb-2">Menu engineering prompts:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {quickPrompts.map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => sendMessage(prompt.text)}
                                        className="px-2.5 py-1 text-xs bg-gray-800 text-gray-300 rounded-lg hover:bg-orange-500/20 hover:border-orange-500/30 border border-transparent transition-all flex items-center gap-1"
                                    >
                                        <span>{prompt.icon}</span>
                                        <span>{prompt.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-4 border-t border-gray-800">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={e => setInputMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(inputMessage)}
                                placeholder="Describe menu design changes..."
                                className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
                                disabled={isProcessing}
                            />
                            <button
                                onClick={() => sendMessage(inputMessage)}
                                disabled={!inputMessage.trim() || isProcessing}
                                className="p-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl disabled:opacity-50 transition-all hover:from-orange-600 hover:to-red-600"
                            >
                                {isProcessing ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 text-center">
                            Menu engineering only • Mobile-first • Order-ready
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
