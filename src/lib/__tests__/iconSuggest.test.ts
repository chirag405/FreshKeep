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
});
