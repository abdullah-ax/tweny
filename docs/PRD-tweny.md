# Product Requirements Document (PRD) v2
## tweny AI - ReAct Agent + Visual Editor Edition

**Version:** 2.0  
**Timeline:** 48 hours  
**Key Updates:** LangGraph ReAct Agent + V0-style Visual Menu Editor

---

## Executive Summary

**Product Name:** tweny AI  
**Tagline:** "AI agent-powered menu optimization with visual no-code editor"  

**Core Value Proposition:**  
Transform restaurant menus using a ReAct AI agent that reasons through data, combined with a v0-style visual editor that lets non-technical users design optimal menu layouts through drag-and-drop.

**Key Differentiators:**
- 🤖 **ReAct AI Agent:** Multi-tool agent that reasons, analyzes data, and generates strategies
- 🎨 **Visual Editor:** No-code, v0-style menu builder (drag, drop, edit)
- 📊 **Real-time Analytics:** Live BCG matrix + menu engineering metrics
- 🎯 **Strategic Frameworks:** BCG, Menu Engineering, Adjacency Analysis

---

## Updated Technical Architecture

### ReAct Agent System

```
┌─────────────────────────────────────────────────────────┐
│              LangGraph ReAct Agent                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Agent State Management                  │  │
│  │  • menuData    • analyticsResults                │  │
│  │  • userIntent  • generatedLayouts                │  │
│  │  • reasoning   • currentStep                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                Agent Tools                        │  │
│  │  1. AnalyzeMenuTool      - Calculate BCG/metrics │  │
│  │  2. QueryDataTool        - Fetch menu/order data │  │
│  │  3. GenerateLayoutTool   - Create layout configs │  │
│  │  4. OptimizeItemsTool    - Suggest improvements  │  │
│  │  5. CalculateImpactTool  - Project revenue gains │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Agent Workflow (ReAct Loop)             │  │
│  │  1. Reason  → Think about what to do next       │  │
│  │  2. Act     → Use a tool                         │  │
│  │  3. Observe → Get tool results                   │  │
│  │  4. Repeat  → Until task complete                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│            V0-Style Visual Menu Editor                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Canvas (Menu Preview)                     │  │
│  │  • Drag-drop item positioning                    │  │
│  │  • Real-time visual feedback                     │  │
│  │  • WYSIWYG editing                               │  │
│  │  • Grid/freeform layouts                         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Sidebar (Components Library)              │  │
│  │  • Menu items (draggable)                        │  │
│  │  • Text elements                                 │  │
│  │  • Images/badges                                 │  │
│  │  • Categories/sections                           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Properties Panel                          │  │
│  │  • Item styling (size, color, font)              │  │
│  │  • Position controls                             │  │
│  │  • BCG badge toggle                              │  │
│  │  • Highlight/feature toggle                      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Updated User Stories

### Epic 6: ReAct AI Agent (NEW)
- ✅ As a user, I can chat with an AI agent that understands my menu
- ✅ As a user, I can ask "What items should I promote?" and get reasoned answers
- ✅ As a user, I can see the agent's reasoning steps in real-time
- ✅ As a user, the agent can automatically fetch data and calculate metrics
- ✅ As a user, I can ask follow-up questions and have context maintained
- ✅ As a user, I can see which tools the agent is using

### Epic 7: Visual Menu Editor (NEW)
- ✅ As a user, I can drag menu items onto a canvas
- ✅ As a user, I can resize and reposition items visually
- ✅ As a user, I can edit text directly on the canvas (WYSIWYG)
- ✅ As a user, I can apply AI-generated layouts with one click
- ✅ As a user, I can see BCG badges on items in the editor
- ✅ As a user, I can undo/redo changes
- ✅ As a user, I can preview mobile vs desktop layouts
- ✅ As a user, I can export the layout as HTML/image
- ✅ As a user, I can save multiple versions
- ✅ As a user, I can duplicate and modify AI layouts

---

## Functional Requirements Updates

### FR9: ReAct Agent System

**Agent Architecture:**
```typescript
interface AgentState {
  messages: Message[];          // Conversation history
  menuData: MenuItem[];         // Current menu items
  analyticsData: Analytics[];   // Calculated metrics
  userIntent: string;           // What user wants to achieve
  reasoning: string[];          // Agent's thought process
  toolResults: any[];          // Results from tool calls
  finalAnswer: string;         // Agent's conclusion
  nextStep: string;            // What to do next
}

