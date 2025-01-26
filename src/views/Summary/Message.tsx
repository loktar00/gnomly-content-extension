import { memo } from 'react';
import { IoCopyOutline } from "react-icons/io5";
import { markdownToHtml } from '@/utils/markdown';
import { toast } from 'react-toastify';
import { Message as MessageType } from './types';

const handleCopyToClipboard = async (content: string) => {
    try {
        await navigator.clipboard.writeText(content);
        toast.success("Transcript copied to clipboard!");
    } catch (error) {
        toast.error(`Failed to copy text to clipboard. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export const Message = memo(({ role, content }: MessageType) => (
    <div className={`message ${role}-message`}>
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />
        <div className="message-controls">
            <IoCopyOutline onClick={() => handleCopyToClipboard(content)} size={20}/>
        </div>
    </div>
));