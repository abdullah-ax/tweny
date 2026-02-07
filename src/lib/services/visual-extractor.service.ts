/**
 * Color & Image Extraction Service
 * Extracts color palette and images from PDF menus
 */

import { ColorPalette, ExtractedImage } from './context.service';

interface RGBColor {
    r: number;
    g: number;
    b: number;
}

/**
 * Extracts colors and images from canvas/images
 */
export class VisualExtractorService {
    /**
     * Extract dominant colors from an image
     */
    static async extractColorsFromImage(imageSource: string | File | Blob): Promise<ColorPalette> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';

            img.onload = () => {
                try {
                    const colors = this.extractFromImageElement(img);
                    resolve(colors);
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));

            if (imageSource instanceof File || imageSource instanceof Blob) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    img.src = e.target?.result as string;
                };
                reader.readAsDataURL(imageSource);
            } else {
                img.src = imageSource;
            }
        });
    }

    /**
     * Extract colors from an HTML image element
     */
    private static extractFromImageElement(img: HTMLImageElement): ColorPalette {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');

        // Sample at reasonable resolution
        const maxDim = 200;
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Collect colors
        const colorCounts = new Map<string, number>();

        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];

            // Skip transparent pixels
            if (a < 128) continue;

            // Quantize colors to reduce noise
            const qr = Math.round(r / 32) * 32;
            const qg = Math.round(g / 32) * 32;
            const qb = Math.round(b / 32) * 32;

            const key = `${qr},${qg},${qb}`;
            colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
        }

        // Sort by frequency
        const sortedColors = Array.from(colorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([key]) => {
                const [r, g, b] = key.split(',').map(Number);
                return { r, g, b };
            });

        return this.buildPalette(sortedColors);
    }

    /**
     * Extract colors from PDF pages (rendered as images)
     */
    static async extractColorsFromPdfPages(pages: HTMLCanvasElement[]): Promise<ColorPalette> {
        const allColors: RGBColor[] = [];

        for (const canvas of pages) {
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;

            const colorCounts = new Map<string, number>();

            for (let i = 0; i < pixels.length; i += 16) { // Sample every 4th pixel for speed
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];

                if (a < 128) continue;

                // Ignore near-white and near-black (likely text/background)
                const brightness = (r + g + b) / 3;
                if (brightness > 240 || brightness < 15) continue;

                const qr = Math.round(r / 24) * 24;
                const qg = Math.round(g / 24) * 24;
                const qb = Math.round(b / 24) * 24;

                const key = `${qr},${qg},${qb}`;
                colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
            }

            // Get top colors from this page
            const pageColors = Array.from(colorCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([key]) => {
                    const [r, g, b] = key.split(',').map(Number);
                    return { r, g, b };
                });

            allColors.push(...pageColors);
        }

        return this.buildPalette(allColors);
    }

    /**
     * Build a harmonious color palette from extracted colors
     */
    private static buildPalette(colors: RGBColor[]): ColorPalette {
        if (colors.length === 0) {
            return this.getDefaultPalette();
        }

        // Dominant color (most common)
        const dominant = colors[0];
        const dominantHex = this.rgbToHex(dominant);

        // Find contrasting colors for accent
        let accent = colors.find(c => this.getColorDistance(c, dominant) > 150) || colors[1] || dominant;
        const accentHex = this.rgbToHex(accent);

        // Determine color scheme
        const scheme = this.determineColorScheme(colors);

        // Generate complementary colors
        const background = this.darkenColor(dominant, 0.8);
        const text = this.getBrightness(dominant) > 128 ? '#1a1a2e' : '#ffffff';

        // Collect all unique extracted colors
        const extractedHexes = [...new Set(colors.slice(0, 8).map(c => this.rgbToHex(c)))];

        return {
            primary: dominantHex,
            secondary: this.lightenColor(dominant, 0.2),
            accent: accentHex,
            background,
            text,
            extracted: extractedHexes,
            dominant: dominantHex,
            scheme,
        };
    }

    /**
     * Determine if palette is warm, cool, neutral, or vibrant
     */
    private static determineColorScheme(colors: RGBColor[]): 'warm' | 'cool' | 'neutral' | 'vibrant' {
        let warmCount = 0;
        let coolCount = 0;
        let saturationSum = 0;

        colors.forEach(c => {
            // Check warm vs cool
            if (c.r > c.b) warmCount++;
            else coolCount++;

            // Check saturation
            const max = Math.max(c.r, c.g, c.b);
            const min = Math.min(c.r, c.g, c.b);
            saturationSum += (max - min) / (max || 1);
        });

        const avgSaturation = saturationSum / colors.length;

        if (avgSaturation > 0.6) return 'vibrant';
        if (warmCount > coolCount * 1.5) return 'warm';
        if (coolCount > warmCount * 1.5) return 'cool';
        return 'neutral';
    }

    /**
     * Extract images from canvas (food photos, logos, etc.)
     */
    static async extractImagesFromCanvas(
        canvas: HTMLCanvasElement,
        pageIndex: number = 0
    ): Promise<ExtractedImage[]> {
        const ctx = canvas.getContext('2d');
        if (!ctx) return [];

        const images: ExtractedImage[] = [];
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Simple blob detection for image regions
        const regions = this.detectImageRegions(imageData, canvas.width, canvas.height);

        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];

            // Create a canvas for this region
            const regionCanvas = document.createElement('canvas');
            regionCanvas.width = region.width;
            regionCanvas.height = region.height;
            const regionCtx = regionCanvas.getContext('2d');
            if (!regionCtx) continue;

            regionCtx.drawImage(
                canvas,
                region.x, region.y, region.width, region.height,
                0, 0, region.width, region.height
            );

            const dataUrl = regionCanvas.toDataURL('image/jpeg', 0.8);

            // Classify image type
            const type = this.classifyImageType(region, canvas);

            images.push({
                id: `img_${pageIndex}_${i}`,
                dataUrl,
                width: region.width,
                height: region.height,
                position: { x: region.x, y: region.y },
                type,
            });
        }

        return images;
    }

    /**
     * Detect image regions in canvas (simplified blob detection)
     */
    private static detectImageRegions(
        imageData: ImageData,
        width: number,
        height: number
    ): Array<{ x: number; y: number; width: number; height: number }> {
        const regions: Array<{ x: number; y: number; width: number; height: number }> = [];

        // Simple grid-based detection
        const gridSize = 50;
        const minRegionSize = 80;

        for (let gy = 0; gy < height; gy += gridSize) {
            for (let gx = 0; gx < width; gx += gridSize) {
                // Check if this grid cell has high color variance (likely an image)
                const variance = this.getRegionColorVariance(imageData, gx, gy, gridSize, gridSize, width);

                if (variance > 1500) {
                    // Expand region to find bounds
                    const bounds = this.expandRegion(imageData, gx, gy, width, height);

                    if (bounds.width > minRegionSize && bounds.height > minRegionSize) {
                        // Check for overlap with existing regions
                        const overlaps = regions.some(r =>
                            this.rectsOverlap(r, bounds)
                        );

                        if (!overlaps) {
                            regions.push(bounds);
                        }
                    }
                }
            }
        }

        return regions.slice(0, 10); // Limit to 10 images
    }

    /**
     * Calculate color variance in a region
     */
    private static getRegionColorVariance(
        imageData: ImageData,
        x: number,
        y: number,
        w: number,
        h: number,
        canvasWidth: number
    ): number {
        const colors: RGBColor[] = [];

        for (let py = y; py < Math.min(y + h, imageData.height); py += 5) {
            for (let px = x; px < Math.min(x + w, canvasWidth); px += 5) {
                const idx = (py * canvasWidth + px) * 4;
                colors.push({
                    r: imageData.data[idx],
                    g: imageData.data[idx + 1],
                    b: imageData.data[idx + 2],
                });
            }
        }

        if (colors.length === 0) return 0;

        // Calculate variance
        const avgR = colors.reduce((s, c) => s + c.r, 0) / colors.length;
        const avgG = colors.reduce((s, c) => s + c.g, 0) / colors.length;
        const avgB = colors.reduce((s, c) => s + c.b, 0) / colors.length;

        const variance = colors.reduce((s, c) => {
            return s + Math.pow(c.r - avgR, 2) + Math.pow(c.g - avgG, 2) + Math.pow(c.b - avgB, 2);
        }, 0) / colors.length;

        return variance;
    }

    /**
     * Expand region to find full bounds of image area
     */
    private static expandRegion(
        imageData: ImageData,
        startX: number,
        startY: number,
        canvasWidth: number,
        canvasHeight: number
    ): { x: number; y: number; width: number; height: number } {
        const step = 20;
        let minX = startX;
        let minY = startY;
        let maxX = startX + 50;
        let maxY = startY + 50;

        // Expand in each direction while variance remains high
        while (maxX < canvasWidth) {
            const variance = this.getRegionColorVariance(imageData, maxX - step, startY, step, 50, canvasWidth);
            if (variance < 1000) break;
            maxX += step;
        }

        while (maxY < canvasHeight) {
            const variance = this.getRegionColorVariance(imageData, startX, maxY - step, 50, step, canvasWidth);
            if (variance < 1000) break;
            maxY += step;
        }

        return {
            x: minX,
            y: minY,
            width: Math.min(maxX - minX, 400),
            height: Math.min(maxY - minY, 400),
        };
    }

    /**
     * Check if two rectangles overlap
     */
    private static rectsOverlap(
        a: { x: number; y: number; width: number; height: number },
        b: { x: number; y: number; width: number; height: number }
    ): boolean {
        return !(
            a.x + a.width < b.x ||
            b.x + b.width < a.x ||
            a.y + a.height < b.y ||
            b.y + b.height < a.y
        );
    }

    /**
     * Classify image type based on position and size
     */
    private static classifyImageType(
        region: { x: number; y: number; width: number; height: number },
        canvas: HTMLCanvasElement
    ): 'logo' | 'food' | 'decoration' | 'unknown' {
        const isTopArea = region.y < canvas.height * 0.15;
        const isSquarish = Math.abs(region.width - region.height) < Math.min(region.width, region.height) * 0.3;
        const isSmall = region.width < canvas.width * 0.2;

        if (isTopArea && isSquarish && isSmall) return 'logo';
        if (isSquarish && region.width > 100) return 'food';
        if (!isSquarish) return 'decoration';

        return 'unknown';
    }

    /**
     * Utility: RGB to Hex
     */
    private static rgbToHex(color: RGBColor): string {
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
    }

    /**
     * Utility: Get color distance
     */
    private static getColorDistance(a: RGBColor, b: RGBColor): number {
        return Math.sqrt(
            Math.pow(a.r - b.r, 2) +
            Math.pow(a.g - b.g, 2) +
            Math.pow(a.b - b.b, 2)
        );
    }

    /**
     * Utility: Get brightness
     */
    private static getBrightness(color: RGBColor): number {
        return (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
    }

    /**
     * Utility: Darken color
     */
    private static darkenColor(color: RGBColor, factor: number): string {
        return this.rgbToHex({
            r: Math.round(color.r * (1 - factor)),
            g: Math.round(color.g * (1 - factor)),
            b: Math.round(color.b * (1 - factor)),
        });
    }

    /**
     * Utility: Lighten color
     */
    private static lightenColor(color: RGBColor, factor: number): string {
        return this.rgbToHex({
            r: Math.round(color.r + (255 - color.r) * factor),
            g: Math.round(color.g + (255 - color.g) * factor),
            b: Math.round(color.b + (255 - color.b) * factor),
        });
    }

    /**
     * Get default palette
     */
    private static getDefaultPalette(): ColorPalette {
        return {
            primary: '#1a1a2e',
            secondary: '#16213e',
            accent: '#f97316',
            background: '#0f0f1a',
            text: '#ffffff',
            extracted: ['#1a1a2e', '#f97316'],
            dominant: '#1a1a2e',
            scheme: 'neutral',
        };
    }
}
