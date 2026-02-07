import Tesseract from 'tesseract.js';

// PDF.js will be dynamically imported when needed to avoid SSR issues
type PdfJsLib = typeof import('pdfjs-dist');
let pdfjsLibPromise: Promise<PdfJsLib> | null = null;

async function getPdfJs(): Promise<PdfJsLib> {
    if (typeof window === 'undefined') {
        throw new Error('PDF.js can only be used in browser environment');
    }

    if (!pdfjsLibPromise) {
        pdfjsLibPromise = (async () => {
            // Use legacy build for better compatibility with bundlers
            const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
            // Set worker from CDN - use matching version
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
            return pdfjs as unknown as PdfJsLib;
        })();
    }
    return pdfjsLibPromise;
}

export interface ExtractedMenuItem {
    name: string;
    description?: string;
    price?: string;
    category?: string;
    position: { x: number; y: number; width: number; height: number };
}

export interface ExtractedMenu {
    items: ExtractedMenuItem[];
    categories: string[];
    rawText: string;
    language: string;
    confidence: number;
    layout: {
        width: number;
        height: number;
        columns: number;
        hasImages: boolean;
    };
    pageCount?: number;
}

export interface OCRProgress {
    status: string;
    progress: number;
}

// Extended type for Tesseract data with lines
interface TesseractData extends Tesseract.Page {
    lines?: Array<{
        text: string;
        bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
}

/**
 * OCR Service using Tesseract.js (free, open-source)
 * Supports 100+ languages including Arabic, Chinese, Japanese, etc.
 */
export class OCRService {
    // More flexible price regex that handles: $10, 10.99, $10.99, 10,99, EGP 50, 50 SAR, etc.
    private static readonly PRICE_REGEX = /(?:[\$€£¥₹]\s*)?\d{1,4}[.,]?\d{0,2}\s*(?:[\$€£¥₹]|EGP|USD|EUR|SAR|LE|SR)?(?!\d)/gi;
    private static readonly CATEGORY_KEYWORDS = [
        'appetizer', 'starter', 'soup', 'salad', 'main', 'entrée', 'entree',
        'dessert', 'beverage', 'drink', 'side', 'breakfast', 'lunch', 'dinner',
        'مقبلات', 'حساء', 'سلطة', 'أطباق', 'حلويات', 'مشروبات', // Arabic
        '前菜', 'スープ', 'メイン', 'デザート', // Japanese
    ];

    /**
     * Extract menu data from an image using OCR
     */
    static async extractFromImage(
        imageSource: string | File | Blob,
        languages: string[] = ['eng', 'ara'],
        onProgress?: (progress: OCRProgress) => void
    ): Promise<ExtractedMenu> {
        const langString = languages.join('+');

        const result = await Tesseract.recognize(imageSource, langString, {
            logger: (m) => {
                if (onProgress && m.status) {
                    onProgress({
                        status: m.status,
                        progress: m.progress || 0,
                    });
                }
            },
        });

        const { data } = result;
        const extendedData = data as TesseractData;
        let items = this.parseMenuItems(extendedData);

        // Fallback: if no items extracted from lines, try parsing raw text
        if (items.length === 0 && data.text.length > 10) {
            items = this.parseTextToItems(data.text);
        }

        const categories = this.extractCategories(data.text);

        return {
            items,
            categories,
            rawText: data.text,
            language: languages[0],
            confidence: data.confidence / 100,
            layout: {
                width: extendedData.lines?.[0]?.bbox?.x1 || 800,
                height: extendedData.lines?.length ? extendedData.lines[extendedData.lines.length - 1]?.bbox?.y1 || 600 : 600,
                columns: this.detectColumns(extendedData),
                hasImages: false,
            },
        };
    }

