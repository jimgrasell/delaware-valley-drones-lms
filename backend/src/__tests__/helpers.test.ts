import {
  generateVerificationId,
  parseToken,
  formatProgress,
  calculateQuizScore,
  isQuizPassed,
  formatDate,
  generateRandomString,
} from '../utils/helpers';

describe('generateVerificationId', () => {
  it('returns a string starting with CERT-', () => {
    const id = generateVerificationId();
    expect(id).toMatch(/^CERT-[A-Z0-9-]{12}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateVerificationId()));
    expect(ids.size).toBe(100);
  });
});

describe('parseToken', () => {
  it('parses a valid JWT payload', () => {
    // Construct a minimal JWT: header.payload.signature
    const payload = { userId: '123', email: 'test@test.com', role: 'student' };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const token = `eyJhbGciOiJIUzI1NiJ9.${encoded}.fakesig`;

    const result = parseToken(token);
    expect(result).toEqual(payload);
  });

  it('returns null for invalid token', () => {
    expect(parseToken('not-a-token')).toBeNull();
    expect(parseToken('')).toBeNull();
  });

  it('returns null for malformed base64', () => {
    expect(parseToken('a.!!!.c')).toBeNull();
  });
});

describe('formatProgress', () => {
  it('calculates percentage correctly', () => {
    expect(formatProgress(5, 13)).toBe(38);
    expect(formatProgress(13, 13)).toBe(100);
    expect(formatProgress(0, 13)).toBe(0);
  });

  it('returns 0 when totalChapters is 0', () => {
    expect(formatProgress(0, 0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(formatProgress(1, 3)).toBe(33);
    expect(formatProgress(2, 3)).toBe(67);
  });
});

describe('calculateQuizScore', () => {
  it('calculates score as percentage', () => {
    expect(calculateQuizScore(7, 10)).toBe(70);
    expect(calculateQuizScore(10, 10)).toBe(100);
    expect(calculateQuizScore(0, 10)).toBe(0);
  });

  it('returns 0 when totalQuestions is 0', () => {
    expect(calculateQuizScore(0, 0)).toBe(0);
  });

  it('rounds correctly', () => {
    expect(calculateQuizScore(1, 3)).toBe(33);
    expect(calculateQuizScore(2, 3)).toBe(67);
  });
});

describe('isQuizPassed', () => {
  it('passes when score meets threshold', () => {
    expect(isQuizPassed(70, 70)).toBe(true);
    expect(isQuizPassed(80, 70)).toBe(true);
    expect(isQuizPassed(100, 70)).toBe(true);
  });

  it('fails when score is below threshold', () => {
    expect(isQuizPassed(69, 70)).toBe(false);
    expect(isQuizPassed(0, 70)).toBe(false);
  });

  it('handles edge cases', () => {
    expect(isQuizPassed(0, 0)).toBe(true);
    expect(isQuizPassed(100, 100)).toBe(true);
  });
});

describe('formatDate', () => {
  it('returns an ISO string', () => {
    const date = new Date('2026-04-13T12:00:00Z');
    expect(formatDate(date)).toBe('2026-04-13T12:00:00.000Z');
  });
});

describe('generateRandomString', () => {
  it('generates string of specified length', () => {
    expect(generateRandomString(8).length).toBe(8);
    expect(generateRandomString(32).length).toBe(32);
  });

  it('defaults to 16 characters', () => {
    expect(generateRandomString().length).toBe(16);
  });

  it('contains only alphanumeric characters', () => {
    const str = generateRandomString(100);
    expect(str).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('generates unique strings', () => {
    const strs = new Set(Array.from({ length: 50 }, () => generateRandomString()));
    expect(strs.size).toBe(50);
  });
});
