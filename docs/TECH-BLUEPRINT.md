# Technical Architecture Blueprint v2
## ReAct Agent + Visual Editor Edition

**Version:** 2.0  
**New Stack:** LangGraph, @dnd-kit, Canvas API

---

## Updated System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Next.js 14)                      │
│  ┌───────────────────┐  ┌──────────────────────────────┐   │
│  │  Visual Editor    │  │  AI Agent Chat               │   │
│  │  - Canvas         │  │  - Conversation UI           │   │
│  │  - Drag/Drop      │  │  - Reasoning Display         │   │
│  │  - Properties     │  │  - Tool Execution View       │   │
│  └───────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                 LangGraph ReAct Agent Layer                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  State Graph:  [Reasoning] → [Tool Selection]        │  │
│  │                     ↓              ↓                  │  │
│  │                [Observation] ← [Action]              │  │
│  │                     ↓                                 │  │
│  │                [Should Continue?] → [Final Answer]   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Tools: AnalyzeMenuTool | QueryDataTool |                  │
│         GenerateLayoutTool | OptimizeItemsTool |           │
│         CalculateImpactTool                                │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                  Database + Services                        │
│  PostgreSQL + Drizzle ORM + Analytics Engine                │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Package.json (Updated)

```json name=package.json
{
  "name": "menu-ai-optimizer",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "drizzle-kit generate:pg",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.4.5",
    "@types/node": "^20.12.7",
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.0",
    
    "drizzle-orm": "^0.30.10",
    "postgres": "^3.4.4",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.6",
    
    "langchain": "^0.2.3",
    "@langchain/openai": "^0.0.33",
    "@langchain/core": "^0.2.3",
    "@langchain/langgraph": "^0.0.19",
    
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    
    "zod": "^3.23.8",
    "recharts": "^2.12.7",
    "lucide-react": "^0.378.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "sonner": "^1.4.41",
    "date-fns": "^3.6.0",
    "react-hot-toast": "^2.4.1",
    "zustand": "^4.5.2",
    "immer": "^10.1.1"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.3",
    "postcss": "^8.4.38",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.3",
    "drizzle-kit": "^0.21.2"
  }
}
```

---

## ReAct Agent Implementation

