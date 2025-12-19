/**
 * MT Training Bug Fix - Validation Tests
 * =======================================
 * 
 * Run this file with Node.js to verify the fix:
 *   node src/engine/__tests__/mtTrainingValidation.test.js
 * 
 * Tests verify:
 * 1. Distance penalty math is correct
 * 2. At d=0 (hotspot), I=trueMT gives ~50% probability
 * 3. At d=30mm, penalty should be ~17%
 * 4. At d=30mm with I=trueMT, probability should be very low
 * 5. Monte Carlo simulation confirms expected hit rates
 */

import {
  calculateDistancePenalty,
  calculateApparentMT,
  calculateTwitchProbability,
  calculateGrade,
  MT_CONSTANTS,
} from '../../stores/tmsStore.js';

// Simple assertion helpers
function assertEqual(actual, expected, message, tolerance = 0) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    console.error(`✗ FAIL: ${message}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual: ${actual}`);
    console.error(`  Diff: ${diff} (tolerance: ${tolerance})`);
    return false;
  }
  console.log(`✓ ${message}`);
  return true;
}

function assertTrue(condition, message) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    return false;
  }
  console.log(`✓ ${message}`);
  return true;
}

// Monte Carlo simulation of pulses
function simulatePulses(numPulses, intensity, apparentMT) {
  let hits = 0;
  const k = MT_CONSTANTS.k;
  
  for (let i = 0; i < numPulses; i++) {
    const p = 1 / (1 + Math.exp(-(intensity - apparentMT) / k));
    if (Math.random() < p) {
      hits++;
    }
  }
  
  return hits / numPulses;
}

console.log('=== MT Training Bug Fix Validation Tests ===\n');
console.log(`Constants: Pmax=${MT_CONSTANTS.Pmax}%, sigma=${MT_CONSTANTS.sigma}mm, k=${MT_CONSTANTS.k}\n`);

let allPassed = true;

// Test 1: Distance penalty at d=0
console.log('--- Test 1: Distance penalty at hotspot (d=0) ---');
const penalty0 = calculateDistancePenalty(0);
allPassed &= assertEqual(penalty0, 0, 'penalty(0) = 0', 0.001);

// Test 2: Distance penalty at d=30mm  
console.log('\n--- Test 2: Distance penalty at d=30mm ---');
const penalty30 = calculateDistancePenalty(30);
// Expected: 18 * (1 - exp(-(30/18)^2)) = 18 * (1 - exp(-2.778)) = 18 * 0.938 = ~16.9
console.log(`penalty(30) = ${penalty30.toFixed(2)}%`);
allPassed &= assertTrue(penalty30 > 16 && penalty30 < 18, 'penalty(30) should be ~17%');

// Test 3: At hotspot, I=trueMT gives p~0.5
console.log('\n--- Test 3: At hotspot (d=0), I=trueMT should give p~50% ---');
const trueMT = 50;
const apparentMT_at_hotspot = calculateApparentMT(trueMT, 0);
const prob_at_hotspot = calculateTwitchProbability(trueMT, apparentMT_at_hotspot);
console.log(`trueMT = ${trueMT}%, apparentMT = ${apparentMT_at_hotspot}%, p = ${(prob_at_hotspot * 100).toFixed(1)}%`);
allPassed &= assertEqual(prob_at_hotspot, 0.5, 'p at hotspot with I=trueMT should be 0.5', 0.01);

// Test 4: At d=30mm, I=trueMT gives much lower probability
console.log('\n--- Test 4: At d=30mm, I=trueMT should give very low p ---');
const apparentMT_at_30 = calculateApparentMT(trueMT, 30);
const prob_at_30 = calculateTwitchProbability(trueMT, apparentMT_at_30);
console.log(`trueMT = ${trueMT}%, d = 30mm`);
console.log(`apparentMT = ${trueMT} + ${penalty30.toFixed(2)} = ${apparentMT_at_30.toFixed(2)}%`);
console.log(`p at I=${trueMT}% = ${(prob_at_30 * 100).toFixed(4)}%`);
allPassed &= assertTrue(prob_at_30 < 0.01, 'p at 30mm should be < 1%');

