'use client';

import { useEditorStore, EditorElement } from '@/lib/store/editor-store';

function renderBcgQuadrant(bcgQuadrant: unknown) {
    if (!bcgQuadrant) return null;
    const quadrant = String(bcgQuadrant);
    return (
        <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded ${quadrant === 'star' ? 'bg-yellow-500/20 text-yellow-400' :
            quadrant === 'cash_cow' ? 'bg-green-500/20 text-green-400' :
                quadrant === 'question_mark' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-red-500/20 text-red-400'
            }`}>
            {quadrant}
        </span>
    );
}

export default function PropertiesPanel() {
    const {
        selectedId,
        elements,
        updateElement,
        saveHistory,
    } = useEditorStore();

    const selectedElement = elements.find(el => el.id === selectedId);

    if (!selectedElement) {
        return (
            <div className="w-64 bg-gray-900 border-l border-gray-800 p-4">
                <div className="text-center text-gray-500 py-8">
                    <p className="text-sm">Select an element to edit its properties</p>
                </div>
            </div>
        );
    }

    const handleChange = (field: string, value: any) => {
        if (field.startsWith('data.')) {
            const dataField = field.replace('data.', '');
            updateElement(selectedId!, {
                data: {
                    ...selectedElement.data,
                    [dataField]: value,
                },
            });
        } else if (field.startsWith('style.')) {
            const styleField = field.replace('style.', '');
            updateElement(selectedId!, {
                style: {
                    ...selectedElement.style,
                    [styleField]: value,
                },
            });
        } else if (field.startsWith('position.')) {
            const posField = field.replace('position.', '');
            updateElement(selectedId!, {
                position: {
                    ...selectedElement.position,
                    [posField]: parseInt(value) || 0,
                },
            });
        } else if (field.startsWith('size.')) {
            const sizeField = field.replace('size.', '');
            updateElement(selectedId!, {
                size: {
                    ...selectedElement.size,
                    [sizeField]: parseInt(value) || 0,
                },
            });
        } else {
            updateElement(selectedId!, { [field]: value });
        }
    };

    const handleBlur = () => {
        saveHistory();
    };

    return (
        <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col h-full overflow-y-auto">
            <div className="p-4 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-white">Properties</h3>
                <p className="text-xs text-gray-500 mt-1 capitalize">{selectedElement.type.replace('_', ' ')}</p>
            </div>

            <div className="p-4 space-y-4">
                {/* Position */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Position</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">X</label>
                            <input
                                type="number"
                                value={Math.round(selectedElement.position.x)}
                                onChange={(e) => handleChange('position.x', e.target.value)}
                                onBlur={handleBlur}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Y</label>
                            <input
                                type="number"
                                value={Math.round(selectedElement.position.y)}
                                onChange={(e) => handleChange('position.y', e.target.value)}
                                onBlur={handleBlur}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Size */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Size</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Width</label>
                            <input
                                type="number"
                                value={Math.round(selectedElement.size.width)}
                                onChange={(e) => handleChange('size.width', e.target.value)}
                                onBlur={handleBlur}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Height</label>
                            <input
                                type="number"
                                value={Math.round(selectedElement.size.height)}
                                onChange={(e) => handleChange('size.height', e.target.value)}
                                onBlur={handleBlur}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Type-specific properties */}
                {selectedElement.type === 'text' && (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Text Content</label>
                            <textarea
                                value={(selectedElement.data?.text as string) || ''}
                                onChange={(e) => handleChange('data.text', e.target.value)}
                                onBlur={handleBlur}
                                rows={3}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Font Size</label>
                            <input
                                type="number"
                                value={selectedElement.style?.fontSize || 16}
                                onChange={(e) => handleChange('style.fontSize', parseInt(e.target.value))}
                                onBlur={handleBlur}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Color</label>
                            <input
                                type="color"
                                value={selectedElement.style?.color || '#ffffff'}
                                onChange={(e) => handleChange('style.color', e.target.value)}
                                onBlur={handleBlur}
                                className="w-full h-8 bg-gray-800 border border-gray-700 rounded cursor-pointer"
                            />
                        </div>
                    </>
                )}

                {selectedElement.type === 'section' && (
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Section Title</label>
                        <input
                            type="text"
                            value={(selectedElement.data?.title as string) || ''}
                            onChange={(e) => handleChange('data.title', e.target.value)}
                            onBlur={handleBlur}
                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        />
                    </div>
                )}

                {selectedElement.type === 'badge' && (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Label</label>
                            <input
                                type="text"
                                value={(selectedElement.data?.label as string) || ''}
                                onChange={(e) => handleChange('data.label', e.target.value)}
                                onBlur={handleBlur}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Variant</label>
                            <select
                                value={(selectedElement.data?.variant as string) || 'default'}
                                onChange={(e) => handleChange('data.variant', e.target.value)}
                                onBlur={handleBlur}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            >
                                <option value="popular">Popular (Orange)</option>
                                <option value="new">New (Green)</option>
                                <option value="chef">Chef's Pick (Purple)</option>
                                <option value="default">Default (Gray)</option>
                            </select>
                        </div>
                    </>
                )}

                {selectedElement.type === 'menu_item' && (
                    <div className="p-3 bg-gray-800 rounded-lg">
                        <h4 className="text-sm font-medium text-white mb-2">
                            {String(selectedElement.data?.name ?? 'Menu Item')}
                        </h4>
                        <p className="text-xs text-gray-400">
                            ${Number(selectedElement.data?.price || 0).toFixed(2)}
                        </p>
                        {renderBcgQuadrant(selectedElement.data?.bcgQuadrant)}
                    </div>
                )}

                {selectedElement.type === 'image' && (
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Image URL</label>
                        <input
                            type="text"
                            value={(selectedElement.data?.url as string) || ''}
                            onChange={(e) => handleChange('data.url', e.target.value)}
                            onBlur={handleBlur}
                            placeholder="https://..."
                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        />
                    </div>
                )}

                {/* Lock toggle */}
                <div className="pt-4 border-t border-gray-800">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-medium text-gray-400">Lock Position</span>
                        <button
                            onClick={() => {
                                updateElement(selectedId!, { locked: !selectedElement.locked });
                                saveHistory();
                            }}
                            className={`w-10 h-5 rounded-full transition-colors ${selectedElement.locked ? 'bg-orange-500' : 'bg-gray-700'
                                }`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${selectedElement.locked ? 'translate-x-5' : 'translate-x-0.5'
                                }`} />
                        </button>
                    </label>
                </div>
            </div>
        </div>
    );
}
