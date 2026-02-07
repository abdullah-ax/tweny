import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { rawText } = await request.json();

        if (!rawText || typeof rawText !== 'string') {
            return NextResponse.json({ error: 'Missing rawText' }, { status: 400 });
        }

        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        const systemPrompt = `You are a menu data extraction expert. Given raw OCR text from a restaurant menu, extract ONLY the real menu items with their prices.

CRITICAL RULES:
- Extract only food/drink items with their prices
- PRICES ARE REQUIRED: If you cannot find a price, estimate based on similar items or use 0
- Ignore: addresses, phone numbers, website URLs, restaurant names, headers, footers, page numbers, noise/gibberish
- Group items into sensible categories (Appetizers, Main Course, Desserts, Beverages, etc.)
- If no clear category, use "Menu" as default
- Clean up item names (fix OCR errors, proper capitalization)
- Extract prices as NUMBERS ONLY (no currency symbols) - e.g., 12.99 not "$12.99" or "EGP 50"
- If price is missing, look for numbers near the item name

Return ONLY valid JSON in this exact format:
{
  "items": [
    {"name": "Item Name", "description": "optional description", "price": 12.99, "category": "Category Name"}
  ],
  "categories": ["Category1", "Category2"]
}

IMPORTANT: Every item MUST have a numeric price > 0. If unsure, estimate based on context.

If the text has no valid menu items, return: {"items": [], "categories": []}`;

        const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                temperature: 0.1,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Extract menu items from this OCR text:\n\n${rawText.slice(0, 8000)}` },
                ],
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('OpenRouter error:', res.status, errorText);
            return NextResponse.json({ error: 'AI service error' }, { status: 500 });
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content ?? '';

        // Try to parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                const items = Array.isArray(parsed.items) ? parsed.items.filter(validateItem) : [];
                const categories = Array.isArray(parsed.categories) ? parsed.categories : ['Menu'];

                return NextResponse.json({
                    success: true,
                    items,
                    categories,
                    confidence: 0.9,
                });
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
            }
        }

        return NextResponse.json({
            success: true,
            items: [],
            categories: ['Menu'],
            confidence: 0.5,
        });
    } catch (error: any) {
        console.error('Menu clean error:', error);
        return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status: 500 });
    }
}

interface MenuItem {
    name: string;
    price?: number;
    description?: string;
    category?: string;
}

function validateItem(item: any): item is MenuItem {
    if (!item || typeof item !== 'object') return false;
    if (!item.name || typeof item.name !== 'string') return false;
    if (item.name.length < 2 || item.name.length > 100) return false;

    // Ensure price is a valid positive number
    if (item.price !== undefined && item.price !== null) {
        const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^\d.,]/g, '').replace(',', '.'));
        if (isNaN(price) || price < 0) {
            item.price = 0;
        } else {
            item.price = price;
        }
    } else {
        item.price = 0;
    }

    // Filter out common junk patterns
    const junkPatterns = [
        /^[\d\s.,\-_]+$/,
        /^(page|tel|phone|fax|www\.|http|@|email)/i,
        /^\d+$/,
        /^[A-Z]{1,2}$/,
        /restaurant|cafe|bistro|grill|kitchen/i,
        /address|street|road|ave|blvd/i,
        /open|close|hour|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
        /delivery|takeout|dine-in|reservation/i,
        /copyright|©|all rights/i,
    ];

    for (const pattern of junkPatterns) {
        if (pattern.test(item.name)) return false;
    }

    return true;
}
