# 48-Hour Implementation Plan v2
## ReAct Agent + Visual Editor Edition

**Key Changes:**
- Hours 12-16: Build LangGraph ReAct agent with tools
- Hours 16-20: Build v0-style visual editor with drag-drop
- Hours 20-22: Integrate agent with editor

---

## DAY 1: Foundation (0-12 hours)

### HOURS 0-6: Same as before
- Project setup
- Database
- Authentication
- Restaurant profiles
- Data import

### HOURS 6-10: Analytics (Same as before)
- Analytics engine
- BCG calculations
- Dashboard UI

### HOURS 10-12: Basic AI Setup
- Install LangGraph dependencies
- Test OpenAI connection
- Create basic agent structure

---

## DAY 2: ReAct Agent + Visual Editor (12-24 hours)

### HOURS 12-14: ReAct Agent Tools

**Step 1:** Install LangGraph
```bash
npm install @langchain/langgraph
```

**Step 2:** Create tool definitions
```bash
touch src/lib/agents/menu-optimizer-agent.ts
touch src/lib/agents/tools.ts
```

**Step 3:** Implement each tool
- [ ] `analyzeMenuTool` - Call AnalyticsEngine
- [ ] `queryDataTool` - Query database
- [ ] `generateLayoutTool` - Generate layouts
- [ ] `optimizeItemsTool` - Suggest improvements
- [ ] `calculateImpactTool` - Project revenue

**Step 4:** Test tools individually
```typescript
// Test file
const result = await analyzeMenuTool.func({ restaurantId: 1, periodDays: 90 });
console.log(JSON.parse(result));
```

**Verify:**
- [ ] All 5 tools execute successfully
- [ ] Tools return proper JSON
- [ ] Error handling works

---

### HOURS 14-16: ReAct Agent Graph

**Step 1:** Create state graph
```typescript
const workflow = new StateGraph<AgentState>({...});
workflow.addNode("reasoning", reasoningNode);
workflow.addNode("action", actionNode);
workflow.addConditionalEdges("reasoning", shouldContinue);
```

**Step 2:** Implement reasoning node
- [ ] Call GPT-4 with tools context
- [ ] Parse tool selection from response
- [ ] Update state with reasoning

**Step 3:** Implement action node
- [ ] Execute selected tool
- [ ] Store tool results
- [ ] Add to message history

**Step 4:** Test agent flow
```typescript
const result = await runAgent("What items should I remove?", 1);
console.log(result.reasoning);
console.log(result.answer);
```

**Verify:**
- [ ] Agent completes reasoning loop
- [ ] Tools are called automatically
- [ ] Final answer is coherent
- [ ] Reasoning steps visible

---

### HOURS 16-18: Visual Editor Foundation

**Step 1:** Install dependencies
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities zustand immer
```

**Step 2:** Create editor store
```bash
touch src/lib/store/editor-store.ts
```

**Step 3:** Create editor components
```bash
mkdir -p src/components/editor
touch src/components/editor/MenuEditor.tsx
touch src/components/editor/EditorCanvas.tsx
touch src/components/editor/EditorSidebar.tsx
touch src/components/editor/PropertiesPanel.tsx
touch src/components/editor/EditorToolbar.tsx
```

**Step 4:** Build canvas component
```typescript
<DndContext onDragEnd={handleDragEnd}>
  <div className="canvas" style={{ transform: `scale(${zoom/100})` }}>
    {elements.map(el => (
      <DraggableElement key={el.id} element={el} />
    ))}
  </div>
