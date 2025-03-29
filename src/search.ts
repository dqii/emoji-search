import { EnrichedEmoji, EmojiData } from './types';
import allEmojisData from './emojis-expanded.json'; // Import the JSON directly

// Characters that might be the end of a common emoticon (missing the leading ':')
const partialEmoticonChars = new Set([')', '(', 'p', 'd', '/', '\\', 'o', '|', ']', '[']);

// Assign the imported data
let allEmojis: EmojiData = [];

// Basic validation after import
try {
  if (Array.isArray(allEmojisData)) {
    allEmojis = allEmojisData as EmojiData;
  } else {
    console.error('Error: Imported emojis-expanded.json is not a valid JSON array.');
    allEmojis = []; // Reset to empty on invalid format
  }
} catch (error) {
  console.error('Error processing imported emoji data:', error);
  allEmojis = []; // Reset to empty on error
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

  // Check if the query might be a partial emoticon (e.g., ')' instead of ':)')
  let potentialFullEmoticon: string | null = null;
  if (lowerCaseQuery.length === 1 && partialEmoticonChars.has(lowerCaseQuery)) {
      potentialFullEmoticon = ':' + lowerCaseQuery;
  }

  const results = new Map<string, EnrichedEmoji>(); // Use Map to ensure unique emojis by character

  for (const emoji of allEmojis) {
    if (results.size >= maxResults) break; // Stop if max results reached

    let matchFound = false;

    // 1. Case-insensitive full emoticon match (original query)
    if (emoji.emoticons.some(emoticon => emoticon.toLowerCase() === lowerCaseQuery)) {
      matchFound = true;
    }

    // 1b. Check potential full emoticon generated by heuristic
    if (!matchFound && potentialFullEmoticon && emoji.emoticons.some(emoticon => emoticon.toLowerCase() === potentialFullEmoticon)) {
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