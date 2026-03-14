import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Link } from 'wouter';
import { IoSend, IoStopCircle, IoGlobeOutline, IoLogoYoutube } from "react-icons/io5";
import { toast } from 'react-toastify';
import { handleStreamingResponse, updateTokenCount, estimateTokens, chunkAndSummarize, generateConversationTitle } from '@/utils/chat';
import { fetchWebpage, getCurrentVideoId, fetchYouTubeTranscript, cleanContent } from '@/utils/content';
import { PathSelector } from '@/components/PathSelector';
import { MessageList } from './MessageList';
import { StreamingMessage } from './StreamingMessage';
import { Message } from './types';
import { useSummaryStore } from '@/stores/Summary';
import { useConversationsStore } from '@/stores/Conversations';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { ModelLabel } from '@/components/ModelLabel';
import { Loader } from '@/components/Loader';
import { TokenDisplay } from './TokenDisplay';
import { useSettings } from '@/hooks/useSettings';
import { BackButton } from '@/components/BackButton';

export const Summary = () => {
    const { content, prompt, enableChunking, sourceUrl } = useSummaryStore();
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
    const titleGeneratedRef = useRef(false);
    const { ref: messagesRef, scrollToBottom } = useAutoScroll([messages, streamingMessage]);
    const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number; message: string } | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const {
        activeConversationId,
        activeMessages,
        startNewConversation,
        addMessage,
        updateTitle,
    } = useConversationsStore();

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsLoading(false);
            const stoppedByUser = `${streamingMessage} \n\n *Output stopped by user*`;
            setStreamingMessage('');

            // Add streaming message to messages
            const stoppedMessage: Message = { role: 'assistant', content: stoppedByUser };
            setMessages(prev => [...prev, stoppedMessage]);
            addMessage(stoppedMessage);
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
            const userMessage: Message = { role: 'user', content: message };

            if (isInitial) {
                // Show the initial message right away
                newMessages = [userMessage];
            } else {
                newMessages = [...messages, userMessage];
            }

            setMessages(newMessages);
            addMessage(userMessage);
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

            // For initial message, pass empty array as conversation history
            const response = await handleStreamingResponse(
                currentSettings,
                message,
                handleUpdate,
                isInitial ? [] : messages, // Only pass previous messages for non-initial interactions
                null,
                abortControllerRef.current
            );

            // Add just the response to our history since we already added the message
            const assistantMessage: Message = { role: 'assistant', content: response };
            setMessages(prev => [...prev, assistantMessage]);
            addMessage(assistantMessage);
            setStreamingMessage('');

            // Generate title after first assistant response
            if (!titleGeneratedRef.current && isInitial) {
                titleGeneratedRef.current = true;
                generateConversationTitle(currentSettings, message, response)
                    .then(title => updateTitle(title))
                    .catch(() => {}); // keep fallback title
            }

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

            initializationRef.current = true;

            // RESUME: if there's an active conversation with messages, restore them
            if (activeConversationId && activeMessages.length > 0) {
                setMessages(activeMessages);
                titleGeneratedRef.current = true;
                setIsLoading(false);
                setTimeout(() => scrollToBottom(), 100);
                return;
            }

            const currentSettings = getProviderSettings(settings.provider);
            abortControllerRef.current = new AbortController();

            // Start a new conversation
            startNewConversation(
                settings.provider,
                settings.model,
                prompt,
                sourceUrl || undefined
            );

            try {
                let contentToProcess = content; // Start with just the content

                if (!currentSettings.num_ctx) {
                    throw new Error('num_ctx is not set');
                }

                // Use currentSettings instead of settings
                const estimatedTokensCount = estimateTokens(content);
                const systemPromptTokens = estimateTokens(prompt);
                const messageFormatTokens = 8;
                const safetyMargin = 50;
                const totalOverhead = systemPromptTokens + messageFormatTokens + safetyMargin;
                setTokenCount(estimatedTokensCount + totalOverhead);

                if (estimatedTokensCount + totalOverhead > currentSettings.num_ctx && enableChunking) {
                    setChunkProgress({ current: 0, total: 0, message: 'Analyzing content size...' });

                    contentToProcess = await chunkAndSummarize(
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

                // Send the prompt and content together as one message
                await handleAIInteraction(`${prompt}\n\n${contentToProcess}`, true);
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

    const insertContent = (text: string) => {
        if (chatInputRef.current) {
            chatInputRef.current.value = text;
            chatInputRef.current.focus();
        }
    };

    const handleFetchWebpage = async () => {
        const content = await fetchWebpage();
        if (content) {
            insertContent(content);
        }
    };

    const handleFetchTranscript = async () => {
        const videoId = await getCurrentVideoId();
        if (!videoId) {
            toast.error("Could not determine video ID. Please ensure you're on a YouTube video page.");
            return;
        }
        try {
            const transcript = await fetchYouTubeTranscript();
            if (transcript) {
                insertContent(transcript);
            }
        } catch (error: unknown) {
            toast.error(`Error fetching transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handlePathSelected = async (selector: string) => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) return;

            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (sel: string) => {
                    const element = document.querySelector(sel);
                    return element?.textContent?.trim() || '';
                },
                args: [selector]
            });

            if (result) {
                insertContent(cleanContent(result));
            }
        } catch (error) {
            console.error('Error getting element content:', error);
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
                                <div className="chat-actions">
                                    <PathSelector onPathSelected={handlePathSelected} compact />
                                    <button className="btn icon-btn" onClick={handleFetchWebpage} title="Get Page Content" disabled={isLoading}>
                                        <IoGlobeOutline size={18} />
                                    </button>
                                    <button className="btn icon-btn" onClick={handleFetchTranscript} title="Get Transcript" disabled={isLoading}>
                                        <IoLogoYoutube size={18} />
                                    </button>
                                    <button
                                        id="send-message"
                                        className="btn icon-btn"
                                        onClick={handleSendMessage}
                                        title="Send Message"
                                        disabled={isLoading} >
                                        <IoSend size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
