import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type EditorElement = {
    id: string;
    type: "menu_item" | "text" | "section" | "image" | "badge" | "divider";
    position: { x: number; y: number };
    size: { width: number; height: number };
    rotation?: number;
    style?: {
        backgroundColor?: string;
        color?: string;
        fontSize?: number;
        fontWeight?: string;
        borderRadius?: number;
        padding?: number;
        opacity?: number;
    };
    data?: Record<string, unknown>;
    locked?: boolean;
};

export type HistoryEntry = {
    elements: EditorElement[];
    timestamp: number;
};

type EditorState = {
    // Canvas
    elements: EditorElement[];
    selectedId: string | null;
    zoom: number;
    showGrid: boolean;
    snapToGrid: boolean;
    gridSize: number;
    canvasSize: { width: number; height: number };

    // History (undo/redo)
    history: HistoryEntry[];
    historyIndex: number;

    // Actions
    addElement: (element: EditorElement) => void;
    updateElement: (id: string, updates: Partial<EditorElement>) => void;
    deleteElement: (id: string) => void;
    moveElement: (id: string, position: { x: number; y: number }) => void;
    resizeElement: (id: string, size: { width: number; height: number }) => void;
    selectElement: (id: string | null) => void;
    duplicateElement: (id: string) => void;
    bringToFront: (id: string) => void;
    sendToBack: (id: string) => void;

    // Canvas controls
    setZoom: (zoom: number) => void;
    toggleGrid: () => void;
    toggleSnap: () => void;
    setCanvasSize: (size: { width: number; height: number }) => void;

    // History
    undo: () => void;
    redo: () => void;
    saveHistory: () => void;

    // Bulk operations
    clear: () => void;
    loadElements: (elements: EditorElement[]) => void;
    getSelectedElement: () => EditorElement | null;
};

export const useEditorStore = create<EditorState>()(
    immer((set, get) => ({
        // Initial state
        elements: [],
        selectedId: null,
        zoom: 100,
        showGrid: true,
        snapToGrid: true,
        gridSize: 20,
        canvasSize: { width: 800, height: 1000 },
        history: [],
        historyIndex: -1,

        // Element management
        addElement: (element) =>
            set((state) => {
                state.elements.push(element);
                state.selectedId = element.id;
            }),

        updateElement: (id, updates) =>
            set((state) => {
                const index = state.elements.findIndex((el) => el.id === id);
                if (index !== -1) {
                    state.elements[index] = { ...state.elements[index], ...updates };
                }
            }),

        deleteElement: (id) =>
            set((state) => {
                state.elements = state.elements.filter((el) => el.id !== id);
                if (state.selectedId === id) {
                    state.selectedId = null;
                }
            }),

        moveElement: (id, position) =>
            set((state) => {
                const index = state.elements.findIndex((el) => el.id === id);
                if (index !== -1 && !state.elements[index].locked) {
                    const { snapToGrid, gridSize } = state;
                    let { x, y } = position;

                    if (snapToGrid) {
                        x = Math.round(x / gridSize) * gridSize;
                        y = Math.round(y / gridSize) * gridSize;
                    }

                    state.elements[index].position = { x, y };
                }
            }),

        resizeElement: (id, size) =>
            set((state) => {
                const index = state.elements.findIndex((el) => el.id === id);
                if (index !== -1 && !state.elements[index].locked) {
                    const { snapToGrid, gridSize } = state;
                    let { width, height } = size;

                    if (snapToGrid) {
                        width = Math.round(width / gridSize) * gridSize;
                        height = Math.round(height / gridSize) * gridSize;
                    }

                    state.elements[index].size = {
                        width: Math.max(40, width),
                        height: Math.max(40, height)
                    };
                }
            }),

        selectElement: (id) =>
            set((state) => {
                state.selectedId = id;
            }),

        duplicateElement: (id) =>
            set((state) => {
                const element = state.elements.find((el) => el.id === id);
                if (element) {
                    const newElement: EditorElement = {
                        ...element,
                        id: `${element.type}-${Date.now()}`,
                        position: {
                            x: element.position.x + 20,
                            y: element.position.y + 20,
                        },
                    };
                    state.elements.push(newElement);
                    state.selectedId = newElement.id;
                }
            }),

        bringToFront: (id) =>
            set((state) => {
                const index = state.elements.findIndex((el) => el.id === id);
                if (index !== -1 && index < state.elements.length - 1) {
                    const [element] = state.elements.splice(index, 1);
                    state.elements.push(element);
                }
            }),

        sendToBack: (id) =>
            set((state) => {
                const index = state.elements.findIndex((el) => el.id === id);
                if (index > 0) {
                    const [element] = state.elements.splice(index, 1);
                    state.elements.unshift(element);
                }
            }),

        // Canvas controls
        setZoom: (zoom) =>
            set((state) => {
                state.zoom = Math.min(200, Math.max(25, zoom));
            }),

        toggleGrid: () =>
            set((state) => {
                state.showGrid = !state.showGrid;
            }),

        toggleSnap: () =>
            set((state) => {
                state.snapToGrid = !state.snapToGrid;
            }),

        setCanvasSize: (size) =>
            set((state) => {
                state.canvasSize = size;
            }),

        // History
        saveHistory: () =>
            set((state) => {
                const entry: HistoryEntry = {
                    elements: JSON.parse(JSON.stringify(state.elements)),
                    timestamp: Date.now(),
                };

                // Remove any future history if we're not at the end
                state.history = state.history.slice(0, state.historyIndex + 1);
                state.history.push(entry);
                state.historyIndex = state.history.length - 1;

                // Keep only last 50 entries
                if (state.history.length > 50) {
                    state.history.shift();
                    state.historyIndex--;
                }
            }),

        undo: () =>
            set((state) => {
                if (state.historyIndex > 0) {
                    state.historyIndex--;
                    state.elements = JSON.parse(JSON.stringify(state.history[state.historyIndex].elements));
                    state.selectedId = null;
                }
            }),

        redo: () =>
            set((state) => {
                if (state.historyIndex < state.history.length - 1) {
                    state.historyIndex++;
                    state.elements = JSON.parse(JSON.stringify(state.history[state.historyIndex].elements));
                    state.selectedId = null;
                }
            }),

        // Bulk operations
        clear: () =>
            set((state) => {
                state.elements = [];
                state.selectedId = null;
            }),

        loadElements: (elements) =>
            set((state) => {
                state.elements = elements;
                state.selectedId = null;
            }),

        getSelectedElement: () => {
            const state = get();
            return state.elements.find((el) => el.id === state.selectedId) || null;
        },
    }))
);
