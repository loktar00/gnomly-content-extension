import { storage } from './storage';
import { dbSavePrompt } from './db';
import { Prompt } from './prompts';

const MIGRATION_FLAG = 'gnomly-prompts-migrated';

export async function migratePromptsToIndexedDB(): Promise<void> {
    if (localStorage.getItem(MIGRATION_FLAG)) {
        return;
    }

    try {
        const result = await storage.sync.get('savedPrompts') as {
            savedPrompts?: Record<string, {
                content: string;
                isDefault: boolean;
                id: string;
                name: string;
                pattern: string;
                selector?: string;
            }>;
        };

        const savedPrompts = result.savedPrompts || {};

        for (const [pattern, prompt] of Object.entries(savedPrompts)) {
            const dbPrompt: Prompt = {
                id: prompt.id || pattern,
                name: prompt.name || pattern,
                content: prompt.content,
                pattern: prompt.pattern || pattern,
                isDefault: prompt.isDefault || false,
                selector: prompt.selector,
            };
            await dbSavePrompt(dbPrompt);
        }

        localStorage.setItem(MIGRATION_FLAG, 'true');
    } catch (error) {
        console.error('Failed to migrate prompts to IndexedDB:', error);
    }
}
