/**
 * Motor Threshold Training - Smoke Tests
 * =======================================
 * Pure-function tests for MT training math.
 * 
 * Run with: node --experimental-vm-modules src/engine/__tests__/mtTraining.test.js
 * Or integrate with your test runner of choice (Jest, Vitest, etc.)
 */

// Import the functions we're testing
import {
  calculateDistancePenalty,
  calculateApparentMT,
  calculateTwitchProbability,
  calculateGrade,
  MT_CONSTANTS,
  GRADE_THRESHOLDS,
} from '../../stores/tmsStore.js';

// Simple test runner
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
    failed++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(actual - expected);
      const epsilon = Math.pow(10, -precision) / 2;
      if (diff > epsilon) {
        throw new Error(`Expected ${expected} ± ${epsilon}, got ${actual} (diff: ${diff})`);
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toBeBetween(min, max) {
      if (actual < min || actual > max) {
        throw new Error(`Expected ${actual} to be between ${min} and ${max}`);
      }
    },
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

console.log('\n=== MT Training Smoke Tests ===\n');

// Distance Penalty Tests
console.log('Distance Penalty:');

test('penalty(0) = 0 (at hotspot)', () => {
  expect(calculateDistancePenalty(0)).toBe(0);
});

test('penalty increases monotonically with distance', () => {
  const p5 = calculateDistancePenalty(5);
  const p10 = calculateDistancePenalty(10);
  const p20 = calculateDistancePenalty(20);
  const p30 = calculateDistancePenalty(30);
  
  expect(p10).toBeGreaterThan(p5);
  expect(p20).toBeGreaterThan(p10);
  expect(p30).toBeGreaterThan(p20);
});

test('penalty approaches Pmax at large distances', () => {
  const pLarge = calculateDistancePenalty(100);
  expect(pLarge).toBeCloseTo(MT_CONSTANTS.Pmax, 1);
});

test('penalty at sigma distance is ~63% of Pmax', () => {
  const pSigma = calculateDistancePenalty(MT_CONSTANTS.sigma);
  const expected = MT_CONSTANTS.Pmax * (1 - Math.exp(-1)); // 1 - e^-1 ≈ 0.632
  expect(pSigma).toBeCloseTo(expected, 1);
});

// Apparent MT Tests
console.log('\nApparent MT:');

test('apparentMT = trueMT when distance = 0', () => {
  const trueMT = 50;
  expect(calculateApparentMT(trueMT, 0)).toBe(trueMT);
});

test('apparentMT > trueMT when distance > 0', () => {
  const trueMT = 50;
  expect(calculateApparentMT(trueMT, 10)).toBeGreaterThan(trueMT);
});

test('apparentMT increases with distance', () => {
  const trueMT = 50;
  const amt10 = calculateApparentMT(trueMT, 10);
  const amt20 = calculateApparentMT(trueMT, 20);
  expect(amt20).toBeGreaterThan(amt10);
});

// Twitch Probability Tests
console.log('\nTwitch Probability:');

test('p = 0.5 when intensity = apparentMT', () => {
  const apparentMT = 55;
  expect(calculateTwitchProbability(apparentMT, apparentMT)).toBeCloseTo(0.5, 2);
});

test('p < 0.5 when intensity < apparentMT', () => {
  const apparentMT = 55;
  expect(calculateTwitchProbability(50, apparentMT)).toBeLessThan(0.5);
});

test('p > 0.5 when intensity > apparentMT', () => {
  const apparentMT = 55;
  expect(calculateTwitchProbability(60, apparentMT)).toBeGreaterThan(0.5);
});

test('p approaches 0 at very low intensity', () => {
  const apparentMT = 55;
  expect(calculateTwitchProbability(30, apparentMT)).toBeLessThan(0.01);
});

test('p approaches 1 at very high intensity', () => {
  const apparentMT = 55;
  expect(calculateTwitchProbability(80, apparentMT)).toBeGreaterThan(0.99);
});

test('p is monotonic in intensity', () => {
  const apparentMT = 55;
  const p40 = calculateTwitchProbability(40, apparentMT);
  const p50 = calculateTwitchProbability(50, apparentMT);
  const p60 = calculateTwitchProbability(60, apparentMT);
  const p70 = calculateTwitchProbability(70, apparentMT);
  
  expect(p50).toBeGreaterThan(p40);
  expect(p60).toBeGreaterThan(p50);
  expect(p70).toBeGreaterThan(p60);
});

// Grade Tests
console.log('\nGrading:');

test('< 3% error = A', () => {
  expect(calculateGrade(0)).toBe('A');
  expect(calculateGrade(1)).toBe('A');
  expect(calculateGrade(2.9)).toBe('A');
});

test('3-5.9% error = B', () => {
  expect(calculateGrade(3)).toBe('B');
  expect(calculateGrade(5)).toBe('B');
  expect(calculateGrade(5.9)).toBe('B');
});

test('6-9.9% error = C', () => {
  expect(calculateGrade(6)).toBe('C');
  expect(calculateGrade(8)).toBe('C');
  expect(calculateGrade(9.9)).toBe('C');
});

test('10-19.9% error = D', () => {
  expect(calculateGrade(10)).toBe('D');
  expect(calculateGrade(15)).toBe('D');
  expect(calculateGrade(19.9)).toBe('D');
});

test('>= 20% error = F', () => {
  expect(calculateGrade(20)).toBe('F');
  expect(calculateGrade(30)).toBe('F');
  expect(calculateGrade(50)).toBe('F');
});

test('grade thresholds have no gaps', () => {
  // A: < 3
  // B: 3 <= x < 6
  // C: 6 <= x < 10
  // D: 10 <= x < 20
  // F: >= 20
  expect(GRADE_THRESHOLDS.A).toBe(3);
  expect(GRADE_THRESHOLDS.B).toBe(6);
  expect(GRADE_THRESHOLDS.C).toBe(10);
  expect(GRADE_THRESHOLDS.D).toBe(20);
});

// Combined scenario tests
console.log('\nIntegration Scenarios:');

test('at hotspot with trueMT intensity: ~50% twitch chance', () => {
  const trueMT = 50;
  const distanceMm = 0;
  const apparentMT = calculateApparentMT(trueMT, distanceMm);
  const prob = calculateTwitchProbability(trueMT, apparentMT);
  expect(prob).toBeCloseTo(0.5, 2);
});

test('10mm from hotspot increases threshold', () => {
  const trueMT = 50;
  const distanceMm = 10;
  const apparentMT = calculateApparentMT(trueMT, distanceMm);
  expect(apparentMT).toBeGreaterThan(trueMT);
  
  // At trueMT intensity, prob should be < 0.5 because apparent is higher
  const prob = calculateTwitchProbability(trueMT, apparentMT);
  expect(prob).toBeLessThan(0.5);
});

test('need higher intensity when off-hotspot to get 50% response', () => {
  const trueMT = 50;
  const distanceMm = 15;
  const apparentMT = calculateApparentMT(trueMT, distanceMm);
  
  // At apparentMT, we should get 50%
  const prob = calculateTwitchProbability(apparentMT, apparentMT);
  expect(prob).toBeCloseTo(0.5, 2);
  
  // apparentMT should be higher than trueMT
  expect(apparentMT).toBeGreaterThan(trueMT);
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n=== Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log('\n⚠️  Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
