import { IoTrash } from 'react-icons/io5';
import { ConversationSummary } from '@/views/Summary/types';

interface ConversationItemProps {
    conversation: ConversationSummary;
    onClick: () => void;
    onDelete: () => void;
}

function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export const ConversationItem = ({ conversation, onClick, onDelete }: ConversationItemProps) => {
    return (
        <div className="conversation-item" onClick={onClick}>
            <div className="conversation-item-content">
                <div className="conversation-title">{conversation.title}</div>
                <div className="conversation-meta">
                    {formatDate(conversation.updatedAt)} &middot; {conversation.provider}/{conversation.model} &middot; {conversation.messageCount} messages
                </div>
            </div>
            <button
                className="conversation-delete"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                title="Delete conversation"
            >
                <IoTrash size={14} />
            </button>
        </div>
    );
};
