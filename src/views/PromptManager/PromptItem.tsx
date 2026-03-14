import { Prompt } from "@/utils/prompts";
import { usePromptManagerStore } from "@/stores/SavedPrompts";

type PromptItemProps = Prompt & { onEdit: (pattern: string) => void };

export const PromptItem = ({ id, pattern, content, isDefault, selector, onEdit }: PromptItemProps) => {
    const { deletePrompt, setDefaultPrompt } = usePromptManagerStore();

    const handleDelete = () => {
        deletePrompt(id);
    };

    const handleSetDefault = () => {
        setDefaultPrompt(id);
    };

    return (
        <div className="prompt-item">
            <div className="prompt-pattern" title={pattern}>{pattern}</div>
            <div className="prompt-selector" title={selector}>{selector}</div>
            <div className="prompt-content">{content}</div>
            <div className="prompt-actions">
                <button className="btn" onClick={() => onEdit(pattern)}>Edit</button>
                <button className="btn" onClick={handleDelete}>Delete</button>
                <button className={`btn ${isDefault ? 'selected' : ''}`} onClick={handleSetDefault}>
                    {isDefault ? 'Default Prompt' : 'Set as Default'}
                </button>
            </div>
        </div>
    );
};