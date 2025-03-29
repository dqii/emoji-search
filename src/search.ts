import { EnrichedEmoji, EmojiData } from './types';
import allEmojisData from './emojis-expanded.json'; // Import the JSON directly

// Used to check for potential single-character emoticons
const partialEmoticonChars = new Set([')', '(', 'p', 'd', '/', '\\', 'o', '|', ']', '[']);

// Manual overrides for common emoticons -> specific graphical emojis
const commonEmoticonTargets: Record<string, string[]> = {
  ':)': ['😊', '😄', '🙂', '🥰', '🤗', '☺️', '😁'],
  ':-)': ['😊', '😄', '🙂', '🥰', '🤗', '☺️', '😁'],
  '=)': ['😊', '😄', '🙂', '🥰', '🤗', '☺️', '😁'],
  ')': ['😊', '😄', '🙂', '🥰', '🤗', '☺️', '😁'],
  ':d': ['😀', '😃', '😂', '🤣', '😆', '😁', '😄'],
  ':-d': ['😀', '😃', '😂', '🤣', '😆', '😁', '😄'],
  '=d': ['😀', '😃', '😂', '🤣', '😆', '😁', '😄'],
  'd': ['😀', '😃', '😂', '🤣', '😆', '😁', '😄'],
  ':p': ['😋', '😛', '😜', '🤪'],
  ':-p': ['😋', '😛', '😜', '🤪'],
  '=p': ['😋', '😛', '😜', '🤪'],
  'p': ['😋', '😛', '😜', '🤪'],
  ':(': ['😞', '😟', '😢', '😥', '🙁', '🥺', '😔'],
  ':-(': ['😞', '😟', '😢', '😥', '🙁', '🥺', '😔'],
  '=(': ['😞', '😟', '😢', '😥', '🙁', '🥺', '😔'],
  '(': ['😞', '😟', '😢', '😥', '🙁', '🥺', '😔'],
  ':o': ['😮', '😯', '😲', '😳', '😱'],
  ':-o': ['😮', '😯', '😲', '😳', '😱'],
  'o': ['😮', '😯', '😲', '😳', '😱'],
  ':|': ['😐', '😑', '😶'],
  ':-|': ['😐', '😑', '😶'],
  '=|': ['😐', '😑', '😶'],
  '|': ['😐', '😑', '😶'],
  ';)': ['😉', '😊', '🥰', '😘', '🤗'],
  ';-)': ['😉', '😊', '🥰', '😘', '🤗'],
  ';': ['😉', '😊', '🥰', '😘', '🤗'],
  ':/': ['😕', '🤔', '🤨', '🧐', '🫤', '🤷', '🙄'],
  ':-/': ['😕', '🤔', '🤨', '🧐', '🫤', '🤷', '🙄'],
  '/': ['😕', '🤔', '🤨', '🧐', '🫤', '🤷', '🙄'],
  ':\\': ['😕', '🤔', '🤨', '🧐', '🫤', '🤷', '🙄'], // Need double escape for literal \
  ':-\\': ['😕', '🤔', '🤨', '🧐', '🫤', '🤷', '🙄'], // Need double escape for literal \
  '\\': ['😕', '🤔', '🤨', '🧐', '🫤', '🤷', '🙄'], // Need double escape for literal \
  '<3': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '♥️', '💖', '💕'],
  '</3': ['💔'], // Broken heart
  ':*': ['😗', '😙', '😚', '😘'],
  ':-*': ['😗', '😙', '😚', '😘'],
  ':$': ['😳', '🫣', '😊', '😅'],
  ':-$': ['😳', '🫣', '😊', '😅'],
  'B)': ['😎'],
  'B-)': ['😎'],
  '8)': ['😎'],
  '8-)': ['😎'],
  '^_^ ': ['😊', '☺️'],
  '^^': ['😊', '☺️'],
  '>:(': ['😠', '😡', '😤'],
  '>:-(': ['��', '😡', '😤'],
  ":\'(": ['😢', '😭', '😥'], // Crying faces (Key uses escaped single quote)
};

let allEmojis: EmojiData = [];
const knownEmoticons = new Set<string>(); // Set of all emoticons found in the data
const knownTextSymbolsToFilter = new Set<string>(['☺']); // Explicitly filter U+263A if query is an emoticon
const resolvedCommonEmoticonMap = new Map<string, EnrichedEmoji[]>(); // Pre-resolved common overrides