```typescript name=src/lib/agents/menu-optimizer-agent.ts
import { StateGraph, END, START } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { AnalyticsEngine } from "../services/analytics.engine";
import { db } from "../db";
import { menuItems, orderItems } from "../db/schema";
import { eq } from "drizzle-orm";

// ============================================
// Agent State Definition
// ============================================

interface AgentState {
  messages: (HumanMessage | AIMessage)[];
  restaurantId: number;
  reasoning: string[];
  toolResults: any[];
  nextAction: {
    tool: string;
    params: any;
  } | null;
  finalAnswer: string | null;
}

// ============================================
// Tool Definitions
// ============================================

const analyzeMenuTool = new DynamicStructuredTool({
  name: "analyze_menu",
  description: "Calculates BCG matrix, menu engineering metrics, and conversion rates for all menu items in a restaurant. Use this when you need to understand menu performance.",
  schema: z.object({
    restaurantId: z.number().describe("The restaurant ID to analyze"),
    periodDays: z.number().optional().default(90).describe("Number of days to analyze (default 90)"),
  }),
  func: async ({ restaurantId, periodDays }) => {
    try {
      const engine = new AnalyticsEngine();
      const results = await engine.calculateForRestaurant(restaurantId, periodDays);
      
      return JSON.stringify({
        success: true,
        itemsAnalyzed: results.length,
        summary: {
          stars: results.filter(r => r.bcgQuadrant === 'star').length,
          cashCows: results.filter(r => r.bcgQuadrant === 'cash_cow').length,
          questionMarks: results.filter(r => r.bcgQuadrant === 'question_mark').length,
          dogs: results.filter(r => r.bcgQuadrant === 'dog').length,
        },
        topPerformers: results.slice(0, 5).map(r => ({
          menuItemId: r.menuItemId,
          revenue: r.totalRevenue,
          bcgQuadrant: r.bcgQuadrant,
        })),
        underperformers: results.slice(-5).map(r => ({
          menuItemId: r.menuItemId,
          revenue: r.totalRevenue,
          bcgQuadrant: r.bcgQuadrant,
        })),
      });
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
});

const queryDataTool = new DynamicStructuredTool({
  name: "query_data",
  description: "Query specific menu items, orders, or get detailed information. Use this when you need specific data about items.",
  schema: z.object({
    restaurantId: z.number(),
    query: z.string().describe("What to query: 'menu_items', 'top_revenue_items', 'low_performing_items'"),
    limit: z.number().optional().default(10),
  }),
  func: async ({ restaurantId, query, limit }) => {
    try {
      if (query === 'menu_items') {
        const items = await db.select()
          .from(menuItems)
          .where(eq(menuItems.restaurantId, restaurantId))
          .limit(limit);
        return JSON.stringify({ success: true, items });
      }
      
      if (query === 'top_revenue_items') {
        // Query top revenue items from order_items
        const items = await db
          .select({
            menuItemId: orderItems.menuItemId,
            totalRevenue: sql`SUM(${orderItems.price} * ${orderItems.quantity})`,
          })
          .from(orderItems)
          .where(eq(orderItems.restaurantId, restaurantId))
          .groupBy(orderItems.menuItemId)
          .orderBy(sql`SUM(${orderItems.price} * ${orderItems.quantity}) DESC`)
          .limit(limit);
        
        return JSON.stringify({ success: true, items });
      }
      
      return JSON.stringify({ success: false, error: 'Unknown query type' });
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
});

const generateLayoutTool = new DynamicStructuredTool({
  name: "generate_layout",
  description: "Generates an optimal menu layout based on a strategy (star_focused, cash_cow_optimizer, experimental, minimalist_optimal). Use this after analyzing the menu.",
  schema: z.object({
    restaurantId: z.number(),
    strategy: z.enum(['star_focused', 'cash_cow_optimizer', 'experimental', 'minimalist_optimal']),
  }),
  func: async ({ restaurantId, strategy }) => {
    try {
      // Fetch analytics data
      const analyticsData = await db
        .select()
        .from(analytics)
        .where(eq(analytics.restaurantId, restaurantId));
      
      // Generate layout based on strategy
      const layoutConfig = generateLayoutFromStrategy(strategy, analyticsData);
      
      // Store layout
      const [savedLayout] = await db.insert(layouts).values({
        restaurantId,
        name: `${strategy} Layout`,
        strategy,
        config: layoutConfig,
        aiGenerated: true,
      }).returning();
      
      return JSON.stringify({
        success: true,
        layoutId: savedLayout.id,
        strategy,
        itemCount: layoutConfig.sections.reduce((sum: number, s: any) => sum + s.items.length, 0),
      });
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
});

const optimizeItemsTool = new DynamicStructuredTool({
  name: "optimize_items",
  description: "Provides specific optimization recommendations for menu items (pricing, positioning, description improvements).",
  schema: z.object({
    restaurantId: z.number(),
    itemIds: z.array(z.number()).describe("Array of menu item IDs to optimize"),
  }),
  func: async ({ restaurantId, itemIds }) => {
    try {
      const recommendations = [];
      
      for (const itemId of itemIds) {
        const [item] = await db.select().from(menuItems).where(eq(menuItems.id, itemId));
        const [itemAnalytics] = await db.select()
          .from(analytics)
          .where(eq(analytics.menuItemId, itemId));
        
        if (!item || !itemAnalytics) continue;
        
        const rec: any = { itemId, itemName: item.name, suggestions: [] };
        
        // Pricing optimization
        if (itemAnalytics.bcgQuadrant === 'star' && parseFloat(item.price) < 15) {
          rec.suggestions.push({
            type: 'pricing',
            action: 'increase_price',
            reason: 'High-performing star item can support premium pricing',
            suggestedPrice: (parseFloat(item.price) * 1.15).toFixed(2),
          });
        }
        
        // Positioning
        if (itemAnalytics.bcgQuadrant === 'question_mark') {
          rec.suggestions.push({
            type: 'positioning',
            action: 'feature_prominently',
            reason: 'Has growth potential, needs more visibility',
          });
        }
        
        // Description
        if (!item.description || item.description.length < 20) {
          rec.suggestions.push({
            type: 'description',
            action: 'add_detailed_description',
            reason: 'Better descriptions increase conversion rates',
          });
        }
        
        recommendations.push(rec);
      }
      
      return JSON.stringify({ success: true, recommendations });
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
});

const calculateImpactTool = new DynamicStructuredTool({
  name: "calculate_impact",
  description: "Projects the revenue impact of proposed menu changes or layout optimizations.",
  schema: z.object({
    restaurantId: z.number(),
    changes: z.array(z.object({
      type: z.enum(['remove_item', 'price_increase', 'reposition', 'feature']),
      itemId: z.number(),
      value: z.any().optional(),
    })),
  }),
  func: async ({ restaurantId, changes }) => {
    try {
      let projectedIncrease = 0;
      const breakdown = [];
      
      for (const change of changes) {
        const [itemAnalytics] = await db.select()
          .from(analytics)
          .where(eq(analytics.menuItemId, change.itemId));
        
        if (!itemAnalytics) continue;
        
        if (change.type === 'price_increase') {
          const currentRevenue = parseFloat(itemAnalytics.totalRevenue);
          const priceIncrease = 0.10; // 10% increase assumption
          const demandElasticity = -0.5; // -50% demand for 100% price increase
          const revenueChange = currentRevenue * (priceIncrease + demandElasticity * priceIncrease);
          projectedIncrease += revenueChange;
          breakdown.push({ itemId: change.itemId, type: 'price_increase', impact: revenueChange });
        }
        
        if (change.type === 'feature') {
          const currentRevenue = parseFloat(itemAnalytics.totalRevenue);
          const visibilityBoost = 0.20; // 20% increase from featuring
          const revenueChange = currentRevenue * visibilityBoost;
          projectedIncrease += revenueChange;
          breakdown.push({ itemId: change.itemId, type: 'feature', impact: revenueChange });
        }
        
        if (change.type === 'remove_item' && itemAnalytics.bcgQuadrant === 'dog') {
          // Removing dogs has minimal revenue impact but reduces complexity
          breakdown.push({ itemId: change.itemId, type: 'remove_item', impact: 0, benefit: 'reduced_complexity' });
        }
      }
      
      return JSON.stringify({
        success: true,
        projectedIncrease: projectedIncrease.toFixed(2),
        projectedIncreasePercent: ((projectedIncrease / 10000) * 100).toFixed(2), // Assuming $10k baseline
        confidence: 0.75,
        breakdown,
      });
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
});

// ============================================
// Agent Nodes
// ============================================

const tools = [
  analyzeMenuTool,
  queryDataTool,
  generateLayoutTool,
  optimizeItemsTool,
  calculateImpactTool,
];

async function reasoningNode(state: AgentState): Promise<Partial<AgentState>> {
  const model = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.7,
  });

  const lastMessage = state.messages[state.messages.length - 1];
  
  const systemPrompt = `You are a menu optimization expert using the ReAct (Reasoning + Acting) framework.

