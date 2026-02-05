'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, Input, Modal, Badge } from '@/components/ui';

interface MenuItem {
    id: number;
    name: string;
    description: string | null;
    price: string;
    cost: string | null;
    type: string | null;
    status: string;
    sectionId: number | null;
}

interface MenuSection {
    id: number;
    name: string;
    position: number;
}

interface Restaurant {
    id: number;
    name: string;
    description: string | null;
}

export default function RestaurantDetailPage() {
    const params = useParams();
    const router = useRouter();
    const restaurantId = params.id as string;

    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [sections, setSections] = useState<MenuSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        cost: '',
        type: 'main',
        sectionId: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [activeSection, setActiveSection] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
    }, [restaurantId]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Fetch restaurant details
            const resRestaurant = await fetch(`/api/restaurants/${restaurantId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            if (!resRestaurant.ok) {
                router.push('/dashboard/restaurants');
                return;
            }
            
            const restaurantData = await resRestaurant.json();
            setRestaurant(restaurantData.restaurant);

            // Fetch menu items
            const resMenu = await fetch(`/api/restaurants/${restaurantId}/menu`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            if (resMenu.ok) {
                const menuData = await resMenu.json();
                setMenuItems(menuData.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.price) {
            setError('Name and price are required');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/restaurants/${restaurantId}/menu`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    sectionId: formData.sectionId ? parseInt(formData.sectionId) : undefined,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setMenuItems([...menuItems, data.item]);
                setIsModalOpen(false);
                setFormData({ name: '', description: '', price: '', cost: '', type: 'main', sectionId: '' });
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to create menu item');
            }
        } catch (error) {
            setError('Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const formatPrice = (price: string) => {
        const num = parseFloat(price);
        return isNaN(num) ? price : `$${num.toFixed(2)}`;
    };

    const getMargin = (price: string, cost: string | null) => {
        if (!cost) return null;
        const priceNum = parseFloat(price);
        const costNum = parseFloat(cost);
        if (isNaN(priceNum) || isNaN(costNum) || priceNum === 0) return null;
        return Math.round(((priceNum - costNum) / priceNum) * 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!restaurant) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
                <Link href="/dashboard/restaurants" className="text-gray-400 hover:text-white transition-colors">
                    Restaurants
                </Link>
                <span className="text-gray-600">/</span>
                <span className="text-white">{restaurant.name}</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
                    <p className="text-gray-400 mt-1">{restaurant.description || 'Manage your menu items'}</p>
                </div>
                <div className="flex gap-3">
                    <Link href={`/dashboard/analytics?restaurant=${restaurantId}`}>
                        <Button variant="secondary">
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                            </svg>
                            Analytics
                        </Button>
                    </Link>
                    <Button onClick={() => setIsModalOpen(true)}>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Item
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card padding="sm">
                    <CardContent>
                        <p className="text-sm text-gray-400">Total Items</p>
                        <p className="text-2xl font-bold text-white mt-1">{menuItems.length}</p>
                    </CardContent>
                </Card>
                <Card padding="sm">
                    <CardContent>
                        <p className="text-sm text-gray-400">Active</p>
                        <p className="text-2xl font-bold text-green-400 mt-1">
                            {menuItems.filter(i => i.status === 'active').length}
                        </p>
                    </CardContent>
                </Card>
                <Card padding="sm">
                    <CardContent>
                        <p className="text-sm text-gray-400">Avg Price</p>
                        <p className="text-2xl font-bold text-white mt-1">
                            {menuItems.length > 0
                                ? formatPrice(
                                    (menuItems.reduce((sum, i) => sum + parseFloat(i.price || '0'), 0) / menuItems.length).toString()
                                )
                                : '—'}
                        </p>
                    </CardContent>
                </Card>
                <Card padding="sm">
                    <CardContent>
                        <p className="text-sm text-gray-400">Avg Margin</p>
                        <p className="text-2xl font-bold text-white mt-1">
                            {menuItems.filter(i => i.cost).length > 0
                                ? `${Math.round(
                                    menuItems
                                        .filter(i => i.cost)
                                        .reduce((sum, i) => sum + (getMargin(i.price, i.cost) || 0), 0) /
                                    menuItems.filter(i => i.cost).length
                                )}%`
                                : '—'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Menu Items */}
            {menuItems.length === 0 ? (
                <Card>
                    <CardContent>
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No menu items yet</h3>
                            <p className="text-gray-400 mb-6">Add items to your menu or import from CSV</p>
                            <div className="flex gap-3 justify-center">
                                <Button onClick={() => setIsModalOpen(true)}>Add Item</Button>
                                <Link href={`/dashboard/import?restaurant=${restaurantId}`}>
                                    <Button variant="secondary">Import CSV</Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card padding="none">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-800">
                                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                                        Item
                                    </th>
                                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                                        Type
                                    </th>
                                    <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                                        Price
                                    </th>
                                    <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                                        Cost
                                    </th>
                                    <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                                        Margin
                                    </th>
                                    <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {menuItems.map((item) => {
                                    const margin = getMargin(item.price, item.cost);
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-medium text-white">{item.name}</p>
                                                    {item.description && (
                                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-400 capitalize">
                                                    {item.type || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-medium text-white">
                                                    {formatPrice(item.price)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm text-gray-400">
                                                    {item.cost ? formatPrice(item.cost) : '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {margin !== null ? (
                                                    <span className={`text-sm font-medium ${
                                                        margin >= 70 ? 'text-green-400' :
                                                        margin >= 50 ? 'text-yellow-400' :
                                                        'text-red-400'
                                                    }`}>
                                                        {margin}%
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-500">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant={item.status === 'active' ? 'success' : 'default'}>
                                                    {item.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Create Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setFormData({ name: '', description: '', price: '', cost: '', type: 'main', sectionId: '' });
                    setError('');
                }}
                title="Add Menu Item"
                description="Add a new item to your menu"
                size="lg"
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Item Name"
                            placeholder="e.g., Caesar Salad"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            error={error && !formData.name ? error : undefined}
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                            >
                                <option value="appetizer">Appetizer</option>
                                <option value="main">Main Course</option>
                                <option value="side">Side</option>
                                <option value="dessert">Dessert</option>
                                <option value="beverage">Beverage</option>
                            </select>
                        </div>
                    </div>
                    <Input
                        label="Description"
                        placeholder="Optional description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Price"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            error={error && !formData.price ? 'Price is required' : undefined}
                        />
                        <Input
                            label="Cost (Optional)"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.cost}
                            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                            hint="For margin calculation"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" loading={submitting} className="flex-1">
                            Add Item
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
