import { Prompt } from './prompts';
import { Conversation, ConversationSummary } from '@/views/Summary/types';
import { Message } from '@/views/Summary/types';

const DB_NAME = 'gnomly-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains('prompts')) {
                    const promptStore = db.createObjectStore('prompts', { keyPath: 'id' });
                    promptStore.createIndex('pattern', 'pattern', { unique: true });
                    promptStore.createIndex('isDefault', 'isDefault', { unique: false });
                }

                if (!db.objectStoreNames.contains('conversations')) {
                    const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
                    convStore.createIndex('title', 'title', { unique: false });
                    convStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return dbPromise;
}

// --- Prompt functions ---

export async function dbGetAllPrompts(): Promise<Prompt[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('prompts', 'readonly');
        const store = tx.objectStore('prompts');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function dbSavePrompt(prompt: Prompt): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('prompts', 'readwrite');
        const store = tx.objectStore('prompts');

        if (prompt.isDefault) {
            // Remove isDefault from all other prompts
            const cursorReq = store.openCursor();
            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (cursor) {
                    const value = cursor.value;
                    if (value.isDefault && value.id !== prompt.id) {
                        value.isDefault = false;
                        cursor.update(value);
                    }
                    cursor.continue();
                } else {
                    // All existing defaults cleared, now save the prompt
                    const putReq = store.put(prompt);
                    putReq.onerror = () => reject(putReq.error);
                }
            };
        } else {
            store.put(prompt);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function dbDeletePrompt(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('prompts', 'readwrite');
        const store = tx.objectStore('prompts');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function dbSetDefaultPrompt(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('prompts', 'readwrite');
        const store = tx.objectStore('prompts');

        const cursorReq = store.openCursor();
        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
                const value = cursor.value;
                const shouldBeDefault = value.id === id;
                if (value.isDefault !== shouldBeDefault) {
                    value.isDefault = shouldBeDefault;
                    cursor.update(value);
                }
                cursor.continue();
            }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// --- Conversation functions ---

export async function dbSaveConversation(conversation: Conversation): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('conversations', 'readwrite');
        const store = tx.objectStore('conversations');
        store.put(conversation);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function dbGetConversation(id: string): Promise<Conversation | undefined> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('conversations', 'readonly');
        const store = tx.objectStore('conversations');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || undefined);
        request.onerror = () => reject(request.error);
    });
}

export async function dbUpdateConversationMessages(id: string, messages: Message[]): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('conversations', 'readwrite');
        const store = tx.objectStore('conversations');
        const getReq = store.get(id);

        getReq.onsuccess = () => {
            const conversation = getReq.result;
            if (conversation) {
                conversation.messages = messages;
                conversation.updatedAt = Date.now();
                store.put(conversation);
            }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function dbUpdateConversationTitle(id: string, title: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('conversations', 'readwrite');
        const store = tx.objectStore('conversations');
        const getReq = store.get(id);

        getReq.onsuccess = () => {
            const conversation = getReq.result;
            if (conversation) {
                conversation.title = title;
                conversation.updatedAt = Date.now();
                store.put(conversation);
            }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function dbDeleteConversation(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('conversations', 'readwrite');
        const store = tx.objectStore('conversations');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function dbGetConversations(opts: {
    page: number;
    pageSize: number;
    search?: string;
}): Promise<{ items: ConversationSummary[]; total: number }> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('conversations', 'readonly');
        const store = tx.objectStore('conversations');
        const index = store.index('updatedAt');

        const allItems: ConversationSummary[] = [];
        const request = index.openCursor(null, 'prev'); // most recent first

        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                const conv = cursor.value as Conversation;
                const searchLower = opts.search?.toLowerCase();

                if (!searchLower || conv.title.toLowerCase().includes(searchLower)) {
                    allItems.push({
                        id: conv.id,
                        title: conv.title,
                        createdAt: conv.createdAt,
                        updatedAt: conv.updatedAt,
                        provider: conv.provider,
                        model: conv.model,
                        messageCount: conv.messages.length,
                    });
                }
                cursor.continue();
            }
        };

        tx.oncomplete = () => {
            const start = (opts.page - 1) * opts.pageSize;
            const items = allItems.slice(start, start + opts.pageSize);
            resolve({ items, total: allItems.length });
        };
        tx.onerror = () => reject(tx.error);
    });
}
