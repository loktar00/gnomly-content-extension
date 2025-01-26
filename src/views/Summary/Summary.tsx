import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Link } from 'wouter';
import { IoSend, IoStopCircle } from "react-icons/io5";
import { toast } from 'react-toastify';
import { handleStreamingResponse, updateTokenCount, estimateTokens, chunkAndSummarize } from '@/utils/chat';
import { MessageList } from './MessageList';
import { StreamingMessage } from './StreamingMessage';
import { Message } from './types';
import { useSummaryStore } from '@/stores/Summary';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { ModelLabel } from '@/components/ModelLabel';
import { Loader } from '@/components/Loader';
import { TokenDisplay } from './TokenDisplay';
import { useSettings } from '@/hooks/useSettings';
import { BackButton } from '@/components/BackButton';

export const Summary = () => {
    const { content, prompt, enableChunking } = useSummaryStore();
    const {
        settings,
        isLoading: settingsLoading,
        error: settingsError,
        getProviderSettings
    } = useSettings();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [tokenCount, setTokenCount] = useState<number>(0);
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const chatInputRef = useRef<HTMLTextAreaElement>(null);
    const initializationRef = useRef(false);
    const { ref: messagesRef, scrollToBottom } = useAutoScroll([messages, streamingMessage]);
    const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number; message: string } | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsLoading(false);
            const stoppedByUser = `${streamingMessage} \n\n *Output stopped by user*`;
            setStreamingMessage('');

            // Add streaming message to messages
            setMessages(prev => [...prev, { role: 'assistant', content: stoppedByUser }]);
            scrollToBottom();
        }
    };

    const handleBack = () => {
        handleStop();
    };

    const handleAIInteraction = async (message: string, isInitial = false) => {
        if (!settings?.provider) {
            toast.error('Settings not available');
            return;
        }

        // Get fresh settings every time
        const currentSettings = getProviderSettings(settings.provider);

        try {
            setIsLoading(true);
            setError(null);
            abortControllerRef.current = new AbortController();

            // Add user message immediately and update token count
            let newMessages: Message[];
            if (isInitial) {
                newMessages = [{ role: 'user', content: message }];
            } else {
                newMessages = [...messages, { role: 'user', content: message }];
            }

            setMessages(newMessages);
            setTimeout(() => scrollToBottom(), 100); // Force scroll after adding user message

            // Initialize token count with current messages before streaming
            const initialTokenCount = updateTokenCount(newMessages);
            setTokenCount(initialTokenCount);

            let streamTokens = 0; // Track streaming tokens separately

            // Create update handler for streaming response
            const handleUpdate = (streamContent: string, tokens?: number) => {
                setStreamingMessage(streamContent);
                if (tokens) {
                    // Only count the new tokens
                    const newTokens = tokens - streamTokens;
                    streamTokens = tokens; // Update running total
                    setTokenCount(prevTokens => prevTokens + newTokens);
                }
            };

            // Get streaming response with conversation history
            const response = await handleStreamingResponse(
                currentSettings,
                message,
                handleUpdate,
                newMessages,
                null,
                abortControllerRef.current
            );

            // Add completed response to messages
            setMessages(prev => {
                const updatedMessages: Message[] = [...prev, { role: 'assistant', content: response }];
                // Don't recount tokens that were already counted during streaming
                return updatedMessages;
            });

            setStreamingMessage('');

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                // Handle abort gracefully
                return;
            }
            setError('error');
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    // Initialize the summary after settings are available
    useEffect(() => {
        const initializeSummary = async () => {
            if (!settings || initializationRef.current) {
                return;
            }

            const currentSettings = getProviderSettings(settings.provider);
            initializationRef.current = true;
            abortControllerRef.current = new AbortController();

            try {
                let initialMessage = `${content}`;

                // Chunking is only supported for Ollama
                if (currentSettings.provider === 'Ollama') {
                    if (!currentSettings.num_ctx) {
                        throw new Error('num_ctx is not set');
                    }

                    // Use currentSettings instead of settings
                    const estimatedTokens = estimateTokens(content);
                    const systemPromptTokens = estimateTokens(prompt);
                    const messageFormatTokens = 8;
                    const safetyMargin = 50;
                    const totalOverhead = systemPromptTokens + messageFormatTokens + safetyMargin;
                    setTokenCount(estimatedTokens + totalOverhead);

                    if (estimatedTokens + totalOverhead > currentSettings.num_ctx && enableChunking) {
                        setChunkProgress({ current: 0, total: 0, message: 'Analyzing content size...' });

                        initialMessage = await chunkAndSummarize(
                            content,
                            currentSettings.num_ctx,
                            currentSettings,
                            prompt,
                            (progress) => {
                                setChunkProgress({
                                    current: progress.currentChunk,
                                    total: progress.totalChunks,
                                    message: progress.message
                                });
                            },
                            (streamContent) => {
                                setStreamingMessage(streamContent);
                            },
                            abortControllerRef.current
                        );
                    }
                }

                await handleAIInteraction(`${prompt}\n\n${initialMessage}`, true);
                setChunkProgress(null);
            } catch (error: unknown) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                setError('error');
            } finally {
                abortControllerRef.current = null;
            }
        };

        initializeSummary();
    }, [settings, content, prompt, getProviderSettings]);

    // Handle sending new messages
    const handleSendMessage = async () => {
        if (!chatInputRef.current?.value.trim()) {
            return;
        }

        const message = chatInputRef.current.value;
        chatInputRef.current.value = '';

        await handleAIInteraction(message);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (settingsLoading) {
        return <Loader />;
    }

    if (settingsError) {
        return <div className="error-text">{settingsError}</div>;
    }

    return (
        <div className="summary-content">
            <ModelLabel provider={settings?.provider || ''} model={settings?.model || ''} />
            <div className="main-content">
                <div id="chat-container" className="chat-container" role="log" aria-live="polite">
                    <div
                        ref={messagesRef}
                        className="chat-messages scrollable">
                        <div className="inner-message">
                            <MessageList messages={messages} />
                            {streamingMessage && <StreamingMessage content={streamingMessage} />}
                        </div>
                    </div>

                    {chunkProgress && (
                        <div className="chunk-progress">
                            <div className="message system-message">
                                <div>{chunkProgress.message}</div>
                                {chunkProgress.total > 0 && (
                                    <div>Progress: {chunkProgress.current} / {chunkProgress.total}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {isLoading && (
                        <div id="chat-loading" className="chat-loading">
                            <Loader />
                            <TokenDisplay tokenCount={Number(tokenCount)} max={Number(settings?.num_ctx)} />
                            <div className="button-group loading-controls">
                                <BackButton onClick={handleBack} />
                                <button className="btn" onClick={handleStop}>
                                    <IoStopCircle size={20} /> Stop
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="error-text">
                            Error generating summary: {error}
                        </div>
                    )}

                    <div className={`chat-input-container ${isLoading ? 'hidden' : ''} scrollable`}>
                        <textarea
                            autoFocus
                            ref={chatInputRef}
                            id="chat-input"
                            rows={3}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question about the content..." />
                        <div className="controls">
                            <Link href="/"><BackButton /></Link>
                            <div className="controls-send">
                                <TokenDisplay tokenCount={Number(tokenCount)} max={Number(settings?.num_ctx)} />
                                <button
                                    id="send-message"
                                    className="btn"
                                    onClick={handleSendMessage}
                                    disabled={isLoading} >
                                    <IoSend />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