interface AgentTool {
  name: string;
  description: string;
  schema: ZodSchema;
  execute: (input: any) => Promise<any>;
}
```

**Available Tools:**

1. **AnalyzeMenuTool**
   - Description: "Calculates BCG matrix, menu engineering metrics, and conversion rates for menu items"
   - Input: `{ restaurantId: number, periodDays?: number }`
   - Output: `{ items: AnalyticsResult[], summary: Summary }`

2. **QueryDataTool**
   - Description: "Queries menu items, orders, or events data from the database"
   - Input: `{ query: string, filters?: object }`
   - Output: `{ results: any[] }`

3. **GenerateLayoutTool**
   - Description: "Generates a menu layout configuration based on strategy and analytics"
   - Input: `{ strategy: string, menuItems: any[], analyticsData: any[] }`
   - Output: `{ layoutConfig: LayoutConfig }`

4. **OptimizeItemsTool**
   - Description: "Suggests specific optimizations for menu items (pricing, position, description)"
   - Input: `{ itemIds: number[], optimizationType: string }`
   - Output: `{ recommendations: Recommendation[] }`

5. **CalculateImpactTool**
   - Description: "Projects revenue impact of proposed changes"
   - Input: `{ currentLayout: Layout, proposedLayout: Layout }`
   - Output: `{ projectedIncrease: number, confidence: number }`

**Agent Workflow:**
```
User: "What items should I remove from my menu?"

Agent Reasoning:
1. "I need to first understand the current menu performance"
   → USE AnalyzeMenuTool(restaurantId: 1)
   → OBSERVE: 23 items, 4 are "dogs" with low revenue and margin

2. "Let me get detailed data on the underperforming items"
   → USE QueryDataTool(query: "items in dog quadrant")
   → OBSERVE: Items #5, #12, #18, #23 have consistently low orders

3. "I should calculate the impact of removing these items"
   → USE CalculateImpactTool(removing: [5,12,18,23])
   → OBSERVE: Removing would reduce decision fatigue, minimal revenue loss

4. "Now I have enough information to answer"
   → FINAL ANSWER: "I recommend removing 4 items: [list]. Here's why..."
```

### FR10: Visual Menu Editor

**Editor Components:**

1. **Canvas (Main Editing Area)**
   ```typescript
   interface EditorCanvas {
     layout: 'grid' | 'freeform';
     dimensions: { width: number; height: number };
     zoom: number;
     elements: EditorElement[];
     guidelines: boolean;
     snapToGrid: boolean;
   }
   
   interface EditorElement {
     id: string;
     type: 'menu_item' | 'text' | 'image' | 'section';
     position: { x: number; y: number };
     size: { width: number; height: number };
     style: CSSProperties;
     data: any;
     locked: boolean;
   }
   ```

2. **Components Sidebar**
   - Menu Items Library (searchable, filterable by BCG quadrant)
   - Text Blocks (headings, descriptions)
   - Visual Elements (dividers, icons, badges)
   - Categories/Sections
   - Drag any component to canvas

3. **Properties Panel**
   - Typography (font, size, weight, color)
   - Spacing (padding, margin)
   - Background (color, image)
   - Border (style, radius, color)
   - Effects (shadow, opacity)
   - BCG Badge (toggle on/off, style)
   - Priority Level (featured/standard/minimal)

4. **Top Toolbar**
   - Undo/Redo
   - Zoom controls
   - Layout mode (Grid/Freeform)
   - Preview mode (Desktop/Tablet/Mobile)
   - AI Suggestions (quick access to agent)
   - Save/Publish

**Editing Interactions:**

```typescript
// Drag and Drop
onDragStart: (item: MenuItem) => void
onDrop: (item: MenuItem, position: Position) => void

