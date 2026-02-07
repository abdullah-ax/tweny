'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { OCRService, ExtractedMenu, OCRProgress } from '@/lib/services/ocr.service';
import { cleanMenuWithAI, CleanedMenu } from '@/lib/services/menu-cleaner.service';

export default function UploadPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState<OCRProgress | null>(null);
    const [extractedData, setExtractedData] = useState<ExtractedMenu | null>(null);
    const [cleanedData, setCleanedData] = useState<CleanedMenu | null>(null);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['eng']);
    const [error, setError] = useState<string | null>(null);
    const [useAICleaning, setUseAICleaning] = useState(true);

    const languages = OCRService.getSupportedLanguages();

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setExtractedData(null);
        setCleanedData(null);
        setError(null);

        // Create preview (different handling for PDFs)
        const isPDF = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');

        if (isPDF) {
            // For PDFs, show a PDF icon/placeholder
            setPreview('pdf');
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => setPreview(ev.target?.result as string);
            reader.readAsDataURL(selectedFile);
        }
    }, []);

    const handleExtract = async () => {
        if (!file) return;

        setProcessing(true);
        setError(null);
        setCleanedData(null);
        setProgress({ status: 'Initializing OCR...', progress: 0 });

        try {
            // Step 1: Extract with OCR
            const result = await OCRService.extractFromFile(file, selectedLanguages, setProgress);
            setExtractedData(result);

            // Step 2: Clean with AI if enabled
            if (useAICleaning && result.rawText.length > 10) {
                setProgress({ status: 'AI is cleaning extracted data...', progress: 0.9 });
                const cleaned = await cleanMenuWithAI(result.rawText, (status) => {
                    setProgress({ status, progress: 0.95 });
                });
                setCleanedData(cleaned);

                // Store cleaned data for next step
                const menuForStrategy = {
                    items: cleaned.items.map((item, idx) => ({
                        name: item.name,
                        description: item.description,
                        price: item.price?.toString(),
                        category: item.category,
                        position: { x: 0, y: idx * 20, width: 400, height: 20 },
                    })),
                    categories: cleaned.categories,
                    rawText: result.rawText,
                    language: result.language,
                    confidence: cleaned.confidence,
                    layout: result.layout,
                };
                sessionStorage.setItem('extractedMenu', JSON.stringify(menuForStrategy));

                if (cleaned.items.length === 0) {
                    setError('AI could not identify menu items. Try a clearer image.');
                }
            } else {
                // Store raw OCR data
                sessionStorage.setItem('extractedMenu', JSON.stringify(result));
                if (result.items.length === 0) {
                    setError('No menu items detected. Try a clearer image or different language settings.');
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to extract menu');
        } finally {
            setProcessing(false);
            setProgress(null);
        }
    };

    const handleContinue = () => {
        const itemCount = cleanedData?.items.length ?? extractedData?.items.length ?? 0;
        if (itemCount > 0) {
            router.push('/dashboard/strategy');
        }
    };

    const toggleLanguage = (code: string) => {
        setSelectedLanguages((prev) =>
            prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
        );
    };

    // Use cleaned data if available, otherwise raw OCR data
    const displayItems = cleanedData?.items ?? extractedData?.items ?? [];
    const displayCategories = cleanedData?.categories ?? extractedData?.categories ?? [];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Upload Your Menu</h1>
                <p className="text-gray-400 mt-1">
                    Upload a PDF or image of your menu. Our AI will extract the items and suggest optimized layouts.
                </p>
            </div>

            {/* Pipeline Progress */}
            <div className="flex items-center gap-2 text-sm">
                <span className="px-3 py-1 bg-orange-500 text-white rounded-full">1. Upload</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full">2. Strategy</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full">3. Deploy</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full">4. Optimize</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Section */}
                <Card>
                    <CardContent>
                        <h3 className="font-semibold text-white mb-4">Menu File</h3>

                        {/* Drop Zone */}
                        <label
                            className={`
                                flex flex-col items-center justify-center
                                w-full h-64 border-2 border-dashed rounded-xl
                                cursor-pointer transition-colors
                                ${preview ? 'border-orange-500' : 'border-gray-700 hover:border-gray-600'}
                            `}
                        >
                            {preview === 'pdf' ? (
                                <div className="text-center p-6">
                                    <svg
                                        className="w-16 h-16 mx-auto text-red-500 mb-3"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1c.55 0 1 .45 1 1v3c0 .55-.45 1-1 1h-1a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5zm2.5 0h1.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5H11v1.5a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5h.5zm4 0h1a.5.5 0 0 1 0 1h-1v1h1a.5.5 0 0 1 0 1h-1v1.5a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5h.5z" />
                                    </svg>
                                    <p className="text-orange-500 font-medium">{file?.name}</p>
                                    <p className="text-gray-500 text-sm mt-1">PDF Document Ready</p>
                                </div>
                            ) : preview ? (
                                <img
                                    src={preview}
                                    alt="Menu preview"
                                    className="max-h-full max-w-full object-contain rounded-lg"
                                />
                            ) : (
                                <div className="text-center p-6">
                                    <svg
                                        className="w-12 h-12 mx-auto text-gray-500 mb-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                    <p className="text-gray-400">
                                        Drop your menu here or <span className="text-orange-500">browse</span>
                                    </p>
                                    <p className="text-gray-500 text-sm mt-1">PDF, PNG, JPG up to 10MB</p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*,.pdf,application/pdf"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>

                        {/* Language Selection */}
                        <div className="mt-4">
                            <label className="block text-sm text-gray-400 mb-2">Menu Languages</label>
                            <div className="flex flex-wrap gap-2">
                                {languages.slice(0, 8).map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => toggleLanguage(lang.code)}
                                        className={`
                                            px-3 py-1 rounded-full text-sm transition-colors
                                            ${selectedLanguages.includes(lang.code)
                                                ? 'bg-orange-500 text-white'
                                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
                                        `}
                                    >
                                        {lang.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* AI Cleaning Toggle */}
                        <div className="mt-4 flex items-center justify-between">
                            <div>
                                <label className="text-sm text-gray-400">AI-Powered Cleaning</label>
                                <p className="text-xs text-gray-500">Filter OCR noise using AI</p>
                            </div>
                            <button
                                onClick={() => setUseAICleaning(!useAICleaning)}
                                className={`
                                    relative w-12 h-6 rounded-full transition-colors
                                    ${useAICleaning ? 'bg-orange-500' : 'bg-gray-700'}
                                `}
                            >
                                <span
                                    className={`
                                        absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                                        ${useAICleaning ? 'left-7' : 'left-1'}
                                    `}
                                />
                            </button>
                        </div>

                        {/* Extract Button */}
                        <Button
                            onClick={handleExtract}
                            disabled={!file || processing}
                            loading={processing}
                            className="w-full mt-4"
                        >
                            {processing ? `${progress?.status || 'Processing'}...` : 'Extract Menu Data'}
                        </Button>

                        {/* Progress */}
                        {progress && (
                            <div className="mt-3">
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 transition-all"
                                        style={{ width: `${progress.progress * 100}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{progress.status}</p>
                            </div>
                        )}

                        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                    </CardContent>
                </Card>

                {/* Extracted Data Preview */}
                <Card>
                    <CardContent>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-white">
                                {cleanedData ? 'AI-Cleaned Menu' : 'Extracted Data'}
                            </h3>
                            <div className="flex items-center gap-2">
                                {cleanedData && (
                                    <Badge variant="info">AI Cleaned</Badge>
                                )}
                                {(cleanedData || extractedData) && (
                                    <Badge variant="success">
                                        {Math.round((cleanedData?.confidence ?? extractedData?.confidence ?? 0) * 100)}% confidence
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {displayItems.length > 0 || extractedData ? (
                            <div className="space-y-4">
                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-white">{displayItems.length}</p>
                                        <p className="text-xs text-gray-400">Items</p>
                                    </div>
                                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-white">{displayCategories.length}</p>
                                        <p className="text-xs text-gray-400">Categories</p>
                                    </div>
                                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-white">{extractedData?.layout?.columns ?? 1}</p>
                                        <p className="text-xs text-gray-400">Columns</p>
                                    </div>
                                </div>

                                {/* Comparison if AI cleaned */}
                                {cleanedData && extractedData && (
                                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                                        <p className="text-green-400 text-sm">
                                            ✨ AI reduced {extractedData.items.length} raw items → {cleanedData.items.length} clean menu items
                                        </p>
                                    </div>
                                )}

                                {/* Items List */}
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                    {displayItems.slice(0, 20).map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2 bg-gray-800/30 rounded-lg"
                                        >
                                            <div>
                                                <p className="text-white text-sm">{item.name}</p>
                                                {item.category && (
                                                    <p className="text-xs text-gray-500">{item.category}</p>
                                                )}
                                            </div>
                                            {item.price && (
                                                <span className="text-orange-400 font-mono text-sm">
                                                    {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : item.price}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {displayItems.length > 20 && (
                                        <p className="text-gray-500 text-sm text-center">
                                            +{displayItems.length - 20} more items
                                        </p>
                                    )}
                                    {displayItems.length === 0 && (
                                        <p className="text-yellow-500 text-sm text-center py-4">
                                            No items detected. Try a clearer image or adjust language settings.
                                        </p>
                                    )}
                                </div>

                                {/* Continue Button */}
                                <Button
                                    onClick={handleContinue}
                                    className="w-full"
                                    disabled={displayItems.length === 0}
                                >
                                    {displayItems.length === 0
                                        ? 'No items to continue with'
                                        : `Continue with ${displayItems.length} items →`}
                                </Button>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-gray-500">
                                <p>Upload and extract a menu to see the data here</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Raw Text Preview */}
            {extractedData && (
                <Card>
                    <CardContent>
                        <details>
                            <summary className="font-semibold text-white mb-3 cursor-pointer">
                                Raw OCR Text ({extractedData.rawText.length} chars)
                            </summary>
                            <pre className="text-xs text-gray-400 bg-gray-900 p-4 rounded-lg overflow-x-auto max-h-48 overflow-y-auto mt-3">
                                {extractedData.rawText}
                            </pre>
                        </details>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
