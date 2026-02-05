# Getting Started with tweny AI

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Add your OpenAI API key:
```
OPENAI_API_KEY=sk-...
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### 4. Start Making Changes

- Editor shell: `src/components/editor/MenuEditorShell.tsx`
- AI chat: `src/components/editor/AIAgentChat.tsx`
- Agent logic: `src/lib/agents/menu-optimizer-agent.ts`
- API routes: `src/app/api/`

## Working with Data

All Menu Engineering datasets are in `data/`:

```bash
# View available CSVs
ls -la data/"Menu Engineering Part 1"
ls -la data/"Menu Engineering Part 2"
ls -la data/"Additional Tables"
```

Key tables for menu engineering:
- `dim_menu_items.csv` - Menu item catalog
- `fct_orders.csv` - Order history
- `fct_order_items.csv` - Items per order
- `fct_payments.csv` - Payment/revenue data
- `dim_taxonomy_terms.csv` - Categories and classifications

Timestamps are UNIX integers; monetary values are in DKK.

## Git Workflow (Team)

1. Create a feature branch:
```bash
git checkout -b feature/descriptive-name
```

2. Make commits with clear messages:
```bash
git commit -m "add: implement analytics engine for BCG matrix"
```

3. Push and create PR:
```bash
git push origin feature/descriptive-name
```

4. Each team member should have distinct commits (don't commit others' work).

## Deploy to Vercel

1. Push to GitHub
2. Install Vercel CLI:
```bash
npm install -g vercel
```

3. Deploy:
```bash
vercel
```

4. Follow prompts to connect your GitHub repo

## Testing Locally

### Test Agent Chat

Make a POST request to `http://localhost:3000/api/agent/chat`:

```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What items should I remove?","restaurantId":1}'
```

### Test Editor Save

```bash
curl -X POST http://localhost:3000/api/editor/save \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":1,"name":"Test Layout","elements":[]}'
```

## Common Issues

**Module not found errors**: Run `npm install` again

**Environment variable errors**: Check `.env.local` is in root and has OPENAI_API_KEY

**Next.js build errors**: Clear `.next/` folder and rebuild: `npm run build`

**Port 3000 in use**: Kill process or use different port: `npm run dev -- -p 3001`

## Next Steps

1. Implement PostgreSQL + Drizzle schema (see TECH-BLUEPRINT.md)
2. Build analytics engine for BCG calculations
3. Complete ReAct agent tool implementations
4. Expand visual editor with @dnd-kit drag-drop
5. Add data loading from CSV files
6. Deploy and test on Vercel