// Pre-computation: Resolves commonEmoticonTargets into actual emoji objects for quick lookup
function initializeCommonEmoticonMap() {
  if (!allEmojis || allEmojis.length === 0) return;

  const emojiStringToObjMap = new Map<string, EnrichedEmoji>();
  for (const emoji of allEmojis) {
    emojiStringToObjMap.set(emoji.emoji, emoji);
  }

  for (const [emoticon, targetEmojiStrings] of Object.entries(commonEmoticonTargets)) {
    const targetEmojis: EnrichedEmoji[] = [];
    for (const emojiStr of targetEmojiStrings) {
      const emojiObj = emojiStringToObjMap.get(emojiStr);
      if (emojiObj) {
        targetEmojis.push(emojiObj);
      } else {
        console.warn(`Target emoji "${emojiStr}" for emoticon "${emoticon}" not found in allEmojis.`);
      }
    }
    if (targetEmojis.length > 0) {
      resolvedCommonEmoticonMap.set(emoticon.toLowerCase(), targetEmojis);
    }
  }
}

// Load data and run pre-computation
try {
  if (Array.isArray(allEmojisData)) {
    allEmojis = allEmojisData as EmojiData;
    initializeCommonEmoticonMap(); // Resolve common overrides
    // Build set of all known emoticons (used for the general filtering step)
    for (const emoji of allEmojis) {
      for (const emoticon of emoji.emoticons) {
        knownEmoticons.add(emoticon.toLowerCase());
      }
    }
  } else {
    console.error('Error: Imported emojis-expanded.json is not a valid JSON array.');
    allEmojis = [];
  }
} catch (error) {
  console.error('Error processing imported emoji data:', error);
  allEmojis = [];
}

/**
 * Searches for emojis based on a query string.
 * 1. Checks for manual overrides for common emoticons (e.g., ':)' -> ['😊', ...]).
 * 2. If no override, performs a scored search:
 *    - Higher score (2) for matches in name, keywords, tags, country code.
 *    - Lower score (1) for matches in emoticons.
 * 3. Sorts results by score (descending).
 * 4. Filters out specific text symbols (like '☺') if the query was identified as any known emoticon.
 * @param query The search query.
 * @param maxResults Optional limit for the number of results.
 * @returns An array of matching emojis.
 */
export function searchEmojis(query: string, maxResults: number = 50): EnrichedEmoji[] {
  const lowerCaseQuery = query.toLowerCase().trim();

  if (!lowerCaseQuery || allEmojis.length === 0) {
    return [];
  }

  // --- 1. Check for Common Emoticon Override ---
  const commonOverrideResult = resolvedCommonEmoticonMap.get(lowerCaseQuery);

  // Manual overrides now explicitly handle single chars like ')' if needed.
  // No need to derive potential full emoticons for the override check anymore.

  if (commonOverrideResult) {
      return commonOverrideResult.slice(0, maxResults); // Return override results directly
  }

  // --- 2. Proceed with General Scored Search (if no override) ---

  // Is the query a known emoticon? (Used for filtering step 4)
  const queryIsKnownEmoticon = knownEmoticons.has(lowerCaseQuery);

  const results = new Map<string, { emoji: EnrichedEmoji, score: number }>();

  for (const emoji of allEmojis) {
    let currentMaxScore = 0;
    const HIGH_SCORE = 2;
    const LOW_SCORE = 1;

    // Higher priority matches get HIGH_SCORE
    if (lowerCaseQuery.length <= 3 && emoji.country_code === lowerCaseQuery.toUpperCase()) {
       currentMaxScore = Math.max(currentMaxScore, HIGH_SCORE);
    }
    if (emoji.tags.includes(lowerCaseQuery)) {
        currentMaxScore = Math.max(currentMaxScore, HIGH_SCORE);
    }
    if (emoji.name.toLowerCase().includes(lowerCaseQuery)) {
      currentMaxScore = Math.max(currentMaxScore, HIGH_SCORE);
    }
    if (emoji.keywords.some(kw => kw.includes(lowerCaseQuery))) {
      currentMaxScore = Math.max(currentMaxScore, HIGH_SCORE);
    }

    // Lower priority emoticon matches get LOW_SCORE
    if (emoji.emoticons.some(emoticon => emoticon.toLowerCase() === lowerCaseQuery)) {
      currentMaxScore = Math.max(currentMaxScore, LOW_SCORE);
    }
    // Removed check for derived emoticon (potentialFullEmoticon)

    // Add/update result if score > 0 and higher than any existing score for this emoji
    if (currentMaxScore > 0) {
        const existing = results.get(emoji.emoji);
        if (!existing || currentMaxScore > existing.score) {
            results.set(emoji.emoji, { emoji, score: currentMaxScore });
        }
    }
  }

  // --- 3. Sort Results by Score --- 
  let sortedResults = Array.from(results.values())
    .sort((a, b) => b.score - a.score) // Descending score
    .map(item => item.emoji);

  // --- 4. Filter specific text symbols if query was an emoticon --- 
  if (queryIsKnownEmoticon) {
      // Filter applies only if the query was identified as an emoticon
      // AND it wasn't handled by the manual override map.
      sortedResults = sortedResults.filter(emoji => !knownTextSymbolsToFilter.has(emoji.emoji));
  }

  // Return top N results
  return sortedResults.slice(0, maxResults);
} 