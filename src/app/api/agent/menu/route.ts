import strategyContext from '../../../../../data/strategy-context.json';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// Tool definitions for the menu design agent
const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'change_color',
            description: 'Change a color in the menu color scheme. Use this for accent, primary, secondary, or background colors.',
            parameters: {
                type: 'object',
                properties: {
                    colorType: {
                        type: 'string',
                        enum: ['accent', 'primary', 'secondary', 'background'],
                        description: 'Which color to change',
                    },
                    color: {
                        type: 'string',
                        description: 'The new color value. Can be a color name (blue, red, etc.) or hex code (#3b82f6)',
                    },
                },
                required: ['colorType', 'color'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'apply_color_palette',
            description: 'Apply a complete color palette to the menu. Available palettes: warm, elegant, modern, vibrant, ocean, forest, sunset, royal, minimal, dark',
            parameters: {
                type: 'object',
                properties: {
                    palette: {
                        type: 'string',
                        enum: ['warm', 'elegant', 'modern', 'vibrant', 'ocean', 'forest', 'sunset', 'royal', 'minimal', 'dark'],
                        description: 'The palette name to apply',
                    },
                },
                required: ['palette'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'change_layout',
            description: 'Change the menu layout type and column count',
            parameters: {
                type: 'object',
                properties: {
                    layoutType: {
                        type: 'string',
                        enum: ['grid', 'list', 'magazine', 'minimal'],
                        description: 'The layout style',
                    },
                    columns: {
                        type: 'number',
                        enum: [1, 2, 3],
                        description: 'Number of columns (1-3)',
                    },
                },
                required: ['layoutType', 'columns'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'change_typography',
            description: 'Change the menu fonts. Available styles: elegant, modern, classic, bold, minimal',
            parameters: {
                type: 'object',
                properties: {
                    style: {
                        type: 'string',
                        enum: ['elegant', 'modern', 'classic', 'bold', 'minimal'],
                        description: 'Typography style preset',
                    },
                    hideDollarSign: {
                        type: 'boolean',
                        description: 'Whether to hide dollar signs from prices (research shows this reduces price sensitivity)',
                    },
                },
                required: ['style'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'add_badge',
            description: 'Add a badge/label to a menu item to make it stand out',
            parameters: {
                type: 'object',
                properties: {
                    itemName: {
                        type: 'string',
                        description: 'Name of the menu item (partial match works)',
                    },
                    badgeType: {
                        type: 'string',
                        enum: ["Chef's Pick", 'Popular', 'New', 'Spicy', 'Vegetarian', 'Limited Time', 'Recommended', 'Best Value'],
                        description: 'Type of badge to add',
                    },
                },
                required: ['itemName', 'badgeType'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'remove_badge',
            description: 'Remove a badge from a menu item',
            parameters: {
                type: 'object',
                properties: {
                    itemName: {
                        type: 'string',
                        description: 'Name of the menu item',
                    },
                    badgeType: {
                        type: 'string',
                        description: 'Badge to remove, or "all" to remove all badges',
                    },
                },
                required: ['itemName'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'highlight_item',
            description: 'Highlight or unhighlight a menu item to make it visually prominent',
            parameters: {
                type: 'object',
                properties: {
                    itemName: {
                        type: 'string',
                        description: 'Name of the menu item',
                    },
                    highlighted: {
                        type: 'boolean',
                        description: 'Whether the item should be highlighted',
                    },
                },
                required: ['itemName', 'highlighted'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_description',
            description: 'Update the description of a menu item. Use sensory language for best results.',
            parameters: {
                type: 'object',
                properties: {
                    itemName: {
                        type: 'string',
                        description: 'Name of the menu item',
                    },
                    description: {
                        type: 'string',
                        description: 'New description text. Use appetizing, sensory language.',
                    },
                },
                required: ['itemName', 'description'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_price',
            description: 'Update the price of a menu item',
            parameters: {
                type: 'object',
                properties: {
                    itemName: {
                        type: 'string',
                        description: 'Name of the menu item',
                    },
                    price: {
                        type: 'number',
                        description: 'New price value',
                    },
                },
                required: ['itemName', 'price'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'reorder_items',
            description: 'Move an item to a different position within its section',
            parameters: {
                type: 'object',
                properties: {
                    itemName: {
                        type: 'string',
                        description: 'Name of the menu item to move',
                    },
                    position: {
                        type: 'string',
                        enum: ['first', 'second', 'last'],
                        description: 'New position for the item',
                    },
                },
                required: ['itemName', 'position'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'rename_section',
            description: 'Rename a menu section',
            parameters: {
                type: 'object',
                properties: {
                    currentName: {
                        type: 'string',
                        description: 'Current section name',
                    },
                    newName: {
                        type: 'string',
                        description: 'New section name',
                    },
                },
                required: ['currentName', 'newName'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'improve_all_descriptions',
            description: 'Automatically improve all item descriptions with appetizing, sensory language',
            parameters: {
                type: 'object',
                properties: {
                    style: {
                        type: 'string',
                        enum: ['sensory', 'minimal', 'storytelling', 'ingredient-focused'],
                        description: 'Description style to use',
                    },
                },
                required: ['style'],
            },
        },
    },
];

// Color palettes
const COLOR_PALETTES: Record<string, { primary: string; secondary: string; accent: string; background: string }> = {
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

// Font presets
const FONT_PRESETS: Record<string, { heading: string; body: string }> = {
    elegant: { heading: 'Playfair Display', body: 'Inter' },
    modern: { heading: 'Montserrat', body: 'Open Sans' },
    classic: { heading: 'Cormorant Garamond', body: 'Lato' },
    bold: { heading: 'Poppins', body: 'Roboto' },
    minimal: { heading: 'Inter', body: 'Inter' },
};

// Color name to hex mapping
const COLOR_MAP: Record<string, string> = {
    blue: '#3b82f6', red: '#ef4444', green: '#22c55e', orange: '#f97316',
    purple: '#a855f7', pink: '#ec4899', yellow: '#eab308', gold: '#c9a227',
    teal: '#14b8a6', cyan: '#06b6d4', indigo: '#6366f1', rose: '#f43f5e',
    emerald: '#10b981', amber: '#f59e0b', lime: '#84cc16', sky: '#0ea5e9',
    violet: '#8b5cf6', fuchsia: '#d946ef', white: '#ffffff', black: '#000000',
    gray: '#6b7280', grey: '#6b7280',
};

// Badge emoji mapping
const BADGE_EMOJIS: Record<string, string> = {
    "Chef's Pick": "👨‍🍳 Chef's Pick",
    'Popular': '🔥 Popular',
    'New': '✨ New',
    'Spicy': '🌶️ Spicy',
    'Vegetarian': '🥬 Vegetarian',
    'Limited Time': '⏰ Limited Time',
    'Recommended': '👍 Recommended',
    'Best Value': '💎 Best Value',
};

interface ToolAction {
    tool: string;
    args: Record<string, unknown>;
    result: string;
    success: boolean;
}

interface AgentResponse {
    message: string;
    actions: ToolAction[];
    updatedStrategy: unknown | null;
    thinking?: string;
}

export async function POST(request: Request): Promise<Response> {
    const encoder = new TextEncoder();

    try {
        const { message, strategy, history = [] } = await request.json();

        if (!message || !strategy) {
            return new Response(JSON.stringify({ error: 'Message and strategy required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Create a streaming response
        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (event: string, data: unknown) => {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
                };

                let updatedStrategy = JSON.parse(JSON.stringify(strategy));
                const actions: ToolAction[] = [];

                try {
                    // Send thinking status
                    sendEvent('thinking', { status: 'Analyzing your request...' });

                    if (!OPENROUTER_API_KEY) {
                        // Fallback mode - parse intent locally
                        const result = await handleLocalParsing(message, updatedStrategy, sendEvent);
                        updatedStrategy = result.strategy;
                        actions.push(...result.actions);

                        sendEvent('complete', {
                            message: result.message,
                            actions,
                            updatedStrategy: actions.length > 0 ? updatedStrategy : null,
                        });
                        controller.close();
                        return;
                    }

                    // Build system prompt with menu context
                    const systemPrompt = buildSystemPrompt(strategy);

                    // Call AI with tools
                    sendEvent('thinking', { status: 'Planning changes...' });

                    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                            'HTTP-Referer': SITE_URL,
                            'X-Title': 'Tweny Menu AI Agent',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: 'google/gemini-2.0-flash-001',
                            messages: [
                                { role: 'system', content: systemPrompt },
                                ...history.slice(-8),
                                { role: 'user', content: message },
                            ],
                            tools: TOOLS,
                            tool_choice: 'auto',
                            temperature: 0.7,
                            max_tokens: 2000,
                        }),
                    });

                    if (!aiResponse.ok) {
                        throw new Error('AI request failed');
                    }

                    const data = await aiResponse.json();
                    const choice = data.choices?.[0];
                    const responseMessage = choice?.message;

                    // Process tool calls if any
                    if (responseMessage?.tool_calls?.length > 0) {
                        for (const toolCall of responseMessage.tool_calls) {
                            const toolName = toolCall.function.name;
                            const args = JSON.parse(toolCall.function.arguments || '{}');

                            sendEvent('tool_start', { tool: toolName, args });

                            const result = executeToolCall(toolName, args, updatedStrategy);
                            updatedStrategy = result.strategy;

                            actions.push({
                                tool: toolName,
                                args,
                                result: result.message,
                                success: result.success,
                            });

                            sendEvent('tool_complete', {
                                tool: toolName,
                                result: result.message,
                                success: result.success,
                            });
                        }
                    }

                    // Get final message from AI
                    let finalMessage = responseMessage?.content || '';

                    // If we executed tools, generate a summary
                    if (actions.length > 0 && !finalMessage) {
                        finalMessage = generateActionSummary(actions);
                    }

                    // If no tools and no message, provide help
                    if (!finalMessage && actions.length === 0) {
                        finalMessage = getHelpResponse(message, strategy);
                    }

                    sendEvent('complete', {
                        message: finalMessage,
                        actions,
                        updatedStrategy: actions.length > 0 ? updatedStrategy : null,
                    });
                } catch (error) {
                    console.error('Agent error:', error);
                    sendEvent('error', {
                        message: 'Sorry, I encountered an error. Please try again.',
                    });
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Agent POST error:', error);
        return new Response(JSON.stringify({ error: 'Agent request failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

function buildSystemPrompt(strategy: unknown): string {
    const strat = strategy as { name: string; layout: { type: string; columns: number; colorScheme: { accent: string }; sections: Array<{ name: string; items: Array<{ name: string; price: number; badges: string[] }> }> } };

    const menuItems = strat.layout.sections
        .flatMap((s) => s.items.map((i) => `${s.name}: ${i.name} ($${i.price}) ${i.badges.length > 0 ? `[${i.badges.join(', ')}]` : ''}`))
        .join('\n');

    return `You are Tweny AI, an expert menu design agent. You help restaurants optimize their digital menus for maximum revenue and customer satisfaction.

CURRENT MENU STATE:
Strategy: ${strat.name}
Layout: ${strat.layout.type} with ${strat.layout.columns} column(s)
Accent Color: ${strat.layout.colorScheme.accent}

MENU ITEMS:
${menuItems}

AVAILABLE PALETTES: warm, elegant, modern, vibrant, ocean, forest, sunset, royal, minimal, dark
AVAILABLE FONTS: elegant, modern, classic, bold, minimal
AVAILABLE BADGES: Chef's Pick, Popular, New, Spicy, Vegetarian, Limited Time, Recommended, Best Value

MENU ENGINEERING KNOWLEDGE:
${JSON.stringify(strategyContext.menuEngineering?.quadrants || {}, null, 2)}

BEHAVIORAL PSYCHOLOGY:
${JSON.stringify(strategyContext.behavioralPsychology || {}, null, 2)}

INSTRUCTIONS:
1. When the user asks to make changes, use the appropriate tools to execute them
2. You can call multiple tools in a single response for complex requests
3. If the user asks for explanations or advice, respond with helpful text
4. Use your knowledge of menu engineering to make smart suggestions
5. Be conversational and explain the psychology behind changes
6. If you're unsure what item the user means, ask for clarification

Remember: You have full control over the menu. Any changes you make via tools will be immediately reflected in the preview.`;
}

function executeToolCall(
    toolName: string,
    args: Record<string, unknown>,
    strategy: Record<string, unknown>
): { strategy: Record<string, unknown>; message: string; success: boolean } {
    const strat = strategy as { layout: { type: string; columns: number; colorScheme: { primary: string; secondary: string; accent: string; background: string }; typography: { headingFont: string; bodyFont: string; priceStyle: string }; sections: Array<{ name: string; items: Array<{ id: string; name: string; description?: string; price: number; badges: string[]; isHighlighted: boolean }> }> } };

    switch (toolName) {
        case 'change_color': {
            const colorType = args.colorType as string;
            let color = args.color as string;

            // Convert color name to hex
            if (COLOR_MAP[color.toLowerCase()]) {
                color = COLOR_MAP[color.toLowerCase()];
            }

            if (!color.startsWith('#')) {
                return { strategy, message: `Invalid color: ${color}`, success: false };
            }

            strat.layout.colorScheme[colorType as keyof typeof strat.layout.colorScheme] = color;
            return { strategy: strat, message: `Changed ${colorType} color to ${color}`, success: true };
        }

        case 'apply_color_palette': {
            const palette = args.palette as string;
            if (COLOR_PALETTES[palette]) {
                strat.layout.colorScheme = { ...COLOR_PALETTES[palette] };
                return { strategy: strat, message: `Applied "${palette}" color palette`, success: true };
            }
            return { strategy, message: `Unknown palette: ${palette}`, success: false };
        }

        case 'change_layout': {
            const layoutType = args.layoutType as string;
            const columns = args.columns as number;
            strat.layout.type = layoutType as 'grid' | 'list' | 'magazine' | 'minimal';
            strat.layout.columns = columns;
            return { strategy: strat, message: `Changed to ${layoutType} layout with ${columns} column(s)`, success: true };
        }

        case 'change_typography': {
            const style = args.style as string;
            const hideDollar = args.hideDollarSign as boolean;

            if (FONT_PRESETS[style]) {
                strat.layout.typography.headingFont = FONT_PRESETS[style].heading;
                strat.layout.typography.bodyFont = FONT_PRESETS[style].body;
            }

            if (hideDollar !== undefined) {
                strat.layout.typography.priceStyle = hideDollar ? 'hidden-dollar' : 'bold';
            }

            return { strategy: strat, message: `Applied ${style} typography${hideDollar ? ' with hidden dollar signs' : ''}`, success: true };
        }

        case 'add_badge': {
            const itemName = (args.itemName as string).toLowerCase();
            const badgeType = args.badgeType as string;
            const badge = BADGE_EMOJIS[badgeType] || `⭐ ${badgeType}`;

            for (const section of strat.layout.sections) {
                for (const item of section.items) {
                    if (item.name.toLowerCase().includes(itemName)) {
                        if (!item.badges.includes(badge)) {
                            item.badges.push(badge);
                            item.isHighlighted = true;
                        }
                        return { strategy: strat, message: `Added "${badgeType}" badge to ${item.name}`, success: true };
                    }
                }
            }
            return { strategy, message: `Item "${args.itemName}" not found`, success: false };
        }

        case 'remove_badge': {
            const itemName = (args.itemName as string).toLowerCase();
            const badgeToRemove = args.badgeType as string;

            for (const section of strat.layout.sections) {
                for (const item of section.items) {
                    if (item.name.toLowerCase().includes(itemName)) {
                        if (badgeToRemove === 'all') {
                            item.badges = [];
                        } else {
                            item.badges = item.badges.filter((b) => !b.toLowerCase().includes(badgeToRemove.toLowerCase()));
                        }
                        return { strategy: strat, message: `Removed badges from ${item.name}`, success: true };
                    }
                }
            }
            return { strategy, message: `Item "${args.itemName}" not found`, success: false };
        }

        case 'highlight_item': {
            const itemName = (args.itemName as string).toLowerCase();
            const highlighted = args.highlighted as boolean;

            for (const section of strat.layout.sections) {
                for (const item of section.items) {
                    if (item.name.toLowerCase().includes(itemName)) {
                        item.isHighlighted = highlighted;
                        if (highlighted && item.badges.length === 0) {
                            item.badges.push('⭐ Featured');
                        }
                        return { strategy: strat, message: `${highlighted ? 'Highlighted' : 'Unhighlighted'} ${item.name}`, success: true };
                    }
                }
            }
            return { strategy, message: `Item "${args.itemName}" not found`, success: false };
        }

        case 'update_description': {
            const itemName = (args.itemName as string).toLowerCase();
            const description = args.description as string;

            for (const section of strat.layout.sections) {
                for (const item of section.items) {
                    if (item.name.toLowerCase().includes(itemName)) {
                        item.description = description;
                        return { strategy: strat, message: `Updated description for ${item.name}`, success: true };
                    }
                }
            }
            return { strategy, message: `Item "${args.itemName}" not found`, success: false };
        }

        case 'update_price': {
            const itemName = (args.itemName as string).toLowerCase();
            const price = args.price as number;

            for (const section of strat.layout.sections) {
                for (const item of section.items) {
                    if (item.name.toLowerCase().includes(itemName)) {
                        item.price = price;
                        return { strategy: strat, message: `Updated ${item.name} price to $${price}`, success: true };
                    }
                }
            }
            return { strategy, message: `Item "${args.itemName}" not found`, success: false };
        }

        case 'reorder_items': {
            const itemName = (args.itemName as string).toLowerCase();
            const position = args.position as string;

            for (const section of strat.layout.sections) {
                const itemIndex = section.items.findIndex((i) => i.name.toLowerCase().includes(itemName));
                if (itemIndex !== -1) {
                    const [item] = section.items.splice(itemIndex, 1);
                    if (position === 'first') {
                        section.items.unshift(item);
                    } else if (position === 'last') {
                        section.items.push(item);
                    } else if (position === 'second') {
                        section.items.splice(1, 0, item);
                    }
                    return { strategy: strat, message: `Moved ${item.name} to ${position} position`, success: true };
                }
            }
            return { strategy, message: `Item "${args.itemName}" not found`, success: false };
        }

        case 'rename_section': {
            const currentName = (args.currentName as string).toLowerCase();
            const newName = args.newName as string;

            for (const section of strat.layout.sections) {
                if (section.name.toLowerCase().includes(currentName)) {
                    const oldName = section.name;
                    section.name = newName;
                    return { strategy: strat, message: `Renamed "${oldName}" to "${newName}"`, success: true };
                }
            }
            return { strategy, message: `Section "${args.currentName}" not found`, success: false };
        }

        case 'improve_all_descriptions': {
            const style = args.style as string;
            let count = 0;

            for (const section of strat.layout.sections) {
                for (const item of section.items) {
                    item.description = generateDescription(item.name, style);
                    count++;
                }
            }
            return { strategy: strat, message: `Improved ${count} item descriptions with ${style} style`, success: true };
        }

        default:
            return { strategy, message: `Unknown tool: ${toolName}`, success: false };
    }
}

function generateDescription(itemName: string, style: string): string {
    const sensoryWords = ['succulent', 'crispy', 'tender', 'aromatic', 'savory', 'rich', 'golden', 'velvety'];
    const preparations = ['slow-roasted', 'pan-seared', 'hand-crafted', 'house-made', 'freshly prepared'];

    switch (style) {
        case 'sensory':
            return `${sensoryWords[Math.floor(Math.random() * sensoryWords.length)].charAt(0).toUpperCase()}${sensoryWords[Math.floor(Math.random() * sensoryWords.length)].slice(1)} and ${sensoryWords[Math.floor(Math.random() * sensoryWords.length)]}, ${preparations[Math.floor(Math.random() * preparations.length)]} to perfection.`;
        case 'minimal':
            return `Fresh. Quality. Unforgettable.`;
        case 'storytelling':
            return `A cherished recipe passed down through generations, crafted with care and the finest ingredients.`;
        case 'ingredient-focused':
            return `Made with premium, locally-sourced ingredients for an authentic taste experience.`;
        default:
            return `Expertly prepared with care and attention to detail.`;
    }
}

function generateActionSummary(actions: ToolAction[]): string {
    const successful = actions.filter((a) => a.success);
    const failed = actions.filter((a) => !a.success);

    let summary = '';

    if (successful.length > 0) {
        summary += '✅ **Changes Applied:**\n';
        successful.forEach((a) => {
            summary += `• ${a.result}\n`;
        });
    }

    if (failed.length > 0) {
        summary += '\n⚠️ **Could not complete:**\n';
        failed.forEach((a) => {
            summary += `• ${a.result}\n`;
        });
    }

    summary += '\nThe preview has been updated. What else would you like to change?';

    return summary;
}

function getHelpResponse(message: string, strategy: unknown): string {
    const strat = strategy as { name: string };
    const lower = message.toLowerCase();

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        return `👋 Hello! I'm your Menu Design Agent powered by AI.

I can make any changes to your **${strat.name}** menu. Just tell me what you'd like:

**🎨 Colors & Style**
"Make the accent color blue" • "Use the ocean palette" • "Apply elegant typography"

**📐 Layout**
"Switch to single column" • "Use magazine layout" • "Make it 3 columns"

**🏷️ Items & Badges**
"Add Chef's Pick to [item]" • "Highlight the pasta" • "Move steak to first"

**✍️ Descriptions**
"Improve all descriptions" • "Make the burger description more appetizing"

**💡 Smart Suggestions**
"What should I change to increase sales?" • "Explain this strategy"

What would you like to do?`;
    }

    if (lower.includes('help')) {
        return `**🛠️ I can help you with:**

🎨 **Colors** - "Change accent to blue", "Apply dark palette"
📐 **Layout** - "Single column", "Magazine style", "3 columns"
✍️ **Typography** - "Elegant fonts", "Hide dollar signs"
🏷️ **Badges** - "Add Chef's Pick to [item]", "Remove badges from [item]"
📝 **Descriptions** - "Improve all descriptions", "Update [item] description"
💰 **Prices** - "Change [item] price to $15"
↕️ **Ordering** - "Move [item] to first position"

Just describe what you want in natural language!`;
    }

    if (lower.includes('explain') || lower.includes('why') || lower.includes('strategy')) {
        return `**About Your Current Setup**

The **${strat.name}** strategy uses proven menu engineering principles:

📍 **Strategic Placement** - High-margin items positioned where eyes naturally go
🎯 **Visual Hierarchy** - Badges and highlights draw attention to key items
💰 **Price Psychology** - Formatting reduces price sensitivity
✨ **Sensory Language** - Descriptions that increase perceived value

This approach typically increases average order value by 12-18%.

Would you like me to explain any specific aspect, or make adjustments?`;
    }

    return `I'm ready to help customize your menu! Try:
• "Change the accent color to blue"
• "Add a Popular badge to [item name]"
• "Use the magazine layout"
• "Improve all descriptions"

What would you like to change?`;
}

async function handleLocalParsing(
    message: string,
    strategy: Record<string, unknown>,
    sendEvent: (event: string, data: unknown) => void
): Promise<{ strategy: Record<string, unknown>; actions: ToolAction[]; message: string }> {
    const lower = message.toLowerCase();
    const actions: ToolAction[] = [];

    // Color changes
    const colorMatch = lower.match(/(accent|primary|background|secondary).*?(blue|red|green|orange|purple|pink|gold|teal|cyan)/);
    if (colorMatch) {
        sendEvent('tool_start', { tool: 'change_color', args: { colorType: colorMatch[1], color: colorMatch[2] } });
        const result = executeToolCall('change_color', { colorType: colorMatch[1], color: colorMatch[2] }, strategy);
        strategy = result.strategy;
        actions.push({ tool: 'change_color', args: { colorType: colorMatch[1], color: colorMatch[2] }, result: result.message, success: result.success });
        sendEvent('tool_complete', { tool: 'change_color', result: result.message, success: result.success });
    }

    // Palette changes
    const paletteMatch = lower.match(/(?:use|apply|switch to)\s+(?:the\s+)?(\w+)\s+(?:palette|theme|colors?)/);
    if (paletteMatch && COLOR_PALETTES[paletteMatch[1]]) {
        sendEvent('tool_start', { tool: 'apply_color_palette', args: { palette: paletteMatch[1] } });
        const result = executeToolCall('apply_color_palette', { palette: paletteMatch[1] }, strategy);
        strategy = result.strategy;
        actions.push({ tool: 'apply_color_palette', args: { palette: paletteMatch[1] }, result: result.message, success: result.success });
        sendEvent('tool_complete', { tool: 'apply_color_palette', result: result.message, success: result.success });
    }

    // Layout changes
    if (lower.includes('single column') || lower.includes('1 column') || lower.includes('one column')) {
        sendEvent('tool_start', { tool: 'change_layout', args: { layoutType: 'list', columns: 1 } });
        const result = executeToolCall('change_layout', { layoutType: 'list', columns: 1 }, strategy);
        strategy = result.strategy;
        actions.push({ tool: 'change_layout', args: { layoutType: 'list', columns: 1 }, result: result.message, success: result.success });
        sendEvent('tool_complete', { tool: 'change_layout', result: result.message, success: result.success });
    } else if (lower.includes('magazine')) {
        sendEvent('tool_start', { tool: 'change_layout', args: { layoutType: 'magazine', columns: 2 } });
        const result = executeToolCall('change_layout', { layoutType: 'magazine', columns: 2 }, strategy);
        strategy = result.strategy;
        actions.push({ tool: 'change_layout', args: { layoutType: 'magazine', columns: 2 }, result: result.message, success: result.success });
        sendEvent('tool_complete', { tool: 'change_layout', result: result.message, success: result.success });
    } else if (lower.match(/\b(2|two)\s*col/)) {
        sendEvent('tool_start', { tool: 'change_layout', args: { layoutType: 'grid', columns: 2 } });
        const result = executeToolCall('change_layout', { layoutType: 'grid', columns: 2 }, strategy);
        strategy = result.strategy;
        actions.push({ tool: 'change_layout', args: { layoutType: 'grid', columns: 2 }, result: result.message, success: result.success });
        sendEvent('tool_complete', { tool: 'change_layout', result: result.message, success: result.success });
    } else if (lower.match(/\b(3|three)\s*col/)) {
        sendEvent('tool_start', { tool: 'change_layout', args: { layoutType: 'grid', columns: 3 } });
        const result = executeToolCall('change_layout', { layoutType: 'grid', columns: 3 }, strategy);
        strategy = result.strategy;
        actions.push({ tool: 'change_layout', args: { layoutType: 'grid', columns: 3 }, result: result.message, success: result.success });
        sendEvent('tool_complete', { tool: 'change_layout', result: result.message, success: result.success });
    }

    // Improve descriptions
    if (lower.includes('improve') && lower.includes('description')) {
        sendEvent('tool_start', { tool: 'improve_all_descriptions', args: { style: 'sensory' } });
        const result = executeToolCall('improve_all_descriptions', { style: 'sensory' }, strategy);
        strategy = result.strategy;
        actions.push({ tool: 'improve_all_descriptions', args: { style: 'sensory' }, result: result.message, success: result.success });
        sendEvent('tool_complete', { tool: 'improve_all_descriptions', result: result.message, success: result.success });
    }

    const responseMessage = actions.length > 0 ? generateActionSummary(actions) : getHelpResponse(message, strategy);

    return { strategy, actions, message: responseMessage };
}
