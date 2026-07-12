import { extractDateCandidates } from '@/lib/ocr/dateParser';

describe('extractDateCandidates', () => {
  it('parses "12 JUL 2026" as high confidence', () => {
    const result = extractDateCandidates('BEST BEFORE 12 JUL 2026');
    expect(result[0]).toMatchObject({ iso: '2026-07-12', confidence: 'high' });
  });

  it('parses a 2-digit year with a month name', () => {
    const result = extractDateCandidates('EXP 05 Jan 27');
    expect(result[0]).toMatchObject({ iso: '2027-01-05', confidence: 'high' });
  });

  it('parses ISO-like "2026-07-14"', () => {
    const result = extractDateCandidates('Use by 2026-07-14');
    expect(result[0]).toMatchObject({ iso: '2026-07-14', confidence: 'high' });
  });

  it('parses ISO-like with slashes "2026/07/14"', () => {
    const result = extractDateCandidates('2026/07/14');
    expect(result[0]).toMatchObject({ iso: '2026-07-14', confidence: 'high' });
  });

  it('parses "EXP 09/26" as month/year-only, low confidence, defaulting to the 1st', () => {
    const result = extractDateCandidates('EXP 09/26');
    expect(result[0]).toMatchObject({ iso: '2026-09-01', confidence: 'low' });
  });

  it('parses numeric D/M/Y as low confidence', () => {
    const result = extractDateCandidates('14/07/2026');
    expect(result[0]).toMatchObject({ iso: '2026-07-14', confidence: 'low' });
  });

  it('returns multiple candidates when text has more than one date-like substring', () => {
    const result = extractDateCandidates('MFG 01/01/2026 EXP 14/07/2026');
    expect(result.map((c) => c.iso)).toEqual(expect.arrayContaining(['2026-01-01', '2026-07-14']));
  });

  it('de-duplicates the same date found by multiple patterns, preferring high confidence', () => {
    const result = extractDateCandidates('12 JUL 2026 / 12/07/2026');
    const matchesForDate = result.filter((c) => c.iso === '2026-07-12');
    expect(matchesForDate).toHaveLength(1);
    expect(matchesForDate[0].confidence).toBe('high');
  });

  it('returns an empty array when no date-like text is found', () => {
    expect(extractDateCandidates('Organic Whole Milk 2% Fat')).toEqual([]);
  });

  it('ignores an invalid month number', () => {
    expect(extractDateCandidates('13/45/2026')).toEqual([]);
  });

  it('rejects a calendar-invalid day for a 30-day month', () => {
    expect(extractDateCandidates('31 Apr 2026')).toEqual([]);
  });

  it('rejects Feb 29 on a non-leap year but accepts it on a leap year', () => {
    expect(extractDateCandidates('29 Feb 2026')).toEqual([]);
    expect(extractDateCandidates('29 Feb 2028')[0]).toMatchObject({ iso: '2028-02-29' });
  });
});
