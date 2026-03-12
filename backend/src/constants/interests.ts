export const INTERESTS: string[] = [
  'coding',        // bit 0
  'gaming',        // bit 1
  'anime',         // bit 2
  'music',         // bit 3
  'sports',        // bit 4
  'movies',        // bit 5
  'reading',       // bit 6
  'art',           // bit 7
  'photography',   // bit 8
  'cooking',       // bit 9
  'travel',        // bit 10
  'fitness',       // bit 11
  'yoga',          // bit 12
  'dancing',       // bit 13
  'singing',       // bit 14
  'writing',       // bit 15
  'poetry',        // bit 16
  'dramatics',       // bit 17
  'cricket',       // bit 18
  'football',      // bit 19
  'basketball',    // bit 20
  'chess',         // bit 21
  'maths',         // bit 22
  'physics',       // bit 23
  'foodie',     // bit 24
  'stand-ups',       // bit 25
  'history',       // bit 26
  'politics',      // bit 27
  'philosophy',    // bit 28
  'psychology',    // bit 29
  'economics',     // bit 30
  'startups',      // bit 31
  'finance',       // bit 32
  'machine-learning', // bit 33
  'web-dev',       // bit 34
  'astronomy',    // bit 35
  'cybersecurity', // bit 36
  'blockchain',    // bit 37
  'robotics',      // bit 38
  'astronomy',     // bit 39
  'environment',   // bit 40
  'hall-culture',  // bit 41
  'fashion',       // bit 42
  'quizzing',         // bit 43
  'podcasts',      // bit 44
  'competitive-programming',         // bit 45
  'vlsi',   // bit 46
  'hiking',        // bit 47
  'meditation',    // bit 48
  'maggu',     // bit 49
];

export const INTEREST_INDEX: Record<string, number> = {};
INTERESTS.forEach((interest, index) => {
  INTEREST_INDEX[interest] = index;
});

export function interestsToBigInt(interests: string[]): bigint {
  let result = 0n;
  for (const interest of interests) {
    const index = INTEREST_INDEX[interest];
    if (index !== undefined) {
      result |= (1n << BigInt(index)); // Set bit at position `index`
    }
  }
  return result;
}

export function bigIntToInterests(bits: bigint): string[] {
  const result: string[] = [];
  for (let i = 0; i < INTERESTS.length; i++) {
    if (bits & (1n << BigInt(i))) {
      result.push(INTERESTS[i]);
    }
  }
  return result;
}

export function popcount(n: bigint): number {
  let count = 0;
  let temp = n;
  while (temp > 0n) {
    count += Number(temp & 1n); // Check last bit
    temp >>= 1n;                // Shift right
  }
  return count;
}

export function jaccardScore(a: bigint, b: bigint): number {
  const intersection = popcount(a & b); // Common interests
  const union = popcount(a | b);        // Total unique interests
  if (union === 0) return 0;
  return intersection / union;
}
