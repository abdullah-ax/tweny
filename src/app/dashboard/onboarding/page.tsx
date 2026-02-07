'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { OCRService, ExtractedMenu, OCRProgress } from '@/lib/services/ocr.service';
import { cleanMenuWithAI, CleanedMenu } from '@/lib/services/menu-cleaner.service';
import { CSVImportService, CSVParseResult } from '@/lib/services/csv-import.service';
import { VisualExtractorService } from '@/lib/services/visual-extractor.service';
import { ContextService, ColorPalette, ContextMenuItem, ExtractedImage } from '@/lib/services/context.service';

interface UploadState {
    file: File | null;
    preview: string | null;
    status: 'idle' | 'processing' | 'done' | 'error';
    progress?: string;
}

export default function OnboardingPage() {
    const router = useRouter();

    // Menu file state
    const [menuState, setMenuState] = useState<UploadState>({
        file: null,
        preview: null,
        status: 'idle',
    });

    // CSV files state (multiple allowed)
    const [csvFiles, setCsvFiles] = useState<File[]>([]);
    const [csvParseResults, setCsvParseResults] = useState<CSVParseResult[]>([]);

    // Processing state
    const [processing, setProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState<string>('');
    const [progress, setProgress] = useState(0);

    // Extracted data
    const [extractedMenu, setExtractedMenu] = useState<CleanedMenu | ExtractedMenu | null>(null);
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
    const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['eng']);
    const [error, setError] = useState<string | null>(null);

    // Restaurant info
    const [restaurantName, setRestaurantName] = useState('');
    const [cuisineType, setCuisineType] = useState('');

    const languages = OCRService.getSupportedLanguages();
    const pdfCanvasRef = useRef<HTMLCanvasElement[]>([]);

    /**
     * Handle menu file selection
     */
    const handleMenuFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (isPDF) {
            setMenuState({ file, preview: 'pdf', status: 'idle' });
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setMenuState({ file, preview: ev.target?.result as string, status: 'idle' });
            };
            reader.readAsDataURL(file);
        }

        setExtractedMenu(null);
        setColorPalette(null);
        setError(null);
    }, []);

    /**
     * Handle CSV file selection
     */
    const handleCSVFilesChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setCsvFiles(prev => [...prev, ...files]);

        // Parse each CSV file
        const results: CSVParseResult[] = [];
        for (const file of files) {
            const result = await CSVImportService.parseCSV(file);
            results.push(result);
        }

        setCsvParseResults(prev => [...prev, ...results]);
    }, []);

    /**
     * Remove a CSV file
     */
    const removeCSVFile = (index: number) => {
        setCsvFiles(prev => prev.filter((_, i) => i !== index));
        setCsvParseResults(prev => prev.filter((_, i) => i !== index));
    };

    /**
     * Main processing function
     */
    const handleProcess = async () => {
        if (!menuState.file) return;

        setProcessing(true);
        setError(null);
        setProgress(0);

        try {
            // Step 1: Extract menu content with OCR
            setCurrentStep('Extracting menu content...');
            setProgress(10);

            const ocrProgress = (p: OCRProgress) => {
                setCurrentStep(p.status);
                setProgress(10 + p.progress * 30);
            };

            const ocrResult = await OCRService.extractFromFile(
                menuState.file,
                selectedLanguages,
                ocrProgress
            );

            // Step 2: Clean with AI
            setCurrentStep('AI is analyzing menu items...');
            setProgress(45);

            let menuData: CleanedMenu | ExtractedMenu = ocrResult;

            if (ocrResult.rawText.length > 10) {
                const cleaned = await cleanMenuWithAI(ocrResult.rawText, (status) => {
                    setCurrentStep(status);
                });
                if (cleaned.items.length > 0) {
                    menuData = cleaned;
                }
            }

            setExtractedMenu(menuData);

            // Step 3: Extract colors from menu
            setCurrentStep('Extracting color palette...');
            setProgress(60);

            let colors: ColorPalette | undefined;
            let images: ExtractedImage[] = [];

            if (menuState.preview && menuState.preview !== 'pdf') {
                colors = await VisualExtractorService.extractColorsFromImage(menuState.preview);
                setColorPalette(colors);
            } else if (menuState.file.type === 'application/pdf') {
                // For PDFs, we'd need to render pages to canvas first
                // This is a simplified version - full implementation would render PDF pages
                colors = await VisualExtractorService.extractColorsFromImage(menuState.file);
                setColorPalette(colors);
            }

            // Step 4: Process CSV sales data
            setCurrentStep('Analyzing sales data...');
            setProgress(75);

            let salesContext = undefined;
            let enrichedItems: ContextMenuItem[] = [];

            if (csvParseResults.length > 0) {
                // Combine all CSV rows
                const allRows = csvParseResults.flatMap(r => r.rows);
                salesContext = CSVImportService.aggregateSalesData(allRows);

                // Convert menu items to context items
                const baseItems: ContextMenuItem[] = ('items' in menuData ? menuData.items : []).map((item, idx) => ({
                    id: `item_${idx}`,
                    name: item.name,
                    description: item.description,
                    price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0'),
                    category: item.category || 'Uncategorized',
                }));

                enrichedItems = CSVImportService.enrichMenuItems(baseItems, allRows);
            } else {
                enrichedItems = ('items' in menuData ? menuData.items : []).map((item, idx) => ({
                    id: `item_${idx}`,
                    name: item.name,
                    description: item.description,
                    price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0'),
                    category: item.category || 'Uncategorized',
                }));
            }

            // Step 5: Build context
            setCurrentStep('Building AI context...');
            setProgress(85);

            const context = await ContextService.buildContext({
                menuItems: enrichedItems,
                categories: menuData.categories || [],
                colorPalette: colors,
                images: extractedImages,
                salesData: salesContext,
                restaurantInfo: {
                    name: restaurantName || 'My Restaurant',
                    cuisine: cuisineType,
                },
            });

            // Step 6: Save to database
            setCurrentStep('Saving to database...');
            setProgress(92);

            // Get or create the restaurant
            const token = localStorage.getItem('token');
            let restaurantId: number;

            // Try to fetch existing restaurants or create one
            try {
                const restaurantsRes = await fetch('/api/restaurants', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (restaurantsRes.ok) {
                    const restaurantsData = await restaurantsRes.json();
                    if (restaurantsData.restaurants?.length > 0) {
                        restaurantId = restaurantsData.restaurants[0].id;
                    } else {
                        // No restaurant exists, create one
                        const createRes = await fetch('/api/restaurants', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                name: restaurantName || 'My Restaurant',
                                cuisine: cuisineType || 'General',
                                description: 'Created during menu setup',
                            }),
                        });
                        if (createRes.ok) {
                            const { restaurant } = await createRes.json();
                            restaurantId = restaurant.id;
                            console.log(`🏪 Created restaurant: ${restaurant.name} (ID: ${restaurantId})`);
                        } else {
                            throw new Error('Failed to create restaurant');
                        }
                    }
                } else {
                    throw new Error('Failed to fetch restaurants');
                }
            } catch (e) {
                console.error('Restaurant setup error:', e);
                setError('Failed to setup restaurant. Please try again.');
                return;
            }

            // Save menu items to database
            const importRes = await fetch('/api/menu/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId,
                    items: enrichedItems.map(item => ({
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        category: item.category,
                        cost: item.cost,
                    })),
                    context: {
                        menuItems: enrichedItems,
                        categories: menuData.categories || [],
                        salesData: salesContext,
                        menuEngineering: context.menuEngineering,
                        colorPalette: colors,
                        extractedImages: extractedImages,
                    },
                }),
            });

            if (importRes.ok) {
                const importData = await importRes.json();
                console.log(`📥 Saved ${importData.imported?.items || 0} menu items to database`);
            }

            // Store for next page (also keep in sessionStorage for quick access)
            sessionStorage.setItem('menuContext', JSON.stringify({ ...context, restaurantId }));
            sessionStorage.setItem('extractedMenu', JSON.stringify({
                items: enrichedItems,
                categories: menuData.categories || [],
                rawText: 'rawText' in menuData ? menuData.rawText : '',
                language: 'language' in menuData ? menuData.language : 'eng',
                confidence: menuData.confidence || 0,
                layout: 'layout' in menuData ? menuData.layout : { width: 0, height: 0, columns: 1, hasImages: false },
                restaurantId, // Include restaurant ID for downstream use
            }));

            setCurrentStep('Complete!');
            setProgress(100);

            // Small delay to show completion
            await new Promise(r => setTimeout(r, 500));

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Processing failed');
            setCurrentStep('');
        } finally {
            setProcessing(false);
        }
    };

    /**
     * Continue to strategy page
     */
    const handleContinue = () => {
        router.push('/dashboard/strategy');
    };

    const toggleLanguage = (code: string) => {
        setSelectedLanguages(prev =>
            prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]
        );
    };

    const totalCSVRows = csvParseResults.reduce((sum, r) => sum + r.summary.validRows, 0);
    const itemCount = extractedMenu?.items?.length ?? 0;
    const categoryCount = extractedMenu?.categories?.length ?? 0;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Setup Your Menu</h1>
                <p className="text-gray-400 mt-1">
                    Upload your menu and sales data to unlock AI-powered optimization.
                </p>
            </div>

            {/* Pipeline Progress */}
            <div className="flex items-center gap-2 text-sm">
                <span className="px-3 py-1 bg-orange-500 text-white rounded-full">1. Setup</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full">2. Strategy</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full">3. Editor</span>
                <span className="text-gray-600">→</span>
                <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full">4. Deploy</span>
            </div>

            {/* Restaurant Info */}
            <Card>
                <CardContent>
                    <h3 className="font-semibold text-white mb-4">Restaurant Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Restaurant Name</label>
                            <input
                                type="text"
                                value={restaurantName}
                                onChange={(e) => setRestaurantName(e.target.value)}
                                placeholder="Enter restaurant name"
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Cuisine Type</label>
                            <select
                                value={cuisineType}
                                onChange={(e) => setCuisineType(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                            >
                                <option value="">Select cuisine</option>
                                <option value="american">American</option>
                                <option value="italian">Italian</option>
                                <option value="mexican">Mexican</option>
                                <option value="asian">Asian</option>
                                <option value="mediterranean">Mediterranean</option>
                                <option value="middle-eastern">Middle Eastern</option>
                                <option value="indian">Indian</option>
                                <option value="fusion">Fusion</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Menu Upload */}
                <Card>
                    <CardContent>
                        <h3 className="font-semibold text-white mb-4">
                            Menu File <span className="text-orange-500">*</span>
                        </h3>

                        <label className={`
                            flex flex-col items-center justify-center
                            w-full h-48 border-2 border-dashed rounded-xl
                            cursor-pointer transition-colors
                            ${menuState.preview ? 'border-orange-500' : 'border-gray-700 hover:border-gray-600'}
                        `}>
                            {menuState.preview === 'pdf' ? (
                                <div className="text-center p-4">
                                    <svg className="w-12 h-12 mx-auto text-red-500 mb-2" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                                    </svg>
                                    <p className="text-orange-500 font-medium text-sm">{menuState.file?.name}</p>
                                    <p className="text-gray-500 text-xs mt-1">PDF Ready</p>
                                </div>
                            ) : menuState.preview ? (
                                <img
                                    src={menuState.preview}
                                    alt="Menu preview"
                                    className="max-h-full max-w-full object-contain rounded-lg"
                                />
                            ) : (
                                <div className="text-center p-4">
                                    <svg className="w-10 h-10 mx-auto text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-gray-400 text-sm">
                                        Drop menu here or <span className="text-orange-500">browse</span>
                                    </p>
                                    <p className="text-gray-500 text-xs mt-1">PDF, PNG, JPG up to 10MB</p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*,.pdf,application/pdf"
                                onChange={handleMenuFileChange}
                                className="hidden"
                            />
                        </label>

                        {/* Language Selection */}
                        <div className="mt-4">
                            <label className="block text-sm text-gray-400 mb-2">Menu Languages</label>
                            <div className="flex flex-wrap gap-2">
                                {languages.slice(0, 6).map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => toggleLanguage(lang.code)}
                                        className={`
                                            px-2 py-1 rounded-full text-xs transition-colors
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
                    </CardContent>
                </Card>

                {/* Sales Data Upload */}
                <Card>
                    <CardContent>
                        <h3 className="font-semibold text-white mb-4">
                            Sales Data <span className="text-gray-500">(Optional)</span>
                        </h3>

                        <label className={`
                            flex flex-col items-center justify-center
                            w-full h-32 border-2 border-dashed rounded-xl
                            cursor-pointer transition-colors
                            ${csvFiles.length > 0 ? 'border-green-500' : 'border-gray-700 hover:border-gray-600'}
                        `}>
                            <div className="text-center p-4">
                                <svg className="w-8 h-8 mx-auto text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-400 text-sm">
                                    Drop CSV files or <span className="text-orange-500">browse</span>
                                </p>
                                <p className="text-gray-500 text-xs mt-1">Order history, sales reports</p>
                            </div>
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleCSVFilesChange}
                                multiple
                                className="hidden"
                            />
                        </label>

                        {/* CSV Files List */}
                        {csvFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {csvFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm text-gray-300 truncate max-w-[150px]">{file.name}</span>
                                            {csvParseResults[idx] && (
                                                <Badge variant="info">
                                                    {csvParseResults[idx].summary.validRows} rows
                                                </Badge>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => removeCSVFile(idx)}
                                            className="text-gray-500 hover:text-red-500"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <p className="text-xs text-gray-500">
                                    Total: {totalCSVRows.toLocaleString()} data rows
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Processing Status */}
            {processing && (
                <Card>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full" />
                            <div className="flex-1">
                                <p className="text-white font-medium">{currentStep}</p>
                                <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error Display */}
            {error && (
                <Card className="border-red-500/50">
                    <CardContent>
                        <div className="flex items-center gap-3 text-red-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Results Preview */}
            {extractedMenu && progress === 100 && (
                <Card>
                    <CardContent>
                        <h3 className="font-semibold text-white mb-4">Extraction Complete</h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-gray-800 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-orange-500">{itemCount}</p>
                                <p className="text-xs text-gray-400">Menu Items</p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-blue-500">{categoryCount}</p>
                                <p className="text-xs text-gray-400">Categories</p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-green-500">{totalCSVRows > 0 ? totalCSVRows.toLocaleString() : '-'}</p>
                                <p className="text-xs text-gray-400">Sales Records</p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-purple-500">{colorPalette ? colorPalette.extracted.length : '-'}</p>
                                <p className="text-xs text-gray-400">Colors Found</p>
                            </div>
                        </div>

                        {/* Color Palette Preview */}
                        {colorPalette && (
                            <div className="mb-4">
                                <p className="text-sm text-gray-400 mb-2">Extracted Color Palette</p>
                                <div className="flex gap-2">
                                    {colorPalette.extracted.slice(0, 6).map((color, idx) => (
                                        <div
                                            key={idx}
                                            className="w-10 h-10 rounded-lg shadow-md border border-gray-700"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sample Items */}
                        <div>
                            <p className="text-sm text-gray-400 mb-2">Sample Items</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {extractedMenu.items.slice(0, 4).map((item, idx) => (
                                    <div key={idx} className="bg-gray-800 rounded-lg px-3 py-2 flex items-center justify-between">
                                        <div>
                                            <p className="text-white text-sm font-medium">{item.name}</p>
                                            <p className="text-gray-500 text-xs">{item.category}</p>
                                        </div>
                                        {item.price && (
                                            <span className="text-orange-500 font-medium">
                                                ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
                <Button
                    variant="secondary"
                    onClick={() => router.push('/dashboard')}
                >
                    Back to Dashboard
                </Button>

                <div className="flex gap-3">
                    <Button
                        onClick={handleProcess}
                        disabled={!menuState.file || processing}
                        loading={processing}
                    >
                        {processing ? 'Processing...' : 'Process Menu'}
                    </Button>

                    {progress === 100 && (
                        <Button
                            onClick={handleContinue}
                            disabled={itemCount === 0}
                        >
                            Continue to Strategy →
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