You have access to these tools:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Current context:
- Restaurant ID: ${state.restaurantId}
- Previous reasoning steps: ${state.reasoning.length}
- Tool results available: ${state.toolResults.length}

Think step-by-step using this format:
1. THOUGHT: What do I need to know?
2. ACTION: Which tool should I use?
3. OBSERVATION: What did the tool return?
4. REPEAT or ANSWER: Do I need more info, or can I answer now?

User question: ${lastMessage.content}

Respond with your reasoning and next action in JSON:
{
  "thought": "string",
  "action": { "tool": "tool_name", "params": {...} } | null,
  "ready_to_answer": boolean
}
`;

  const response = await model.invoke([
    { role: 'system', content: systemPrompt },
    ...state.messages,
  ]);

  let reasoning = '';
  let nextAction = null;
  let readyToAnswer = false;

  try {
    const parsed = JSON.parse(response.content as string);
    reasoning = parsed.thought;
    nextAction = parsed.action;
    readyToAnswer = parsed.ready_to_answer;
  } catch {
    reasoning = response.content as string;
  }

  return {
    reasoning: [...state.reasoning, reasoning],
    nextAction,
    finalAnswer: readyToAnswer ? reasoning : null,
  };
}

async function actionNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.nextAction) {
    return {};
  }

  const tool = tools.find(t => t.name === state.nextAction!.tool);
  
  if (!tool) {
    return {
      toolResults: [...state.toolResults, { error: 'Tool not found' }],
    };
  }

  try {
    const result = await tool.func(state.nextAction.params);
    const parsed = JSON.parse(result);
    
    return {
      toolResults: [...state.toolResults, { tool: tool.name, result: parsed }],
      messages: [...state.messages, new AIMessage(`Used ${tool.name}: ${result}`)],
    };
  } catch (error: any) {
    return {
      toolResults: [...state.toolResults, { tool: tool.name, error: error.message }],
    };
  }
}

function shouldContinue(state: AgentState): string {
  // Max 5 reasoning steps to prevent infinite loops
  if (state.reasoning.length >= 5) {
    return END;
  }
  
  // If agent has final answer, end
  if (state.finalAnswer) {
    return END;
  }
  
  // If next action is null, end (agent decided it has enough info)
  if (!state.nextAction) {
    return END;
  }
  
  // Otherwise continue the loop
  return "action";
}

// ============================================
// Build Agent Graph
// ============================================

const workflow = new StateGraph<AgentState>({
  channels: {
    messages: { value: (prev, next) => [...prev, ...next] },
    restaurantId: { value: (prev, next) => next ?? prev },
    reasoning: { value: (prev, next) => [...prev, ...next] },
    toolResults: { value: (prev, next) => [...prev, ...next] },
    nextAction: { value: (prev, next) => next },
    finalAnswer: { value: (prev, next) => next ?? prev },
  },
});

workflow.addNode("reasoning", reasoningNode);
workflow.addNode("action", actionNode);

workflow.addEdge(START, "reasoning");
workflow.addConditionalEdges("reasoning", shouldContinue, {
  "action": "action",
  [END]: END,
});
workflow.addEdge("action", "reasoning");

export const menuOptimizerAgent = workflow.compile();

// ============================================
// Helper: Run Agent
// ============================================

export async function runAgent(userMessage: string, restaurantId: number) {
  const initialState: AgentState = {
    messages: [new HumanMessage(userMessage)],
    restaurantId,
    reasoning: [],
    toolResults: [],
    nextAction: null,
    finalAnswer: null,
  };

  const result = await menuOptimizerAgent.invoke(initialState);
  
  return {
    answer: result.finalAnswer || "I couldn't determine an answer.",
    reasoning: result.reasoning,
    toolResults: result.toolResults,
  };
}
```