    /**
     * Extract menu data from a PDF file
     */
    static async extractFromPDF(
        pdfSource: File | ArrayBuffer,
        languages: string[] = ['eng', 'ara'],
        onProgress?: (progress: OCRProgress) => void
    ): Promise<ExtractedMenu> {
        onProgress?.({ status: 'Loading PDF...', progress: 0.1 });

        // Get PDF.js library (dynamic import)
        const pdfjs = await getPdfJs();

        // Convert File to ArrayBuffer if needed
        let arrayBuffer: ArrayBuffer;
        if (pdfSource instanceof File) {
            arrayBuffer = await pdfSource.arrayBuffer();
        } else {
            arrayBuffer = pdfSource;
        }

        // Load the PDF document
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        onProgress?.({ status: `Processing ${numPages} page(s)...`, progress: 0.2 });

        let allText = '';
        const allItems: ExtractedMenuItem[] = [];
        let totalConfidence = 0;
        let maxWidth = 800;
        let totalHeight = 0;

        // Process each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const progressBase = 0.2 + (0.7 * (pageNum - 1)) / numPages;
            onProgress?.({ status: `Processing page ${pageNum}/${numPages}...`, progress: progressBase });

            const page = await pdf.getPage(pageNum);

            // First try to extract text directly (for digital PDFs)
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            if (pageText.trim().length > 50) {
                // PDF has extractable text - use it directly
                allText += pageText + '\n';

                // Parse items from text - improved parsing
                const items = this.parseTextToItems(pageText, totalHeight);
                allItems.push(...items);
                totalConfidence += 0.95; // High confidence for digital text
            } else {
                // Scanned PDF - render to image and OCR
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any).promise;

                // Convert canvas to blob for OCR
                const blob = await new Promise<Blob>((resolve) => {
                    canvas.toBlob((b) => resolve(b!), 'image/png');
                });

                // OCR the page image
                const pageResult = await this.extractFromImage(blob, languages, (p) => {
                    onProgress?.({
                        status: `OCR page ${pageNum}/${numPages}: ${p.status}`,
                        progress: progressBase + (0.7 / numPages) * p.progress,
                    });
                });

                allText += pageResult.rawText + '\n';
                allItems.push(
                    ...pageResult.items.map((item) => ({
                        ...item,
                        position: {
                            ...item.position,
                            y: item.position.y + totalHeight,
                        },
                    }))
                );
                totalConfidence += pageResult.confidence;
                maxWidth = Math.max(maxWidth, pageResult.layout.width);
            }

            const viewport = page.getViewport({ scale: 1.0 });
            totalHeight += viewport.height;
        }

        onProgress?.({ status: 'Finalizing...', progress: 0.95 });

        const categories = this.extractCategories(allText);

