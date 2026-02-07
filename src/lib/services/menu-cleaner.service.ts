/**
 * AI-powered Menu Cleaner Service
 * Uses LLM to filter OCR junk and extract only real menu items
 */

export interface CleanedMenuItem {
    name: string;
    description?: string;
    price?: number;
    category: string;
}

export interface CleanedMenu {
    items: CleanedMenuItem[];
    categories: string[];
    confidence: number;
}

/**
 * Clean raw OCR text using AI to extract only valid menu items
 */
export async function cleanMenuWithAI(
    rawText: string,
    onProgress?: (status: string) => void
): Promise<CleanedMenu> {
    onProgress?.('Analyzing menu with AI...');

    try {
        const res = await fetch('/api/menu/clean', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawText }),
        });

        if (!res.ok) {
            console.error('AI cleaning failed:', res.status);
            return basicClean(rawText);
        }

        const data = await res.json();

        if (data.success) {
            return {
                items: data.items || [],
                categories: data.categories || ['Menu'],
                confidence: data.confidence || 0.9,
            };
        }

        return basicClean(rawText);
    } catch (error) {
        console.error('AI menu cleaning error:', error);
        return basicClean(rawText);
    }
}

/**
 * Basic cleaning without AI (fallback)
 */
function basicClean(rawText: string): CleanedMenu {
    const lines = rawText.split(/[\n\r]+/).map((l) => l.trim()).filter((l) => l.length > 2);
    const items: CleanedMenuItem[] = [];
    let currentCategory = 'Menu';

    const priceRegex = /(?:[\$€£¥₹]\s*)?\d{1,4}[.,]\d{2}\s*(?:[\$€£¥₹]|EGP|USD|EUR|SAR)?/;

    for (const line of lines) {
        // Skip obvious junk
        if (/^(page|tel|phone|fax|www\.|http|@|\d+$)/i.test(line)) continue;
        if (line.length > 100) continue;

        const priceMatch = line.match(priceRegex);
        if (priceMatch) {
            const price = parseFloat(priceMatch[0].replace(/[^\d.,]/g, '').replace(',', '.'));
            const name = line.replace(priceMatch[0], '').trim().replace(/[.\-_]+$/, '');

            if (name.length >= 3 && name.length <= 60 && price > 0 && price < 1000) {
                items.push({
                    name,
                    price,
                    category: currentCategory,
                });
            }
        }
    }

    const categories = [...new Set(items.map((i) => i.category))];

    return {
        items: items.slice(0, 100), // Limit to 100 items
        categories: categories.length > 0 ? categories : ['Menu'],
        confidence: 0.5,
    };
}
