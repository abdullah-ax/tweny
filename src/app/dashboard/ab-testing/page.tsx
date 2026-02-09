'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Users,
    MousePointerClick,
    ShoppingCart,
    DollarSign,
    Download,
    RefreshCw,
    Trophy,
    AlertCircle
} from 'lucide-react';
import { springs, variants, colors } from '@/lib/design-system';

// Types
interface VariantMetrics {
    variant: 'a' | 'b';
    viewCount: number;
    uniqueVisitors: number;
    itemClickCount: number;
    itemClickRate: number;
    addToCartCount: number;
    addToCartRate: number;
    checkoutCount: number;
    checkoutRate: number;
    orderCount: number;
    conversionRate: number;
    totalRevenue: number;
    averageOrderValue: number;
    revenuePerVisitor: number;
}

interface SignificanceResult {
    isSignificant: boolean;
    confidenceLevel: number;
    winner: 'a' | 'b' | 'tie';
    lift: number;
}

interface Restaurant {
    id: number;
    name: string;
}

// Animation variants
const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

// Metric Card Component
function MetricCard({
    title,
    variantA,
    variantB,
    format = 'number',
    icon: Icon,
    winner,
    delay = 0,
}: {
    title: string;
    variantA: number;
    variantB: number;
    format?: 'number' | 'percent' | 'currency';
    icon: React.ElementType;
    winner: 'a' | 'b' | 'tie' | null;
    delay?: number;
}) {
    const formatValue = (value: number) => {
        if (format === 'percent') return `${(value * 100).toFixed(2)}%`;
        if (format === 'currency') return `$${value.toFixed(2)}`;
        return value.toLocaleString();
    };

    const diff = variantA - variantB;
    const percentDiff = variantB !== 0 ? ((variantA - variantB) / variantB) * 100 : 0;

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay, ...springs.smooth }}
        >
            <Card className="overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-neutral-100">
                            <Icon className="w-5 h-5 text-neutral-600" />
                        </div>
                        <h3 className="font-medium text-neutral-700">{title}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Variant A */}
                        <div className={`p-4 rounded-xl ${winner === 'a' ? 'bg-green-50 ring-2 ring-green-200' : 'bg-neutral-50'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-900 text-white">A</span>
                                {winner === 'a' && <Trophy className="w-4 h-4 text-green-600" />}
                            </div>
                            <p className="text-2xl font-bold text-neutral-900">{formatValue(variantA)}</p>
                        </div>

                        {/* Variant B */}
                        <div className={`p-4 rounded-xl ${winner === 'b' ? 'bg-purple-50 ring-2 ring-purple-200' : 'bg-neutral-50'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-600 text-white">B</span>
                                {winner === 'b' && <Trophy className="w-4 h-4 text-purple-600" />}
                            </div>
                            <p className="text-2xl font-bold text-neutral-900">{formatValue(variantB)}</p>
                        </div>
                    </div>

                    {/* Difference indicator */}
                    {winner !== 'tie' && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                            {diff > 0 ? (
                                <>
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                    <span className="text-green-600 font-medium">A is {Math.abs(percentDiff).toFixed(1)}% higher</span>
                                </>
                            ) : diff < 0 ? (
                                <>
                                    <TrendingUp className="w-4 h-4 text-purple-600" />
                                    <span className="text-purple-600 font-medium">B is {Math.abs(percentDiff).toFixed(1)}% higher</span>
                                </>
                            ) : null}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

// Statistical Significance Banner
function SignificanceBanner({ result }: { result: SignificanceResult }) {
    if (!result.isSignificant) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3"
            >
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                    <p className="font-medium text-amber-800">Not yet statistically significant</p>
                    <p className="text-sm text-amber-600">
                        Current confidence: {result.confidenceLevel}%. Need 95%+ for reliable results.
                    </p>
                </div>
            </motion.div>
        );
    }

    const winnerColor = result.winner === 'a' ? 'green' : 'purple';

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-${winnerColor}-50 border border-${winnerColor}-200 rounded-xl p-4 mb-6`}
        >
            <div className="flex items-center gap-3">
                <Trophy className={`w-6 h-6 text-${winnerColor}-600`} />
                <div>
                    <p className={`font-semibold text-${winnerColor}-800`}>
                        Variant {result.winner.toUpperCase()} is the winner!
                    </p>
                    <p className={`text-sm text-${winnerColor}-600`}>
                        {result.confidenceLevel}% confidence • {Math.abs(result.lift).toFixed(1)}% lift in conversion
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// Funnel Visualization
function ConversionFunnel({ metricsA, metricsB }: { metricsA: VariantMetrics; metricsB: VariantMetrics }) {
    const steps = [
        { label: 'Views', a: metricsA.viewCount, b: metricsB.viewCount },
        { label: 'Clicks', a: metricsA.itemClickCount, b: metricsB.itemClickCount },
        { label: 'Add to Cart', a: metricsA.addToCartCount, b: metricsB.addToCartCount },
        { label: 'Checkout', a: metricsA.checkoutCount, b: metricsB.checkoutCount },
        { label: 'Orders', a: metricsA.orderCount, b: metricsB.orderCount },
    ];

    const maxValue = Math.max(...steps.map(s => Math.max(s.a, s.b)));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Conversion Funnel
                </CardTitle>
                <CardDescription>Side-by-side comparison of user journey</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1, ...springs.smooth }}
                        >
                            <div className="flex items-center gap-4 mb-2">
                                <span className="w-24 text-sm font-medium text-neutral-600">{step.label}</span>
                                <div className="flex-1 space-y-1">
                                    {/* Variant A bar */}
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 text-xs font-semibold text-neutral-500">A</span>
                                        <div className="flex-1 h-6 bg-neutral-100 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-neutral-900 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${maxValue > 0 ? (step.a / maxValue) * 100 : 0}%` }}
                                                transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                                            />
                                        </div>
                                        <span className="w-16 text-right text-sm font-medium">{step.a.toLocaleString()}</span>
                                    </div>
                                    {/* Variant B bar */}
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 text-xs font-semibold text-purple-500">B</span>
                                        <div className="flex-1 h-6 bg-neutral-100 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-purple-600 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${maxValue > 0 ? (step.b / maxValue) * 100 : 0}%` }}
                                                transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                                            />
                                        </div>
                                        <span className="w-16 text-right text-sm font-medium">{step.b.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// QR Download Section
function QRDownloadSection({ restaurantId, restaurantName }: { restaurantId: number; restaurantName: string }) {
    const [loading, setLoading] = useState(false);
    const [qrData, setQrData] = useState<{ a: string; b: string } | null>(null);

    const downloadQR = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/export-qr?restaurantId=${restaurantId}`);
            const data = await response.json();
            setQrData({
                a: data.variants.a.svg,
                b: data.variants.b.svg,
            });
        } catch (error) {
            console.error('Failed to fetch QR codes:', error);
        }
        setLoading(false);
    };

    const downloadSvg = (svg: string, variant: 'a' | 'b') => {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${restaurantName.toLowerCase().replace(/\s+/g, '-')}-qr-variant-${variant}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export QR Codes
                </CardTitle>
                <CardDescription>Download high-resolution QR codes for each variant</CardDescription>
            </CardHeader>
            <CardContent>
                {!qrData ? (
                    <motion.button
                        onClick={downloadQR}
                        disabled={loading}
                        className="w-full py-3 px-4 rounded-xl bg-neutral-900 text-white font-medium flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Generate QR Codes
                            </>
                        )}
                    </motion.button>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <div
                                className="mb-3 bg-white rounded-xl p-4 border"
                                dangerouslySetInnerHTML={{ __html: qrData.a.replace(/width="500"/g, 'width="100%"').replace(/height="600"/g, 'height="auto"') }}
                            />
                            <button
                                onClick={() => downloadSvg(qrData.a, 'a')}
                                className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-700 text-sm font-medium hover:bg-neutral-200 transition-colors"
                            >
                                Download Variant A
                            </button>
                        </div>
                        <div className="text-center">
                            <div
                                className="mb-3 bg-white rounded-xl p-4 border"
                                dangerouslySetInnerHTML={{ __html: qrData.b.replace(/width="500"/g, 'width="100%"').replace(/height="600"/g, 'height="auto"') }}
                            />
                            <button
                                onClick={() => downloadSvg(qrData.b, 'b')}
                                className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 text-sm font-medium hover:bg-purple-200 transition-colors"
                            >
                                Download Variant B
                            </button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Main Dashboard Content
function ABTestingDashboardContent() {
    const searchParams = useSearchParams();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
    const [metricsA, setMetricsA] = useState<VariantMetrics | null>(null);
    const [metricsB, setMetricsB] = useState<VariantMetrics | null>(null);
    const [significance, setSignificance] = useState<SignificanceResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch restaurants
    useEffect(() => {
        async function fetchRestaurants() {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/restaurants', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                const restaurantList = data.restaurants || [];
                setRestaurants(restaurantList);

                const urlRestaurantId = searchParams.get('restaurantId');
                if (urlRestaurantId) {
                    setSelectedRestaurant(parseInt(urlRestaurantId));
                } else if (restaurantList.length > 0) {
                    setSelectedRestaurant(restaurantList[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch restaurants:', error);
            }
            setLoading(false);
        }

        fetchRestaurants();
    }, [searchParams]);

    // Fetch metrics when restaurant is selected
    useEffect(() => {
        if (!selectedRestaurant) return;

        async function fetchMetrics() {
            setRefreshing(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/analytics/ab-metrics?restaurantId=${selectedRestaurant}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();

                setMetricsA(data.a);
                setMetricsB(data.b);
                setSignificance(data.significance);
            } catch (error) {
                console.error('Failed to fetch metrics:', error);
                // Set empty metrics for demo
                const emptyMetrics: VariantMetrics = {
                    variant: 'a',
                    viewCount: 0,
                    uniqueVisitors: 0,
                    itemClickCount: 0,
                    itemClickRate: 0,
                    addToCartCount: 0,
                    addToCartRate: 0,
                    checkoutCount: 0,
                    checkoutRate: 0,
                    orderCount: 0,
                    conversionRate: 0,
                    totalRevenue: 0,
                    averageOrderValue: 0,
                    revenuePerVisitor: 0,
                };
                setMetricsA({ ...emptyMetrics, variant: 'a' });
                setMetricsB({ ...emptyMetrics, variant: 'b' });
                setSignificance({ isSignificant: false, confidenceLevel: 0, winner: 'tie', lift: 0 });
            }
            setRefreshing(false);
        }

        fetchMetrics();
    }, [selectedRestaurant]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    const selectedRestaurantData = restaurants.find(r => r.id === selectedRestaurant);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">A/B Testing Dashboard</h1>
                    <p className="text-neutral-500">Compare menu variant performance</p>
                </div>

                {/* Restaurant Selector */}
                <select
                    value={selectedRestaurant || ''}
                    onChange={(e) => setSelectedRestaurant(parseInt(e.target.value))}
                    className="px-4 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-700 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                    {restaurants.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
            </div>

            {/* Statistical Significance Banner */}
            {significance && <SignificanceBanner result={significance} />}

            {/* Metrics Grid */}
            {metricsA && metricsB && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <MetricCard
                            title="Page Views"
                            variantA={metricsA.viewCount}
                            variantB={metricsB.viewCount}
                            icon={Users}
                            winner={significance?.winner || 'tie'}
                            delay={0}
                        />
                        <MetricCard
                            title="Click Rate"
                            variantA={metricsA.itemClickRate}
                            variantB={metricsB.itemClickRate}
                            format="percent"
                            icon={MousePointerClick}
                            winner={significance?.winner || 'tie'}
                            delay={0.1}
                        />
                        <MetricCard
                            title="Add to Cart Rate"
                            variantA={metricsA.addToCartRate}
                            variantB={metricsB.addToCartRate}
                            format="percent"
                            icon={ShoppingCart}
                            winner={significance?.winner || 'tie'}
                            delay={0.2}
                        />
                        <MetricCard
                            title="Conversion Rate"
                            variantA={metricsA.conversionRate}
                            variantB={metricsB.conversionRate}
                            format="percent"
                            icon={TrendingUp}
                            winner={significance?.winner || 'tie'}
                            delay={0.3}
                        />
                        <MetricCard
                            title="Average Order Value"
                            variantA={metricsA.averageOrderValue}
                            variantB={metricsB.averageOrderValue}
                            format="currency"
                            icon={DollarSign}
                            winner={significance?.winner || 'tie'}
                            delay={0.4}
                        />
                        <MetricCard
                            title="Total Revenue"
                            variantA={metricsA.totalRevenue}
                            variantB={metricsB.totalRevenue}
                            format="currency"
                            icon={DollarSign}
                            winner={significance?.winner || 'tie'}
                            delay={0.5}
                        />
                    </div>

                    {/* Funnel & QR Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ConversionFunnel metricsA={metricsA} metricsB={metricsB} />
                        {selectedRestaurantData && (
                            <QRDownloadSection
                                restaurantId={selectedRestaurant!}
                                restaurantName={selectedRestaurantData.name}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// Main Page Component
export default function ABTestingDashboard() {
    return (
        <div className="p-6">
            <Suspense fallback={
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-neutral-400" />
                </div>
            }>
                <ABTestingDashboardContent />
            </Suspense>
        </div>
    );
}
