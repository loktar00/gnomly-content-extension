import { useState, useRef, ChangeEvent } from "react";
import { useLocation } from "wouter";
import { toast } from 'react-toastify';
import { GiBrainstorm } from "react-icons/gi";
import { IoLogoYoutube } from "react-icons/io5";
import { PromptSelector } from "./PromptSelector";
import { useSummaryStore } from "@/stores/Summary";
import { getVideoTitle } from "@/utils/url";
import { fetchWebpage, getCurrentVideoId, fetchYouTubeTranscript } from "@/utils/content";
import { ModelLabel } from "@/components/ModelLabel";
import { PathSelector } from '@/components/PathSelector';
import { cleanContent } from "@/utils/content";
import { useSettings } from "@/hooks/useSettings";
import { Loader } from "@/components/Loader";
import { requestPagePermissions, checkPagePermissions } from '@/utils/permissions';

export const Home = () =>  {
    const { settings, isLoading, error } = useSettings();
    const [selectedPromptContent, setSelectedPromptContent] = useState<string>('');
    const [, setLocation] = useLocation();
    const { setContent, setPrompt, enableChunking, setEnableChunking } = useSummaryStore();
    const [selectedPath, setSelectedPath] = useState<string>('');
    const transcriptAreaRef = useRef<HTMLTextAreaElement>(null);

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return <div className="error-text">{error}</div>;
    }

    const handlePromptChange = (content: string, selector: string | undefined) => {
        setSelectedPromptContent(content);
        setSelectedPath(selector || '');
        setPrompt(content);
    };

    const handleFetchWebpage = async () => {
        const content = await fetchWebpage();
        if (content && transcriptAreaRef.current) {
            transcriptAreaRef.current.value = content;
            setContent(content);
        }
    };

    const handleFetchTranscript = async () => {
        const videoId = await getCurrentVideoId();

        if (!videoId) {
            toast.error("Could not determine video ID. Please ensure you're on a YouTube video page.");
            return;
        }

        if (transcriptAreaRef.current) {
            transcriptAreaRef.current.value = "Fetching transcript...";
        }

        try {
            const transcript = await fetchYouTubeTranscript();
            if (transcript && transcriptAreaRef.current) {
                transcriptAreaRef.current.value = transcript;
                setContent(transcript);
            }
        } catch (error: unknown) {
            if (transcriptAreaRef.current) {
                transcriptAreaRef.current.value = `Error fetching transcript: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        }
    }

    const handleSummarize = async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.url) {
                toast.error("Cannot access current page URL");
                return;
            }

            let userContent = transcriptAreaRef.current?.value.trim();
            const isYouTube = tab.url.includes('youtube.com/watch');

            // Check permissions based on whether it's YouTube or not
            if (!isYouTube) {
                const hasPermission = await checkPagePermissions(tab.url);
                if (!hasPermission) {
                    const granted = await requestPagePermissions(tab.url);
                    if (!granted) {
                        toast.error("Permission needed to summarize this page");
                        return;
                    }
                }
            }

            // Get content if not already present
            if (!userContent) {
                if (isYouTube) {
                    await handleFetchTranscript();
                } else if (selectedPath) {
                    await handlePathSelected(selectedPath);
                } else {
                    await handleFetchWebpage();
                }
                userContent = transcriptAreaRef.current?.value;
            }

            const pageTitle = await getVideoTitle() || document.title || "Content";


            setContent(`${pageTitle}\n${userContent}`);
            setLocation('/summary');
        } catch (error) {
            toast.error('Error accessing page: ' + error);
        }
    };

    const handleCopyToClipboard = async () => {
        if (transcriptAreaRef.current) {
            try {
                await navigator.clipboard.writeText(transcriptAreaRef.current.value);
                toast.success("Transcript copied to clipboard!");
            } catch (error) {
                toast.error(`Failed to copy text to clipboard. ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }

    const handleChunkSettingChange = (e: ChangeEvent<HTMLInputElement>) => {
        setEnableChunking(e.target.checked);
    };

    const handlePathSelected = async (selector: string) => {
        // Set the selected path to the selector
        setSelectedPath(selector);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab.id) {
                return;
            }

            // Get the text content using the selector
            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (selector: string) => {
                    const element = document.querySelector(selector);
                    return element?.textContent?.trim() || '';
                },
                args: [selector]
            });

            if (transcriptAreaRef.current) {
                transcriptAreaRef.current.value = cleanContent(result || '');
                setContent(cleanContent(result || ''));
            }
        } catch (error) {
            console.error('Error getting element content:', error);
        }
    };

    return (
        <>
            <ModelLabel
                provider={settings?.provider || ''}
                model={settings?.model || ''}
            />
            <div className="main-content">
                <PromptSelector onSelect={handlePromptChange}/>
                <div className="form-group">
                    <label>System Prompt</label>
                    <textarea
                        id="system-prompt"
                        rows={6}
                        cols={50}
                        placeholder="System Prompt"
                        value={selectedPromptContent}
                        onChange={(e) => handlePromptChange(e.target.value, selectedPath)}
                    />
                </div>
                <div className="form-group">
                    <label>Target element</label>
                    <div className="prompt-manager-input-group">
                        <input type="text" id="use-selector" placeholder="Target element" value={selectedPath || ''} onChange={(e) => setSelectedPath(e.target.value)} />
                        <PathSelector onPathSelected={handlePathSelected} />
                    </div>
                </div>
                <div className="form-group--center">
                    <button
                        id="summarize-transcript"
                        className="btn ai-btn"
                        onClick={handleSummarize}>
                        <GiBrainstorm size={24} />
                        Execute Prompt
                    </button>
                    <div className="chunk-control">
                        <label>
                            <input type="checkbox" id="enable-chunking" defaultChecked={enableChunking} onChange={handleChunkSettingChange} />
                            <span>Auto-chunk large content</span>
                        </label>
                    </div>
                </div>
                <div className="form-group">x
                    <textarea
                        ref={transcriptAreaRef}
                        id="transcript-area"
                        rows={5}
                        cols={50}
                        placeholder="Content to summarize..."
                    />
                </div>
                <div className="form-group">
                    <label>Manual Actions</label>
                    <div className="button-group source-buttons">
                        <PathSelector onPathSelected={handlePathSelected} />
                        <button id="fetch-webpage" className="btn" onClick={handleFetchWebpage}>
                            Get Page Content
                        </button>
                        <button id="fetch-current-transcript" className="btn" onClick={handleFetchTranscript}>
                            <IoLogoYoutube size={20} />
                            Get Transcript
                        </button>
                        <button id="copy-to-clipboard" className="btn" onClick={handleCopyToClipboard}>
                            Copy to Clipboard
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};