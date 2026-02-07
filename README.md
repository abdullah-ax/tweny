# tweny

AI-powered menu optimization for restaurants.

## Quick Start

1. **Upload Menu** - Take a photo or upload a PDF of your menu
2. **Choose Strategy** - AI generates 4 psychology-backed layouts
3. **Deploy** - Get a QR code for your optimized menu
4. **Iterate** - Track metrics and improve with AI insights

## Access

Live app: [tweny.vercel.app](https://tweny.vercel.app)

Demo credentials:
- Email: `demo@tweny.ai`
- Password: `demo1234`

## How It's Made

Built with Next.js 15, React 19, and TypeScript. Uses:
- **Tesseract.js** for menu OCR (supports 100+ languages)
- **PDF.js** for PDF extraction
- **Menu Psychology** - Golden Triangle, Anchoring, Decoy Pricing, Scarcity
- **Real-time Analytics** for experiment tracking

## Features

- Upload PDF or image menus
- AI-powered menu extraction (OCR)
- 4 psychology-based layout strategies
- QR code deployment
- Mock payment flow
- Voice feedback collection
- Experiment tracking with scientific insights
- AI chat assistant for optimization advice

## Local Development

```bash
npm install
npm run dev
```

Set up `.env.local` with:
```
DATABASE_URL=your_neon_postgres_url
JWT_SECRET=your_secret_key
```
