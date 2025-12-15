/**
 * TMS Simulator State Management
 * ===============================
 * Zustand store managing all simulator state including:
 * - Protocol parameters (frequency, intensity, pulses)
 * - Session state (running, paused, progress)
 * - Coil state (position, rotation, locked target)
 * - UI state (selected target, popups)
 * 
 * Coordinate Convention (RADIOLOGIC):
 * Patient LEFT = +X = viewer's RIGHT
 * Patient RIGHT = −X = viewer's LEFT
 */

import { create } from 'zustand';

// TMS Protocol Presets
export const PROTOCOL_PRESETS = {
  'depression_f3_10hz': {
    name: '10 Hz F3 Depression Protocol',
    description: 'Standard left DLPFC depression treatment',
    target: 'F3',
    frequency: 10,
    stimulationType: 'standard',
    intensity: 120,
    pulsesPerTrain: 40,
    interTrainInterval: 11,
    totalPulses: 3000,
  },
  'depression_f3_1hz': {
    name: '1 Hz F3 Protocol',
    description: 'Low frequency depression protocol',
    target: 'F3',
    frequency: 1,
    stimulationType: 'standard',
    intensity: 110,
    pulsesPerTrain: 60,
    interTrainInterval: 30,
    totalPulses: 900,
  },
  'ocd_sma': {
    name: 'SMA OCD Protocol',
    description: 'Supplementary Motor Area for OCD',
    target: 'SMA',
    frequency: 1,
    stimulationType: 'standard',
    intensity: 100,
    pulsesPerTrain: 60,
    interTrainInterval: 25,
    totalPulses: 1200,
  },
  'itbs_f3': {
    name: 'iTBS F3 Protocol',
    description: 'Intermittent Theta Burst Stimulation',
    target: 'F3',
    frequency: 50,
    stimulationType: 'iTBS',
    intensity: 80,
    pulsesPerTrain: 30,  // 10 bursts of 3 pulses
    interTrainInterval: 8,
    totalPulses: 600,
  },
  'ctbs_f4': {
    name: 'cTBS F4 Protocol',
    description: 'Continuous Theta Burst for right DLPFC',
    target: 'F4',
    frequency: 50,
    stimulationType: 'cTBS',
    intensity: 80,
    pulsesPerTrain: 600,
    interTrainInterval: 0,
    totalPulses: 600,
  },
};

// Target Information with clinical meanings
export const TARGET_INFO = {
  F3: {
    name: 'F3',
    fullName: 'Left Frontal (F3)',
    brainTarget: 'Left Dorsolateral Prefrontal Cortex (DLPFC)',
    clinicalMeaning: 'Primary target for depression treatment. The DLPFC is involved in executive function, working memory, and emotional regulation.',
    beamF3Method: 'The Beam F3 method uses tape-measure measurements from anatomical landmarks (Nasion, Inion, and preauricular points) to locate F3 without neuronavigation. It calculates proportional distances along the scalp surface arcs defined by the 10-20 system.',
    commonUse: 'Treatment-resistant depression, cognitive enhancement protocols',
    convention: 'Patient LEFT = +X = viewer\'s RIGHT',
  },
  F4: {
    name: 'F4',
    fullName: 'Right Frontal (F4)',
    brainTarget: 'Right Dorsolateral Prefrontal Cortex (DLPFC)',
    clinicalMeaning: 'Right DLPFC target, often used with low-frequency stimulation as complement to left DLPFC high-frequency treatment.',
    commonUse: 'Bilateral depression protocols, anxiety treatment',
    convention: 'Patient RIGHT = −X = viewer\'s LEFT',
  },
  FP2: {
    name: 'FP2',
    fullName: 'Right Frontopolar (Fp2)',
    brainTarget: 'Right Orbitofrontal Cortex (OFC)',
    clinicalMeaning: 'Frontopolar region associated with decision-making, reward processing, and emotional valence.',
    commonUse: 'Experimental OFC protocols, impulse control research',
    convention: 'Patient RIGHT = −X = viewer\'s LEFT',
  },
  C3: {
    name: 'C3',
    fullName: 'Left Central (C3)',
    brainTarget: 'Left Primary Motor Cortex (M1)',
    clinicalMeaning: 'Overlies the hand area of motor cortex. Used for motor threshold determination and motor rehabilitation.',
    commonUse: 'Motor hotspot localization, stroke rehabilitation, chronic pain',
    convention: 'Patient LEFT = +X = viewer\'s RIGHT',
  },
  SMA: {
    name: 'SMA',
    fullName: 'Supplementary Motor Area',
    brainTarget: 'Supplementary Motor Area (SMA)',
    clinicalMeaning: 'The SMA is a midline motor network region involved in movement planning, sequencing, and initiation. Located 15% of the Nasion-Inion distance anterior to Cz on the scalp midline.',
    commonUse: 'OCD treatment, Tourette syndrome, movement disorders. One of the most common midline TMS targets.',
    convention: 'Midline target (X ≈ 0)',
    calculation: '35% along sagittal arc from Nasion (15% anterior to Cz at 50%)',
  },
  // Fiducials
  Nasion: {
    name: 'Nasion',
    fullName: 'Nasion (Nz)',
    brainTarget: 'N/A - Anatomical Landmark',
    clinicalMeaning: 'The bridge of the nose, at the junction of the frontal and nasal bones. Primary anterior reference point for the 10-20 EEG system.',
    commonUse: 'Fiducial landmark for coordinate system',
    convention: 'Anterior midline reference',
  },
  Inion: {
    name: 'Inion',
    fullName: 'Inion (Iz)',
    brainTarget: 'N/A - Anatomical Landmark',
    clinicalMeaning: 'The external occipital protuberance at the back of the skull. Primary posterior reference point for the 10-20 system.',
    commonUse: 'Fiducial landmark for sagittal arc measurement',
    convention: 'Posterior midline reference',
  },
  LPA: {
    name: 'LPA',
    fullName: 'Left Preauricular Point (AL)',
    brainTarget: 'N/A - Anatomical Landmark',
    clinicalMeaning: 'Located at the left tragus/preauricular area. Left lateral reference point for the 10-20 system.',
    commonUse: 'Fiducial landmark for coronal arc measurement',
    convention: 'Patient LEFT = +X = viewer\'s RIGHT',
  },
  RPA: {
    name: 'RPA',
    fullName: 'Right Preauricular Point (AR)',
    brainTarget: 'N/A - Anatomical Landmark',
    clinicalMeaning: 'Located at the right tragus/preauricular area. Right lateral reference point for the 10-20 system.',
    commonUse: 'Fiducial landmark for coronal arc measurement',
    convention: 'Patient RIGHT = −X = viewer\'s LEFT',
  },
};