// Direct Editing
onClick: (element: EditorElement) => setSelected(element)
onDoubleClick: (element: EditorElement) => enableInlineEdit(element)

// Keyboard Shortcuts
Ctrl+Z: undo
Ctrl+Y: redo
Ctrl+D: duplicate selected
Delete: remove selected
Arrow Keys: move selected element
Ctrl+Arrow: resize selected element

// Context Menu
Right-click element → [Duplicate, Delete, Lock, Bring to Front, Send to Back]
```

**AI-Powered Features:**

1. **Auto-Layout**
   - Click "Apply AI Layout"
   - Agent generates optimal positioning
   - Smooth animation applies changes

2. **Smart Suggestions**
   - Hover over item → See AI recommendations
   - "This item could perform better if moved to top-right"
   - "Consider making this item larger - it's a Star"

3. **One-Click Optimization**
   - "Optimize for Revenue"
   - "Optimize for Margin"
   - "Reduce Decision Fatigue"
   - Agent rearranges entire menu automatically

---

## UI/UX Requirements (Updated)

### Visual Editor Interface

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Top Bar: Undo Redo | Zoom | Preview | AI Chat | Save      │
├───────┬─────────────────────────────────────┬───────────────┤
│       │                                     │               │
│ Left  │           Canvas                    │   Right       │
│ Side  │     (Menu Preview/Editor)           │   Panel       │
│ bar   │                                     │ (Properties)  │
│       │  [Draggable Menu Items]             │               │
│ Menu  │  [Editable Text]                    │ - Size        │
│ Items │  [Visual Elements]                  │ - Color       │
│ List  │                                     │ - Style       │
│       │  Grid lines (toggleable)            │ - Position    │
│       │  Snap to grid                       │ - BCG Badge   │
│       │                                     │               │
├───────┴─────────────────────────────────────┴───────────────┤
│  Bottom Bar: AI Agent Chat (expandable)                     │
│  💬 "What should I optimize?" [Ask AI]                      │
└─────────────────────────────────────────────────────────────┘
```

**Interactions:**

1. **Drag from Sidebar**
   ```
   User drags "Margherita Pizza" from sidebar
   → Ghost preview follows cursor
   → Drop onto canvas
   → Item appears with default styling
   → Properties panel updates
   ```

2. **Inline Editing**
   ```
   Double-click item name
   → Text becomes editable
   → Type new name
   → Press Enter or click away to save
   ```

3. **Resize Handles**
   ```
   Select item
   → 8 resize handles appear
   → Drag corner = proportional resize
   → Drag edge = stretch
   → Hold Shift = maintain aspect ratio
   ```

4. **AI Integration**
   ```
   Click "AI Suggestions" on any item
   → Agent analyzes item performance
   → Shows tooltip: "Move to top - High margin Star ⭐"
   → Click suggestion → Auto-applies change
   ```

---

## Technical Implementation Details

### ReAct Agent with LangGraph

