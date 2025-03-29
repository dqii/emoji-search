// Represents the structure of a single emoji in emojis-expanded.json
export interface EnrichedEmoji {
  code: string[];
  emoji: string;
  name: string; // Original name
  keywords: string[]; // LLM generated keywords
  emoticons: string[]; // LLM generated emoticons
  description: string; // LLM generated description
  tags: string[]; // LLM generated tags
  country_code: string | null; // LLM generated country code (or null)
}

// The structure of the entire emojis-expanded.json file
export type EmojiData = EnrichedEmoji[]; // It's now a flat array 