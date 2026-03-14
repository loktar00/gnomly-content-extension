import { dbGetAllPrompts, dbSavePrompt } from './db';

export type Prompt = {
    id: string;
    name: string;
    content: string;
    pattern: string;
    isDefault?: boolean;
    selector?: string; // CSS selector for the element to get content from
};

// Save a prompt
export async function savePrompt(prompt: Prompt) {
    // Clean pattern and save prompt
    const cleanPattern = prompt.pattern.replace(/^www\./, '');

    await dbSavePrompt({
        ...prompt,
        pattern: cleanPattern,
        isDefault: prompt.isDefault || false,
        selector: prompt.selector || '',
    });
}

// Get all prompts
export async function getPrompts(): Promise<Prompt[]> {
    return dbGetAllPrompts();
}

// Get the current default prompt (either user-set or system)
export async function getDefaultPrompt(): Promise<Prompt> {
    const prompts = await getPrompts();
    return prompts.find(prompt => prompt.isDefault) as Prompt;
}
