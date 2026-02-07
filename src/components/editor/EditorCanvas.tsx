'use client';

import { useRef, useEffect, useState } from 'react';
import { useEditorStore, EditorElement } from '@/lib/store/editor-store';

interface EditorCanvasProps {
    onDrop?: (item: any, position: { x: number; y: number }) => void;
}

export default function EditorCanvas({ onDrop }: EditorCanvasProps) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const {
        elements,
        selectedId,
        zoom,
        showGrid,
        gridSize,
        canvasSize,
        selectElement,
        moveElement,
        resizeElement,
        saveHistory,
    } = useEditorStore();

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [resizeCorner, setResizeCorner] = useState<string | null>(null);

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (e.target === canvasRef.current) {
            selectElement(null);
        }
    };

    const handleMouseDown = (e: React.MouseEvent, element: EditorElement) => {
        e.stopPropagation();
        selectElement(element.id);

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        setIsDragging(true);
        setDragStart({
            x: e.clientX - element.position.x * (zoom / 100),
            y: e.clientY - element.position.y * (zoom / 100),
        });
    };

    const handleResizeStart = (e: React.MouseEvent, corner: string) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeCorner(corner);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && selectedId) {
            const newX = (e.clientX - dragStart.x) / (zoom / 100);
            const newY = (e.clientY - dragStart.y) / (zoom / 100);
            moveElement(selectedId, { x: Math.max(0, newX), y: Math.max(0, newY) });
        }

        if (isResizing && selectedId && resizeCorner) {
            const element = elements.find(el => el.id === selectedId);
            if (!element) return;

            const deltaX = (e.clientX - dragStart.x) / (zoom / 100);
            const deltaY = (e.clientY - dragStart.y) / (zoom / 100);

            let newWidth = element.size.width;
            let newHeight = element.size.height;

            if (resizeCorner.includes('e')) newWidth += deltaX;
            if (resizeCorner.includes('s')) newHeight += deltaY;
            if (resizeCorner.includes('w')) newWidth -= deltaX;
            if (resizeCorner.includes('n')) newHeight -= deltaY;

            resizeElement(selectedId, { width: newWidth, height: newHeight });
            setDragStart({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        if (isDragging || isResizing) {
            saveHistory();
        }
        setIsDragging(false);
        setIsResizing(false);
        setResizeCorner(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const data = e.dataTransfer.getData('application/json');
        if (data && onDrop) {
            const item = JSON.parse(data);
            const position = {
                x: (e.clientX - rect.left) / (zoom / 100),
                y: (e.clientY - rect.top) / (zoom / 100),
            };
            onDrop(item, position);
        }
    };

    const renderElement = (element: EditorElement) => {
        const isSelected = selectedId === element.id;
        const style: React.CSSProperties = {
            position: 'absolute',
            left: element.position.x,
            top: element.position.y,
            width: element.size.width,
            height: element.size.height,
            transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
            ...element.style,
        };

        return (
            <div
                key={element.id}
                className={`cursor-move transition-shadow ${isSelected ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-gray-900' : ''
                    }`}
                style={style}
                onMouseDown={(e) => handleMouseDown(e, element)}
            >
                {/* Element Content */}
                {element.type === 'menu_item' && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 h-full overflow-hidden">
                        <h4 className="font-medium text-white text-sm truncate">
                            {(element.data?.name as string) || 'Menu Item'}
                        </h4>
                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                            {(element.data?.description as string) || 'Description'}
                        </p>
                        <p className="text-orange-400 font-semibold mt-2 text-sm">
                            ${Number(element.data?.price || 0).toFixed(2)}
                        </p>
                        {element.data?.bcgQuadrant ? (
                            <span className={`inline-block px-1.5 py-0.5 text-xs rounded mt-1 ${String(element.data.bcgQuadrant) === 'star' ? 'bg-yellow-500/20 text-yellow-400' :
                                    String(element.data.bcgQuadrant) === 'cash_cow' ? 'bg-green-500/20 text-green-400' :
                                        String(element.data.bcgQuadrant) === 'question_mark' ? 'bg-purple-500/20 text-purple-400' :
                                            'bg-red-500/20 text-red-400'
                                }`}>
                                {String(element.data.bcgQuadrant) === 'star' ? '⭐ Star' :
                                    String(element.data.bcgQuadrant) === 'cash_cow' ? '🐄 Cash Cow' :
                                        String(element.data.bcgQuadrant) === 'question_mark' ? '❓ Puzzle' :
                                            '🐕 Dog'}
                            </span>
                        ) : null}
                    </div>
                )}

                {element.type === 'text' && (
                    <div
                        className="p-2"
                        style={{
                            color: element.style?.color || '#fff',
                            fontSize: element.style?.fontSize || 16,
                            fontWeight: element.style?.fontWeight || 'normal',
                        }}
                    >
                        {(element.data?.text as string) || 'Text'}
                    </div>
                )}

                {element.type === 'section' && (
                    <div className="border-b-2 border-gray-700 pb-2">
                        <h3 className="text-lg font-bold text-white">
                            {(element.data?.title as string) || 'Section'}
                        </h3>
                    </div>
                )}

                {element.type === 'badge' && (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${element.data?.variant === 'popular' ? 'bg-orange-500 text-white' :
                            element.data?.variant === 'new' ? 'bg-green-500 text-white' :
                                element.data?.variant === 'chef' ? 'bg-purple-500 text-white' :
                                    'bg-gray-600 text-white'
                        }`}>
                        {(element.data?.label as string) || 'Badge'}
                    </div>
                )}

                {element.type === 'divider' && (
                    <div className="h-px bg-gray-700 w-full my-auto" />
                )}

                {element.type === 'image' && (
                    <div className="bg-gray-700 rounded-lg h-full flex items-center justify-center">
                        {element.data?.url ? (
                            <img
                                src={element.data.url as string}
                                alt="Menu"
                                className="w-full h-full object-cover rounded-lg"
                            />
                        ) : (
                            <span className="text-gray-500 text-sm">Image</span>
                        )}
                    </div>
                )}

                {/* Resize Handles */}
                {isSelected && !element.locked && (
                    <>
                        <div
                            className="absolute -top-1 -left-1 w-3 h-3 bg-orange-500 rounded-full cursor-nw-resize"
                            onMouseDown={(e) => handleResizeStart(e, 'nw')}
                        />
                        <div
                            className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full cursor-ne-resize"
                            onMouseDown={(e) => handleResizeStart(e, 'ne')}
                        />
                        <div
                            className="absolute -bottom-1 -left-1 w-3 h-3 bg-orange-500 rounded-full cursor-sw-resize"
                            onMouseDown={(e) => handleResizeStart(e, 'sw')}
                        />
                        <div
                            className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full cursor-se-resize"
                            onMouseDown={(e) => handleResizeStart(e, 'se')}
                        />
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="relative flex-1 overflow-auto bg-gray-950 p-8">
            <div
                ref={canvasRef}
                className="relative mx-auto rounded-lg border border-gray-800 overflow-hidden"
                style={{
                    width: canvasSize.width * (zoom / 100),
                    height: canvasSize.height * (zoom / 100),
                    backgroundColor: '#0a0a0a',
                    backgroundImage: showGrid
                        ? `linear-gradient(to right, #1f1f1f 1px, transparent 1px),
                           linear-gradient(to bottom, #1f1f1f 1px, transparent 1px)`
                        : 'none',
                    backgroundSize: `${gridSize * (zoom / 100)}px ${gridSize * (zoom / 100)}px`,
                }}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
                    {elements.map(renderElement)}
                </div>
            </div>
        </div>
    );
}