// Test 5: At d=30mm, need I≈apparentMT to get p~50%
console.log('\n--- Test 5: At d=30mm, need I≈apparentMT for p~50% ---');
const prob_at_apparent = calculateTwitchProbability(apparentMT_at_30, apparentMT_at_30);
console.log(`At I=${apparentMT_at_30.toFixed(1)}% (=apparentMT), p = ${(prob_at_apparent * 100).toFixed(1)}%`);
allPassed &= assertEqual(prob_at_apparent, 0.5, 'p at I=apparentMT should be 0.5', 0.01);

// Test 6: Monte Carlo validation at hotspot
console.log('\n--- Test 6: Monte Carlo at hotspot (200 pulses, I=trueMT) ---');
const NUM_PULSES = 200;
const hitRate_hotspot = simulatePulses(NUM_PULSES, trueMT, apparentMT_at_hotspot);
console.log(`Simulated ${NUM_PULSES} pulses at hotspot: hit rate = ${(hitRate_hotspot * 100).toFixed(1)}%`);
// Expected: ~50% ± 7% (binomial variance)
allPassed &= assertTrue(
  hitRate_hotspot > 0.35 && hitRate_hotspot < 0.65,
  'Monte Carlo hit rate at hotspot should be ~50% (35-65% acceptable range)'
);

// Test 7: Monte Carlo validation at d=30mm
console.log('\n--- Test 7: Monte Carlo at d=30mm (200 pulses, I=trueMT) ---');
const hitRate_30 = simulatePulses(NUM_PULSES, trueMT, apparentMT_at_30);
console.log(`Simulated ${NUM_PULSES} pulses at 30mm: hit rate = ${(hitRate_30 * 100).toFixed(1)}%`);
allPassed &= assertTrue(
  hitRate_30 < 0.05,
  'Monte Carlo hit rate at 30mm (I=trueMT) should be < 5%'
);

// Test 8: Monte Carlo at d=30mm with compensated intensity
console.log('\n--- Test 8: Monte Carlo at d=30mm with I=apparentMT ---');
const hitRate_30_compensated = simulatePulses(NUM_PULSES, apparentMT_at_30, apparentMT_at_30);
console.log(`Simulated ${NUM_PULSES} pulses at 30mm with I=${apparentMT_at_30.toFixed(1)}%: hit rate = ${(hitRate_30_compensated * 100).toFixed(1)}%`);
allPassed &= assertTrue(
  hitRate_30_compensated > 0.35 && hitRate_30_compensated < 0.65,
  'Monte Carlo hit rate at 30mm with compensated intensity should be ~50%'
);

// Test 9: Grade calculation
console.log('\n--- Test 9: Grade calculation ---');
const gradeA = calculateGrade(2.5);
const gradeB = calculateGrade(4.5);
const gradeF = calculateGrade(25);
allPassed &= assertEqual(gradeA, 'A', 'Grade for 2.5% error should be A');
allPassed &= assertEqual(gradeB, 'B', 'Grade for 4.5% error should be B');
allPassed &= assertEqual(gradeF, 'F', 'Grade for 25% error should be F');

// Test 10: Critical bug scenario - user far from hotspot should NOT get A easily
console.log('\n--- Test 10: Bug scenario - far from hotspot with guessed MT ---');
const userGuessedMT = trueMT; // User happens to guess the exact trueMT
const percentDiff_exact = 100 * Math.abs(userGuessedMT - trueMT) / trueMT;
const grade_exact = calculateGrade(percentDiff_exact);
console.log(`If user guesses MT=${userGuessedMT}% and trueMT=${trueMT}%, percentDiff=${percentDiff_exact.toFixed(1)}%, grade=${grade_exact}`);
console.log('This should be "A" (grade is based on userMT vs trueMT, NOT distance)');
console.log('But the KEY is: user can\'t reliably FIND trueMT if they\'re far from hotspot!');

// Explain the fix
console.log('\n--- Fix Explanation ---');
console.log('OLD BUG: Distance was computed incorrectly (hotspot not on surface, or used stale d=0)');
console.log('RESULT: User always got high twitch probability regardless of coil position');
console.log('');
console.log('FIX: ');
console.log('1. Hotspot is now projected onto actual scalp surface via raycast');
console.log('2. Distance is computed fresh at each pulse from current coil position');
console.log('3. All UI buttons (not just spacebar) compute real-time distance');
console.log('4. Debug overlay shows all values for verification');

// Final result
console.log('\n=== Results ===');
console.log(`${allPassed ? '✓ All validation tests passed!' : '✗ Some tests failed!'}`);

if (!allPassed) {
  process.exit(1);
}
