import { NextResponse } from 'next/server';
import strategyContext from '@/lib/data/strategy-context.json';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface StrategyLayout {
    type: 'grid' | 'list' | 'magazine' | 'minimal';
    columns: number;
    highlightStrategy: string;
    colorScheme: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
    };
    typography: {
        headingFont: string;
        bodyFont: string;
        priceStyle: string;
    };
    sections: Array<{
        id: string;
        name: string;
        position: number;
        items: Array<{
            id: string;
            name: string;
            description?: string;
            price: number;
            badges: string[];
            isHighlighted: boolean;
        }>;
    }>;
}

interface MenuStrategy {
    id: string;
    name: string;
    description: string;
    psychology: string;
    expectedOutcome: string;
    reasoning?: Array<{
        principle: string;
        application: string;
        expectedImpact: string;
    }>;
    idealFor?: string[];
    layout: StrategyLayout;
}

interface ChatRequest {
    message: string;
    context?: {
        strategy?: MenuStrategy;
        layout?: unknown;
        mode?: string;
    };
    history?: ChatMessage[];
}

// Color palette options for easy reference
const COLOR_PALETTES = {
    warm: { primary: '#1a1a2e', secondary: '#16213e', accent: '#e94560', background: '#0f0f1a' },
    elegant: { primary: '#2d2d2d', secondary: '#3d3d3d', accent: '#c9a227', background: '#1a1a1a' },
    modern: { primary: '#1e3a5f', secondary: '#2e5077', accent: '#ff6b6b', background: '#0d1b2a' },
    vibrant: { primary: '#2d132c', secondary: '#801336', accent: '#ee4540', background: '#1a0a1a' },
    ocean: { primary: '#0a192f', secondary: '#112240', accent: '#64ffda', background: '#020c1b' },
    forest: { primary: '#1a2f1a', secondary: '#2d4a2d', accent: '#7cb342', background: '#0d1a0d' },
    sunset: { primary: '#2d1b1b', secondary: '#4a2c2c', accent: '#ff7043', background: '#1a0f0f' },
    royal: { primary: '#1a1a3e', secondary: '#2e2e5f', accent: '#9c27b0', background: '#0f0f2a' },
    minimal: { primary: '#ffffff', secondary: '#f5f5f5', accent: '#000000', background: '#fafafa' },
    dark: { primary: '#121212', secondary: '#1e1e1e', accent: '#bb86fc', background: '#000000' },
};

const FONTS = {
    elegant: { heading: 'Playfair Display', body: 'Inter' },
    modern: { heading: 'Montserrat', body: 'Open Sans' },
    classic: { heading: 'Cormorant Garamond', body: 'Lato' },
    bold: { heading: 'Poppins', body: 'Roboto' },
    minimal: { heading: 'Inter', body: 'Inter' },
};

export async function POST(request: Request): Promise<Response> {
    try {
        const body: ChatRequest = await request.json();
        const { message, context, history = [] } = body;

        if (!message) {
            return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
        }

        const strategy = context?.strategy;
        const lowerMessage = message.toLowerCase();

        // Check if this is a design modification request
        const isDesignRequest = checkIfDesignRequest(lowerMessage);

        if (isDesignRequest && strategy) {
            // Handle design modifications directly with smart parsing
            const result = handleDesignModification(message, strategy);
            return NextResponse.json(result);
        }

        // For explanations and other queries, use AI or fallback
        if (OPENROUTER_API_KEY) {
            const aiResponse = await getAIResponse(message, context, history);
            return NextResponse.json(aiResponse);
        }

        // Smart fallback response
        return NextResponse.json({
            success: true,
            response: getSmartFallbackResponse(message, strategy),
            layoutUpdated: false,
        });
    } catch (error) {
        console.error('Strategy chat error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Chat failed' },
            { status: 500 }
        );
    }
}

