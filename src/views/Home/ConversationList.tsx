import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useConversationsStore } from '@/stores/Conversations';
import { ConversationItem } from './ConversationItem';

export const ConversationList = () => {
    const [, setLocation] = useLocation();
    const {
        conversations,
        totalCount,
        currentPage,
        pageSize,
        isLoading,
        loadConversations,
        loadConversation,
        setPage,
        setSearchQuery,
        deleteConversation,
    } = useConversationsStore();

    const [localSearch, setLocalSearch] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        loadConversations();
    }, []);

    const handleSearchChange = (value: string) => {
        setLocalSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearchQuery(value);
        }, 300);
    };

    const handleItemClick = async (id: string) => {
        await loadConversation(id);
        setLocation('/summary');
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="conversation-list">
            <label>Recent Conversations</label>
            <input
                type="text"
                className="conversation-search"
                placeholder="Search conversations..."
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
            />

            {isLoading && <div className="conversation-list-loading">Loading...</div>}

            {!isLoading && conversations.length === 0 && (
                <div className="conversation-list-empty">No conversations yet</div>
            )}

            {conversations.map((conv) => (
                <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    onClick={() => handleItemClick(conv.id)}
                    onDelete={() => deleteConversation(conv.id)}
                />
            ))}

            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="btn"
                        disabled={currentPage <= 1}
                        onClick={() => setPage(currentPage - 1)}
                    >
                        &lt;
                    </button>
                    <span className="pagination-info">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        className="btn"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage(currentPage + 1)}
                    >
                        &gt;
                    </button>
                </div>
            )}
        </div>
    );
};
