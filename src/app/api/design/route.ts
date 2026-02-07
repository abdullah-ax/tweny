import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

/**
 * RATE LIMITING & BUDGET CONTROL
 * Budget: $5 total
 * Gemini Flash 2.0 pricing: ~$0.10/1M input, ~$0.40/1M output (VERY CHEAP!)
 * Strategy: Limit requests per minute, track estimated cost
 */
const BUDGET_LIMIT_USD = 5.0;
const REQUESTS_PER_MINUTE = 10; // Can do more with cheap model
const MAX_TOKENS_OUTPUT = 8000; // Increased for larger menus

// In-memory rate limiting (resets on server restart)
const rateLimitState = {
    requests: [] as number[],
    estimatedCostUsd: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
};

function checkRateLimit(): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old requests
    rateLimitState.requests = rateLimitState.requests.filter(t => t > oneMinuteAgo);

    // Check budget
    if (rateLimitState.estimatedCostUsd >= BUDGET_LIMIT_USD) {
        return {
            allowed: false,
            reason: `Budget limit reached ($${rateLimitState.estimatedCostUsd.toFixed(2)}/$${BUDGET_LIMIT_USD}). Reset server to continue.`
        };
    }

    // Check rate limit
    if (rateLimitState.requests.length >= REQUESTS_PER_MINUTE) {
        const oldestRequest = Math.min(...rateLimitState.requests);
        const waitTime = Math.ceil((oldestRequest + 60000 - now) / 1000);
        return {
            allowed: false,
            reason: `Rate limited. Please wait ${waitTime} seconds.`
        };
    }

    return { allowed: true };
}

function trackUsage(inputTokens: number, outputTokens: number) {
    // Gemini Flash 2.0 pricing (VERY cheap via OpenRouter)
    const INPUT_COST_PER_TOKEN = 0.10 / 1_000_000;  // $0.10 per 1M input tokens
    const OUTPUT_COST_PER_TOKEN = 0.40 / 1_000_000; // $0.40 per 1M output tokens

    const cost = (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN);

    rateLimitState.estimatedCostUsd += cost;
    rateLimitState.totalInputTokens += inputTokens;
    rateLimitState.totalOutputTokens += outputTokens;
    rateLimitState.requests.push(Date.now());

    console.log(`Cost: $${cost.toFixed(4)} | Total: $${rateLimitState.estimatedCostUsd.toFixed(2)}/$${BUDGET_LIMIT_USD} | Tokens: ${inputTokens}in/${outputTokens}out`);
}

/**
 * MENU ENGINEERING DESIGN AGENT
 * 
 * Mobile-first, functional QR menu designer with:
 * - Order and payment functionality
 * - Menu engineering best practices (BCG matrix)
 * - Clarifying questions before changes
 * - Maximum visual appeal for phones
 */

interface MenuContextData {
    items?: Array<{
        id: string;
        name: string;
        description?: string;
        price: number;
        category: string;
        salesVolume?: number;
        margin?: number;
        bcgClass?: 'star' | 'cash_cow' | 'puzzle' | 'dog';
    }>;
    salesData?: {
        totalRevenue: number;
        totalOrders: number;
        averageOrderValue: number;
        topSellers: Array<{ name: string; quantity: number }>;
        lowPerformers: Array<{ name: string; quantity: number }>;
    };
    extractedColors?: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        dominant: string;
    };
    menuEngineering?: {
        stars: Array<{ name: string; price: number }>;
        cashCows: Array<{ name: string; price: number }>;
        puzzles: Array<{ name: string; price: number }>;
        dogs: Array<{ name: string; price: number }>;
        averageMargin: number;
    };
    restaurantName?: string;
    cuisine?: string;
}

interface DesignRequest {
    message: string;
    currentHtml: string;
    currentCss: string;
    strategy: unknown;
    menuContext?: MenuContextData;
    history?: Array<{ role: string; content: string }>;
    isConfirmation?: boolean; // User confirmed the plan
}

interface DesignChange {
    type: 'html' | 'css' | 'both';
    description: string;
    reasoning: string;
}