function checkIfDesignRequest(message: string): boolean {
    const designKeywords = [
        'change', 'make', 'set', 'use', 'switch', 'update', 'modify',
        'color', 'colour', 'accent', 'background', 'primary',
        'font', 'typography', 'heading', 'text',
        'column', 'layout', 'grid', 'list', 'magazine',
        'badge', 'highlight', 'feature', 'promote',
        'description', 'rename', 'rewrite',
        'blue', 'red', 'green', 'orange', 'purple', 'gold', 'pink', 'teal', 'cyan',
        'darker', 'lighter', 'brighter', 'warmer', 'cooler',
    ];
    return designKeywords.some((kw) => message.includes(kw));
}

function handleDesignModification(
    message: string,
    strategy: MenuStrategy
): { success: boolean; response: string; layoutUpdated: boolean; updatedStrategy?: MenuStrategy } {
    const lowerMessage = message.toLowerCase();
    const updatedStrategy = JSON.parse(JSON.stringify(strategy)) as MenuStrategy;
    let modified = false;
    let responseText = '';

    // COLOR CHANGES
    const colorMatch = lowerMessage.match(
        /(?:change|make|set|use|switch)?\s*(?:the\s+)?(?:accent|primary|background|secondary)?\s*(?:color|colour)?\s*(?:to\s+)?(\w+)/i
    );

    if (lowerMessage.includes('accent') || (colorMatch && !lowerMessage.includes('background') && !lowerMessage.includes('primary'))) {
        const color = extractColor(lowerMessage);
        if (color) {
            updatedStrategy.layout.colorScheme.accent = color;
            modified = true;
            responseText = `✨ **Accent color updated to ${color}!**\n\nThe new accent color will be applied to highlights, badges, and call-to-action elements. This creates visual emphasis on your key items.`;
        }
    }

    if (lowerMessage.includes('background')) {
        const color = extractColor(lowerMessage);
        if (color) {
            updatedStrategy.layout.colorScheme.background = color;
            modified = true;
            responseText = `🎨 **Background color updated to ${color}!**\n\nThe menu background has been changed. Make sure there's enough contrast with your text for readability.`;
        }
    }

    if (lowerMessage.includes('primary') && !lowerMessage.includes('background')) {
        const color = extractColor(lowerMessage);
        if (color) {
            updatedStrategy.layout.colorScheme.primary = color;
            modified = true;
            responseText = `🎨 **Primary color updated to ${color}!**\n\nThis affects the main card backgrounds and section styling.`;
        }
    }

    // COLOR PALETTE CHANGES
    const paletteNames = Object.keys(COLOR_PALETTES);
    for (const paletteName of paletteNames) {
        if (lowerMessage.includes(paletteName)) {
            const palette = COLOR_PALETTES[paletteName as keyof typeof COLOR_PALETTES];
            updatedStrategy.layout.colorScheme = { ...palette };
            modified = true;
            responseText = `🎨 **Applied "${paletteName}" color palette!**\n\n• Primary: ${palette.primary}\n• Accent: ${palette.accent}\n• Background: ${palette.background}\n\nThis gives your menu a cohesive ${paletteName} look.`;
            break;
        }
    }

    // LAYOUT TYPE CHANGES
    if (lowerMessage.includes('single column') || lowerMessage.includes('1 column') || lowerMessage.includes('one column')) {
        updatedStrategy.layout.columns = 1;
        updatedStrategy.layout.type = 'list';
        modified = true;
        responseText = `📱 **Switched to single column layout!**\n\nThis layout is:\n• Optimal for mobile viewing\n• Creates a focused, linear flow\n• Ensures every item is seen in order\n\nPerfect for price anchoring strategy.`;
    }

    if (lowerMessage.includes('two column') || lowerMessage.includes('2 column') || lowerMessage.match(/\b2\s*col/)) {
        updatedStrategy.layout.columns = 2;
        updatedStrategy.layout.type = 'grid';
        modified = true;
        responseText = `📊 **Switched to two column grid!**\n\nThis layout:\n• Maximizes screen real estate\n• Creates natural comparison pairs\n• Works great for visual menus with photos`;
    }

    if (lowerMessage.includes('three column') || lowerMessage.includes('3 column') || lowerMessage.match(/\b3\s*col/)) {
        updatedStrategy.layout.columns = 3;
        updatedStrategy.layout.type = 'grid';
        modified = true;
        responseText = `📊 **Switched to three column grid!**\n\nThis layout is ideal for:\n• Decoy pricing display (good/better/best)\n• Quick visual scanning\n• Showing many items at once`;
    }

    if (lowerMessage.includes('magazine')) {
        updatedStrategy.layout.type = 'magazine';
        updatedStrategy.layout.columns = 2;
        modified = true;
        responseText = `📰 **Switched to magazine layout!**\n\nThis elegant layout:\n• Features hero items prominently\n• Uses the Golden Triangle eye-tracking pattern\n• Creates a premium, editorial feel`;
    }

    // FONT CHANGES
    const fontNames = Object.keys(FONTS);
    for (const fontName of fontNames) {
        if (lowerMessage.includes(fontName)) {
            const fonts = FONTS[fontName as keyof typeof FONTS];
            updatedStrategy.layout.typography.headingFont = fonts.heading;
            updatedStrategy.layout.typography.bodyFont = fonts.body;
            modified = true;
            responseText = `✍️ **Applied "${fontName}" typography!**\n\n• Headings: ${fonts.heading}\n• Body: ${fonts.body}\n\nThis gives your menu a ${fontName} aesthetic.`;
            break;
        }
    }

    // BADGE MODIFICATIONS
    if (lowerMessage.includes('add') && (lowerMessage.includes('badge') || lowerMessage.includes('chef') || lowerMessage.includes('popular') || lowerMessage.includes('pick'))) {
        const itemName = extractItemName(message);
        const badgeType = extractBadgeType(lowerMessage);

        if (itemName) {
            let found = false;
            for (const section of updatedStrategy.layout.sections) {
                for (const item of section.items) {
                    if (item.name.toLowerCase().includes(itemName.toLowerCase())) {
                        if (!item.badges.includes(badgeType)) {
                            item.badges.push(badgeType);
                            item.isHighlighted = true;
                        }
                        found = true;
                        responseText = `🏷️ **Added "${badgeType}" badge to ${item.name}!**\n\nThis item will now stand out with social proof, increasing its selection rate by up to 30%.`;
                        break;
                    }
                }
                if (found) break;
            }
            if (found) modified = true;
        }
    }

    // DESCRIPTION IMPROVEMENTS
    if (lowerMessage.includes('description') || lowerMessage.includes('rewrite') || lowerMessage.includes('improve')) {
        const itemName = extractItemName(message);
        if (itemName) {
            for (const section of updatedStrategy.layout.sections) {
                for (const item of section.items) {
                    if (item.name.toLowerCase().includes(itemName.toLowerCase())) {
                        const newDesc = generateAppetizingDescription(item.name);
                        item.description = newDesc;
                        modified = true;
                        responseText = `✏️ **Improved description for ${item.name}!**\n\n"${newDesc}"\n\nSensory language increases perceived value by up to 27%.`;
                        break;
                    }
                }
            }
        } else if (lowerMessage.includes('all') || lowerMessage.includes('every')) {
            let count = 0;
            for (const section of updatedStrategy.layout.sections) {
                for (const item of section.items) {
                    item.description = generateAppetizingDescription(item.name);
                    count++;
                }
            }
            modified = true;
            responseText = `✏️ **Improved ${count} item descriptions!**\n\nAll descriptions now use sensory language and appetizing adjectives to increase perceived value.`;
        }
    }

    // HIGHLIGHT ITEMS
    if (lowerMessage.includes('highlight') || lowerMessage.includes('feature') || lowerMessage.includes('promote')) {
        const itemName = extractItemName(message);
        if (itemName) {
            for (const section of updatedStrategy.layout.sections) {
                for (const item of section.items) {
                    if (item.name.toLowerCase().includes(itemName.toLowerCase())) {
                        item.isHighlighted = true;
                        if (item.badges.length === 0) {
                            item.badges.push('⭐ Featured');
                        }
                        modified = true;
                        responseText = `✨ **${item.name} is now highlighted!**\n\nFeatured items get 2-3x more attention. This item will stand out in the layout with visual emphasis.`;
                        break;
                    }
                }
            }
        }
    }

    // PRICE STYLE
    if (lowerMessage.includes('hide dollar') || lowerMessage.includes('remove dollar') || lowerMessage.includes('no dollar')) {
        updatedStrategy.layout.typography.priceStyle = 'hidden-dollar';
        modified = true;
        responseText = `💰 **Removed dollar signs from prices!**\n\nResearch shows removing currency symbols reduces price sensitivity and increases spending by 8-12%.`;
    }

    if (lowerMessage.includes('show dollar') || lowerMessage.includes('add dollar')) {
        updatedStrategy.layout.typography.priceStyle = 'bold';
        modified = true;
        responseText = `💲 **Dollar signs restored!**\n\nPrices will now display with currency symbols for clarity.`;
    }

    if (!modified) {
        // No modification detected, provide helpful response
        return {
            success: true,
            response: getDesignHelpResponse(message, strategy),
            layoutUpdated: false,
        };
    }

    return {
        success: true,
        response: responseText,
        layoutUpdated: true,
        updatedStrategy,
    };
}

