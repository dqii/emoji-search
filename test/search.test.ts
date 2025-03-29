import { searchEmojis } from '../src/search';

describe('searchEmojis (with enriched data)', () => {
  it('should return an empty array for an empty query', () => {
    expect(searchEmojis('')).toEqual([]);
  });

  it('should find emoji without eyes', () => {
    const results = searchEmojis(')', 10);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(e => e.emoji === '😊')).toBe(true);
  });

  it('should find emoji by exact emoticon match', () => {
    const resultsP = searchEmojis(':p');
    expect(resultsP.length).toBeGreaterThan(1);

    const resultsHeart = searchEmojis('<3');
    expect(resultsHeart.length).toBeGreaterThan(1);
    expect(resultsHeart.some(e => e.tags.includes('heart'))).toBe(true);
  });

  it('should find emoji by exact country code match (case-insensitive)', () => {
    const resultsGB = searchEmojis('gb');
    expect(resultsGB.length).toBeGreaterThanOrEqual(1);
    expect(resultsGB.some(e => e.emoji === '🇬🇧')).toBe(true);

    const resultsGB_Upper = searchEmojis('GB');
    expect(resultsGB_Upper.length).toBeGreaterThanOrEqual(1);
    expect(resultsGB_Upper.some(e => e.emoji === '🇬🇧')).toBe(true);
  });

  it('should find emoji by exact tag match', () => {
    const results = searchEmojis('cat');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(e => e.emoji === '😼' || e.emoji === '😺')).toBe(true); // Check for common cat emojis
  });

  it('should find emoji by partial name match (case-insensitive)', () => {
    const results = searchEmojis('kingdom'); // from 'flag: united kingdom'
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(e => e.emoji === '🇬🇧')).toBe(true);

    const resultsUpper = searchEmojis('KINGDOM');
    expect(resultsUpper).toEqual(results);
  });

  it('should find emoji by partial keyword match (case-insensitive)', () => {
    const resultsSecret = searchEmojis('secret');
    expect(resultsSecret.length).toBeGreaterThanOrEqual(1);
    expect(resultsSecret.some(e => e.emoji === '🤐')).toBe(true);

    const resultsLove = searchEmojis('love');
    expect(resultsLove.length).toBeGreaterThanOrEqual(1);
    expect(resultsLove.some(e => e.emoji === '💙' || e.emoji === '❤️')).toBe(true); // Common love emojis

    const resultsShip = searchEmojis('ship');
    expect(resultsShip.length).toBeGreaterThanOrEqual(1);
    expect(resultsShip.some(e => e.emoji === '🚚' || e.emoji === '🚢')).toBe(true); // truck or ship
  });

  it('should return multiple results and respect maxResults', () => {
    const resultsFlag = searchEmojis('flag');
    expect(resultsFlag.length).toBeGreaterThanOrEqual(2); // Expect at least GB and potentially others

    const resultsFlagLimited = searchEmojis('flag', 1);
    expect(resultsFlagLimited.length).toBe(1);
  });

  it('should not find emojis for a nonsensical query', () => {
    const results = searchEmojis('qwertyuiopasdfghjkl');
    expect(results).toEqual([]);
  });
}); 