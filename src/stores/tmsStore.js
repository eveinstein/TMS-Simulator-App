/**
 * TMS Simulator State Management
 * ===============================
 * Zustand store managing all simulator state.
 * 
 * CRITICAL: No default protocols - neutral start state
 * Protocol parameters are null/empty until user sets them
 */

import { create } from 'zustand';

// ============================================================================
// MOTOR THRESHOLD TRAINING CONSTANTS
// ============================================================================

export const MT_CONSTANTS = {
  // Distance penalty: penalty(d) = Pmax * (1 - exp(-(d/sigma)²))
  Pmax: 18,      // Maximum penalty in % MSO
  sigma: 18,     // Distance falloff in mm
  
  // Twitch probability: p = 1 / (1 + exp(-(I - apparentMT) / k))
  k: 2.0,        // Steepness of logistic curve
  
  // True MT generation range
  minMT: 35,
  maxMT: 70,
  
  // Hotspot generation radius from C3 (mm) - reduced by 1/3 for tighter clustering
  maxHotspotRadius: 20,
};

// Grade thresholds (percent difference)
export const GRADE_THRESHOLDS = {
  A: 3,   // < 3%
  B: 6,   // < 6%
  C: 10,  // < 10%
  D: 20,  // < 20%
  // F: >= 20%
};

// ============================================================================
// EXAMPLE PROTOCOLS - NOT loaded by default, available in Advanced menu
// ============================================================================

export const EXAMPLE_PROTOCOLS = {
  'Depression 10Hz': {
    frequency: 10,
    stimType: 'standard',
    intensity: 120,
    pulsesPerTrain: 40,
    iti: 11,
    totalPulses: 3000,
  },
  'Depression 1Hz': {
    frequency: 1,
    stimType: 'standard',
    intensity: 110,
    pulsesPerTrain: 60,
    iti: 30,
    totalPulses: 900,
  },
  'iTBS': {
    frequency: 50,
    stimType: 'iTBS',
    intensity: 80,
    pulsesPerTrain: 30,
    iti: 8,
    totalPulses: 600,
  },
  'cTBS': {
    frequency: 50,
    stimType: 'cTBS',
    intensity: 80,
    pulsesPerTrain: 600,
    iti: 0,
    totalPulses: 600,
  },
  'OCD SMA': {
    frequency: 1,
    stimType: 'standard',
    intensity: 100,
    pulsesPerTrain: 60,
    iti: 25,
    totalPulses: 1200,
  },
};

// ============================================================================
// MT MATH FUNCTIONS
// ============================================================================

export function calculateDistancePenalty(distanceMm) {
  const { Pmax, sigma } = MT_CONSTANTS;
  return Pmax * (1 - Math.exp(-Math.pow(distanceMm / sigma, 2)));
}

export function calculateApparentMT(trueMT, distanceMm) {
  return trueMT + calculateDistancePenalty(distanceMm);
}

export function calculateTwitchProbability(intensity, apparentMT) {
  const { k } = MT_CONSTANTS;
  return 1 / (1 + Math.exp(-(intensity - apparentMT) / k));
}

export function sampleTwitch(probability) {
  return Math.random() < probability;
}

export function calculateTwitchAmplitude(intensity, apparentMT) {
  const x = intensity - apparentMT;
  const amp = Math.max(0, Math.min(1, x / 12));
  // Add small noise
  const noisy = amp + (Math.random() - 0.5) * 0.1;
  return Math.max(0, Math.min(1, noisy));
}

export function getAmplitudeCategory(amplitude) {
  if (amplitude < 0.1) return 'none';
  if (amplitude < 0.4) return 'small';
  if (amplitude < 0.8) return 'medium';
  return 'large';
}

export function calculateGrade(percentDiff) {
  if (percentDiff < GRADE_THRESHOLDS.A) return 'A';
  if (percentDiff < GRADE_THRESHOLDS.B) return 'B';
  if (percentDiff < GRADE_THRESHOLDS.C) return 'C';
  if (percentDiff < GRADE_THRESHOLDS.D) return 'D';
  return 'F';
}

