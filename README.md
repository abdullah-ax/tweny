# tweny

AI-powered menu optimization for restaurants.

## Access

Live app: [tweny.vercel.app](https://tweny.vercel.app)

Demo credentials:
- Email: `demo@tweny.ai`
- Password: `demo1234`

## How It's Made

Built with Next.js 15, React 19, and TypeScript. Uses Neon PostgreSQL for database with Drizzle ORM. Authentication with JWT and bcryptjs. Styled with Tailwind CSS.

The app analyzes menu data using BCG matrix categorization to identify high performers (Stars), reliable earners (Workhorses), underperformers (Dogs), and potential items (Puzzles).

## Features

Currently available:
- Restaurant management dashboard
- Menu item tracking with costs and pricing
- BCG Matrix analytics visualization
- Data import via CSV upload
- Visual menu editor interface

## Coming Soon

- AI agent with LangGraph for menu analysis
- Automated recommendations for pricing and positioning
- Layout generation based on item performance
- Revenue impact projections
- Advanced analytics and reporting

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
