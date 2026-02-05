'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, Badge } from '@/components/ui';

interface Restaurant {
    id: number;
    name: string;
}

interface ImportResult {
    success: boolean;
    message: string;
    count?: number;
}

export default function ImportPage() {
    const searchParams = useSearchParams();
    const preselectedRestaurant = searchParams.get('restaurant');
    
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>(preselectedRestaurant || '');
    const [file, setFile] = useState<File | null>(null);
    const [dataType, setDataType] = useState<string>('menuItems');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        fetchRestaurants();
    }, []);

    const fetchRestaurants = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/restaurants', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setRestaurants(data.restaurants || []);
                if (!selectedRestaurant && data.restaurants?.length > 0) {
                    setSelectedRestaurant(data.restaurants[0].id.toString());
                }
            }
        } catch (error) {
            console.error('Failed to fetch restaurants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.name.endsWith('.csv')) {
                setFile(droppedFile);
                setResult(null);
            } else {
                setResult({ success: false, message: 'Please upload a CSV file' });
            }
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedRestaurant) return;

        setUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', dataType);

            const token = localStorage.getItem('token');
            const res = await fetch(`/api/restaurants/${selectedRestaurant}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setResult({
                    success: true,
                    message: data.message || 'Import completed successfully',
                    count: data.results?.imported || data.count,
                });
                setFile(null);
            } else {
                setResult({
                    success: false,
                    message: data.error || 'Import failed',
                });
            }
        } catch (error) {
            setResult({
                success: false,
                message: 'Something went wrong during upload',
            });
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Import Data</h1>
                <p className="text-gray-400 mt-1">Upload CSV files to import menu data</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Restaurant Selection */}
                    <Card>
                        <CardContent>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Select Restaurant
                            </label>
                            <select
                                value={selectedRestaurant}
                                onChange={(e) => setSelectedRestaurant(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                            >
                                <option value="">Select a restaurant...</option>
                                {restaurants.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </CardContent>
                    </Card>

                    {/* Data Type */}
                    <Card>
                        <CardContent>
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Data Type
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { value: 'menuItems', label: 'Menu Items', icon: '🍽️' },
                                    { value: 'sections', label: 'Sections', icon: '📑' },
                                    { value: 'orderItems', label: 'Orders', icon: '📦' },
                                    { value: 'appEvents', label: 'Events', icon: '📊' },
                                ].map((type) => (
                                    <button
                                        key={type.value}
                                        onClick={() => setDataType(type.value)}
                                        className={`p-3 rounded-lg border transition-all text-left ${
                                            dataType === type.value
                                                ? 'bg-white text-black border-white'
                                                : 'bg-gray-800 text-white border-gray-700 hover:border-gray-600'
                                        }`}
                                    >
                                        <span className="text-xl">{type.icon}</span>
                                        <p className="text-sm font-medium mt-1">{type.label}</p>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* File Upload */}
                    <Card>
                        <CardContent>
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Upload CSV File
                            </label>
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                                    dragActive
                                        ? 'border-white bg-white/5'
                                        : 'border-gray-700 hover:border-gray-600'
                                }`}
                            >
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                
                                {file ? (
                                    <div className="space-y-2">
                                        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="text-white font-medium">{file.name}</p>
                                        <p className="text-sm text-gray-400">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                            }}
                                            className="text-sm text-red-400 hover:text-red-300"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                            </svg>
                                        </div>
                                        <p className="text-white font-medium">Drop your CSV file here</p>
                                        <p className="text-sm text-gray-400">or click to browse</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Result */}
                    {result && (
                        <Card className={result.success ? 'border-green-500/20' : 'border-red-500/20'}>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    {result.success ? (
                                        <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                                            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                                            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                    )}
                                    <div>
                                        <p className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                                            {result.success ? 'Import Successful' : 'Import Failed'}
                                        </p>
                                        <p className="text-sm text-gray-400">{result.message}</p>
                                        {result.count !== undefined && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                {result.count} items imported
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Upload Button */}
                    <Button
                        onClick={handleUpload}
                        disabled={!file || !selectedRestaurant || uploading}
                        loading={uploading}
                        size="lg"
                        className="w-full"
                    >
                        {uploading ? 'Uploading...' : 'Import Data'}
                    </Button>
                </div>

                {/* Help Section */}
                <div className="space-y-6">
                    <Card>
                        <CardContent>
                            <h3 className="text-lg font-semibold text-white mb-4">CSV Format</h3>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <p className="text-gray-400 mb-1">Menu Items</p>
                                    <code className="text-xs text-green-400 bg-gray-800 px-2 py-1 rounded">
                                        name,price,cost,description,type
                                    </code>
                                </div>
                                <div>
                                    <p className="text-gray-400 mb-1">Sections</p>
                                    <code className="text-xs text-green-400 bg-gray-800 px-2 py-1 rounded">
                                        name,position
                                    </code>
                                </div>
                                <div>
                                    <p className="text-gray-400 mb-1">Orders</p>
                                    <code className="text-xs text-green-400 bg-gray-800 px-2 py-1 rounded">
                                        item_id,quantity,price,date
                                    </code>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <h3 className="text-lg font-semibold text-white mb-4">Tips</h3>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    Use UTF-8 encoding for special characters
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    Include header row with column names
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    Use decimal format for prices (e.g., 12.99)
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-yellow-400 mt-0.5">!</span>
                                    Max file size: 10MB
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
