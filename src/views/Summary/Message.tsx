import { memo } from 'react';
import { markdownToHtml } from '@/utils/markdown';
import { Message as MessageType } from './types';

export const Message = memo(({ role, content }: MessageType) => (
    <div className={`message ${role}-message`}>
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />
    </div>
));