```typescript
// src/lib/agents/menu-optimizer-agent.ts

import { StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// Define agent state
interface AgentState {
  messages: any[];
  menuData: any[];
  analyticsData: any[];
  reasoning: string[];
  nextAction: string;
}

// Define tools
const analyzeMenuTool = new DynamicStructuredTool({
  name: "analyze_menu",
  description: "Calculates BCG matrix and menu engineering metrics for a restaurant",
  schema: z.object({
    restaurantId: z.number(),
    periodDays: z.number().optional().default(90),
  }),
  func: async ({ restaurantId, periodDays }) => {
    const engine = new AnalyticsEngine();
    const results = await engine.calculateForRestaurant(restaurantId, periodDays);
    return JSON.stringify(results);
  },
});

const queryDataTool = new DynamicStructuredTool({
  name: "query_data",
  description: "Queries menu items, orders, or events data",
  schema: z.object({
    restaurantId: z.number(),
    dataType: z.enum(['menu_items', 'orders', 'events']),
    filters: z.record(z.any()).optional(),
  }),
  func: async ({ restaurantId, dataType, filters }) => {
    // Query database based on dataType and filters
    const results = await queryDatabase(restaurantId, dataType, filters);
    return JSON.stringify(results);
  },
});

const generateLayoutTool = new DynamicStructuredTool({
  name: "generate_layout",
  description: "Generates a menu layout configuration based on strategy",
  schema: z.object({
    strategy: z.enum(['star_focused', 'cash_cow_optimizer', 'experimental', 'minimalist_optimal']),
    menuItems: z.array(z.any()),
    analyticsData: z.array(z.any()),
  }),
  func: async ({ strategy, menuItems, analyticsData }) => {
    const layoutService = new LayoutService();
    const layout = await layoutService.generate(strategy, menuItems, analyticsData);
    return JSON.stringify(layout);
  },
});

// Create agent graph
const workflow = new StateGraph({
  channels: {
    messages: null,
    reasoning: null,
    nextAction: null,
  }
});

// Define nodes
async function reasoningNode(state: AgentState) {
  const model = new ChatOpenAI({ modelName: "gpt-4" });
  
  const prompt = `
You are a menu optimization expert. Analyze the conversation and decide what to do next.

Current State:
- User Question: ${state.messages[state.messages.length - 1].content}
- Available Data: ${state.menuData.length} menu items, ${state.analyticsData.length} analytics records
- Tools Available: analyze_menu, query_data, generate_layout, calculate_impact

Think step-by-step:
1. What information do I need?
2. Which tool should I use?
3. What will I do with the results?

Respond with your reasoning and the next action.
`;

  const response = await model.invoke(prompt);
  
  return {
    ...state,
    reasoning: [...state.reasoning, response.content],
    nextAction: extractAction(response.content),
  };
}

async function actionNode(state: AgentState) {
  // Execute the tool based on nextAction
  const tool = selectTool(state.nextAction);
  const result = await tool.func(extractParams(state.nextAction));
  
  return {
    ...state,
    messages: [...state.messages, { role: 'tool', content: result }],
  };
}

function shouldContinue(state: AgentState) {
  // Check if agent has enough info to answer
  if (state.reasoning.length > 5 || state.nextAction === 'FINAL_ANSWER') {
    return END;
  }
  return "action";
}

// Build graph
workflow.addNode("reasoning", reasoningNode);
workflow.addNode("action", actionNode);
workflow.addEdge("reasoning", "action");
workflow.addConditionalEdges("action", shouldContinue, {
  "action": "reasoning",
  [END]: END,
});
workflow.setEntryPoint("reasoning");

export const agent = workflow.compile();
```

### Visual Editor Implementation

```typescript
// src/components/editor/MenuEditor.tsx

'use client';

import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { useState } from 'react';

interface EditorElement {
  id: string;
  type: 'menu_item' | 'text' | 'section';
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: any;
  data: any;
}

export function MenuEditor() {
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    
    setElements(prev => prev.map(el => {
      if (el.id === active.id) {
        return {
          ...el,
          position: {
            x: el.position.x + delta.x,
            y: el.position.y + delta.y,
          }
        };
      }
      return el;
    }));
  };

  const addMenuItem = (menuItem: any) => {
    const newElement: EditorElement = {
      id: `item-${Date.now()}`,
      type: 'menu_item',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 120 },
      style: getDefaultStyle(menuItem.bcgQuadrant),
      data: menuItem,
    };
    
    setElements([...elements, newElement]);
  };

  const updateElementStyle = (id: string, style: any) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, style: { ...el.style, ...style } } : el
    ));
  };

  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Components */}
      <EditorSidebar onAddItem={addMenuItem} />

      {/* Canvas */}
      <div className="flex-1 bg-gray-100 relative overflow-auto">
        <EditorToolbar zoom={zoom} setZoom={setZoom} />
        
        <DndContext onDragEnd={handleDragEnd}>
          <div 
            className="relative bg-white mx-auto my-8 shadow-lg"
            style={{ 
              width: 800, 
              height: 1200,
              transform: `scale(${zoom / 100})`,
            }}
          >
            {elements.map(element => (
              <DraggableElement
                key={element.id}
                element={element}
                selected={element.id === selectedId}
                onSelect={() => setSelectedId(element.id)}
                onUpdate={(updates) => updateElementStyle(element.id, updates)}
              />
            ))}
          </div>
        </DndContext>
      </div>

      {/* Right Panel - Properties */}
      <PropertiesPanel 
        element={elements.find(el => el.id === selectedId)}
        onChange={(style) => selectedId && updateElementStyle(selectedId, style)}
      />

      {/* Bottom - AI Agent Chat */}
      <AIAgentChat 
        onSuggestion={(suggestion) => applySuggestion(suggestion)}
      />
    </div>
  );
}

// Draggable Element Component
function DraggableElement({ element, selected, onSelect, onUpdate }: any) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      className={`absolute cursor-move ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        ...element.style,
      }}
      onClick={onSelect}
      onDoubleClick={() => setIsEditing(true)}
    >
      {element.type === 'menu_item' && (
        <MenuItemCard 
          item={element.data} 
          isEditing={isEditing}
          onEditComplete={() => setIsEditing(false)}
        />
      )}
      
      {selected && (
        <ResizeHandles 
          onResize={(newSize) => onUpdate({ size: newSize })}
        />
      )}
    </div>
  );
}

