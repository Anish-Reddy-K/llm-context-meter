# LLM Context Meter

A lightweight Chrome extension that shows you how much of your LLM's context window is being used in real-time.

![Context Meter Demo](https://img.shields.io/badge/version-1.0.0-green)

## Features

- **Real-time context tracking** - See your token usage update as you chat
- **Visual progress ring** - Color-coded icon in your browser toolbar
- **Multi-platform support** - Works with ChatGPT, Claude, and Gemini
- **Model-aware** - Automatically detects which model you're using and its context limit
- **Lightweight** - Minimal performance impact with debounced updates

## Supported Platforms

| Platform | Models Detected |
|----------|----------------|
| **ChatGPT** | GPT-4o, GPT-4o-mini, GPT-4, GPT-4-Turbo, GPT-3.5, o1, o1-mini |
| **Claude** | Claude 3.5 Sonnet, Claude 3 Opus, Sonnet, Haiku |
| **Gemini** | Gemini 2.0, 1.5 Pro, 1.5 Flash |

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `llm-context-meter` folder

## How It Works

1. **Content Script** - Monitors the chat page for conversation updates
2. **Token Estimation** - Uses a character-based approximation (~4 chars = 1 token)
3. **Context Calculation** - Compares used tokens against the model's context limit
4. **Visual Feedback** - Updates the toolbar icon with a progress ring

### Color Coding

| Usage | Color |
|-------|-------|
| 0-24% | 🟢 Green |
| 25-49% | 🟢 Lime |
| 50-74% | 🟡 Yellow |
| 75-89% | 🟠 Orange |
| 90-100% | 🔴 Red |

## Privacy

This extension:
- ✅ Only reads conversation text from supported LLM sites
- ✅ Processes everything locally in your browser
- ✅ Never sends data to external servers
- ✅ Stores only minimal state (current usage) locally

## Technical Details

### Token Estimation
The extension uses a simplified token estimation formula:
```
tokens ≈ (character_count / 4 + word_count * 1.3) / 2
```

This provides a reasonable approximation for English text. Actual tokenization varies by model.

### Context Overhead
An overhead multiplier (1.1x for most models, 1.3x for o1/thinking models) accounts for:
- System prompts
- Internal formatting
- Thinking tokens (for reasoning models)

## Development

```bash
# Clone the repo
git clone https://github.com/yourusername/llm-context-meter.git

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the project folder
```

## Contributing

Contributions welcome! Areas that could use help:
- Better DOM selectors for each platform (they change frequently)
- More accurate token estimation
- Support for additional LLM platforms
- Localization

## License

MIT License - see LICENSE file for details.

