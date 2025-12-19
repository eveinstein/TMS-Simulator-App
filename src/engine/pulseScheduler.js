/**
 * Pulse Scheduler Engine
 * ======================
 * Handles precise timing of TMS pulses during sessions.
 * 
 * Timing math:
 * - trainDuration = pulsesPerTrain / frequency
 * - totalTrains = ceil(totalPulses / pulsesPerTrain)
 * - sessionDuration = trains * trainDuration + (trains-1) * ITI
 * 
 * Example: 10 Hz, 40/train, 11s ITI, 3000 total
 * - trainDuration = 40/10 = 4s
 * - totalTrains = 3000/40 = 75
 * - sessionDuration = 75*4 + 74*11 = 300 + 814 = 1114s = 18.6 min
 */

/**
 * Calculate session timing parameters
 * @param {Object} protocol - Protocol object with frequency, pulsesPerTrain, iti, totalPulses, stimType
 * @returns {{ pulseInterval, trainDuration, totalTrains, sessionDuration, pulsesInLastTrain } | null}
 */
export function calculateSessionTiming(protocol) {
  const { frequency, pulsesPerTrain, iti, totalPulses, stimType } = protocol;
  
  if (!frequency || !pulsesPerTrain || totalPulses === null) {
    return null;
  }
  
  let pulseInterval;
  let trainDuration;
  
  if (stimType === 'iTBS' || stimType === 'cTBS') {
    // Theta burst: 50 Hz bursts (3 pulses at 20ms intervals within burst)
    // iTBS: 2s on, 8s off
    // cTBS: continuous
    pulseInterval = 1 / 50; // 50 Hz within bursts
    
    if (stimType === 'iTBS') {
      // 10 bursts per 2s train (5 Hz burst rate)
      const burstsPerTrain = Math.ceil(pulsesPerTrain / 3);
      trainDuration = burstsPerTrain / 5; // 5 Hz burst rate = 200ms per burst
    } else {
      // cTBS: continuous bursts at 5 Hz
      const burstsPerTrain = Math.ceil(pulsesPerTrain / 3);
      trainDuration = burstsPerTrain / 5;
    }
  } else {
    // Standard rTMS
    pulseInterval = 1 / frequency;
    trainDuration = pulsesPerTrain / frequency;
  }
  
  const totalTrains = Math.ceil(totalPulses / pulsesPerTrain);
  
  // Total time = all train durations + all ITIs
  const sessionDuration = totalTrains * trainDuration + Math.max(0, totalTrains - 1) * (iti || 0);
  
  return {
    pulseInterval,
    trainDuration,
    totalTrains,
    sessionDuration,
    pulsesInLastTrain: totalPulses % pulsesPerTrain || pulsesPerTrain,
  };
}

/**
 * Format duration as MM:SS
 * @param {number} seconds 
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate progress percentage
 * @param {number} currentPulse 
 * @param {number} totalPulses 
 * @returns {number}
 */
export function calculateProgress(currentPulse, totalPulses) {
  if (!totalPulses) return 0;
  return Math.min(100, (currentPulse / totalPulses) * 100);
}

/**
 * PulseScheduler class for managing pulse timing in animation loop
 * 
 * Usage:
 *   const scheduler = new PulseScheduler(protocol);
 *   // In animation loop:
 *   const pulseCount = scheduler.update(deltaTime);
 *   for (let i = 0; i < pulseCount; i++) incrementPulse();
 */
export class PulseScheduler {
  /**
   * @param {Object} protocol - Protocol with frequency, pulsesPerTrain, iti, totalPulses
   */
  constructor(protocol) {
    this.protocol = protocol;
    this.timing = calculateSessionTiming(protocol);
    this.pulseAccumulator = 0;
    this.trainPulseCount = 0; // Pulses in current train
    this.totalPulseCount = 0;
    this.itiAccumulator = 0;
    this.inITI = false;
  }
  
  reset() {
    this.pulseAccumulator = 0;
    this.trainPulseCount = 0;
    this.totalPulseCount = 0;
    this.itiAccumulator = 0;
    this.inITI = false;
  }
  
  /**
   * Update scheduler with delta time
   * @param {number} deltaTime - Time since last frame in seconds
   * @returns {number} Number of pulses to emit this frame
   */
  update(deltaTime) {
    if (!this.timing) return 0;
    
    const { pulseInterval } = this.timing;
    const { pulsesPerTrain, iti, totalPulses } = this.protocol;
    
    // Check if session complete
    if (this.totalPulseCount >= totalPulses) {
      return 0;
    }
    
    // Handle ITI (inter-train interval)
    if (this.inITI) {
      this.itiAccumulator += deltaTime;
      if (this.itiAccumulator >= (iti || 0)) {
        this.inITI = false;
        this.itiAccumulator = 0;
        this.trainPulseCount = 0;
      }
      return 0;
    }
    
    // Count pulses during train
    this.pulseAccumulator += deltaTime;
    let pulsesThisFrame = 0;
    
    // Emit pulses based on pulse interval
    while (this.pulseAccumulator >= pulseInterval && this.totalPulseCount < totalPulses) {
      pulsesThisFrame++;
      this.totalPulseCount++;
      this.trainPulseCount++;
      this.pulseAccumulator -= pulseInterval;
      
      // Check if train complete
      if (this.trainPulseCount >= pulsesPerTrain) {
        // Check if more trains needed
        if (this.totalPulseCount < totalPulses && (iti || 0) > 0) {
          this.inITI = true;
          this.itiAccumulator = 0;
          this.pulseAccumulator = 0;
          break;
        } else {
          this.trainPulseCount = 0;
        }
      }
    }
    
    return pulsesThisFrame;
  }
  
