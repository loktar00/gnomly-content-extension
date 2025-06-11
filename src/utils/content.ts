export async function getCurrentVideoId() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.url) return null;
    return new URL(tabs[0].url).searchParams.get("v");
}

export async function getVideoTitle(videoId: string) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0]?.title?.replace(' - YouTube', '') || `Video ${videoId}`;
    } catch {
        return `Video ${videoId}`;
    }
}

export function parseTranscriptXml(transcriptXml: string) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");

    // Create a textarea element for decoding HTML entities
    const decoder = document.createElement('textarea');

    return Array.from(xmlDoc.getElementsByTagName('text'))
        .map(node => ({
            text: (node.textContent || '')
                .trim()
                // Decode HTML entities
                .replace(/&([^;]+);/g, (match) => {
                    decoder.innerHTML = match;
                    return decoder.value;
                })
                // Replace multiple spaces with single space
                .replace(/\s+/g, ' ')
                // Remove any remaining newlines
                .replace(/\n/g, ' '),
            start: parseFloat(node.getAttribute('start') || '0'),
            duration: parseFloat(node.getAttribute('dur') || '0')
        }))
        .filter(line => line.text.length > 0)
        .map(line => line.text)
        // Join with single space instead of newline
        .join(' ');
}

interface CaptionTrack {
    languageCode: string;
    baseUrl: string;
}

// Extend window interface for YouTube globals
declare global {
    interface Window {
        ytInitialPlayerResponse?: {
            captions?: {
                playerCaptionsTracklistRenderer?: {
                    captionTracks?: CaptionTrack[];
                };
            };
        };
        ytInitialData?: Record<string, unknown>;
    }
}

