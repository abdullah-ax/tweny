"use client";

import { useState } from "react";
import { AIAgentChat } from "@/components/editor/AIAgentChat";

export function MenuEditorShell() {
    const [status, setStatus] = useState("Ready");

    return (
        <div className="flex min-h-screen flex-col">
            <header className="border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">tweny AI</h1>
                        <p className="text-sm text-slate-500">Menu optimization workspace</p>
                    </div>
                    <span className="text-sm text-slate-600">Status: {status}</span>
                </div>
            </header>

            <div className="flex flex-1">
                <aside className="w-64 border-r p-4">
                    <h2 className="text-sm font-semibold text-slate-700">Components</h2>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li>Menu Items</li>
                        <li>Sections</li>
                        <li>Highlights</li>
                    </ul>
                </aside>

                <section className="flex-1 p-6">
                    <div className="h-full rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
                        <p className="text-sm text-slate-500">
                            Canvas placeholder — drag and drop menu items here.
                        </p>
                    </div>
                </section>

                <aside className="w-72 border-l p-4">
                    <h2 className="text-sm font-semibold text-slate-700">Properties</h2>
                    <p className="mt-3 text-sm text-slate-600">Select an element to edit.</p>
                </aside>
            </div>

            <AIAgentChat onStatusChange={setStatus} />
        </div>
    );
}