  /**
   * Check if currently in ITI
   * @returns {boolean}
   */
  isInITI() {
    return this.inITI;
  }
  
  /**
   * Get ITI progress information
   * @returns {{ inITI: boolean, progress: number, remaining: number, elapsed: number }}
   */
  getITIProgress() {
    const iti = this.protocol.iti || 0;
    if (!this.inITI || iti <= 0) {
      return { inITI: false, progress: 0, remaining: 0, elapsed: 0 };
    }
    const elapsed = this.itiAccumulator;
    const progress = Math.min(1, elapsed / iti);
    const remaining = Math.max(0, iti - elapsed);
    return { inITI: true, progress, remaining, elapsed };
  }
}

/**
 * ThetaBurstScheduler for iTBS/cTBS patterns
 * iTBS: 2s train, 8s ITI, bursts at 5Hz (3 pulses per burst at 50Hz)
 * cTBS: continuous bursts at 5Hz
 */
export class ThetaBurstScheduler {
  /**
   * @param {Object} protocol - Protocol with stimType, totalPulses
   */
  constructor(protocol) {
    this.protocol = protocol;
    this.burstAccumulator = 0;
    this.pulseInBurst = 0;
    this.trainAccumulator = 0;
    this.totalPulseCount = 0;
    this.itiAccumulator = 0;
    this.inITI = false;
  }
  
  reset() {
    this.burstAccumulator = 0;
    this.pulseInBurst = 0;
    this.trainAccumulator = 0;
    this.totalPulseCount = 0;
    this.itiAccumulator = 0;
    this.inITI = false;
  }
  
  /**
   * Update scheduler with delta time
   * @param {number} deltaTime - Time since last frame in seconds
   * @returns {number} Number of pulses to emit this frame
   */
  update(deltaTime) {
    const { stimType, totalPulses } = this.protocol;
    
    // Check session complete
    if (this.totalPulseCount >= totalPulses) {
      return 0;
    }
    
    // iTBS ITI handling
    if (stimType === 'iTBS' && this.inITI) {
      this.itiAccumulator += deltaTime;
      if (this.itiAccumulator >= 8) { // 8s ITI for iTBS
        this.inITI = false;
        this.itiAccumulator = 0;
        this.trainAccumulator = 0;
      }
      return 0;
    }
    
    this.burstAccumulator += deltaTime;
    this.trainAccumulator += deltaTime;
    
    let pulsesThisFrame = 0;
    
    // Burst rate: 5 Hz (200ms between bursts)
    const burstInterval = 0.2;
    // Pulse interval within burst: 50 Hz (20ms)
    const pulseInterval = 0.02;
    
    // Within a burst, emit 3 pulses rapidly
    if (this.pulseInBurst > 0 && this.pulseInBurst < 3) {
      if (this.burstAccumulator >= pulseInterval) {
        pulsesThisFrame++;
        this.totalPulseCount++;
        this.pulseInBurst++;
        this.burstAccumulator -= pulseInterval;
        
        if (this.pulseInBurst >= 3) {
          this.pulseInBurst = 0;
        }
      }
    }
    
    // Start new burst
    if (this.pulseInBurst === 0 && this.burstAccumulator >= burstInterval) {
      pulsesThisFrame++;
      this.totalPulseCount++;
      this.pulseInBurst = 1;
      this.burstAccumulator = 0;
    }
    
    // iTBS train timing: 2s on
    if (stimType === 'iTBS' && this.trainAccumulator >= 2) {
      this.inITI = true;
      this.itiAccumulator = 0;
    }
    
    return pulsesThisFrame;
  }
  
  /**
   * Check if currently in ITI
   * @returns {boolean}
   */
  isInITI() {
    return this.inITI;
  }
  
  /**
   * Get ITI progress information (iTBS uses 8s ITI)
   * @returns {{ inITI: boolean, progress: number, remaining: number, elapsed: number }}
   */
  getITIProgress() {
    const iti = this.protocol.stimType === 'iTBS' ? 8 : 0;
    if (!this.inITI || iti <= 0) {
      return { inITI: false, progress: 0, remaining: 0, elapsed: 0 };
    }
    const elapsed = this.itiAccumulator;
    const progress = Math.min(1, elapsed / iti);
    const remaining = Math.max(0, iti - elapsed);
    return { inITI: true, progress, remaining, elapsed };
  }
}
