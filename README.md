# tweny AI

AI agent-powered menu optimization with visual editor for restaurants.

## Problem Statement

Restaurant operators make menu decisions on hunches without data-driven insights. They don't know which items are losing money, which should be promoted, or how pricing changes would impact revenue. tweny AI solves this with a ReAct agent that analyzes menu and sales data, combined with a visual no-code editor for menu layout design.

## Features

- ReAct AI agent with multi-tool reasoning for menu analysis
- Visual drag-and-drop menu editor with real-time updates
- BCG matrix analytics (Stars, Cash Cows, Question Marks, Dogs)
- Menu engineering metrics and recommendations
- AI-generated layout suggestions
- Save and export menu layouts

## Technologies Used

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **AI/ML**: LangGraph, LangChain, OpenAI GPT-4
- **UI Components**: @dnd-kit (drag-drop), Zustand (state management), Recharts (analytics)
- **Styling**: Tailwind CSS, PostCSS
- **Data**: PostgreSQL, Drizzle ORM (to be added)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key

### Installation

1. Clone and install dependencies:
```bash
cd /Users/abdullah/Desktop/tweny
npm install
```

2. Set up environment variables in `.env.local`:
```
OPENAI_API_KEY=your_openai_api_key
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### AI Agent Chat

Type questions about your menu at the bottom of the editor:
- "What items should I remove?"
- "Which items should I feature prominently?"
- "Generate optimal layout for revenue"

The agent will reason through available data and provide recommendations.

### Visual Editor

1. **Drag items** from the left sidebar onto the canvas
2. **Edit properties** using the right panel (size, color, styling)
3. **Double-click** to edit text inline
4. **Ask AI** for layout suggestions, then click "Apply"
5. **Save layout** to export for implementation

## Architecture

```
Frontend (Next.js)
  ├─ Visual Editor Shell
  └─ AI Agent Chat UI
        ↓
LangGraph ReAct Agent Layer
  ├─ AnalyzeMenuTool (BCG, metrics)
  ├─ QueryDataTool (fetch data)
  ├─ GenerateLayoutTool (create layouts)
  ├─ OptimizeItemsTool (recommendations)
  └─ CalculateImpactTool (revenue projections)
        ↓
API Routes (/api/agent/chat, /api/editor/save)
```

## Project Structure

```
tweny/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── page.tsx           # Home page
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global styles
│   │   └── api/               # API routes
│   ├── components/
│   │   └── editor/            # Editor components
│   ├── lib/
│   │   ├── agents/            # ReAct agent logic
│   │   └── store/             # Zustand state stores
├── data/                      # Menu Engineering datasets
├── docs/                      # Technical documentation
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

## Data

Menu Engineering datasets are in `data/`:
- Menu Engineering Part 1: Sales orders, payments, app events (255 MB)
- Menu Engineering Part 2: Menu items, dimensions, hierarchies (208 MB)
- Additional Tables: Subscriptions, devices, integrations (467 KB)

Datasets include CSV files for dim_menu_items, fct_orders, fct_payments, etc. All timestamps are UNIX integers; all monetary values in DKK.

## Development

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Deploy to Vercel

```bash
vercel
```

## Team Members

- Team Lead: [Your name and role]
- Backend/AI: [Your name and role]
- Frontend/UI: [Your name and role]

Document each team member's contributions here and ensure distributed GitHub commits.

## Next Steps

1. Add PostgreSQL database and Drizzle schema
2. Implement analytics engine for BCG calculations
3. Complete ReAct agent tool implementations
4. Build menu editor canvas with drag-drop
5. Integrate editor with AI agent suggestions
6. Deploy to Vercel and collect feedback

## Documentation

See `docs/` for detailed information:
- `PRD-tweny.md` - Product requirements and features
- `TECH-BLUEPRINT.md` - Architecture and API specifications
- `IMPLEMENTATION-PLAN.md` - 48-hour implementation roadmap
- `data/README.md` - Dataset documentation
