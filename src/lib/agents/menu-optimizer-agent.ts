export type AgentResult = {
    answer: string;
    reasoning: string[];
    toolResults: Array<{ tool?: string; result?: unknown; error?: string }>;
};

export async function runAgent(userMessage: string, restaurantId: number): Promise<AgentResult> {
    const reasoning = [`Received message for restaurant ${restaurantId}`];

    return {
        answer: `Thanks! I will analyze your menu next: "${userMessage}".`,
        reasoning,
        toolResults: [],
    };
}