const SYSTEM_PROMPT = `You are an expert menu engineering AI specializing in mobile-optimized, high-converting QR menus. You modify HTML/CSS based on user requests, always applying industry best practices.

## RESPONSE FORMAT
Respond with JSON ONLY - put updatedHtml and updatedCss FIRST:
\`\`\`json
{
  "updatedHtml": "<COMPLETE HTML HERE>",
  "updatedCss": "<COMPLETE CSS HERE>",
  "mode": "execute",
  "changes": [{"type": "css", "description": "brief", "reasoning": "menu engineering principle used"}],
  "summary": "1-line summary"
}
\`\`\`

## MANDATORY BEST PRACTICES - ALWAYS APPLY:

### 1. TYPOGRAPHY & FONTS
- Match the EXACT font family from the uploaded menu (check extractedColors/context)
- If original font detected, use it via Google Fonts or system fallback
- Never change fonts unless explicitly requested
- Font sizes: minimum 16px body, 20px+ headings for mobile readability
- Line height: 1.4-1.6 for descriptions

### 2. PRICING DISPLAY - CRITICAL
- REMOVE all currency symbols ($, €, £, etc.) from prices
- Show prices as plain numbers: "12.99" not "$12.99"
- This is a psychological pricing technique that reduces price focus
- Right-align prices or use leader dots for visual scanning

### 3. MENU ENGINEERING (BCG MATRIX)
- **STARS** (high profit + high popularity): Place in Golden Triangle (top-right, center), use larger font, highlights, badges like "Popular" or "Chef's Pick"
- **CASH COWS** (low profit + high popularity): Position prominently but don't over-emphasize, use for volume
- **PUZZLES** (high profit + low popularity): Give prime placement, add descriptions, use "Hidden Gem" or "Try Something New" badges
- **DOGS** (low profit + low popularity): De-emphasize with smaller text, consider hiding or removing

### 4. VISUAL HIERARCHY & LAYOUT
- Golden Triangle: Eyes scan top-right → top-left → center. Place stars there.
- Group items in sections of 5-7 items max for easy scanning
- High-contrast text: dark text on light bg, or light text on dark bg
- Use whitespace strategically - don't crowd items
- Cards or dividers between sections

### 5. MOBILE-FIRST UI/UX
- Touch targets: minimum 44px × 44px for all interactive elements
- Thumb-friendly: important actions at bottom of screen
- Scrollable sections: sticky headers for navigation
- Fast-loading: avoid heavy images inline, use CSS gradients
- Add to Cart buttons: prominent, high contrast, easy to tap

### 6. COLOR PSYCHOLOGY
- Warm colors (red, orange, yellow): stimulate appetite, use for CTAs and highlights
- Use extracted brand colors for consistency
- Ensure WCAG 2.1 AA contrast ratio (4.5:1 minimum)
- Avoid pure black text on pure white (use #1a1a1a on #fafafa)

### 7. PERSUASIVE ELEMENTS
- Anchor pricing: show higher-priced items first to make others seem reasonable
- Decoy items: include premium options that make mid-tier look attractive
- Social proof badges: "Most Popular", "Customer Favorite", "Sells Out Fast"
- Scarcity: "Limited", "Seasonal", "While Supplies Last"

### 8. STRUCTURAL RULES
- Preserve ALL data-* attributes (data-item-id, data-price, etc.) for ordering functionality
- Keep add-to-cart buttons and cart functionality intact
- Maintain semantic HTML (sections, articles, headers)
- CSS Grid or Flexbox for responsive layouts

## CRITICAL OUTPUT RULES:
- Output updatedHtml and updatedCss FIRST in the JSON
- Keep code minimal - no comments or unnecessary whitespace
- NEVER break existing cart/order JavaScript hooks
- ALWAYS remove currency symbols from prices unless user says otherwise`;

/**
 * Attempt to repair truncated JSON responses
 */
function repairTruncatedJson(jsonStr: string, currentHtml: string, currentCss: string): { json: string; wasTruncated: boolean } {
    let repaired = jsonStr.trim();
    let wasTruncated = false;

    // Count brackets to detect truncation
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;

    // If unbalanced, try to fix
    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
        console.log('Detected truncated JSON, attempting repair...');
        wasTruncated = true;

        // Remove trailing incomplete strings/values
        repaired = repaired.replace(/,\s*"[^"]*$/, '');  // Remove incomplete key
        repaired = repaired.replace(/,\s*$/, '');        // Remove trailing comma
        repaired = repaired.replace(/:\s*"[^"]*$/, ': ""'); // Close incomplete string value
        repaired = repaired.replace(/:\s*$/, ': null');  // Fill missing value

        // Add missing closing brackets/braces
        const missingBrackets = openBrackets - closeBrackets;
        const missingBraces = openBraces - closeBraces;

        for (let i = 0; i < missingBrackets; i++) repaired += ']';
        for (let i = 0; i < missingBraces; i++) repaired += '}';
    }

    return { json: repaired, wasTruncated };
}

/**
 * Ensure required fields exist in parsed response, filling with fallbacks if needed
 */
function ensureResponseFields(result: Record<string, unknown>, currentHtml: string, currentCss: string): Record<string, unknown> {
    // Ensure mode exists
    if (!result.mode) {
        result.mode = 'execute';
    }

    // Ensure HTML/CSS exist - use current if missing or empty
    if (!result.updatedHtml || (typeof result.updatedHtml === 'string' && result.updatedHtml.trim() === '')) {
        result.updatedHtml = currentHtml;
        console.log('Missing updatedHtml, using current HTML');
    }
    if (!result.updatedCss || (typeof result.updatedCss === 'string' && result.updatedCss.trim() === '')) {
        result.updatedCss = currentCss;
        console.log('Missing updatedCss, using current CSS');
    }

    // Ensure changes array exists
    if (!result.changes || !Array.isArray(result.changes)) {
        result.changes = [];
    }

    // Ensure summary exists
    if (!result.summary) {
        result.summary = 'Changes applied';
    }

    return result;
}

