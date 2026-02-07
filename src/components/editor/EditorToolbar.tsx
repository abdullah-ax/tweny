'use client';

import { useEditorStore, EditorElement } from '@/lib/store/editor-store';

export default function EditorToolbar() {
    const {
        zoom,
        showGrid,
        snapToGrid,
        selectedId,
        elements,
        historyIndex,
        history,
        setZoom,
        toggleGrid,
        toggleSnap,
        undo,
        redo,
        deleteElement,
        duplicateElement,
        bringToFront,
        sendToBack,
        clear,
    } = useEditorStore();

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const hasSelection = selectedId !== null;

    return (
        <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
            {/* Left: History */}
            <div className="flex items-center gap-1">
                <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Undo (Cmd+Z)"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                </button>
                <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Redo (Cmd+Shift+Z)"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                    </svg>
                </button>

                <div className="w-px h-6 bg-gray-700 mx-2" />

                {/* Selection actions */}
                <button
                    onClick={() => selectedId && duplicateElement(selectedId)}
                    disabled={!hasSelection}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Duplicate (Cmd+D)"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
                <button
                    onClick={() => selectedId && deleteElement(selectedId)}
                    disabled={!hasSelection}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Delete (Del)"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>

                <div className="w-px h-6 bg-gray-700 mx-2" />

                {/* Layer order */}
                <button
                    onClick={() => selectedId && bringToFront(selectedId)}
                    disabled={!hasSelection}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Bring to Front"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                </button>
                <button
                    onClick={() => selectedId && sendToBack(selectedId)}
                    disabled={!hasSelection}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Send to Back"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {/* Center: Zoom */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setZoom(zoom - 25)}
                    disabled={zoom <= 25}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>

                <select
                    value={zoom}
                    onChange={(e) => setZoom(parseInt(e.target.value))}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                >
                    {[25, 50, 75, 100, 125, 150, 200].map((z) => (
                        <option key={z} value={z}>{z}%</option>
                    ))}
                </select>

                <button
                    onClick={() => setZoom(zoom + 25)}
                    disabled={zoom >= 200}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* Right: View options */}
            <div className="flex items-center gap-1">
                <button
                    onClick={toggleGrid}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${showGrid ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    Grid
                </button>
                <button
                    onClick={toggleSnap}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${snapToGrid ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    Snap
                </button>

                <div className="w-px h-6 bg-gray-700 mx-2" />

                <button
                    onClick={clear}
                    className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 rounded"
                >
                    Clear All
                </button>
            </div>
        </div>
    );
}
