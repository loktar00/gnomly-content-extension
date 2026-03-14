<div align="center">
  <img src="public/logo.png" alt="Gnomly Logo" width="128"/>
  <h1>Gnomly</h1>
</div>

A Chrome extension that extracts content from webpages and YouTube videos, sends it to local or remote AI models, and lets you chat about it in a side panel.

## What it does

- Grabs page content or YouTube transcripts with one click
- Sends content to Ollama (local) or DeepSeek (remote) for analysis
- Streams AI responses in a chat interface where you can ask follow-up questions
- Saves custom prompts per URL pattern (e.g. a different prompt for Reddit vs GitHub)
- Optionally targets specific page elements with a visual selector
- Auto-chunks content that exceeds the model's context window
- Tracks token usage against the model's context limit

## Requirements

- Chrome browser
- At least one AI provider:
  - [Ollama](https://ollama.ai/) running locally (or on a remote server) with a model pulled
  - [DeepSeek API key](https://platform.deepseek.com/)

## Install

```bash
git clone https://github.com/loktar00/gnomly-content-extension.git
cd gnomly-content-extension
npm install
npm run build
```

Then load `dist/` as an unpacked extension at `chrome://extensions/` (enable Developer mode first).

Keyboard shortcut: `Ctrl+Shift+Y` opens the side panel.

## Setup

1. Open the extension side panel and click the gear icon
2. Pick a provider (Ollama or DeepSeek)
3. For Ollama: set the server URL, click "Fetch Available Models", pick a model
4. For DeepSeek: enter your API key
5. Adjust context window size if needed
6. Save

## Usage

Click the Gnomly icon or press `Ctrl+Shift+Y` to open the side panel on any page.

**Summarize a page:** Click "Execute Prompt" — it auto-detects YouTube vs regular pages, fetches the content, and sends it to your AI model. You can also manually click "Get Page Content" or "Get Transcript" first.

**Target a specific element:** Click "Select Content", hover over the page to highlight elements, click one to extract just that element's text.

**Follow-up chat:** After the initial summary, type questions in the chat input. You can also fetch new content mid-conversation using the action buttons next to the send button.

**Custom prompts:** Click the prompt manager icon in the header. Create prompts tied to URL patterns with wildcard support (e.g. `reddit.com/r/*`). The matching prompt is auto-selected when you visit a matching page. Set any prompt as the default fallback.

## Development

```bash
npm run dev        # Vite dev server
npm run build      # TypeScript check + production build
npm run lint       # ESLint
npm run lint:fix   # ESLint auto-fix
npm test           # Vitest (watch mode)
npx vitest run     # Tests once
```

Built with React, TypeScript, Vite, Zustand, and wouter. Manifest v3.

## License

[Apache 2.0](LICENSE)