/**
 * Build a context string from menu data for the AI
 */
function buildContextInfo(menuContext?: MenuContextData): string {
    if (!menuContext) return '';

    const sections: string[] = ['## RESTAURANT CONTEXT'];

    if (menuContext.restaurantName) {
        sections.push(`Restaurant: ${menuContext.restaurantName}`);
    }
    if (menuContext.cuisine) {
        sections.push(`Cuisine: ${menuContext.cuisine}`);
    }

    // Menu items
    if (menuContext.items && menuContext.items.length > 0) {
        sections.push('\n### MENU ITEMS');
        const itemsByCategory: Record<string, typeof menuContext.items> = {};
        menuContext.items.forEach(item => {
            const cat = item.category || 'Other';
            if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
            itemsByCategory[cat].push(item);
        });
        for (const [category, items] of Object.entries(itemsByCategory)) {
            sections.push(`\n**${category}:**`);
            items.forEach(item => {
                let line = `- ${item.name}: $${item.price}`;
                if (item.bcgClass) line += ` [${item.bcgClass.toUpperCase()}]`;
                sections.push(line);
            });
        }
    }

    // Sales data
    if (menuContext.salesData) {
        const sd = menuContext.salesData;
        sections.push('\n### SALES INSIGHTS');
        if (sd.totalRevenue) sections.push(`Total Revenue: $${sd.totalRevenue.toLocaleString()}`);
        if (sd.averageOrderValue) sections.push(`Avg Order: $${sd.averageOrderValue.toFixed(2)}`);
        if (sd.topSellers && sd.topSellers.length > 0) {
            sections.push(`\n**Top Sellers:** ${sd.topSellers.slice(0, 5).map(t => t.name).join(', ')}`);
        }
        if (sd.lowPerformers && sd.lowPerformers.length > 0) {
            sections.push(`**Low Performers:** ${sd.lowPerformers.slice(0, 5).map(l => l.name).join(', ')}`);
        }
    }

    // Menu engineering analysis
    if (menuContext.menuEngineering) {
        const me = menuContext.menuEngineering;
        sections.push('\n### MENU ENGINEERING ANALYSIS');
        if (me.stars && me.stars.length > 0) {
            sections.push(`**Stars (High Popularity + High Profit):** ${me.stars.map(s => s.name).join(', ')}`);
        }
        if (me.cashCows && me.cashCows.length > 0) {
            sections.push(`**Cash Cows (High Popularity + Low Profit):** ${me.cashCows.map(c => c.name).join(', ')}`);
        }
        if (me.puzzles && me.puzzles.length > 0) {
            sections.push(`**Puzzles (Low Popularity + High Profit):** ${me.puzzles.map(p => p.name).join(', ')}`);
        }
        if (me.dogs && me.dogs.length > 0) {
            sections.push(`**Dogs (Low Popularity + Low Profit):** ${me.dogs.map(d => d.name).join(', ')}`);
        }
    }

    // Original colors from PDF
    if (menuContext.extractedColors) {
        const ec = menuContext.extractedColors;
        sections.push('\n### ORIGINAL BRAND COLORS (from uploaded menu)');
        if (ec.primary) sections.push(`Primary: ${ec.primary}`);
        if (ec.secondary) sections.push(`Secondary: ${ec.secondary}`);
        if (ec.accent) sections.push(`Accent: ${ec.accent}`);
        if (ec.background) sections.push(`Background: ${ec.background}`);
        if (ec.dominant) sections.push(`Dominant: ${ec.dominant}`);
    }

    sections.push('\n### DESIGN GUIDANCE');
    sections.push('- Highlight STARS prominently - they drive profit');
    sections.push('- Give PUZZLES better placement to increase sales');
    sections.push('- Consider de-emphasizing DOGS');
    sections.push('- Use original brand colors for consistency');

    return sections.join('\n');
}