function extractColor(message: string): string | null {
    const colorMap: Record<string, string> = {
        blue: '#3b82f6',
        red: '#ef4444',
        green: '#22c55e',
        orange: '#f97316',
        purple: '#a855f7',
        pink: '#ec4899',
        yellow: '#eab308',
        gold: '#c9a227',
        teal: '#14b8a6',
        cyan: '#06b6d4',
        indigo: '#6366f1',
        rose: '#f43f5e',
        emerald: '#10b981',
        amber: '#f59e0b',
        lime: '#84cc16',
        sky: '#0ea5e9',
        violet: '#8b5cf6',
        fuchsia: '#d946ef',
        white: '#ffffff',
        black: '#000000',
        gray: '#6b7280',
        grey: '#6b7280',
    };

    for (const [name, hex] of Object.entries(colorMap)) {
        if (message.includes(name)) {
            return hex;
        }
    }

    // Check for hex color
    const hexMatch = message.match(/#[0-9a-fA-F]{6}/);
    if (hexMatch) {
        return hexMatch[0];
    }

    return null;
}

function extractItemName(message: string): string | null {
    // Look for quoted item names
    const quotedMatch = message.match(/["']([^"']+)["']/);
    if (quotedMatch) return quotedMatch[1];

    // Look for "to X" or "for X" patterns
    const toMatch = message.match(/(?:to|for|on)\s+(?:the\s+)?([A-Z][a-zA-Z\s]+?)(?:\s+item|\s+dish|$|\.|\?)/);
    if (toMatch) return toMatch[1].trim();

    // Look for capitalized words that might be item names
    const words = message.split(/\s+/);
    const capitalizedWords = words.filter((w) => /^[A-Z]/.test(w) && w.length > 2);
    if (capitalizedWords.length > 0) {
        return capitalizedWords.join(' ');
    }

    return null;
}

function extractBadgeType(message: string): string {
    if (message.includes('chef') || message.includes('pick')) return "Chef's Pick";
    if (message.includes('popular') || message.includes('best seller')) return '🔥 Popular';
    if (message.includes('new')) return '✨ New';
    if (message.includes('spicy')) return '🌶️ Spicy';
    if (message.includes('vegetarian') || message.includes('veg')) return '🥬 Vegetarian';
    if (message.includes('limited')) return '⏰ Limited Time';
    if (message.includes('recommended')) return '👍 Recommended';
    return '⭐ Featured';
}

function generateAppetizingDescription(itemName: string): string {
    const adjectives = ['succulent', 'crispy', 'golden', 'tender', 'aromatic', 'savory', 'rich', 'fresh', 'house-made', 'slow-roasted'];
    const preparations = ['perfectly seasoned', 'expertly crafted', 'carefully prepared', 'lovingly made'];
    const finishes = ['served with a side of', 'drizzled with', 'topped with', 'accompanied by'];

    const adj1 = adjectives[Math.floor(Math.random() * adjectives.length)];
    const adj2 = adjectives[Math.floor(Math.random() * adjectives.length)];
    const prep = preparations[Math.floor(Math.random() * preparations.length)];

    return `${adj1.charAt(0).toUpperCase() + adj1.slice(1)} and ${adj2}, ${prep} to bring out the finest flavors.`;
}

function getDesignHelpResponse(message: string, strategy: MenuStrategy): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('explain') || lowerMessage.includes('why')) {
        return `**About the ${strategy.name} Strategy**\n\n${strategy.psychology}\n\n**Expected Result:** ${strategy.expectedOutcome}\n\nThis layout is designed to guide customer attention and maximize high-margin item visibility.`;
    }

    return `I can help you customize this menu! Try commands like:\n\n**Colors:**\n• "Change accent color to blue"\n• "Use the ocean color palette"\n• "Make background darker"\n\n**Layout:**\n• "Switch to single column"\n• "Use magazine layout"\n• "Make it 3 columns"\n\n**Typography:**\n• "Use elegant fonts"\n• "Hide dollar signs"\n\n**Items:**\n• "Add Chef's Pick badge to [item]"\n• "Highlight the [item]"\n• "Improve all descriptions"\n\nWhat would you like to change?`;
}

