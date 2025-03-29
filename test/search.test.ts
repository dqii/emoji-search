import { searchEmojis } from '../src/search';
import { EnrichedEmoji } from '../src/types';
import * as fs from 'fs';

// Mock the fs module to control the data loaded by search.ts
jest.mock('fs');
const mockedFs = jest.mocked(fs);

// --- Mock Data ---
// Create a sample of EnrichedEmoji data for testing
const mockEmojiData: EnrichedEmoji[] = [
  {
    code: ['1F600'], emoji: '😀', name: 'grinning face',
    keywords: ['happy', 'joy', 'smile', 'face'], emoticons: [':)', ':-)'], description: 'A standard grinning face.', tags: ['face', 'emotion', 'positive'], country_code: null
  },
  {
    code: ['1F602'], emoji: '😂', name: 'face with tears of joy',
    keywords: ['laugh', 'tear', 'happy', 'cry', 'lol'], emoticons: [":'D"], description: 'Laughing so hard tears are streaming.', tags: ['face', 'emotion', 'positive', 'laughing'], country_code: null
  },
  {
    code: ['1F61B'], emoji: '😛', name: 'face with tongue',
    keywords: ['silly', 'playful', 'tease'], emoticons: [':p', ':-p'], description: 'A face sticking its tongue out.', tags: ['face', 'emotion', 'playful'], country_code: null
  },
   {
    code: ['1F63A'], emoji: '😼', name: 'smirking cat face',
    keywords: ['cat', 'smirk', 'animal', 'wry'], emoticons: [], description: 'A cat face with a knowing smirk.', tags: ['face', 'animal', 'cat'], country_code: null
  },
  {
    code: ['1F499'], emoji: '💙', name: 'blue heart',
    keywords: ['love', 'like', 'romance', 'emotion', 'blue'], emoticons: ['<3'], description: 'A blue heart, often representing friendship or platonic love.', tags: ['heart', 'emotion', 'symbol', 'love'], country_code: null
  },
   {
    code: ['1F510'], emoji: '🤐', name: 'zipper-mouth face',
    keywords: ['secret', 'quiet', 'silence', 'lips sealed'], emoticons: [':x'], description: 'A face with a zipper for a mouth, signifying a secret or silence.', tags: ['face', 'emotion', 'secret'], country_code: null
  },
  {
    code: ['1F1FA-1F1F8'], emoji: '🇺🇸', name: 'flag: united states',
    keywords: ['usa', 'america', 'flag', 'country'], emoticons: [], description: 'The flag of the United States of America.', tags: ['flag', 'country', 'nation'], country_code: 'US'
  },
  {
    code: ['1F1EC-1F1E7'], emoji: '🇬🇧', name: 'flag: united kingdom',
    keywords: ['uk', 'britain', 'flag', 'country', 'british'], emoticons: [], description: 'The flag of the United Kingdom.', tags: ['flag', 'country', 'nation'], country_code: 'GB'
  },
    {
    code: ['1F69A'], emoji: '🚚', name: 'delivery truck',
    keywords: ['truck', 'vehicle', 'transport', 'shipping'], emoticons: [], description: 'A delivery truck.', tags: ['vehicle', 'object', 'transport'], country_code: null
  },
];

describe('searchEmojis (with enriched data)', () => {

  // Before each test, set up the mock implementation for fs
  beforeEach(() => {
    // Mock existsSync to return true, indicating the file exists
    mockedFs.existsSync.mockReturnValue(true);
    // Mock readFileSync to return our stringified mock data
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockEmojiData));
    // We need to dynamically import searchEmojis *after* the mocks are set up
    // This is a common pattern when testing modules with top-level code execution (like file reading)
    // You might need to adjust your Jest config (e.g., resetModules: true) if you face issues.
    // For simplicity here, we assume the module is fresh on each run or re-imported if needed.
  });

  afterEach(() => {
    // Reset mocks after each test
    jest.resetAllMocks();
  });

  it('should return an empty array if data loading fails or file empty', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('[]'); // Simulate empty file
    // Need to force re-require/re-import searchEmojis after changing the mock if it wasn't done automatically
    // For this test, let's just call it directly assuming initial load was ok
    expect(searchEmojis('test')).toEqual([]);

    mockedFs.existsSync.mockReturnValue(false); // Simulate file not found
    expect(searchEmojis('test')).toEqual([]);
  });

  it('should return an empty array for an empty query', () => {
    expect(searchEmojis('')).toEqual([]);
  });

  it('should find emoji by exact emoticon match', () => {
    const resultsP = searchEmojis(':p');
    expect(resultsP.length).toBe(1);
    expect(resultsP[0].emoji).toBe('😛');

    const resultsHeart = searchEmojis('<3');
    expect(resultsHeart.length).toBe(1);
    expect(resultsHeart[0].emoji).toBe('💙');

    const resultsX = searchEmojis(':x');
    expect(resultsX.length).toBe(1);
    expect(resultsX[0].emoji).toBe('🤐');
  });

  it('should find emoji by exact country code match (case-insensitive)', () => {
    const resultsUS = searchEmojis('us');
    expect(resultsUS.length).toBe(1);
    expect(resultsUS[0].emoji).toBe('🇺🇸');

    const resultsGB = searchEmojis('GB');
    expect(resultsGB.length).toBe(1);
    expect(resultsGB[0].emoji).toBe('🇬🇧');
  });

   it('should find emoji by exact tag match', () => {
    const results = searchEmojis('cat');
    // Should match the cat tag and potentially cat in name/keywords
    expect(results.some(e => e.emoji === '😼')).toBe(true);
  });

  it('should find emoji by partial name match (case-insensitive)', () => {
    const results = searchEmojis('king'); // from 'flag: united kingdom'
    expect(results.length).toBe(1);
    expect(results[0].emoji).toBe('🇬🇧');

     const resultsUpper = searchEmojis('KING');
     expect(resultsUpper).toEqual(results);
  });

  it('should find emoji by partial keyword match (case-insensitive)', () => {
    const resultsSecret = searchEmojis('secret');
    expect(resultsSecret.length).toBe(1);
    expect(resultsSecret[0].emoji).toBe('🤐');

    const resultsLove = searchEmojis('love');
    expect(resultsLove.some(e => e.emoji === '💙')).toBe(true);

    const resultsShip = searchEmojis('ship'); // from 'shipping'
    expect(resultsShip.some(e => e.emoji === '🚚')).toBe(true);
  });

  it('should return multiple results and respect maxResults', () => {
    // "flag" keyword/tag exists in both US and GB flags
    const resultsFlag = searchEmojis('flag');
    expect(resultsFlag.length).toBe(2);
    expect(resultsFlag.some(e => e.emoji === '🇺🇸')).toBe(true);
    expect(resultsFlag.some(e => e.emoji === '🇬🇧')).toBe(true);

    // Test maxResults
    const resultsFlagLimited = searchEmojis('flag', 1);
    expect(resultsFlagLimited.length).toBe(1);
  });

  it('should return unique emojis even if matched multiple ways', () => {
    // 'usa' matches country code 'US' and keyword 'usa' for the same flag
    const results = searchEmojis('usa');
    expect(results.length).toBe(1);
    expect(results[0].emoji).toBe('🇺🇸');
  });

  it('should not find emojis for a nonsensical query', () => {
    const results = searchEmojis('qwertyuiopasdfghjkl');
    expect(results).toEqual([]);
  });
}); 