export async function POST(request: Request): Promise<Response> {
    const encoder = new TextEncoder();

    try {
        const body: DesignRequest = await request.json();
        const { message, currentHtml, currentCss, strategy, menuContext, history = [] } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // Build context string from menu data
        const contextInfo = buildContextInfo(menuContext);

        // Create streaming response
        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (event: string, data: unknown) => {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
                };

                try {
                    sendEvent('status', { stage: 'analyzing', message: 'Understanding your request...' });

                    // Build the context for the AI
                    const userPrompt = `## CURRENT MENU HTML
\`\`\`html
${currentHtml}
\`\`\`

## CURRENT MENU CSS
\`\`\`css
${currentCss}
\`\`\`

## USER REQUEST
${message}

## STRATEGY CONTEXT
Name: ${(strategy as { name?: string })?.name || 'Custom'}

${contextInfo}

Now analyze the request and return the JSON response with your changes.`;

                    if (!OPENROUTER_API_KEY) {
                        // Fallback: Basic local processing
                        const result = handleLocalDesignRequest(message, currentHtml, currentCss, menuContext);
                        sendEvent('changes', { changes: result.changes });
                        sendEvent('complete', result);
                        controller.close();
                        return;
                    }

                    sendEvent('status', { stage: 'designing', message: 'Crafting your design changes...' });

                    // Check rate limit before making request
                    const rateLimitCheck = checkRateLimit();
                    if (!rateLimitCheck.allowed) {
                        sendEvent('error', {
                            message: `${rateLimitCheck.reason}\n\nBudget: $${rateLimitState.estimatedCostUsd.toFixed(2)}/$${BUDGET_LIMIT_USD} used`
                        });
                        controller.close();
                        return;
                    }

                    // Models to try: Gemini Flash 2.0 (fast & cheap), then free fallbacks
                    const models = [
                        'google/gemini-2.0-flash-001',                // Primary: Fast & very cheap!
                        'liquid/lfm-2.5-1.2b-instruct:free',          // Fallback 1
                        'nvidia/nemotron-nano-9b-v2:free',            // Fallback 2
                        'meta-llama/llama-3.2-3b-instruct:free',      // Fallback 3
                    ];

                    let lastError: unknown = null;
                    let aiSuccess = false;
                    let winningResponse: { model: string; content: string } | null = null;

                    // Try each model in order until one succeeds
                    for (const model of models) {
                        const isPaidModel = !model.includes(':free');

                        try {
                            console.log(`🤖 Trying ${model} (budget: $${rateLimitState.estimatedCostUsd.toFixed(2)}/$${BUDGET_LIMIT_USD})`);

                            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                                    'HTTP-Referer': SITE_URL,
                                    'X-Title': 'Tweny Menu Engineering Agent',
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    model,
                                    messages: [
                                        { role: 'system', content: SYSTEM_PROMPT },
                                        ...history.slice(-4).map(h => ({ role: h.role, content: h.content })),
                                        { role: 'user', content: userPrompt },
                                    ],
                                    temperature: 0.7,
                                    max_tokens: isPaidModel ? MAX_TOKENS_OUTPUT : 4000,
                                }),
                            });

                            if (!response.ok) {
                                const errorText = await response.text();
                                console.log(`${model} failed: ${response.status}`);
                                lastError = new Error(`${model}: ${response.status} - ${errorText.slice(0, 100)}`);
                                continue; // Try next model
                            }

                            const data = await response.json();

                            // Track usage for paid models only
                            if (isPaidModel) {
                                const usage = data.usage || {};
                                trackUsage(usage.prompt_tokens || 500, usage.completion_tokens || 500);
                            }

                            const content = data.choices?.[0]?.message?.content || '';
                            if (!content) {
                                lastError = new Error(`${model}: empty response`);
                                continue;
                            }

                            console.log(`${model} succeeded!`);
                            winningResponse = { model, content };
                            break; // Success, stop trying
                        } catch (err) {
                            console.log(`${model} error:`, err);
                            lastError = err;
                            continue;
                        }
                    }

                    if (winningResponse) {
                        const content = winningResponse.content;

                        // Parse the JSON response - try multiple patterns
                        let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
                        if (!jsonMatch) {
                            jsonMatch = content.match(/\{[\s\S]*"mode"[\s\S]*\}/);
                        }
                        if (!jsonMatch) {
                            jsonMatch = content.match(/\{[\s\S]*"updatedCss"[\s\S]*\}/);
                        }
                        if (!jsonMatch) {
                            // Try to find any JSON object
                            jsonMatch = content.match(/\{[\s\S]*\}/);
                        }

                        if (jsonMatch) {
                            try {
                                let jsonStr = jsonMatch[1] || jsonMatch[0];

                                // Try to repair truncated JSON
                                const { json: repairedJson, wasTruncated } = repairTruncatedJson(jsonStr, currentHtml, currentCss);
                                jsonStr = repairedJson;

                                let result = JSON.parse(jsonStr);

                                // Ensure all required fields exist (fills missing HTML/CSS with current values)
                                result = ensureResponseFields(result, currentHtml, currentCss);

                                if (wasTruncated) {
                                    console.log('🔧 Repaired truncated response, result:', {
                                        mode: result.mode,
                                        hasHtml: !!result.updatedHtml,
                                        hasCss: !!result.updatedCss,
                                        changesCount: result.changes?.length || 0,
                                    });
                                }

                                // Handle different response modes
                                if (result.mode === 'clarify') {
                                    sendEvent('clarify', {
                                        questions: result.questions,
                                        context: result.context,
                                    });
                                    sendEvent('complete', {
                                        success: true,
                                        mode: 'clarify',
                                        summary: `I have a few questions to make sure I give you the best result:\n\n${result.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`,
                                        updatedHtml: currentHtml,
                                        updatedCss: currentCss,
                                    });
                                } else if (result.mode === 'plan') {
                                    sendEvent('plan', {
                                        plan: result.plan,
                                    });
                                    sendEvent('complete', {
                                        success: true,
                                        mode: 'plan',
                                        summary: `**Here's my plan:**\n\n${result.plan.summary}\n\n**Changes I'll make:**\n${result.plan.changes.map((c: string) => `• ${c}`).join('\n')}\n\n**Reasoning:** ${result.plan.reasoning}\n\n*Say "yes" or "go ahead" to apply these changes, or tell me what to adjust.*`,
                                        updatedHtml: currentHtml,
                                        updatedCss: currentCss,
                                    });
                                } else {
                                    // Execute mode - apply changes
                                    if (result.changes) {
                                        for (const change of result.changes) {
                                            sendEvent('change', change);
                                            await new Promise(r => setTimeout(r, 100));
                                        }
                                    }

                                    sendEvent('complete', {
                                        success: true,
                                        mode: 'execute',
                                        thinking: result.thinking,
                                        changes: result.changes,
                                        updatedHtml: result.updatedHtml,
                                        updatedCss: result.updatedCss,
                                        summary: result.summary,
                                    });
                                }
                                aiSuccess = true;
                            } catch (parseError) {
                                console.error('JSON parse error:', parseError);
                                lastError = parseError;
                            }
                        } else {
                            console.log('AI returned non-JSON response:', content.substring(0, 500));
                            lastError = new Error('Invalid JSON response');
                        }
                    }

                    // If no AI model worked, return error with details
                    if (!aiSuccess) {
                        const errorDetails = lastError instanceof Error ? lastError.message : 'All models rate-limited';
                        console.error('All AI models failed:', errorDetails);
                        sendEvent('error', {
                            message: `AI models are temporarily unavailable. Please wait a moment and try again.\n\nTechnical details: ${errorDetails}`
                        });
                    }
                } catch (error) {
                    console.error('Design agent error:', error);
                    // Provide more helpful error message
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    sendEvent('error', { message: `Something went wrong. Try simpler requests like "dark mode" or "make text bigger". Error: ${errorMsg}` });
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
        console.error('Design API error:', error);
        return NextResponse.json({ error: 'Request failed' }, { status: 500 });
    }
}

