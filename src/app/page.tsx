'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MenuEditorShell } from "@/components/editor/MenuEditorShell";

export default function HomePage() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        } else {
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <main className="min-h-screen">
            <MenuEditorShell />
        </main>
    );
}
