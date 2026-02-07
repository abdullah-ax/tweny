'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Document {
    id: number;
    name: string;
    type: string;
    mimeType: string | null;
    fileSize: number | null;
    storageUrl: string | null;
    thumbnailUrl: string | null;
    extractedData: {
        menuItems?: unknown[];
        colors?: unknown;
        text?: string;
        pageCount?: number;
    } | null;
    status: string;
    createdAt: string;
}

interface Restaurant {
    id: number;
    name: string;
}

export default function DocumentsPage() {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

    // Fetch user's restaurants
    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const response = await fetch('/api/restaurants', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) throw new Error('Failed to fetch restaurants');

                const data = await response.json();
                setRestaurants(data.restaurants || []);

                if (data.restaurants?.length > 0) {
                    setSelectedRestaurant(data.restaurants[0].id);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load restaurants');
            }
        };

        fetchRestaurants();
    }, [router]);

    // Fetch documents when restaurant changes
    const fetchDocuments = useCallback(async () => {
        if (!selectedRestaurant) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/restaurants/${selectedRestaurant}/documents`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Failed to fetch documents');

            const data = await response.json();
            setDocuments(data.documents || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, [selectedRestaurant]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedRestaurant) return;

        setUploading(true);
        try {
            // Convert file to base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target?.result as string;

                // Determine document type
                let docType = 'other';
                if (file.type.includes('pdf')) docType = 'menu_pdf';
                else if (file.type.includes('image')) docType = 'menu_image';
                else if (file.name.includes('sales') || file.name.includes('csv')) docType = 'sales_data';

                const token = localStorage.getItem('token');
                const response = await fetch(`/api/restaurants/${selectedRestaurant}/documents`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: file.name,
                        type: docType,
                        mimeType: file.type,
                        fileSize: file.size,
                        storageUrl: base64,
                        thumbnailUrl: file.type.includes('image') ? base64 : null,
                    }),
                });

                if (!response.ok) throw new Error('Failed to upload document');

                await fetchDocuments();
            };
            reader.readAsDataURL(file);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    // Handle document deletion
    const handleDelete = async (documentId: number) => {
        if (!selectedRestaurant || !confirm('Are you sure you want to delete this document?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `/api/restaurants/${selectedRestaurant}/documents?documentId=${documentId}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!response.ok) throw new Error('Failed to delete document');

            setDocuments(docs => docs.filter(d => d.id !== documentId));
            if (selectedDoc?.id === documentId) setSelectedDoc(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete document');
        }
    };

    // Format file size
    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return 'Unknown size';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Get icon for document type
    const getDocIcon = (type: string) => {
        switch (type) {
            case 'menu_pdf':
                return (
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                );
            case 'menu_image':
                return (
                    <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                );
            case 'sales_data':
                return (
                    <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
        }
    };

    const getTypeBadge = (type: string) => {
        const variants: Record<string, 'info' | 'success' | 'warning'> = {
            menu_pdf: 'info',
            menu_image: 'warning',
            sales_data: 'success',
        };
        const labels: Record<string, string> = {
            menu_pdf: 'Menu PDF',
            menu_image: 'Menu Image',
            sales_data: 'Sales Data',
            other: 'Other',
        };
        return <Badge variant={variants[type] || 'info'}>{labels[type] || type}</Badge>;
    };

    if (!restaurants.length && !loading) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="py-12 text-center">
                        <h3 className="text-lg font-medium text-white mb-2">No Restaurant Found</h3>
                        <p className="text-gray-400 mb-4">You need to create a restaurant first.</p>
                        <Button onClick={() => router.push('/dashboard/onboarding')}>
                            Get Started
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Documents</h1>
                    <p className="text-gray-400 mt-1">Manage your uploaded menus, images, and data files</p>
                </div>

                {/* Restaurant selector */}
                {restaurants.length > 1 && (
                    <select
                        value={selectedRestaurant || ''}
                        onChange={(e) => setSelectedRestaurant(parseInt(e.target.value))}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        {restaurants.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                    <button onClick={() => setError(null)} className="float-right">×</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Documents List */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Uploaded Documents</CardTitle>
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.png,.jpg,.jpeg,.csv"
                                    onChange={handleFileUpload}
                                    disabled={uploading || !selectedRestaurant}
                                />
                                <Button as="span" loading={uploading} size="sm">
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Upload
                                </Button>
                            </label>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
                                </div>
                            ) : documents.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <h3 className="text-lg font-medium text-white mb-2">No Documents</h3>
                                    <p className="text-gray-400 mb-4">Upload your menu PDF or images to get started</p>
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.png,.jpg,.jpeg,.csv"
                                            onChange={handleFileUpload}
                                            disabled={uploading || !selectedRestaurant}
                                        />
                                        <Button as="span">Upload Document</Button>
                                    </label>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {documents.map((doc) => (
                                        <div
                                            key={doc.id}
                                            onClick={() => setSelectedDoc(doc)}
                                            className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${selectedDoc?.id === doc.id
                                                    ? 'bg-orange-500/10 border-orange-500/50'
                                                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                                                }`}
                                        >
                                            {doc.thumbnailUrl ? (
                                                <img
                                                    src={doc.thumbnailUrl}
                                                    alt={doc.name}
                                                    className="w-12 h-12 object-cover rounded"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                                                    {getDocIcon(doc.type)}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-medium truncate">{doc.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {getTypeBadge(doc.type)}
                                                    <span className="text-xs text-gray-500">
                                                        {formatFileSize(doc.fileSize)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(doc.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(doc.id);
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Document Preview */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>Document Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedDoc ? (
                                <div className="space-y-4">
                                    {/* Preview */}
                                    {selectedDoc.type === 'menu_image' && selectedDoc.storageUrl ? (
                                        <img
                                            src={selectedDoc.storageUrl}
                                            alt={selectedDoc.name}
                                            className="w-full rounded-lg"
                                        />
                                    ) : selectedDoc.type === 'menu_pdf' ? (
                                        <div className="bg-gray-800 rounded-lg p-8 text-center">
                                            <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-gray-400">PDF Document</p>
                                            {selectedDoc.extractedData?.pageCount && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {selectedDoc.extractedData.pageCount} pages
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-800 rounded-lg p-8 text-center">
                                            {getDocIcon(selectedDoc.type)}
                                            <p className="text-gray-400 mt-4">{selectedDoc.type.replace('_', ' ')}</p>
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Name</span>
                                            <span className="text-white truncate ml-4">{selectedDoc.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Type</span>
                                            {getTypeBadge(selectedDoc.type)}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Size</span>
                                            <span className="text-white">{formatFileSize(selectedDoc.fileSize)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Uploaded</span>
                                            <span className="text-white">
                                                {new Date(selectedDoc.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Status</span>
                                            <Badge variant={selectedDoc.status === 'processed' ? 'success' : 'warning'}>
                                                {selectedDoc.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Extracted Data Summary */}
                                    {selectedDoc.extractedData && (
                                        <div className="border-t border-gray-700 pt-4">
                                            <h4 className="text-sm font-medium text-white mb-2">Extracted Data</h4>
                                            {selectedDoc.extractedData.menuItems && (
                                                <p className="text-sm text-gray-400">
                                                    {(selectedDoc.extractedData.menuItems as unknown[]).length} menu items found
                                                </p>
                                            )}
                                            {selectedDoc.extractedData.colors && (
                                                <p className="text-sm text-gray-400">
                                                    Color palette extracted
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-4 border-t border-gray-700">
                                        {selectedDoc.storageUrl && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = selectedDoc.storageUrl!;
                                                    link.download = selectedDoc.name;
                                                    link.click();
                                                }}
                                                className="flex-1"
                                            >
                                                Download
                                            </Button>
                                        )}
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleDelete(selectedDoc.id)}
                                            className="flex-1 text-red-400 hover:bg-red-500/10"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <p>Select a document to view details</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