---

## Visual Editor Store (Zustand)

```typescript name=src/lib/store/editor-store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface EditorElement {
  id: string;
  type: 'menu_item' | 'text' | 'section' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;
  };
  data: any;
  locked: boolean;
}

interface EditorState {
  elements: EditorElement[];
  selectedId: string | null;
  history: EditorElement[][];
  historyIndex: number;
  zoom: number;
  
  // Actions
  addElement: (element: EditorElement) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  moveElement: (id: string, delta: { x: number; y: number }) => void;
  resizeElement: (id: string, size: { width: number; height: number }) => void;
  undo: () => void;
  redo: () => void;
  setZoom: (zoom: number) => void;
  applyAILayout: (layoutConfig: any) => void;
  clearCanvas: () => void;
}

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    elements: [],
    selectedId: null,
    history: [[]],
    historyIndex: 0,
    zoom: 100,

    addElement: (element) => set((state) => {
      state.elements.push(element);
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push([...state.elements]);
      state.historyIndex++;
    }),

    updateElement: (id, updates) => set((state) => {
      const index = state.elements.findIndex(el => el.id === id);
      if (index !== -1) {
        state.elements[index] = { ...state.elements[index], ...updates };
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push([...state.elements]);
        state.historyIndex++;
      }
    }),

    deleteElement: (id) => set((state) => {
      state.elements = state.elements.filter(el => el.id !== id);
      if (state.selectedId === id) state.selectedId = null;
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push([...state.elements]);
      state.historyIndex++;
    }),

    selectElement: (id) => set((state) => {
      state.selectedId = id;
    }),

    moveElement: (id, delta) => set((state) => {
      const element = state.elements.find(el => el.id === id);
      if (element) {
        element.position.x += delta.x;
        element.position.y += delta.y;
      }
    }),

    resizeElement: (id, size) => set((state) => {
      const element = state.elements.find(el => el.id === id);
      if (element) {
        element.size = size;
      }
    }),

    undo: () => set((state) => {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        state.elements = [...state.history[state.historyIndex]];
      }
    }),

    redo: () => set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        state.elements = [...state.history[state.historyIndex]];
      }
    }),

    setZoom: (zoom) => set((state) => {
      state.zoom = zoom;
    }),

    applyAILayout: (layoutConfig) => set((state) => {
      // Clear existing elements
      state.elements = [];
      
      // Apply layout from AI config
      layoutConfig.sections.forEach((section: any, sectionIndex: number) => {
        section.items.forEach((item: any, itemIndex: number) => {
          const element: EditorElement = {
            id: `item-${item.id}-${Date.now()}`,
            type: 'menu_item',
            position: {
              x: 50 + (itemIndex % 2) * 350,
              y: 50 + sectionIndex * 200 + Math.floor(itemIndex / 2) * 150,
            },
            size: {
              width: item.size === 'large' ? 300 : item.size === 'medium' ? 250 : 200,
              height: item.size === 'large' ? 150 : item.size === 'medium' ? 120 : 100,
            },
            style: {
              backgroundColor: item.highlight ? '#fef3c7' : '#ffffff',
              borderRadius: 8,
              padding: 16,
            },
            data: item,
            locked: false,
          };
          state.elements.push(element);
        });
      });
      
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push([...state.elements]);
      state.historyIndex++;
    }),

    clearCanvas: () => set((state) => {
      state.elements = [];
      state.selectedId = null;
    }),
  }))
);
```

