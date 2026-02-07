"use client";

import { useState } from "react";

type Props = {
    onStatusChange?: (status: string) => void;
};

export function AIAgentChat({ onStatusChange }: Props) {
    const [message, setMessage] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const askAgent = async () => {
        if (!message.trim()) return;
        setIsLoading(true);
        onStatusChange?.("Thinking");

        try {
            const response = await fetch("/api/agent/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, restaurantId: 1 }),
            });
            const data = await response.json();
            const next = data?.response ?? "Unable to generate response. Please try again.";
            setHistory((prev) => [...prev, `You: ${message}`, `AI: ${next}`]);
        } catch {
            setHistory((prev) => [...prev, "AI: Unable to reach agent service."]);
        } finally {
            setIsLoading(false);
            onStatusChange?.("Ready");
            setMessage("");
        }
    };

    return (
        <div className="border-t bg-white px-6 py-4">
            <div className="mx-auto flex max-w-4xl gap-3">
                <input
                    className="flex-1 rounded border px-3 py-2 text-sm"
                    placeholder="Ask AI about your menu..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && askAgent()}
                    disabled={isLoading}
                />
                <button
                    className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
                    onClick={askAgent}
                    disabled={isLoading}
                >
                    {isLoading ? "Thinking..." : "Ask AI"}
                </button>
            </div>
            {history.length > 0 && (
                <div className="mx-auto mt-3 max-w-4xl space-y-1 text-xs text-slate-600">
                    {history.map((entry, index) => (
                        <div key={index}>{entry}</div>
                    ))}
                </div>
            )}
        </div>
    );
}
