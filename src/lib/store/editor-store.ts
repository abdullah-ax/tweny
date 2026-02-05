import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type EditorElement = {
    id: string;
    type: "menu_item" | "text" | "section" | "image";
    position: { x: number; y: number };
    size: { width: number; height: number };
    data?: Record<string, unknown>;
};

type EditorState = {
    elements: EditorElement[];
    selectedId: string | null;
    addElement: (element: EditorElement) => void;
    selectElement: (id: string | null) => void;
    clear: () => void;
};

export const useEditorStore = create<EditorState>()(
    immer((set) => ({
        elements: [],
        selectedId: null,
        addElement: (element) =>
            set((state) => {
                state.elements.push(element);
            }),
        selectElement: (id) =>
            set((state) => {
                state.selectedId = id;
            }),
        clear: () =>
            set((state) => {
                state.elements = [];
                state.selectedId = null;
            }),
    }))
);