async function getAIResponse(
    message: string,
    context: ChatRequest['context'],
    history: ChatMessage[]
): Promise<{ success: boolean; response: string; layoutUpdated: boolean; updatedStrategy?: MenuStrategy }> {
    const strategy = context?.strategy;

    const systemPrompt = `You are Tweny AI, an expert menu design assistant. You help restaurants optimize their digital menus.

Current Strategy: ${strategy?.name || 'Not selected'}
Layout Type: ${strategy?.layout.type || 'Unknown'}
Columns: ${strategy?.layout.columns || 2}
Accent Color: ${strategy?.layout.colorScheme.accent || '#e94560'}

MENU ENGINEERING KNOWLEDGE:
${JSON.stringify(strategyContext.menuEngineering, null, 2)}

BEHAVIORAL PSYCHOLOGY:
${JSON.stringify(strategyContext.behavioralPsychology, null, 2)}

When answering:
1. Be concise but informative
2. Explain the psychology behind design choices
3. Reference the current strategy when relevant
4. Suggest specific actionable changes
5. Use markdown formatting for readability

If the user asks to make changes, explain what you would change and why. For actual modifications, they should use specific commands like "change accent to blue" or "use magazine layout".`;

    const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.slice(-6),
        { role: 'user' as const, content: message },
    ];

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': SITE_URL,
                'X-Title': 'Tweny Menu AI',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages,
                temperature: 0.7,
                max_tokens: 1500,
            }),
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content || '';

        return {
            success: true,
            response: aiResponse,
            layoutUpdated: false,
        };
    } catch (error) {
        console.error('AI API error:', error);
        return {
            success: true,
            response: getSmartFallbackResponse(message, strategy),
            layoutUpdated: false,
        };
    }
}