---

## API Routes

```typescript name=src/app/api/agent/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/agents/menu-optimizer-agent';
import { AuthService } from '@/lib/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const userId = await AuthService.getUserFromRequest(req);
    const { message, restaurantId } = await req.json();
    
    if (!message || !restaurantId) {
      return NextResponse.json({ error: 'Missing message or restaurantId' }, { status: 400 });
    }
    
    const result = await runAgent(message, restaurantId);
    
    return NextResponse.json({
      success: true,
      response: result.answer,
      reasoning: result.reasoning,
      toolResults: result.toolResults,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

```typescript name=src/app/api/editor/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { layouts } from '@/lib/db/schema';
import { AuthService } from '@/lib/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const userId = await AuthService.getUserFromRequest(req);
    const { restaurantId, name, elements } = await req.json();
    
    // Convert editor elements to layout config
    const layoutConfig = {
      sections: [{
        name: 'Main Menu',
        items: elements.map((el: any) => ({
          id: el.data.id,
          position: el.position,
          size: el.size,
          style: el.style,
        })),
      }],
      principles: ['User-designed layout'],
      expectedImpact: 'Custom layout',
    };
    
    const [savedLayout] = await db.insert(layouts).values({
      restaurantId,
      name: name || 'Custom Layout',
      strategy: 'custom',
      config: layoutConfig,
      aiGenerated: false,
    }).returning();
    
    return NextResponse.json({ success: true, layoutId: savedLayout.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

**Document Owner:** abdullah-axI  
**Last Updated:** 2026-02-05  
**Status:** UPDATED WITH REACT AGENT + DND EDITOR