// AI Integration Component
function AIAgentChat({ onSuggestion }: any) {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<any[]>([]);
  const [thinking, setThinking] = useState(false);

  const askAgent = async () => {
    setThinking(true);
    
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation }),
    });
    
    const data = await response.json();
    
    setConversation([
      ...conversation,
      { role: 'user', content: message },
      { role: 'agent', content: data.response, reasoning: data.reasoning },
    ]);
    
    setThinking(false);
    setMessage('');
    
    if (data.suggestions) {
      onSuggestion(data.suggestions);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask AI: 'What items should I feature?'"
            className="flex-1 px-4 py-2 border rounded"
            onKeyPress={(e) => e.key === 'Enter' && askAgent()}
          />
          <button 
            onClick={askAgent}
            disabled={thinking}
            className="px-6 py-2 bg-blue-600 text-white rounded"
          >
            {thinking ? 'Thinking...' : 'Ask AI'}
          </button>
        </div>
        
        {thinking && (
          <div className="mt-2 text-sm text-gray-600">
            🤔 Agent is reasoning through your question...
          </div>
        )}
        
        {conversation.length > 0 && (
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {conversation.map((msg, i) => (
              <div key={i} className={`p-2 rounded ${msg.role === 'user' ? 'bg-blue-50' : 'bg-green-50'}`}>
                <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.content}
                {msg.reasoning && (
                  <details className="mt-1 text-xs text-gray-600">
                    <summary>View reasoning</summary>
                    {msg.reasoning.map((r: string, j: number) => (
                      <div key={j}>• {r}</div>
                    ))}
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Updated Success Criteria

### Must Have (Critical):
- ✅ ReAct agent with 5+ tools working
- ✅ Agent shows reasoning steps visibly
- ✅ Visual editor with drag-drop functional
- ✅ Inline editing on canvas works
- ✅ AI-generated layouts can be applied to editor
- ✅ Properties panel updates selected elements
- ✅ Can save and load editor state
- ✅ Agent chat interface embedded in editor

### Demo Flow (6 minutes):
1. **[30s]** Login → Upload data → Show analytics
2. **[60s]** Open AI Agent chat → Ask "What should I optimize?"
3. **[45s]** Agent reasons through data → Uses tools → Provides answer
4. **[90s]** Open visual editor → Drag items onto canvas
5. **[60s]** Click "Apply AI Layout" → Smooth animation applies optimal layout
6. **[30s]** Edit item directly → Show properties panel
7. **[15s]** Export layout → Show projected impact

---

**Document Owner:** abdullah-axI  
**Last Updated:** 2026-02-05  
**Status:** UPDATED FOR REACT AGENT + VISUAL EDITOR