/**
 * Local fallback for when no API key is available
 * Handles common design requests with pattern matching
 */
function handleLocalDesignRequest(message: string, html: string, css: string, menuContext?: MenuContextData) {
    const lower = message.toLowerCase();
    let updatedCss = css;
    let updatedHtml = html;
    const changes: DesignChange[] = [];

    // Apply original brand colors if requested
    if ((lower.includes('original') || lower.includes('brand') || lower.includes('pdf') || lower.includes('my color')) && lower.includes('color')) {
        if (menuContext?.extractedColors) {
            const ec = menuContext.extractedColors;
            if (ec.primary) {
                updatedCss = updatedCss.replace(/--primary:\s*[^;]+;/, `--primary: ${ec.primary};`);
            }
            if (ec.accent) {
                updatedCss = updatedCss.replace(/--accent:\s*[^;]+;/, `--accent: ${ec.accent};`);
            }
            if (ec.background) {
                updatedCss = updatedCss.replace(/--background:\s*[^;]+;/, `--background: ${ec.background};`);
            }
            changes.push({
                type: 'css',
                description: 'Applied original brand colors from uploaded menu',
                reasoning: 'Maintains brand consistency',
            });
        }
    }

    // Color changes - more flexible matching
    const colorPatterns: Record<string, string> = {
        blue: '#3b82f6', red: '#ef4444', green: '#22c55e', purple: '#a855f7',
        orange: '#f97316', pink: '#ec4899', gold: '#fbbf24', teal: '#14b8a6',
        cyan: '#06b6d4', indigo: '#6366f1', yellow: '#eab308', lime: '#84cc16',
        white: '#ffffff', black: '#000000', gray: '#6b7280', grey: '#6b7280',
    };

    for (const [color, hex] of Object.entries(colorPatterns)) {
        // More flexible color matching - just mention the color
        if (lower.includes(color)) {
            if (lower.includes('background') || lower.includes('bg')) {
                updatedCss = updatedCss.replace(/--background:\s*[^;]+;/, `--background: ${hex};`);
                changes.push({
                    type: 'css',
                    description: `Changed background to ${color}`,
                    reasoning: 'Applied user-requested background change',
                });
            } else {
                // Default to accent color
                updatedCss = updatedCss.replace(/--accent:\s*[^;]+;/, `--accent: ${hex};`);
                changes.push({
                    type: 'css',
                    description: `Changed accent color to ${color}`,
                    reasoning: 'Applied user-requested color change',
                });
            }
            break; // Only apply first color match
        }
    }

    // Layout changes
    if (lower.includes('single column') || lower.includes('1 column') || lower.includes('one column')) {
        updatedCss = updatedCss.replace(/grid-template-columns:\s*repeat\(\d+,\s*1fr\);/, 'grid-template-columns: 1fr;');
        changes.push({
            type: 'css',
            description: 'Switched to single column layout',
            reasoning: 'Better for mobile or focused reading experience',
        });
    }

    if (lower.includes('2 column') || lower.includes('two column')) {
        updatedCss = updatedCss.replace(/grid-template-columns:\s*[^;]+;/, 'grid-template-columns: repeat(2, 1fr);');
        changes.push({
            type: 'css',
            description: 'Switched to 2-column layout',
            reasoning: 'Balanced display for tablets',
        });
    }

    if (lower.includes('3 column') || lower.includes('three column')) {
        updatedCss = updatedCss.replace(/grid-template-columns:\s*[^;]+;/, 'grid-template-columns: repeat(3, 1fr);');
        changes.push({
            type: 'css',
            description: 'Switched to 3-column layout',
            reasoning: 'Displays more items at once for quick scanning',
        });
    }

    // Font changes - more flexible
    if (lower.includes('bigger') || lower.includes('larger') || lower.includes('increase') && lower.includes('font')) {
        updatedCss = updatedCss.replace(/font-size:\s*1\.25rem;/g, 'font-size: 1.5rem;');
        updatedCss = updatedCss.replace(/font-size:\s*0\.9rem;/g, 'font-size: 1rem;');
        updatedCss = updatedCss.replace(/font-size:\s*1rem;/g, 'font-size: 1.15rem;');
        changes.push({
            type: 'css',
            description: 'Increased font sizes',
            reasoning: 'Improved readability',
        });
    }

    if (lower.includes('smaller') || lower.includes('decrease') && lower.includes('font')) {
        updatedCss = updatedCss.replace(/font-size:\s*1\.5rem;/g, 'font-size: 1.25rem;');
        updatedCss = updatedCss.replace(/font-size:\s*1\.25rem;/g, 'font-size: 1rem;');
        changes.push({
            type: 'css',
            description: 'Decreased font sizes',
            reasoning: 'More compact display',
        });
    }

    // Spacing changes - more flexible
    if (lower.includes('more spac') || lower.includes('add spac') || lower.includes('increase spac') || lower.includes('breathing')) {
        updatedCss = updatedCss.replace(/gap:\s*[\d.]+rem;/g, 'gap: 2.5rem;');
        updatedCss = updatedCss.replace(/padding:\s*[\d.]+rem;/g, 'padding: 2rem;');
        changes.push({
            type: 'css',
            description: 'Increased spacing between elements',
            reasoning: 'More breathing room creates a premium feel',
        });
    }

    if (lower.includes('less spac') || lower.includes('compact') || lower.includes('tight')) {
        updatedCss = updatedCss.replace(/gap:\s*[\d.]+rem;/g, 'gap: 0.75rem;');
        updatedCss = updatedCss.replace(/padding:\s*[\d.]+rem;/g, 'padding: 1rem;');
        changes.push({
            type: 'css',
            description: 'Made layout more compact',
            reasoning: 'Shows more content in less space',
        });
    }

    // Rounded corners - more flexible
    if (lower.includes('round') || lower.includes('curved')) {
        if (lower.includes('less') || lower.includes('sharp') || lower.includes('square')) {
            updatedCss = updatedCss.replace(/border-radius:\s*[\d]+px;/g, 'border-radius: 4px;');
            changes.push({
                type: 'css',
                description: 'Made corners more squared',
                reasoning: 'Sharper, more professional look',
            });
        } else {
            updatedCss = updatedCss.replace(/border-radius:\s*[\d]+px;/g, 'border-radius: 20px;');
            changes.push({
                type: 'css',
                description: 'Made corners more rounded',
                reasoning: 'Softer, friendlier aesthetic',
            });
        }
    }

    // Shadows - more flexible
    if (lower.includes('shadow')) {
        if (lower.includes('remove') || lower.includes('no ')) {
            updatedCss = updatedCss.replace(/box-shadow:\s*[^;]+;/g, 'box-shadow: none;');
            changes.push({
                type: 'css',
                description: 'Removed shadows',
                reasoning: 'Cleaner, flatter design',
            });
        } else {
            updatedCss += `
.menu-item {
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}
`;
            changes.push({
                type: 'css',
                description: 'Added shadows to menu items',
                reasoning: 'Creates depth and visual hierarchy',
            });
        }
    }

    // Animation - more flexible
    if (lower.includes('animat') || lower.includes('transition') || lower.includes('fade') || lower.includes('effect')) {
        updatedCss += `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.menu-item {
  animation: fadeIn 0.5s ease-out forwards;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.menu-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}

.menu-item:nth-child(1) { animation-delay: 0.1s; }
.menu-item:nth-child(2) { animation-delay: 0.15s; }
.menu-item:nth-child(3) { animation-delay: 0.2s; }
.menu-item:nth-child(4) { animation-delay: 0.25s; }
.menu-item:nth-child(5) { animation-delay: 0.3s; }
`;
        changes.push({
            type: 'css',
            description: 'Added animations and hover effects',
            reasoning: 'Smooth interactions create a polished feel',
        });
    }

    // Dark mode - more flexible
    if (lower.includes('dark')) {
        updatedCss = updatedCss.replace(/--background:\s*[^;]+;/, '--background: #0a0a0a;');
        updatedCss = updatedCss.replace(/--text:\s*[^;]+;/, '--text: #ffffff;');
        updatedCss = updatedCss.replace(/--text-secondary:\s*[^;]+;/, '--text-secondary: #a0a0a0;');
        updatedCss = updatedCss.replace(/--card-bg:\s*[^;]+;/, '--card-bg: #1a1a1a;');
        updatedCss = updatedCss.replace(/background:\s*#fff[^;]*;/g, 'background: #1a1a1a;');
        updatedCss = updatedCss.replace(/background:\s*white[^;]*;/g, 'background: #1a1a1a;');
        updatedCss = updatedCss.replace(/color:\s*#000[^;]*;/g, 'color: #ffffff;');
        updatedCss = updatedCss.replace(/color:\s*black[^;]*;/g, 'color: #ffffff;');
        changes.push({
            type: 'css',
            description: 'Applied dark mode theme',
            reasoning: 'Dark themes reduce eye strain and look modern',
        });
    }

    // Light mode
    if (lower.includes('light mode') || lower.includes('light theme')) {
        updatedCss = updatedCss.replace(/--background:\s*[^;]+;/, '--background: #ffffff;');
        updatedCss = updatedCss.replace(/--text:\s*[^;]+;/, '--text: #1a1a1a;');
        updatedCss = updatedCss.replace(/--text-secondary:\s*[^;]+;/, '--text-secondary: #666666;');
        updatedCss = updatedCss.replace(/--card-bg:\s*[^;]+;/, '--card-bg: #f5f5f5;');
        changes.push({
            type: 'css',
            description: 'Applied light mode theme',
            reasoning: 'Clean, bright appearance',
        });
    }

    // Highlight items / stars - more flexible
    if (lower.includes('highlight') || lower.includes('star') || lower.includes('feature') || lower.includes('best seller') || lower.includes('popular')) {
        updatedCss += `
.menu-item[data-bcg="star"], .menu-item.star-item, .menu-item:first-child {
  border: 2px solid var(--accent, #f97316);
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(234, 88, 12, 0.05));
  position: relative;
}
.menu-item[data-bcg="star"]::before, .menu-item.star-item::before {
  content: "Popular";
  position: absolute;
  top: -10px;
  left: 10px;
  background: var(--accent, #f97316);
  color: white;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
`;
        changes.push({
            type: 'css',
            description: 'Highlighted popular/star items with special styling',
            reasoning: 'Menu engineering: draw attention to high-margin items',
        });
    }

    // Golden triangle
    if (lower.includes('golden triangle') || lower.includes('eye pattern') || lower.includes('visual hierarchy')) {
        updatedCss += `
.menu-section:first-child .menu-item:first-child {
  transform: scale(1.02);
  border: 2px solid var(--accent, #f97316);
}
.menu-section .menu-item:nth-child(2) {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.05), transparent);
}
`;
        changes.push({
            type: 'css',
            description: 'Applied Golden Triangle positioning emphasis',
            reasoning: 'Eyes naturally move top→middle→right, placing focus on key items',
        });
    }

    // Mobile optimization - more flexible
    if (lower.includes('mobile') || lower.includes('phone') || lower.includes('responsive') || lower.includes('touch')) {
        updatedCss = updatedCss.replace(/font-size:\s*0\.\d+rem;/g, 'font-size: 1rem;');
        updatedCss += `
@media (max-width: 480px) {
  .menu-container { padding: 1rem; }
  .menu-item { padding: 1rem; }
  .item-name { font-size: 1.1rem; }
  .item-price { font-size: 1.2rem; min-width: 60px; }
  .add-to-cart-btn, button { min-height: 44px; min-width: 44px; font-size: 1rem; }
}
`;
        changes.push({
            type: 'css',
            description: 'Optimized for mobile devices',
            reasoning: 'Larger touch targets and readable fonts for phone users',
        });
    }

    // Luxury/gold/premium aesthetic - more flexible
    if (lower.includes('luxury') || lower.includes('premium') || lower.includes('elegant') || lower.includes('upscale') || lower.includes('fancy')) {
        updatedCss = updatedCss.replace(/--accent:\s*[^;]+;/, '--accent: #d4af37;');
        updatedCss = updatedCss.replace(/--background:\s*[^;]+;/, '--background: #1a1a1a;');
        updatedCss = updatedCss.replace(/--text:\s*[^;]+;/, '--text: #f5f5f5;');
        updatedCss += `
.menu-header, h1, h2 { 
  font-family: 'Playfair Display', serif; 
  letter-spacing: 0.1em;
}
.menu-item {
  border: 1px solid rgba(212, 175, 55, 0.3);
}
`;
        changes.push({
            type: 'css',
            description: 'Applied luxury gold aesthetic',
            reasoning: 'Premium feel increases perceived value',
        });
    }

    // Minimalist
    if (lower.includes('minimal') || lower.includes('simple') || lower.includes('clean')) {
        updatedCss = updatedCss.replace(/border:\s*[^;]+;/g, 'border: none;');
        updatedCss = updatedCss.replace(/box-shadow:\s*[^;]+;/g, 'box-shadow: none;');
        updatedCss = updatedCss.replace(/background:\s*linear-gradient[^;]+;/g, 'background: transparent;');
        changes.push({
            type: 'css',
            description: 'Applied minimalist style',
            reasoning: 'Clean design focuses attention on content',
        });
    }

    // Colorful / Vibrant
    if (lower.includes('colorful') || lower.includes('vibrant') || lower.includes('bright') || lower.includes('fun')) {
        updatedCss = updatedCss.replace(/--accent:\s*[^;]+;/, '--accent: #ec4899;');
        updatedCss += `
.menu-section:nth-child(1) .menu-item { border-left: 4px solid #f97316; }
.menu-section:nth-child(2) .menu-item { border-left: 4px solid #3b82f6; }
.menu-section:nth-child(3) .menu-item { border-left: 4px solid #22c55e; }
.menu-section:nth-child(4) .menu-item { border-left: 4px solid #a855f7; }
`;
        changes.push({
            type: 'css',
            description: 'Made design more colorful and vibrant',
            reasoning: 'Fun colors create energy and appeal',
        });
    }

    // Glassmorphism
    if (lower.includes('glass') || lower.includes('blur') || lower.includes('frosted')) {
        updatedCss += `
.menu-item {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
`;
        changes.push({
            type: 'css',
            description: 'Applied glassmorphism effect',
            reasoning: 'Modern frosted glass aesthetic',
        });
    }

    // Neon / Glow
    if (lower.includes('neon') || lower.includes('glow')) {
        updatedCss = updatedCss.replace(/--background:\s*[^;]+;/, '--background: #0a0a0a;');
        updatedCss = updatedCss.replace(/--accent:\s*[^;]+;/, '--accent: #00ff88;');
        updatedCss += `
.menu-item {
  border: 1px solid var(--accent, #00ff88);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
}
.item-price {
  color: var(--accent, #00ff88);
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}
`;
        changes.push({
            type: 'css',
            description: 'Applied neon glow effect',
            reasoning: 'Eye-catching modern aesthetic',
        });
    }

    // Decoy pricing
    if (lower.includes('decoy') || lower.includes('pricing') || lower.includes('anchor')) {
        updatedCss += `
.menu-item:first-child .item-price {
  font-size: 1.4rem;
  font-weight: 700;
}
.menu-item:nth-child(2) {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), transparent);
  border: 2px solid rgba(34, 197, 94, 0.5);
}
.menu-item:nth-child(2)::after {
  content: "Best Value";
  position: absolute;
  top: -8px;
  right: 10px;
  background: #22c55e;
  color: white;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 8px;
}
`;
        changes.push({
            type: 'css',
            description: 'Applied decoy pricing layout',
            reasoning: 'Price anchoring makes middle option more attractive',
        });
    }

    // If no changes made, provide a helpful default change
    if (changes.length === 0) {
        // Apply a general improvement
        updatedCss += `
.menu-item {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.menu-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}
`;
        changes.push({
            type: 'css',
            description: 'Added subtle hover effects',
            reasoning: 'Improved interactivity and visual feedback',
        });
    }

    const summary = `Made ${changes.length} change(s): ${changes.map(c => c.description).join(', ')}`;

    return {
        success: true,
        changes,
        updatedHtml,
        updatedCss,
        summary,
    };
}