export async function fetchYouTubeTranscript() {
    try {
        // Get the current video ID from the active tab
        const videoId = await getCurrentVideoId();
        if (!videoId) {
            throw new Error('No YouTube video ID found in current tab');
        }

        // Get the current YouTube tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
            throw new Error('No active tab found');
        }

        // Check if we're on a YouTube page
        if (!tab.url?.includes('youtube.com/watch')) {
            throw new Error('Please navigate to a YouTube video page');
        }

        // Inject script to extract transcript data directly from the page
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: async () => {
                try {
                    // Function to extract transcript from page data
                    function extractTranscriptFromPage() {
                        // Try to get data from ytInitialPlayerResponse (most common)
                        if (window.ytInitialPlayerResponse) {
                            const captions = window.ytInitialPlayerResponse.captions;
                            if (captions?.playerCaptionsTracklistRenderer?.captionTracks) {
                                return captions.playerCaptionsTracklistRenderer.captionTracks;
                            }
                        }

                        // Try to get from ytInitialData
                        if (window.ytInitialData) {
                            const dataStr = JSON.stringify(window.ytInitialData);
                            const captionMatch = dataStr.match(/"captionTracks":\[(.*?)\]/);
                            if (captionMatch) {
                                try {
                                    return JSON.parse('[' + captionMatch[1] + ']');
                                } catch {
                                    // Continue to next method
                                }
                            }
                        }

                        // Try to find in script tags
                        const scripts = document.getElementsByTagName('script');
                        for (let i = 0; i < scripts.length; i++) {
                            const script = scripts[i];
                            if (script.textContent && script.textContent.includes('captionTracks')) {
                                const match = script.textContent.match(/"captionTracks":\[(.*?)\]/);
                                if (match) {
                                    try {
                                        return JSON.parse('[' + match[1] + ']');
                                    } catch {
                                        continue;
                                    }
                                }
                            }
                        }

                        return null;
                    }

                    const captionTracks = extractTranscriptFromPage();
                    if (!captionTracks || !captionTracks.length) {
                        return {
                            success: false,
                            error: 'No caption tracks found on this page'
                        };
                    }

                    // Find English track or use first available
                    const track = captionTracks.find((t: CaptionTrack) => t.languageCode === 'en') || captionTracks[0];

                    // Extract transcript via DOM interaction
                    try {
                        // Find transcript button
                        const transcriptButton = document.querySelector('[aria-label*="transcript"], [aria-label*="Transcript"], button[aria-label*="Show transcript"]') as HTMLElement;

                        if (!transcriptButton) {
                            throw new Error('No transcript button found on page');
                        }

                        // Click the transcript button to open the panel
                        transcriptButton.click();

                        // Function to wait for transcript content
                        const waitForTranscript = (): Promise<string> => {
                            return new Promise((resolve, reject) => {
                                let attempts = 0;
                                const maxAttempts = 20; // Wait up to 10 seconds

                                const checkForTranscript = () => {
                                    attempts++;

                                    // Look for transcript panel elements
                                    const transcriptPanel = document.querySelector('ytd-transcript-segment-list-renderer, #transcript, [data-target-id="engagement-panel-transcript"]');

                                    if (transcriptPanel) {
                                        // Try different selectors for transcript segments
                                        const transcriptSegments =
                                            transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer') ||
                                            transcriptPanel.querySelectorAll('[data-segment-start-time]') ||
                                            transcriptPanel.querySelectorAll('.transcript-segment') ||
                                            transcriptPanel.querySelectorAll('span');

                                        if (transcriptSegments.length > 0) {
                                            // Extract text from segments
                                            const transcriptTexts: string[] = [];

                                            transcriptSegments.forEach((segment) => {
                                                const textElement = segment.querySelector('yt-formatted-string, .segment-text, span') || segment;
                                                const text = textElement.textContent?.trim();

                                                if (text && text.length > 0) {
                                                    transcriptTexts.push(text);
                                                }
                                            });

                                            if (transcriptTexts.length > 0) {
                                                const fullTranscript = transcriptTexts.join(' ');
                                                resolve(fullTranscript);
                                                return;
                                            }
                                        }
                                    }

                                    // If not found yet and we haven't reached max attempts, try again
                                    if (attempts < maxAttempts) {
                                        setTimeout(checkForTranscript, 500);
                                    } else {
                                        reject(new Error('Transcript panel did not load within timeout'));
                                    }
                                };

                                // Start checking immediately
                                checkForTranscript();
                            });
                        };

                        const transcriptText = await waitForTranscript();

                        if (transcriptText && transcriptText.length > 0) {
                            return {
                                success: true,
                                transcriptXml: transcriptText,
                                languageCode: track.languageCode
                            };
                        }

                        throw new Error('No transcript text extracted from DOM');

                    } catch (domError) {
                        return {
                            success: false,
                            error: 'Failed to extract transcript from DOM: ' + (domError instanceof Error ? domError.message : String(domError))
                        };
                    }

                } catch (error) {
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error extracting transcript data'
                    };
                }
            }
        });

        const result = results[0]?.result;

        if (!result || !result.success) {
            throw new Error(result?.error || 'Failed to extract transcript data from page');
        }

        if (!result.transcriptXml) {
            throw new Error('Transcript text is empty or undefined');
        }

        return result.transcriptXml;

    } catch (error: unknown) {
        console.error('Error fetching transcript:', error);
        throw new Error(`Failed to fetch transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function cleanContent(content: string) {
    return content
        .replace(/\n\s*\n\s*\n/g, '\n\n')  // Replace 3+ line breaks with 2
        .replace(/\s+/g, ' ')               // Replace multiple spaces with single space
        .replace(/\n +/g, '\n')             // Remove spaces at start of lines
        .replace(/ +\n/g, '\n')             // Remove spaces at end of lines
        .trim();                            // Remove leading/trailing whitespace
}

async function getPageContent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
        throw new Error('No active tab found');
    }

    // Inject and execute content script
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            try {
                // Otherwise, get content from body but exclude common non-content areas
                const body = document.body;
                const virtualDoc = body.cloneNode(true) as Document;

                const excludeSelectors = [
                    'script', 'style', 'noscript', 'svg', 'img', 'video', 'audio'
                ].join(',');

                const elementsToExclude = virtualDoc.querySelectorAll(excludeSelectors);
                elementsToExclude.forEach(el => {
                    if (el.textContent) {
                        el.textContent = '';
                    }
                });

                const content = virtualDoc.textContent || '';

                return content.trim();
            } catch (error) {
                console.error('Error extracting content:', error);
                return document.body.innerText;
            }
        }
    });

    return result ? cleanContent(result) : '';
}

export async function fetchWebpage() {
    try {
        const content = await getPageContent();
        return content?.trim();
    } catch (error: unknown) {
        if (error instanceof Error) {
            return `Error fetching page content: ${error.message}`;
        }
        return 'Error fetching page content';
    }
}