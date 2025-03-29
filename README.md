# Emoji Search TS

A simple TypeScript library for searching emojis based on names, keywords, emoticons, tags, and country codes. It uses an enriched emoji dataset generated by a local LLM via Ollama.

## Features

* Search emojis by
  * Name (e.g., "cat face", "heart")
  * Semantic keywords (e.g., "love", "sad", "party")
  * Common emoticons (e.g., `:), :P, <3, :x`)
  * Tags (e.g., "animal", "food", "flag")
  * Country code (e.g., "US", "GB", "DE")
* Uses a pre-generated JSON file for fast, local searching (no external API calls at runtime).
* Includes a script to generate the enriched JSON data using a local LLM (Ollama).

Run `ollama run llama3` (or your chosen model) in your terminal to download it.

## Installation

```bash
npm install @diqi/emoji-search
```

## Usage

After building the project (`npm run build`), you can import and use the `searchEmojis` function in your own Node.js/TypeScript projects.

```typescript
// Assuming 'emoji-search' is installed or linked
import { searchEmojis } from '@diqi/emoji-search'; // Adjust path/import based on your setupi

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

Remember to ensure the generated `emojis-expanded.json` file is available relative to where the compiled `search.js` code expects it (or adjust the path in `src/search.ts` if needed before building).


## Development

### Prerequisites

1. **Node.js and npm:** Required for running the TypeScript package and build/test scripts. ([Download Node.js](https://nodejs.org/))
2. **Python 3:** Required for the metadata generation script. ([Download Python](https://www.python.org/))
3. **Ollama:** Required to run the local LLM for metadata generation. ([Install Ollama](https://ollama.com/))
4. **Ollama Model:** You need to have downloaded an LLM model for Ollama. The script defaults to `llama3`, but you can configure it.

### Commands

```bash
git clone https://github.com/dqii/emoji-search
cd emoji-search
npm install
pip install requests
```

### Data Generation (One-time Step)

The search functionality relies on an enriched data file (`emojis-expanded.json`) which needs to be generated using the provided Python script and a running Ollama instance.

1. **Ensure Ollama is running:** Open a separate terminal and make sure Ollama is running with your chosen model loaded.

    ```bash
    ollama run llama3 # Or your chosen model (e.g., phi3, mistral)
    ```

2. **Run the generation script:** From the project root directory (`emoji-search`), run:

    ```bash
    python scripts/generate_metadata.py
    ```

    This script will:

    * Connect to Ollama.
    * Read the base `emojis.json` file.
    * Query the LLM for each emoji to generate keywords, emoticons, descriptions, tags, and country codes.
    * Write the results to `emojis-expanded.json` in the project root.

    This process can take several minutes depending on your system and the number of emojis.

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
