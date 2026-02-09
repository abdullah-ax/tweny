/**
 * QR Code Export API
 * GET /api/export-qr?restaurantId=1
 * 
 * Generates two high-resolution SVG QR codes for A/B testing,
 * each with embedded tracking parameters.
 */

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface QRExportResponse {
    restaurantId: number;
    restaurantName: string;
    variants: {
        a: {
            svg: string;
            url: string;
            trackingId: string;
        };
        b: {
            svg: string;
            url: string;
            trackingId: string;
        };
    };
    createdAt: string;
}

// Generate a tracking ID for the QR code
function generateTrackingId(restaurantId: number, variant: 'a' | 'b'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `qr-${restaurantId}-${variant}-${timestamp}-${random}`;
}

// Get the base URL from environment or request
function getBaseUrl(request: NextRequest): string {
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${host}`;
}

// Generate styled SVG QR code
async function generateStyledQR(
    url: string,
    variant: 'a' | 'b',
    restaurantName: string
): Promise<string> {
    // Generate the base QR code
    const qrSvg = await QRCode.toString(url, {
        type: 'svg',
        width: 400,
        margin: 2,
        color: {
            dark: variant === 'a' ? '#1c1917' : '#581c87', // Variant A: dark, Variant B: purple
            light: '#ffffff',
        },
        errorCorrectionLevel: 'H', // High error correction for styling
    });

    // Extract the QR path from the SVG
    const pathMatch = qrSvg.match(/<path[^>]*d="([^"]*)"[^>]*\/>/);
    const qrPath = pathMatch ? pathMatch[1] : '';

    // Create a beautifully styled SVG
    const variantColor = variant === 'a' ? '#1c1917' : '#7e22ce';
    const accentColor = variant === 'a' ? '#d4af37' : '#a855f7';
    const gradientId = `gradient-${variant}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" width="500" height="600">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${accentColor};stop-opacity:0.1" />
      <stop offset="100%" style="stop-color:${variantColor};stop-opacity:0.05" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.15"/>
    </filter>
    <clipPath id="rounded">
      <rect x="30" y="80" width="440" height="440" rx="24"/>
    </clipPath>
  </defs>
  
  <!-- Background -->
  <rect width="500" height="600" fill="#fafaf9"/>
  <rect width="500" height="600" fill="url(#${gradientId})"/>
  
  <!-- Decorative Elements -->
  <circle cx="50" cy="50" r="80" fill="${accentColor}" opacity="0.08"/>
  <circle cx="450" cy="550" r="100" fill="${variantColor}" opacity="0.05"/>
  
  <!-- Header -->
  <text x="250" y="50" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="${variantColor}">
    ${restaurantName}
  </text>
  
  <!-- QR Code Container -->
  <rect x="30" y="80" width="440" height="440" rx="24" fill="white" filter="url(#shadow)"/>
  
  <!-- QR Code -->
  <g transform="translate(50, 100) scale(1)">
    <path d="${qrPath}" fill="${variantColor}"/>
  </g>
  
  <!-- Variant Badge -->
  <rect x="200" y="530" width="100" height="32" rx="16" fill="${variantColor}"/>
  <text x="250" y="552" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="white">
    Variant ${variant.toUpperCase()}
  </text>
  
  <!-- Instructions -->
  <text x="250" y="580" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#78716c">
    Scan to view menu
  </text>
</svg>`;
}

export async function GET(request: NextRequest) {
    try {
        const restaurantId = request.nextUrl.searchParams.get('restaurantId');
        const format = request.nextUrl.searchParams.get('format') || 'json'; // json or svg
        const variant = request.nextUrl.searchParams.get('variant') as 'a' | 'b' | null;

        if (!restaurantId) {
            return NextResponse.json(
                { error: 'restaurantId query parameter is required' },
                { status: 400 }
            );
        }

        const parsedId = parseInt(restaurantId, 10);
        if (isNaN(parsedId)) {
            return NextResponse.json(
                { error: 'Invalid restaurantId' },
                { status: 400 }
            );
        }

        // Get restaurant info
        const restaurant = await db.query.restaurants.findFirst({
            where: eq(restaurants.id, parsedId),
        });

        if (!restaurant) {
            return NextResponse.json(
                { error: 'Restaurant not found' },
                { status: 404 }
            );
        }

        const baseUrl = getBaseUrl(request);

        // Generate tracking IDs
        const trackingIdA = generateTrackingId(parsedId, 'a');
        const trackingIdB = generateTrackingId(parsedId, 'b');

        // Generate menu URLs with tracking
        const urlA = `${baseUrl}/menu/${parsedId}?variant=a&qr=${trackingIdA}`;
        const urlB = `${baseUrl}/menu/${parsedId}?variant=b&qr=${trackingIdB}`;

        // If requesting a single SVG
        if (format === 'svg' && variant) {
            const url = variant === 'a' ? urlA : urlB;
            const svg = await generateStyledQR(url, variant, restaurant.name);

            return new NextResponse(svg, {
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Content-Disposition': `attachment; filename="qr-${restaurant.name.toLowerCase().replace(/\s+/g, '-')}-variant-${variant}.svg"`,
                },
            });
        }

        // Generate both QR codes
        const [svgA, svgB] = await Promise.all([
            generateStyledQR(urlA, 'a', restaurant.name),
            generateStyledQR(urlB, 'b', restaurant.name),
        ]);

        const response: QRExportResponse = {
            restaurantId: parsedId,
            restaurantName: restaurant.name,
            variants: {
                a: {
                    svg: svgA,
                    url: urlA,
                    trackingId: trackingIdA,
                },
                b: {
                    svg: svgB,
                    url: urlB,
                    trackingId: trackingIdB,
                },
            },
            createdAt: new Date().toISOString(),
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('QR Export error:', error);
        return NextResponse.json(
            { error: 'Failed to generate QR codes' },
            { status: 500 }
        );
    }
}
