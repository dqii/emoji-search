import { EnrichedEmoji, EmojiData } from './types';
import allEmojisData from './emojis-expanded.json';

const commonEmoticonTargets: Record<string, string[]> = {
  ':)': ['😊', '😄', '🙂', '🥰', '🤗', '😁'],
  ':-)': ['😊', '😄', '🙂', '🥰', '🤗', '😁'],
  '=)': ['😊', '😄', '🙂', '🥰', '🤗', '😁'],
  ')': ['😊', '😄', '🙂', '🥰', '🤗', '😁'],
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
  ':\\': ['😕', '🤔', '🤨', '🧐', '🫤', '🤷', '🙄'],
  ':-\\': ['😕', '🤔', '🤨', '🧐', '🫤', '🤷', '🙄'],
  '\\': ['😕', '🤔', '🤨', '🧐', '🫤', '🤷', '🙄'],
  '<3': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💖', '💕'],
  '</3': ['💔'],
  ':*': ['😗', '😙', '😚', '😘'],
  ':-*': ['😗', '😙', '😚', '😘'],
  ':$': ['😳', '🫣', '😊', '😅'],
  ':-$': ['😳', '🫣', '😊', '😅'],
  'B)': ['😎'],
  'B-)': ['😎'],
  '8)': ['😎'],
  '8-)': ['😎'],
  '^_^ ': ['😊'],
  '^^': ['😊'],
  '>:(': ['😠', '😡', '😤'],
  '>:-(': ['😡', '😤'],
  ":\'(": ['😢', '😭', '😥'],
};

let allEmojis: EmojiData = [];
const knownEmoticons = new Set<string>();
const resolvedCommonEmoticonMap = new Map<string, EnrichedEmoji[]>();


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
      } 
    }
    if (targetEmojis.length > 0) {
      resolvedCommonEmoticonMap.set(emoticon.toLowerCase(), targetEmojis);
    }
  }
}

try {
  if (Array.isArray(allEmojisData)) {
    allEmojis = allEmojisData as EmojiData;
    initializeCommonEmoticonMap(); 
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


export function searchEmojis(query: string, maxResults: number = 50): EnrichedEmoji[] {
  const lowerCaseQuery = query.toLowerCase().trim();

  if (!lowerCaseQuery || allEmojis.length === 0) {
    return [];
  }

  const commonOverrideResult = resolvedCommonEmoticonMap.get(lowerCaseQuery);
  if (commonOverrideResult) {
      return commonOverrideResult.slice(0, maxResults);
  }
  const commonOverrideResult2 = resolvedCommonEmoticonMap.get(':' + lowerCaseQuery);
  if (commonOverrideResult2) {
      return commonOverrideResult2.slice(0, maxResults);
  } 
  

  const results = new Map<string, { emoji: EnrichedEmoji, score: number }>();

  for (const emoji of allEmojis) {
    let currentMaxScore = 0;
    const HIGH_SCORE = 2;
    const LOW_SCORE = 1;

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

    if (emoji.emoticons.some(emoticon => emoticon.toLowerCase() === lowerCaseQuery)) {
      currentMaxScore = Math.max(currentMaxScore, LOW_SCORE);
    }

    if (currentMaxScore > 0) {
        const existing = results.get(emoji.emoji);
        if (!existing || currentMaxScore > existing.score) {
            results.set(emoji.emoji, { emoji, score: currentMaxScore });
        }
    }
  }


  let sortedResults = Array.from(results.values())
    .sort((a, b) => b.score - a.score)
    .map(item => item.emoji);

  return sortedResults.slice(0, maxResults);
} 