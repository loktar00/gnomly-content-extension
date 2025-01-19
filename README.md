<div align="center">
  <img src="public/logo.png" alt="Gnomly Logo" width="128"/>
  <h1>Gnomly</h1>
  <p><em>Your Content, Simplified</em></p>
</div>

A Chrome extension that helps analyze and discuss content from any webpage or YouTube video using AI.

## Features

- 🌐 Extract and analyze content from any webpage
- 🎥 Fetch transcripts from YouTube videos
- 🤖 Generate AI summaries using Ollama
- 💬 Interactive chat interface for follow-up questions
- 🎨 Smart content handling:
  - Automatic content chunking for large texts
  - Token-aware processing
  - Progress tracking for multi-chunk processing
  - Intelligent content preservation
- 🎨 Smart URL-based prompts:
  - Save custom prompts for specific URL patterns
  - Automatic prompt selection based on current webpage
  - Support for wildcards in URL patterns (e.g., reddit.com/*/comments/*)
  - Manage default system prompts
  - Edit and organize prompts by URL pattern
- 📊 Token usage tracking with context window warnings
- 🎨 Cyberpunk-inspired dark mode interface
- ⚙️ Configurable AI model settings
- 📋 Easy content copying

## What's New

- 🔄 Smart content chunking system
- 📈 Real-time chunk processing feedback
- 🎯 Improved content preservation in summaries
- 🔄 Completely redesigned interface with side panel integration
- 🎯 Advanced URL pattern matching with wildcard support
- 📝 Improved prompt management system
- 🔍 Default prompt system for consistent interactions
- 📊 Real-time token usage monitoring
- 🎨 New cyberpunk theme and branding
- 🎯 Element targeting for specific content extraction

## Requirements

- Chrome browser
- [Ollama](https://ollama.ai/) running locally or on a remote server
- An AI model pulled into Ollama (e.g., mistral, llama2, etc.)

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Install dependencies: `npm install`
5. Build the extension: `npm run build`
6. Click "Load unpacked" and select the `dist` folder from this repository

## Configuration

1. Click the extension settings icon (⚙️)
2. Enter your Ollama server URL (default: http://localhost:11434)
3. Click "Fetch Available Models" to see models available on your Ollama server
4. Select your preferred model
5. Adjust the context window size based on your needs and model capabilities
6. Click Save

## Usage

### Managing Prompts
1. Click the prompt manager icon (📝)
2. To add a new prompt:
   - Enter a URL pattern (e.g., reddit.com/r/*)
   - Write your custom prompt
   - Click "Select Element" to target specific page content (optional)
   - The selector will be saved with your prompt for automatic targeting
   - Click Save
3. To use current page URL:
   - Click "Get URL" to automatically fill the pattern
   - Modify as needed (add wildcards for broader matching)
4. Set a prompt as default:
   - Click "Make Default" on any saved prompt
   - Default prompt will be used when no URL patterns match
5. Edit or delete existing prompts using the action buttons

### Element Targeting
1. Select content on any webpage:
   - Click "Select Element" in the side panel
   - Hover over any element to highlight it
   - Click to select and extract its content
2. Use with saved prompts:
   - Prompts with saved selectors automatically target specific elements
   - Content is extracted from matching elements on matching pages
   - Perfect for consistent analysis of similar webpage elements

### For Any Webpage
1. Navigate to any webpage
2. Click the Gnomly icon to open the side panel
3. Click "Get Page Content" to extract the main content
4. The appropriate prompt will be automatically selected based on URL patterns
5. Click "Summarize Page with AI" to generate a summary
6. Monitor token usage in real-time
7. Ask follow-up questions in the chat interface

### For YouTube Videos
1. Navigate to any YouTube video
2. Click the Gnomly icon to open the side panel
3. Click "Get Transcript" to fetch the video transcript
4. The appropriate prompt will be automatically selected based on URL patterns
5. Click "Summarize Page with AI" to generate a summary
6. Monitor token usage in real-time
7. Ask follow-up questions in the chat interface

## Development

Built with:
- Vanilla JavaScript
- Chrome Extension APIs
- Ollama API
- Custom CSS with cyberpunk theme

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Roadmap

### Upcoming Features

#### Interface Improvements
- 🌓 Light mode theme option
- 📜 Auto-scroll webpage content integration
- 🔄 Save transcript between screen changes
- 🎛️ Model switching in chat summary view

#### Core Functionality
- 🤖 External AI provider support (OpenAI, Anthropic)
- 📊 Enhanced webpage interaction capabilities

#### Development Improvements
- ✅ Test suite implementation
- 🔍 Enhanced linting and code quality tools

## License

[Apache 2.0 License](LICENSE)
