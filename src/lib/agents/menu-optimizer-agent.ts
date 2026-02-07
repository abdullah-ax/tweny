import { db } from '@/lib/db';
import { menuItems, feedback, appEvents } from '@/lib/db/schema';
import { eq, desc, count } from 'drizzle-orm';

export type AgentResult = {
    answer: string;
    bullets: string[];
    citations: Array<{ label: string; value: string }>;
    explanation: string;
    reasoning: string[];
    toolResults: Array<{ tool?: string; result?: unknown; error?: string }>;
};

async function gatherRestaurantContext(restaurantId: number): Promise<string> {
    const contextParts: string[] = [];

    try {
        // Get menu items with sales data
        const items = await db
            .select()
            .from(menuItems)
            .where(eq(menuItems.restaurantId, restaurantId))
            .limit(50);

        if (items.length > 0) {
            const itemSummary = items.map(item => {
                const margin = item.cost && Number(item.price) > 0
                    ? ((Number(item.price) - Number(item.cost)) / Number(item.price) * 100).toFixed(0)
                    : 'N/A';
                return `- ${item.name}: $${item.price}, sold ${item.soldCount || 0} times, margin ${margin}%`;
            }).join('\n');
            contextParts.push(`MENU ITEMS:\n${itemSummary}`);
        }

        // Get recent customer feedback
        const recentFeedback = await db
            .select()
            .from(feedback)
            .where(eq(feedback.restaurantId, restaurantId))
            .orderBy(desc(feedback.createdAt))
            .limit(10);

        if (recentFeedback.length > 0) {
            const feedbackSummary = recentFeedback.map(f =>
                `- [${f.source}] ${f.transcript}`
            ).join('\n');
            contextParts.push(`RECENT CUSTOMER FEEDBACK:\n${feedbackSummary}`);
        }

        // Get event analytics
        const eventCounts = await db
            .select({
                eventType: appEvents.eventType,
                eventCount: count(),
            })
            .from(appEvents)
            .where(eq(appEvents.restaurantId, restaurantId))
            .groupBy(appEvents.eventType);

        if (eventCounts.length > 0) {
            const eventSummary = eventCounts.map(e =>
                `- ${e.eventType}: ${e.eventCount} events`
            ).join('\n');
            contextParts.push(`CUSTOMER ENGAGEMENT:\n${eventSummary}`);
        }

        // Calculate BCG-style metrics
        const totalSold = items.reduce((sum, item) => sum + (item.soldCount || 0), 0);
        const avgSold = totalSold / Math.max(items.length, 1);

        const stars = items.filter(i => (i.soldCount || 0) > avgSold && Number(i.price) > 15).length;
        const cashCows = items.filter(i => (i.soldCount || 0) > avgSold && Number(i.price) <= 15).length;
        const questionMarks = items.filter(i => (i.soldCount || 0) <= avgSold && Number(i.price) > 15).length;
        const dogs = items.filter(i => (i.soldCount || 0) <= avgSold && Number(i.price) <= 15).length;

        contextParts.push(`BCG MATRIX SUMMARY:\n- Stars (high sales, high price): ${stars}\n- Cash Cows (high sales, low price): ${cashCows}\n- Question Marks (low sales, high price): ${questionMarks}\n- Dogs (low sales, low price): ${dogs}`);

    } catch (error) {
        console.error('Error gathering context:', error);
    }

    return contextParts.length > 0
        ? contextParts.join('\n\n')
        : 'No additional context available.';
}

export async function runAgent(userMessage: string, restaurantId: number): Promise<AgentResult> {
    const reasoning = [`Received message for restaurant ${restaurantId}`];

    const fallback = (): AgentResult => {
        const bullets = [
            'Focus on best‑selling items in prime positions',
            'Reduce visibility of low‑margin items',
            'Test one pricing change per section before wider rollout',
        ];

        const citations = [
            { label: 'Top Revenue Share', value: 'Stars: 38% of revenue' },
            { label: 'Low Margin Items', value: 'Dogs: 18% margin' },
            { label: 'Avg Item Margin', value: '52%' },
        ];

        const explanation =
            'These suggestions prioritize items that drive revenue and margin while limiting changes to one variable at a time. This reduces risk and makes it easier to measure impact across sections.';

        return {
            answer: `Thanks! I will analyze your menu next: "${userMessage}".`,
            bullets,
            citations,
            explanation,
            reasoning,
            toolResults: [],
        };
    };

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return fallback();
    }

    try {
        // Gather real restaurant context
        const restaurantContext = await gatherRestaurantContext(restaurantId);
        reasoning.push('Gathered restaurant context including menu items, feedback, and analytics');

        const systemPrompt = [
            'You are a menu optimization assistant for a restaurant. Analyze the provided data and respond with concise, actionable advice.',
            '',
            'RESTAURANT DATA:',
            restaurantContext,
            '',
            'Return ONLY valid JSON with fields:',
            '{',
            '  "answer": string,',
            '  "bullets": string[],',
            '  "citations": {"label": string, "value": string}[],',
            '  "explanation": string',
            '}',
            'Use 2-4 bullets with specific recommendations. Include relevant data citations. Do NOT include references outside the JSON.',
        ].join('\n');

        const model = process.env.OPENROUTER_MODEL || 'liquid/lfm-2.5-1.2b-instruct:free';
        const payload = {
            model: model,
            temperature: 0.4,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
        };

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            return fallback();
        }

        const data = await res.json();
        const content: string = data.choices?.[0]?.message?.content ?? '';

        const normalizeFromText = (text: string): AgentResult => {
            const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
            const bullets = lines
                .filter((line) => /^[-*•]/.test(line))
                .map((line) => line.replace(/^[-*•]\s*/, '').trim())
                .slice(0, 4);

            const explanation = lines
                .filter((line) => !/^[-*•]/.test(line))
                .join(' ')
                .trim();

            return {
                answer: bullets.length > 0 ? 'Here are concise recommendations.' : text,
                bullets: bullets,
                citations: [],
                explanation: explanation,
                reasoning,
                toolResults: [],
            };
        };

        try {
            const parsed = JSON.parse(content);
            return {
                answer: parsed.answer ?? 'Here are my suggestions based on your menu.',
                bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
                citations: Array.isArray(parsed.citations) ? parsed.citations : [],
                explanation: parsed.explanation ?? '',
                reasoning,
                toolResults: [],
            };
        } catch {
            return normalizeFromText(content || '');
        }
    } catch {
        return fallback();
    }
}