// Generate random hotspot near C3 on the scalp surface
function generateHotspotPosition(c3Position) {
  if (!c3Position) {
    // Default position if C3 not available
    return [0.05, 0.12, 0.05];
  }
  
  // Random offset within radius (in XZ plane to stay on scalp)
  const radius = MT_CONSTANTS.maxHotspotRadius / 1000; // Convert mm to world units
  const angle = Math.random() * 2 * Math.PI;
  const r = Math.sqrt(Math.random()) * radius;
  
  // Keep hotspot on scalp surface by maintaining C3's Y coordinate
  // The scalp is roughly dome-shaped, so staying at the same height as C3
  // keeps the hotspot approximately on the surface
  return [
    c3Position[0] + r * Math.cos(angle),
    c3Position[1], // Same Y as C3 to stay on scalp surface
    c3Position[2] + r * Math.sin(angle),
  ];
}

// Generate random true MT
function generateTrueMT() {
  const { minMT, maxMT } = MT_CONSTANTS;
  return minMT + Math.random() * (maxMT - minMT);
}

// ============================================================================
// STORE
// ============================================================================

export const useTMSStore = create((set, get) => ({
  // ============================================================================
  // APP MODE
  // ============================================================================
  mode: 'simulator', // 'simulator' | 'rmt'
  setMode: (mode) => set({ mode }),
  
  // ============================================================================
  // PROTOCOL - Grouped object for easier access
  // ============================================================================
  protocol: {
    frequency: null,
    stimType: 'standard',
    intensity: 50,
    pulsesPerTrain: null,
    iti: null,
    totalPulses: null,
  },
  
  setProtocolField: (field, value) => set(state => ({
    protocol: { ...state.protocol, [field]: value }
  })),
  
  // ============================================================================
  // SESSION STATE - Grouped object
  // ============================================================================
  session: {
    isRunning: false,
    isPaused: false,
    pulsesDelivered: 0,
    elapsedTime: 0,
    currentTrain: 0,
  },
  
  startSession: () => {
    const { protocol } = get();
    if (!protocol.frequency || !protocol.pulsesPerTrain || 
        !protocol.totalPulses || protocol.iti === null) {
      console.warn('[Store] Cannot start - protocol not valid');
      return false;
    }
    set({
      session: {
        isRunning: true,
        isPaused: false,
        pulsesDelivered: 0,
        elapsedTime: 0,
        currentTrain: 0,
      }
    });
    return true;
  },
  
  pauseSession: () => set(state => ({
    session: { ...state.session, isPaused: true }
  })),
  
  resumeSession: () => set(state => ({
    session: { ...state.session, isPaused: false }
  })),
  
  stopSession: () => set(state => ({
    session: { ...state.session, isRunning: false, isPaused: false }
  })),
  
  resetSession: () => set({
    session: {
      isRunning: false,
      isPaused: false,
      pulsesDelivered: 0,
      elapsedTime: 0,
      currentTrain: 0,
    }
  }),
  
  incrementPulse: () => set(state => ({
    session: { 
      ...state.session, 
      pulsesDelivered: state.session.pulsesDelivered + 1 
    }
  })),
  
  // ============================================================================
  // COIL STATE
  // ============================================================================
  coilPosition: [0.05, 0.12, 0.05],
  coilRotation: [0, 0, 0, 1], // Quaternion
  isCoilLocked: false,
  lockedTarget: null,
  
  setCoilPosition: (pos) => set({ coilPosition: pos }),
  setCoilRotation: (rot) => set({ coilRotation: rot }),
  
  lockCoil: (targetName) => set({ isCoilLocked: true, lockedTarget: targetName }),
  unlockCoil: () => set({ isCoilLocked: false, lockedTarget: null }),
  
  // ============================================================================
  // TARGET STATE
  // ============================================================================
  targetPositions: null, // Will be set when head model loads
  nearestTarget: null,
  selectedTargetKey: null, // Currently selected EEG target for UI highlight
  coilResetTrigger: 0, // Increment to trigger coil reset
  
  // Snap request - nonce-based to prevent re-triggering
  // Only fires snap when nonce changes (not when selection persists)
  snapRequest: { key: null, nonce: 0 },
  
  // Proximity hover state (for educational indicator)
  hoverTargetKey: null,
  
  setTargetPositions: (positions) => set({ targetPositions: positions }),
  setNearestTarget: (target) => set({ nearestTarget: target }),
  setSelectedTargetKey: (key) => set({ selectedTargetKey: key }),
  resetCoilPosition: () => set(state => ({ coilResetTrigger: state.coilResetTrigger + 1 })),
  
  // Request a snap - increments nonce to trigger effect exactly once
  requestSnap: (key) => set(state => ({
    selectedTargetKey: key, // Also update UI highlight
    snapRequest: { key, nonce: state.snapRequest.nonce + 1 }
  })),
  
  // Set hover target (proximity indicator)
  setHoverTargetKey: (key) => set({ hoverTargetKey: key }),
  
  // ============================================================================
  // RMT TRAINING STATE - Grouped object
  // ============================================================================
  rmt: {
    phase: 'idle', // 'idle' | 'hunt' | 'titration' | 'complete'
    trialNumber: 0,
    hotspotPosition: null,
    trueMT: null,
    hotspotRevealed: false,
    intensity: 50,
    distanceToHotspot: null,
    lastPulseResult: null,
    titrationCount: 0,
    titrationHits: 0,
    titrationLog: [],
    completionResults: null,
    lastPulseTime: 0,
  },
  
  startNewTrial: (c3Position) => {
    const hotspotPosition = generateHotspotPosition(c3Position);
    const trueMT = generateTrueMT();
    
    set(state => ({
      rmt: {
        phase: 'hunt',
        trialNumber: state.rmt.trialNumber + 1,
        hotspotPosition,
        trueMT,
        hotspotRevealed: false,
        intensity: 50,
        distanceToHotspot: null,
        lastPulseResult: null,
        titrationCount: 0,
        titrationHits: 0,
        titrationLog: [],
        completionResults: null,
        lastPulseTime: 0,
      }
    }));
    
    console.log('[RMT] New trial started:', { 
      trialNumber: get().rmt.trialNumber,
      hotspotPosition,
      trueMT: Math.round(trueMT)
    });
  },
  
  setRMTIntensity: (intensity) => set(state => ({
    rmt: { ...state.rmt, intensity: Math.max(0, Math.min(100, intensity)) }
  })),
  
  adjustRMTIntensity: (delta) => set(state => ({
    rmt: { 
      ...state.rmt, 
      intensity: Math.max(0, Math.min(100, state.rmt.intensity + delta)) 
    }
  })),
  
  firePulse: (distanceToHotspotMm) => {
    const state = get();
    const { rmt } = state;
    
    if (rmt.phase !== 'hunt' && rmt.phase !== 'titration') {
      return null;
    }
    
    // Throttle pulses (min 200ms between)
    const now = Date.now();
    if (now - rmt.lastPulseTime < 200) {
      return null;
    }
    
    const trueMT = rmt.trueMT || 50;
    const intensity = rmt.intensity;
    const apparentMT = calculateApparentMT(trueMT, distanceToHotspotMm);
    const probability = calculateTwitchProbability(intensity, apparentMT);
    const twitch = sampleTwitch(probability);
    
    let amplitude = 0;
    let category = 'none';
    if (twitch) {
      amplitude = calculateTwitchAmplitude(intensity, apparentMT);
      category = getAmplitudeCategory(amplitude);
    }
    
    const pulseResult = {
      twitch,
      amplitude,
      category,
      probability,
      intensity,
      apparentMT,
      distance: distanceToHotspotMm,
      timestamp: now,
    };
    
    if (rmt.phase === 'hunt') {
      set({
        rmt: {
          ...rmt,
          lastPulseResult: pulseResult,
          distanceToHotspot: distanceToHotspotMm,
          lastPulseTime: now,
        }
      });
    } else if (rmt.phase === 'titration') {
      const newCount = rmt.titrationCount + 1;
      const newHits = rmt.titrationHits + (twitch ? 1 : 0);
      
      set({
        rmt: {
          ...rmt,
          lastPulseResult: pulseResult,
          titrationCount: newCount,
          titrationHits: newHits,
          titrationLog: [...rmt.titrationLog, { pulse: newCount, hit: twitch }],
          distanceToHotspot: distanceToHotspotMm,
          lastPulseTime: now,
        }
      });
    }
    
    return pulseResult;
  },
  
  runTenPulseTrial: (distanceToHotspotMm) => {
    const state = get();
    const { rmt } = state;
    
    if (rmt.phase !== 'titration') return null;
    
    const results = [];
    const trueMT = rmt.trueMT || 50;
    const intensity = rmt.intensity;
    const apparentMT = calculateApparentMT(trueMT, distanceToHotspotMm);
    
    for (let i = 0; i < 10; i++) {
      const probability = calculateTwitchProbability(intensity, apparentMT);
      const twitch = sampleTwitch(probability);
      
      let amplitude = 0;
      let category = 'none';
      if (twitch) {
        amplitude = calculateTwitchAmplitude(intensity, apparentMT);
        category = getAmplitudeCategory(amplitude);
      }
      
      results.push({ pulse: i + 1, hit: twitch, amplitude, category });
    }
    
    const hitCount = results.filter(r => r.hit).length;
    
    set({
      rmt: {
        ...rmt,
        titrationCount: 10,
        titrationHits: hitCount,
        titrationLog: results.map(r => ({ pulse: r.pulse, hit: r.hit })),
        lastPulseResult: results[results.length - 1],
        distanceToHotspot: distanceToHotspotMm,
        lastPulseTime: Date.now(),
      }
    });
    
    return { results, hitCount };
  },
  
  advanceToTitration: () => set(state => ({
    rmt: {
      ...state.rmt,
      phase: 'titration',
      titrationCount: 0,
      titrationHits: 0,
      titrationLog: [],
    }
  })),
  
  revealHotspot: () => set(state => ({
    rmt: { ...state.rmt, hotspotRevealed: true }
  })),
  
  completeTrial: (userClaimedMT, finalDistanceMm = 0) => {
    const state = get();
    const { rmt } = state;
    const trueMT = rmt.trueMT || 50;
    
    const percentDiff = 100 * Math.abs(userClaimedMT - trueMT) / trueMT;
    const absoluteError = Math.abs(userClaimedMT - trueMT);
    const grade = calculateGrade(percentDiff);
    
    const results = {
      trueMT: Math.round(trueMT),
      userMT: userClaimedMT,
      percentDiff,
      absoluteError,
      distance: finalDistanceMm,
      grade,
      trialNumber: rmt.trialNumber,
    };
    
    set({
      rmt: {
        ...rmt,
        phase: 'complete',
        completionResults: results,
        hotspotRevealed: true,
      }
    });
    
    return results;
  },
  
  resetRMT: () => set(state => ({
    rmt: {
      phase: 'idle',
      trialNumber: state.rmt.trialNumber, // Keep trial count
      hotspotPosition: null,
      trueMT: null,
      hotspotRevealed: false,
      intensity: 50,
      distanceToHotspot: null,
      lastPulseResult: null,
      titrationCount: 0,
      titrationHits: 0,
      titrationLog: [],
      completionResults: null,
      lastPulseTime: 0,
    }
  })),
}));
