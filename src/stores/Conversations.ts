import { create } from 'zustand';
import { Message, Conversation, ConversationSummary } from '@/views/Summary/types';
import {
    dbSaveConversation,
    dbGetConversation,
    dbUpdateConversationMessages,
    dbUpdateConversationTitle,
    dbDeleteConversation,
    dbGetConversations,
} from '@/utils/db';

interface ConversationsState {
    // List
    conversations: ConversationSummary[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    searchQuery: string;
    isLoading: boolean;

    // Active conversation
    activeConversationId: string | null;
    activeMessages: Message[];

    // List actions
    loadConversations: () => Promise<void>;
    setPage: (page: number) => void;
    setSearchQuery: (query: string) => void;
    deleteConversation: (id: string) => Promise<void>;

    // Active conversation actions
    startNewConversation: (provider: string, model: string, systemPrompt?: string, sourceUrl?: string) => string;
    loadConversation: (id: string) => Promise<void>;
    addMessage: (message: Message) => Promise<void>;
    updateTitle: (title: string) => Promise<void>;
    clearActiveConversation: () => void;
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
    conversations: [],
    totalCount: 0,
    currentPage: 1,
    pageSize: 10,
    searchQuery: '',
    isLoading: false,

    activeConversationId: null,
    activeMessages: [],

    loadConversations: async () => {
        const { currentPage, pageSize, searchQuery } = get();
        set({ isLoading: true });
        try {
            const result = await dbGetConversations({
                page: currentPage,
                pageSize,
                search: searchQuery || undefined,
            });
            set({
                conversations: result.items,
                totalCount: result.total,
                isLoading: false,
            });
        } catch (error) {
            console.error('Failed to load conversations:', error);
            set({ isLoading: false });
        }
    },

    setPage: (page: number) => {
        set({ currentPage: page });
        get().loadConversations();
    },

    setSearchQuery: (query: string) => {
        set({ searchQuery: query, currentPage: 1 });
        get().loadConversations();
    },

    deleteConversation: async (id: string) => {
        try {
            await dbDeleteConversation(id);
            const { activeConversationId } = get();
            if (activeConversationId === id) {
                set({ activeConversationId: null, activeMessages: [] });
            }
            await get().loadConversations();
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    },

    startNewConversation: (provider: string, model: string, systemPrompt?: string, sourceUrl?: string) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const conversation: Conversation = {
            id,
            title: 'New conversation',
            messages: [],
            createdAt: now,
            updatedAt: now,
            provider,
            model,
            systemPrompt,
            sourceUrl,
        };

        set({ activeConversationId: id, activeMessages: [] });

        // Save to IndexedDB in background
        dbSaveConversation(conversation).catch((err) =>
            console.error('Failed to save new conversation:', err)
        );

        return id;
    },

    loadConversation: async (id: string) => {
        try {
            const conversation = await dbGetConversation(id);
            if (conversation) {
                set({
                    activeConversationId: conversation.id,
                    activeMessages: conversation.messages,
                });
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    },

    addMessage: async (message: Message) => {
        const { activeConversationId, activeMessages } = get();
        if (!activeConversationId) return;

        const updated = [...activeMessages, message];
        set({ activeMessages: updated });

        try {
            await dbUpdateConversationMessages(activeConversationId, updated);
        } catch (error) {
            console.error('Failed to persist message:', error);
        }
    },

    updateTitle: async (title: string) => {
        const { activeConversationId } = get();
        if (!activeConversationId) return;

        try {
            await dbUpdateConversationTitle(activeConversationId, title);
        } catch (error) {
            console.error('Failed to update conversation title:', error);
        }
    },

    clearActiveConversation: () => {
        set({ activeConversationId: null, activeMessages: [] });
    },
}));
