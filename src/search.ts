import * as fs from 'fs';
import * as path from 'path';
import { EnrichedEmoji, EmojiData } from './types';

// Load enriched emoji data from the JSON file
const emojiFilePath = path.resolve(__dirname, '../../emojis-expanded.json'); // Load the new file
let allEmojis: EmojiData = []; // Initialize as an empty array

try {
  if (fs.existsSync(emojiFilePath)) {
      const fileContent = fs.readFileSync(emojiFilePath, 'utf8');
      allEmojis = JSON.parse(fileContent);
      if (!Array.isArray(allEmojis)) {
        console.error('Error: emojis-expanded.json does not contain a valid JSON array.');
        allEmojis = []; // Reset to empty on invalid format
      }
  } else {
    console.error(`Error: emojis-expanded.json not found at ${emojiFilePath}`);
    console.error('Please run the metadata generation script first (e.g., python scripts/generate_metadata.py)');
    // Optionally, you could fall back to the original emojis.json here if needed
  }
} catch (error) {
  console.error('Error loading or parsing emoji data:', error);
  // Keep allEmojis as empty array on error
}

/**
 * Searches for emojis based on a query string using enriched metadata.
 * @param query The search query.
 * @param maxResults Optional limit for the number of results.
 * @returns An array of matching emojis.
 */
export function searchEmojis(query: string, maxResults: number = 50): EnrichedEmoji[] {
  const lowerCaseQuery = query.toLowerCase().trim();

  if (!lowerCaseQuery || allEmojis.length === 0) {
    return [];
  }

  const results = new Map<string, EnrichedEmoji>(); // Use Map to ensure unique emojis by character

  for (const emoji of allEmojis) {
    if (results.size >= maxResults) break; // Stop if max results reached

    let matchFound = false;

    // 1. Exact emoticon match
    if (emoji.emoticons.includes(lowerCaseQuery)) {
      matchFound = true;
    }

    // 2. Exact country code match (only for short queries)
    if (!matchFound && lowerCaseQuery.length <= 3 && emoji.country_code === lowerCaseQuery.toUpperCase()) {
       matchFound = true;
    }

    // 3. Exact tag match
    if (!matchFound && emoji.tags.includes(lowerCaseQuery)) {
        matchFound = true;
    }

    // 4. Partial match in name
    if (!matchFound && emoji.name.toLowerCase().includes(lowerCaseQuery)) {
      matchFound = true;
    }

    // 5. Partial match in keywords
    if (!matchFound && emoji.keywords.some(kw => kw.includes(lowerCaseQuery))) {
      matchFound = true;
    }

    // 6. Partial match in description (optional, can be noisy)
    // if (!matchFound && emoji.description.toLowerCase().includes(lowerCaseQuery)) {
    //   matchFound = true;
    // }

    // Add to results if a match was found and emoji not already added
    if (matchFound && !results.has(emoji.emoji)) {
      results.set(emoji.emoji, emoji);
    }
  }

  return Array.from(results.values());
} 