# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gnomly** — a Chrome extension (Manifest v3) that extracts content from YouTube videos (transcripts) and webpages, then sends it to AI models (Ollama or DeepSeek) for analysis via a streaming chat interface. The UI renders as a browser side panel.

## Commands

```bash
npm run dev        # Start Vite dev server (opens browser)
npm run build      # TypeScript check + Vite production build → dist/
npm run lint       # ESLint check
npm run lint:fix   # ESLint auto-fix
npm test           # Run Vitest (watch mode)
npx vitest run     # Run tests once (CI-friendly)
```

To load the built extension: build, then load `dist/` as an unpacked extension in `chrome://extensions`.

## Architecture

**React + TypeScript Chrome extension** built with Vite. The Vite root is `src/` (not the repo root), and `public/` contains Chrome extension assets (manifest, service worker, content scripts) that get copied into `dist/` at build time.

### Data Flow

User selects content source (YouTube/webpage/custom) → prompt auto-matched by URL pattern → content extracted via Chrome scripting API → optionally chunked for large content → streamed to AI provider → response rendered as markdown in chat UI.

### Key Layers

- **Views** (`src/views/`) — page-level components: `Home` (content input + prompt selection), `Summary` (chat interface + streaming), `Settings` (provider config), `PromptManager` (CRUD for URL-matched prompts)
- **Stores** (`src/stores/`) — Zustand stores: `Summary.ts` (content/prompt/chunk state), `SavedPrompts.ts` (prompt persistence)
- **Utils** (`src/utils/`) — core logic: `chat.ts` (streaming + token counting + chunking), `content.ts` (YouTube transcript + webpage extraction), `url.ts` (wildcard URL pattern matching), `prompts.ts` (prompt CRUD), `markdown.ts` (MD→HTML), `storage.ts` (Chrome storage abstraction with localStorage fallback)
- **Configs** (`src/Configs/ModelProviders.ts`) — provider definitions for Ollama and DeepSeek (URLs, endpoints, defaults, token limits)

### Routing

Uses `wouter` for client-side routing. Routes defined in `App.tsx`.

### Path Alias

`@/*` maps to `src/*` (configured in both tsconfig and vite).

## Code Style

- **4-space indentation** (enforced by ESLint)
- `react-hooks/exhaustive-deps` is intentionally disabled
- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`