const initialState = {
  // Protocol Settings
  stimulationType: 'standard', // 'standard' | 'iTBS' | 'cTBS'
  frequency: 10,
  intensity: 120,
  pulsesPerTrain: 40,
  interTrainInterval: 11,
  totalPulses: 3000,
  
  // Session State
  isRunning: false,
  isPaused: false,
  sessionStartTime: null,
  elapsedTime: 0,
  pulsesDelivered: 0,
  currentTrainNumber: 0,
  isInTrain: false,
  trainProgress: 0,
  
  // Coil State
  coilPosition: [0, 0.15, 0.12],
  coilRotation: [0, 0, 0],
  coilNormal: [0, 1, 0],
  isCoilLocked: false,
  lockedTarget: null,
  nearestTarget: null,
  distanceToNearestTarget: null,
  
  // UI State
  selectedTarget: null,
  showPopup: false,
  popupTarget: null,
  showAdvanced: false,
  speedMultiplier: 1,
  
  // Pulse Animation
  pulseActive: false,
  pulseCount: 0,
};

export const useTMSStore = create((set, get) => ({
  ...initialState,
  
  // Protocol Actions
  setStimulationType: (type) => set({ stimulationType: type }),
  setFrequency: (freq) => set({ frequency: Math.max(1, Math.min(50, freq)) }),
  setIntensity: (intensity) => set({ intensity: Math.max(0, Math.min(150, intensity)) }),
  setPulsesPerTrain: (pulses) => set({ pulsesPerTrain: Math.max(1, pulses) }),
  setInterTrainInterval: (interval) => set({ interTrainInterval: Math.max(0, interval) }),
  setTotalPulses: (pulses) => set({ totalPulses: Math.max(1, pulses) }),
  
  // Load preset
  loadPreset: (presetKey) => {
    const preset = PROTOCOL_PRESETS[presetKey];
    if (preset) {
      set({
        stimulationType: preset.stimulationType,
        frequency: preset.frequency,
        intensity: preset.intensity,
        pulsesPerTrain: preset.pulsesPerTrain,
        interTrainInterval: preset.interTrainInterval,
        totalPulses: preset.totalPulses,
        selectedTarget: preset.target,
      });
    }
  },
  
  // Session Control
  startSession: () => {
    const state = get();
    if (!state.isCoilLocked) {
      console.warn('Cannot start session: Coil must be locked to a target');
      return false;
    }
    set({
      isRunning: true,
      isPaused: false,
      sessionStartTime: Date.now(),
      elapsedTime: 0,
      pulsesDelivered: 0,
      currentTrainNumber: 0,
      isInTrain: true,
      trainProgress: 0,
    });
    return true;
  },
  
  pauseSession: () => set({ isPaused: true }),
  
  resumeSession: () => set({ isPaused: false }),
  
  stopSession: () => set({
    isRunning: false,
    isPaused: false,
    isInTrain: false,
  }),
  
  resetSession: () => set({
    isRunning: false,
    isPaused: false,
    sessionStartTime: null,
    elapsedTime: 0,
    pulsesDelivered: 0,
    currentTrainNumber: 0,
    isInTrain: false,
    trainProgress: 0,
    pulseActive: false,
  }),
  
  // Session Update (called from animation loop)
  updateSession: (deltaTime) => {
    const state = get();
    if (!state.isRunning || state.isPaused) return;
    
    const { 
      frequency, 
      pulsesPerTrain, 
      interTrainInterval, 
      totalPulses,
      stimulationType,
      speedMultiplier,
    } = state;
    
    const adjustedDelta = deltaTime * speedMultiplier;
    const newElapsed = state.elapsedTime + adjustedDelta;
    
    // Calculate timing based on protocol type
    let trainDuration, cycleTime;
    
    if (stimulationType === 'iTBS') {
      // iTBS: 2 sec on, 8 sec off pattern
      trainDuration = 2;
      cycleTime = trainDuration + interTrainInterval;
    } else if (stimulationType === 'cTBS') {
      // cTBS: continuous for ~40 seconds
      trainDuration = 40;
      cycleTime = trainDuration;
    } else {
      // Standard rTMS
      trainDuration = pulsesPerTrain / frequency;
      cycleTime = trainDuration + interTrainInterval;
    }
    
    // Determine current position in cycle
    const cyclePosition = newElapsed % cycleTime;
    const isInTrain = cyclePosition < trainDuration;
    const currentTrainNumber = Math.floor(newElapsed / cycleTime) + 1;
    
    // Calculate pulses delivered
    let pulsesDelivered;
    if (stimulationType === 'cTBS') {
      pulsesDelivered = Math.min(Math.floor(newElapsed * 50), totalPulses);
    } else if (stimulationType === 'iTBS') {
      const completedCycles = Math.floor(newElapsed / cycleTime);
      const pulsesPerCycle = 30; // 10 bursts * 3 pulses
      pulsesDelivered = Math.min(completedCycles * pulsesPerCycle + 
        (isInTrain ? Math.floor((cyclePosition / trainDuration) * pulsesPerCycle) : pulsesPerCycle), 
        totalPulses);
    } else {
      const completedTrains = Math.floor(newElapsed / cycleTime);
      const currentTrainPulses = isInTrain ? Math.floor(cyclePosition * frequency) : pulsesPerTrain;
      pulsesDelivered = Math.min(completedTrains * pulsesPerTrain + currentTrainPulses, totalPulses);
    }
    
    // Check for session completion
    if (pulsesDelivered >= totalPulses) {
      set({
        isRunning: false,
        isPaused: false,
        pulsesDelivered: totalPulses,
        elapsedTime: newElapsed,
        isInTrain: false,
      });
      return;
    }
    
    set({
      elapsedTime: newElapsed,
      pulsesDelivered,
      currentTrainNumber,
      isInTrain,
      trainProgress: isInTrain ? cyclePosition / trainDuration : 0,
    });
  },
  
  // Pulse Animation
  triggerPulse: () => set(state => ({ 
    pulseActive: true, 
    pulseCount: state.pulseCount + 1 
  })),
  clearPulse: () => set({ pulseActive: false }),
  
  // Coil Actions
  setCoilPosition: (position) => set({ coilPosition: position }),
  setCoilRotation: (rotation) => set({ coilRotation: rotation }),
  setCoilNormal: (normal) => set({ coilNormal: normal }),
  
  lockCoilToTarget: (targetName) => {
    set({
      isCoilLocked: true,
      lockedTarget: targetName,
      selectedTarget: targetName,
    });
  },
  
  unlockCoil: () => set({
    isCoilLocked: false,
    lockedTarget: null,
  }),
  
  setNearestTarget: (targetName, distance) => set({
    nearestTarget: targetName,
    distanceToNearestTarget: distance,
  }),
  
  // UI Actions
  selectTarget: (targetName) => set({ selectedTarget: targetName }),
  
  openPopup: (targetName) => set({
    showPopup: true,
    popupTarget: targetName,
  }),
  
  closePopup: () => set({
    showPopup: false,
    popupTarget: null,
  }),
  
  toggleAdvanced: () => set(state => ({ showAdvanced: !state.showAdvanced })),
  
  setSpeedMultiplier: (multiplier) => set({ speedMultiplier: multiplier }),
  
  // Calculate session duration
  getSessionDuration: () => {
    const { frequency, pulsesPerTrain, interTrainInterval, totalPulses, stimulationType } = get();
    
    if (stimulationType === 'cTBS') {
      return totalPulses / 50; // 50 Hz continuous
    }
    
    if (stimulationType === 'iTBS') {
      const cycleTime = 2 + interTrainInterval; // 2 sec on, 8 sec off
      const pulsesPerCycle = 30;
      const cycles = Math.ceil(totalPulses / pulsesPerCycle);
      return cycles * cycleTime - interTrainInterval;
    }
    
    // Standard rTMS
    const trainDuration = pulsesPerTrain / frequency;
    const numTrains = Math.ceil(totalPulses / pulsesPerTrain);
    return (numTrains * trainDuration) + ((numTrains - 1) * interTrainInterval);
  },
  
  // Calculate progress percentage
  getProgress: () => {
    const { pulsesDelivered, totalPulses } = get();
    return (pulsesDelivered / totalPulses) * 100;
  },
}));