function getSmartFallbackResponse(message: string, strategy?: MenuStrategy): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        return `👋 Hello! I'm your Menu Design Assistant.\n\nI can help you customize your ${strategy?.name || ''} menu layout. Try asking me to:\n• Change colors\n• Modify the layout\n• Add badges to items\n• Explain design choices\n\nWhat would you like to do?`;
    }

    if (lowerMessage.includes('help')) {
        return `**I can help you with:**\n\n🎨 **Colors** - "Change accent to blue", "Use dark palette"\n📐 **Layout** - "Single column", "Magazine style", "3 columns"\n✍️ **Typography** - "Elegant fonts", "Hide dollar signs"\n🏷️ **Badges** - "Add Chef's Pick to [item]"\n✏️ **Descriptions** - "Improve all descriptions"\n\n**Current Setup:**\n• Strategy: ${strategy?.name || 'None'}\n• Layout: ${strategy?.layout.type || 'Grid'}\n• Columns: ${strategy?.layout.columns || 2}`;
    }

    if (lowerMessage.includes('strategy') || lowerMessage.includes('explain')) {
        if (strategy) {
            return `**${strategy.name} Strategy**\n\n${strategy.psychology}\n\n**Why it works:**\n${strategy.description}\n\n**Expected outcome:** ${strategy.expectedOutcome}`;
        }
    }

    return `I can help you customize this menu! Try:\n• "Change accent color to blue"\n• "Switch to single column layout"\n• "Add Popular badge to [item name]"\n• "Explain this strategy"\n\nWhat would you like to adjust?`;
}
