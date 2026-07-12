import { suggestIcon } from '@/lib/iconSuggest';

describe('suggestIcon', () => {
  it('matches milk', () => {
    expect(suggestIcon('Milk (2%)', 'expiry')).toBe('🥛');
  });
  it('matches paracetamol as medicine', () => {
    expect(suggestIcon('Paracetamol', 'expiry')).toBe('💊');
  });
  it('matches bedsheets', () => {
    expect(suggestIcon('Changed the bedsheets', 'lastTime')).toBe('🛏️');
  });
  it('is case-insensitive', () => {
    expect(suggestIcon('BREAD loaf', 'expiry')).toBe('🍞');
  });
  it('falls back to a default icon per section when nothing matches', () => {
    expect(suggestIcon('Xyzzy', 'expiry')).toBe('🥫');
    expect(suggestIcon('Xyzzy', 'lastTime')).toBe('📝');
  });
  it('distinguishes salad from other greens', () => {
    expect(suggestIcon('Caesar salad', 'expiry')).toBe('🥗');
    expect(suggestIcon('Spinach', 'expiry')).toBe('🥬');
  });
  it('matches newly added home & chores keywords', () => {
    expect(suggestIcon('Car oil change', 'lastTime')).toBe('🚗');
    expect(suggestIcon('Spare keys', 'lastTime')).toBe('🔑');
    expect(suggestIcon('Vacuum the carpet', 'lastTime')).toBe('🧹');
  });
  it('does not false-positive-match "ac" inside an unrelated word', () => {
    expect(suggestIcon('Zodiac calendar', 'lastTime')).toBe('📝');
  });
});
