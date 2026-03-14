import { create } from 'zustand';
import { Prompt, getPrompts, savePrompt } from '@/utils/prompts';
import { dbDeletePrompt, dbSetDefaultPrompt } from '@/utils/db';
import { migratePromptsToIndexedDB } from '@/utils/migration';
import { CONSTANTS } from '@/constants';

interface PromptManagerState {
    prompts: Prompt[];
    isLoading: boolean;
    error: string | null;
    initializePrompts: () => Promise<void>;
    addPrompt: (prompt: Prompt) => Promise<void>;
    deletePrompt: (id: string) => Promise<void>;
    setDefaultPrompt: (id: string) => Promise<void>;
}

export const usePromptManagerStore = create<PromptManagerState>((set) => ({
    prompts: [],
    isLoading: true,
    error: null,

    initializePrompts: async () => {
        try {
            set({ isLoading: true, error: null });

            // Migrate from chrome.storage.sync to IndexedDB on first run
            await migratePromptsToIndexedDB();

            let savedPrompts = await getPrompts();

            // If no prompts exist, create the default one
            if (savedPrompts.length === 0) {
                const defaultPrompt: Prompt = {
                    id: 'default',
                    name: 'Default System Prompt',
                    content: CONSTANTS.DEFAULT_SYSTEM_PROMPT,
                    pattern: 'Default',
                    isDefault: true
                };

                await savePrompt(defaultPrompt);
                savedPrompts = await getPrompts();
            }

            set({ prompts: savedPrompts, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load prompts',
                isLoading: false
            });
        }
    },

    addPrompt: async (prompt: Prompt) => {
        try {
            await savePrompt(prompt);
            // Refresh prompts after saving
            const savedPrompts = await getPrompts();
            set({ prompts: savedPrompts });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to save prompt' });
        }
    },

    deletePrompt: async (id: string) => {
        try {
            await dbDeletePrompt(id);

            // Refresh prompts after deletion
            const updatedPrompts = await getPrompts();
            set({ prompts: updatedPrompts });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to remove prompt' });
        }
    },

    setDefaultPrompt: async (id: string) => {
        try {
            await dbSetDefaultPrompt(id);

            // Refresh prompts after updating
            const updatedPrompts = await getPrompts();
            set({ prompts: updatedPrompts });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to set default prompt' });
        }
    }
}));

// Initialize prompts when the store is first imported
usePromptManagerStore.getState().initializePrompts();