</DndContext>
```

**Verify:**
- [ ] Canvas renders
- [ ] Zustand store works
- [ ] Can add elements programmatically

---

### HOURS 18-20: Drag-Drop + Editing

**Step 1:** Implement drag from sidebar
```typescript
function EditorSidebar() {
  const { sensors } = useDndContext();
  
  return (
    <div>
      {menuItems.map(item => (
        <DraggableMenuItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

**Step 2:** Implement drop on canvas
```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, delta } = event;
  
  if (active.data.current?.type === 'new_item') {
    // Add new element to canvas
    addElement(createElementFromItem(active.data.current.item));
  } else {
    // Move existing element
    moveElement(active.id, delta);
  }
}
```

**Step 3:** Add inline editing
```typescript
function DraggableElement({ element }: any) {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <div onDoubleClick={() => setIsEditing(true)}>
      {isEditing ? (
        <input 
          value={element.data.name}
          onChange={(e) => updateElement(element.id, { data: { ...element.data, name: e.target.value }})}
          onBlur={() => setIsEditing(false)}
        />
      ) : (
        <span>{element.data.name}</span>
      )}
    </div>
  );
}
```

**Step 4:** Add resize handles
```typescript
function ResizeHandles({ onResize }: any) {
  return (
    <>
      <div className="resize-handle top-left" onMouseDown={(e) => startResize(e, 'tl')} />
      <div className="resize-handle top-right" onMouseDown={(e) => startResize(e, 'tr')} />
      {/* ... 6 more handles */}
    </>
  );
}
```

**Verify:**
- [ ] Can drag items from sidebar to canvas
- [ ] Can move items on canvas
- [ ] Can double-click to edit text
- [ ] Can resize with handles
- [ ] Undo/redo works

---

### HOURS 20-22: Agent + Editor Integration

**Step 1:** Create agent chat UI
```bash
touch src/components/editor/AIAgentChat.tsx
```

**Step 2:** Embed in editor
```typescript
<div className="editor-layout">
  <EditorCanvas />
  <AIAgentChat 
    onLayoutSuggestion={(config) => applyAILayout(config)}
  />
</div>
```

**Step 3:** Connect agent to editor actions
```typescript
function AIAgentChat() {
  const [message, setMessage] = useState('');
  const applyAILayout = useEditorStore(s => s.applyAILayout);
  
  const askAgent = async () => {
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, restaurantId: 1 }),
    });
    
    const data = await response.json();
    
    // If agent generated a layout, apply it
    if (data.toolResults.some((r: any) => r.tool === 'generate_layout')) {
      const layoutResult = data.toolResults.find((r: any) => r.tool === 'generate_layout');
      applyAILayout(layoutResult.result);
    }
  };
  
  return (
    <div className="ai-chat">
      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={askAgent}>Ask AI</button>
    </div>
  );
}
```

**Step 4:** Add "Apply AI Layout" button
```typescript
<button onClick={async () => {
  const response = await fetch('/api/ai/generate-layout', {
    method: 'POST',
    body: JSON.stringify({ restaurantId: 1, strategy: 'star_focused' }),
  });
  const data = await response.json();
  applyAILayout(data.config);
}}>
  Apply AI Layout
</button>
```

**Verify:**
- [ ] Chat interface visible
- [ ] Can ask agent questions
- [ ] Agent uses tools correctly
- [ ] Layout suggestions apply to editor
- [ ] Smooth animations

---

### HOURS 22-24: Polish + Deploy

**Step 1:** Add keyboard shortcuts
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z') undo();
    if (e.ctrlKey && e.key === 'y') redo();
    if (e.key === 'Delete') deleteElement(selectedId);
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

**Step 2:** Add tooltips and hints
```typescript
<Tooltip content="Drag items here to add to menu">
  <div className="canvas-placeholder">
    Drop items here
  </div>
</Tooltip>
```

**Step 3:** Test complete flow
1. Login
2. Upload data
3. View analytics
4. Ask agent "What should I optimize?"
5. Agent reasons and suggests
6. Open editor
7. Drag items onto canvas
8. Ask agent "Generate optimal layout"
9. Agent creates layout and applies it
10. Edit items directly
11. Save layout

**Step 4:** Deploy
- Push to GitHub
- Deploy to Vercel
- Test production

---

## Updated Demo Script (6 min)

**[30s] Introduction**
- "Menu AI Optimizer with ReAct agent and visual editor"

**[60s] Data & Analytics**
- Upload CSVs
- Show BCG matrix
- Explain metrics

**[90s] AI Agent Demo**
- Type: "What items should I remove?"
- Show agent reasoning steps
- Agent uses analyze_menu tool
- Agent provides answer with data

**[90s] Visual Editor**
- Open editor
- Drag items onto canvas
- Double-click to edit
- Resize items

**[60s] AI + Editor Integration**
- Ask agent: "Generate optimal layout"
- Watch agent reason and create layout
- Click "Apply" → Smooth animation applies layout
- Show projected impact

**[30s] Wrap-up**
- Export layout
- Show next steps

---

## Critical Path (Cannot Skip)

1. ✅ Database + Auth (Hours 0-4)
2. ✅ Data import (Hours 6-8)
3. ✅ Analytics engine (Hours 8-10)
4. ✅ Analytics dashboard (Hours 10-12)
5. ✅ ReAct agent with tools (Hours 12-16)
6. ✅ Visual editor drag-drop (Hours 16-20)
7. ✅ Agent + Editor integration (Hours 20-22)
8. ✅ Deploy (Hours 22-24)

---

## Features to Cut if Behind

1. ❌ Resize handles (just use fixed sizes)
2. ❌ Inline editing (edit in properties panel only)
3. ❌ Undo/redo (nice-to-have)
4. ❌ Mobile preview
5. ❌ Export to image
6. ❌ Voice feedback
7. ❌ Gamification
8. ❌ Multiple layout versions

---

## Testing Checklist

### ReAct Agent
- [ ] All 5 tools execute
- [ ] Agent completes reasoning loop
- [ ] Final answer makes sense
- [ ] Tool results visible in UI
- [ ] Error handling works

### Visual Editor
- [ ] Drag from sidebar works
- [ ] Drop on canvas works
- [ ] Items moveable
- [ ] Items selectable
- [ ] Properties panel updates
- [ ] Canvas zoomable
- [ ] Save/load works

### Integration
- [ ] Agent suggestions apply to editor
- [ ] Layout generation works
- [ ] Smooth animations
- [ ] Chat UI functional
- [ ] Reasoning steps visible

---

**You're ready to build! Start with Hour 0 immediately.** 🚀

**Document Owner:** abdullah-axI  
**Last Updated:** 2026-02-05  
**Status:** FINAL - REACT AGENT + V0 EDITOR EDITION