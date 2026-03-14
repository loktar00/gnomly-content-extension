export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AISettings {
    url: string;
    model: string;
    num_ctx: number;
    provider: string;
    api_key?: string;
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
    provider: string;
    model: string;
    systemPrompt?: string;
    sourceUrl?: string;
}

export interface ConversationSummary {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    provider: string;
    model: string;
    messageCount: number;
}