        return {
            items: allItems,
            categories: categories.length > 0 ? categories : ['Menu'],
            rawText: allText,
            language: languages[0],
            confidence: totalConfidence / numPages,
            layout: {
                width: maxWidth,
                height: totalHeight,
                columns: 1,
                hasImages: false,
            },
            pageCount: numPages,
        };
    }

    /**
     * Extract menu from file (auto-detects PDF vs image)
     */
    static async extractFromFile(
        file: File,
        languages: string[] = ['eng', 'ara'],
        onProgress?: (progress: OCRProgress) => void
    ): Promise<ExtractedMenu> {
        const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (isPDF) {
            return this.extractFromPDF(file, languages, onProgress);
        } else {
            return this.extractFromImage(file, languages, onProgress);
        }
    }

    /**
     * Parse raw OCR data into structured menu items
     */
    private static parseMenuItems(data: TesseractData): ExtractedMenuItem[] {
        const items: ExtractedMenuItem[] = [];
        const lines = data.lines || [];

        let currentCategory = 'Uncategorized';
        let currentItem: Partial<ExtractedMenuItem> | null = null;

        for (const line of lines) {
            const text = line.text.trim();
            if (!text) continue;

            // Check if line is a category header
            if (this.isCategory(text)) {
                currentCategory = text;
                continue;
            }

            // Check if line contains a price (likely item name + price)
            const priceMatch = text.match(this.PRICE_REGEX);
            if (priceMatch) {
                // Save previous item
                if (currentItem?.name) {
                    items.push(currentItem as ExtractedMenuItem);
                }

                const price = priceMatch[0].trim();
                const name = text.replace(price, '').trim();

                currentItem = {
                    name: name || text,
                    price,
                    category: currentCategory,
                    position: {
                        x: line.bbox.x0,
                        y: line.bbox.y0,
                        width: line.bbox.x1 - line.bbox.x0,
                        height: line.bbox.y1 - line.bbox.y0,
                    },
                };
            } else if (currentItem && !currentItem.description) {
                // Treat as description if it's a short line after an item
                if (text.length < 100) {
                    currentItem.description = text;
                }
            } else if (text.length > 3) {
                // Standalone item without price
                if (currentItem?.name) {
                    items.push(currentItem as ExtractedMenuItem);
                }
                currentItem = {
                    name: text,
                    category: currentCategory,
                    position: {
                        x: line.bbox.x0,
                        y: line.bbox.y0,
                        width: line.bbox.x1 - line.bbox.x0,
                        height: line.bbox.y1 - line.bbox.y0,
                    },
                };
            }
        }

        // Don't forget the last item
        if (currentItem?.name) {
            items.push(currentItem as ExtractedMenuItem);
        }

        return items;
    }

    /**
     * Check if text is likely a category header
     */
    private static isCategory(text: string): boolean {
        const lower = text.toLowerCase();

        // Check against known category keywords
        for (const keyword of this.CATEGORY_KEYWORDS) {
            if (lower.includes(keyword.toLowerCase())) {
                return true;
            }
        }

        // Category headers are often ALL CAPS or Title Case with no prices
        const isAllCaps = text === text.toUpperCase() && text.length > 3 && text.length < 30;
        const hasNoPrice = !this.PRICE_REGEX.test(text);

        return isAllCaps && hasNoPrice;
    }

    /**
     * Parse raw text into menu items (for PDF text extraction)
     */
    private static parseTextToItems(text: string, yOffset: number = 0): ExtractedMenuItem[] {
        const items: ExtractedMenuItem[] = [];
        let currentCategory = 'Menu';

        // Split by newlines and clean up
        const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip very short lines (likely noise)
            if (line.length < 2) continue;

            // Check if this is a category header
            if (this.isCategory(line)) {
                currentCategory = line;
                continue;
            }

            // Try to extract price from line
            const priceMatches = line.match(this.PRICE_REGEX);
            let price: string | undefined;
            let name = line;

            if (priceMatches && priceMatches.length > 0) {
                // Use the last price match (prices usually at the end)
                price = priceMatches[priceMatches.length - 1].trim();
                // Remove price from name
                name = line.replace(price, '').trim();
                // Clean up any trailing dots, dashes used as separators
                name = name.replace(/[.\-_]+$/, '').trim();
            }

            // Skip if name is too short or looks like junk
            if (name.length < 2 || /^[\d\s.,-]+$/.test(name)) continue;

            // Skip lines that look like headers/footers
            if (/^(page|tel|phone|address|www\.|http)/i.test(name)) continue;

            items.push({
                name,
                price,
                category: currentCategory,
                description: undefined,
                position: { x: 0, y: yOffset + i * 20, width: 400, height: 20 },
            });
        }

        return items;
    }

    /**
     * Extract category names from text
     */
    private static extractCategories(text: string): string[] {
        const categories: string[] = [];
        const lines = text.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (this.isCategory(trimmed) && !categories.includes(trimmed)) {
                categories.push(trimmed);
            }
        }

        return categories.length > 0 ? categories : ['Menu'];
    }

    /**
     * Detect number of columns in the menu layout
     */
    private static detectColumns(data: TesseractData): number {
        if (!data.lines || data.lines.length < 5) return 1;

        const xPositions = data.lines.map((l) => l.bbox.x0);
        const midPoint = Math.max(...xPositions) / 2;

        const leftCount = xPositions.filter((x: number) => x < midPoint * 0.7).length;
        const rightCount = xPositions.filter((x: number) => x > midPoint * 1.3).length;

        if (rightCount > data.lines.length * 0.3) {
            return 2;
        }
        return 1;
    }

    /**
     * Supported language codes for OCR
     */
    static getSupportedLanguages(): { code: string; name: string }[] {
        return [
            { code: 'eng', name: 'English' },
            { code: 'ara', name: 'Arabic' },
            { code: 'chi_sim', name: 'Chinese (Simplified)' },
            { code: 'chi_tra', name: 'Chinese (Traditional)' },
            { code: 'jpn', name: 'Japanese' },
            { code: 'kor', name: 'Korean' },
            { code: 'fra', name: 'French' },
            { code: 'deu', name: 'German' },
            { code: 'spa', name: 'Spanish' },
            { code: 'ita', name: 'Italian' },
            { code: 'por', name: 'Portuguese' },
            { code: 'rus', name: 'Russian' },
            { code: 'tur', name: 'Turkish' },
            { code: 'hin', name: 'Hindi' },
        ];
    }
}
