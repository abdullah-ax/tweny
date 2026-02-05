import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agents/menu-optimizer-agent";

export async function POST(request: Request) {
    try {
        const { message, restaurantId } = await request.json();

        if (!message || !restaurantId) {
            return NextResponse.json({ error: "Missing message or restaurantId" }, { status: 400 });
        }

        const result = await runAgent(message, Number(restaurantId));
        return NextResponse.json({
            success: true,
            response: result.answer,
            reasoning: result.reasoning,
            toolResults: result.toolResults,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message ?? "Unknown error" }, { status: 500 });
    }
}
