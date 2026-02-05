import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { restaurantId, name, elements } = await request.json();

        if (!restaurantId || !elements) {
            return NextResponse.json({ error: "Missing restaurantId or elements" }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            layoutId: "mock-layout-id",
            name: name ?? "Custom Layout",
        });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message ?? "Unknown error" }, { status: 500 });
    }
}
