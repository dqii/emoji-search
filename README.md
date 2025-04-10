# Emoji Search TS

A simple TypeScript library for searching emojis based on names, keywords, emoticons, tags, and country codes. It uses an enriched emoji dataset generated by the DeepSeek API.

```bash
npm install @diqi/emoji-search
```

## Features

* Search emojis by
  * Name (e.g., "cat face", "heart")
  * Semantic keywords (e.g., "love", "sad", "party")
  * Common emoticons (e.g., `:), :P, <3, :x`)
  * Tags (e.g., "animal", "food", "flag")
  * Country code (e.g., "US", "GB", "DE")
* Uses a pre-generated JSON file for fast, local searching (no external API calls at runtime).
* Includes a script to generate the enriched JSON data using the DeepSeek API.

## Prerequisites

1. **Node.js and npm:** Required for running the TypeScript package and build/test scripts. ([Download Node.js](https://nodejs.org/))
2. **Python 3:** Required for the metadata generation script. ([Download Python](https://www.python.org/))
3. **DeepSeek API Key:** You need an API key from DeepSeek. ([Sign up/Login at DeepSeek](https://platform.deepseek.com/))

## Setup

```bash
git clone https://github.com/dqii/emoji-search
cd emoji-search
npm install
pip install requests python-dotenv
```

Add your DeepSeek API key to `.env`:

```bash
DEEPSEEK_API_KEY=YOUR_DEEPSEEK_API_KEY_HERE
```

## Data Generation (One-time Step)

The search functionality relies on an enriched data file (`emojis-expanded.json`) which needs to be generated using the provided Python script and your DeepSeek API key.

1. **Ensure `.env` file is set up** with your `DEEPSEEK_API_KEY`.

2. **Run the generation script:** From the project root directory (`emoji-search`), run:

    ```bash
    python scripts/generate_metadata.py
    ```

    This script will:
    * Read your API key from the `.env` file.
    * Read the base `emojis.json` file.
    * Query the DeepSeek API for each emoji to generate keywords, emoticons, descriptions, tags, and country codes.
    * Write the results to `emojis-expanded.json` in the project root.

    This process can take several minutes depending on your system, the number of emojis, and DeepSeek API limits/latency.

    *(Note: If you modify `emojis.json` later, you'll need to re-run this script.)*

## Usage

```bash
npm install @diqi/emoji-search
```

```typescript
import { searchEmojis } from '@diqi/emoji-search';

// --- Examples ---

// Search by keyword
const happyEmojis = searchEmojis('happy');
console.log('Happy:', happyEmojis.map(e => e.emoji));
// Example Output: Happy: [ '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '🥰', '🥳' ] (Results may vary based on generated data)

// Search by emoticon
const tongueEmojis = searchEmojis(':p');
console.log('Tongue Out:', tongueEmojis.map(e => e.emoji));
// Example Output: Tongue Out: [ '😛', '😜', '🤪', '😝' ]

// Search by country code
const ukFlag = searchEmojis('gb');
console.log('UK Flag:', ukFlag.map(e => e.emoji));
// Example Output: UK Flag: [ '🇬🇧' ]

// Search by name fragment
const catEmojis = searchEmojis('cat face');
console.log('Cat Faces:', catEmojis.map(e => e.emoji));
// Example Output: Cat Faces: [ '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾' ]

// Limit results
const limitedFlags = searchEmojis('flag', 5);
console.log('Flags (max 5):', limitedFlags.map(e => e.emoji));
```

## Development

### Commands

```bash
git clone https://github.com/dqii/emoji-search
cd emoji-search
npm install
pip install requests
```

### Build and test

```bash
npm run build
npm test
```

### Publishing to npm

Ensure you have an npm access token with publish permissions in your `.npmrc` file.

```ini
//registry.npmjs.org/:_authToken=NPM_ACCESS_TOKEN
```

Before publishing, ensure you increment the `version` field in `package.json`.

```bash
npm login
npm run build
npm publish --access public
```
