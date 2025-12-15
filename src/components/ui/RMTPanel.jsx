/**
 * RMTPanel.jsx
 * ============
 * Motor Threshold Training interface.
 * 
 * Two-step workflow:
 * 1. Hunt - Find hotspot near C3
 * 2. Titration - Determine threshold
 */

import React, { useState, useCallback } from 'react';
import { useTMSStore, calculateGrade, GRADE_THRESHOLDS } from '../../stores/tmsStore';
import './RMTPanel.css';

export function RMTPanel() {
  const {
    rmt,
    targetPositions,
    startNewTrial,
    firePulse,
    setRMTIntensity,
    adjustRMTIntensity,
    advanceToTitration,
    runTenPulseTrial,
    revealHotspot,
    completeTrial,
    resetRMT,
  } = useTMSStore();
  
  const [claimedMT, setClaimedMT] = useState('');
  
  // Get C3 position for trial generation
  const c3Position = targetPositions?.C3 ? 
    [targetPositions.C3.x, targetPositions.C3.y, targetPositions.C3.z] : null;
  
  const handleStartTrial = useCallback(() => {
    startNewTrial(c3Position);
  }, [startNewTrial, c3Position]);
  
  const handleFirePulse = useCallback(() => {
    const distance = rmt.distanceToHotspot || 0;
    firePulse(distance);
  }, [firePulse, rmt.distanceToHotspot]);
  
  const handleRunTenPulse = useCallback(() => {
    const distance = rmt.distanceToHotspot || 0;
    runTenPulseTrial(distance);
  }, [runTenPulseTrial, rmt.distanceToHotspot]);
  
  const handleComplete = useCallback(() => {
    const mt = parseInt(claimedMT, 10);
    if (isNaN(mt) || mt < 0 || mt > 100) {
      alert('Please enter a valid MT value (0-100)');
      return;
    }
    completeTrial(mt, rmt.distanceToHotspot || 0);
  }, [claimedMT, completeTrial, rmt.distanceToHotspot]);
  
  const handleReset = useCallback(() => {
    resetRMT();
    setClaimedMT('');
  }, [resetRMT]);
  
  // Render based on phase
  const renderPhaseContent = () => {
    switch (rmt.phase) {
      case 'idle':
        return (
          <div className="phase-content idle">
            <div className="phase-instruction">
              <h3>Motor Threshold Training</h3>
              <p>Practice locating the motor hotspot and determining resting motor threshold.</p>
              <ol>
                <li>Use WASD to move the coil near C3</li>
                <li>Fire single pulses to find the hotspot</li>
                <li>Use titration to determine threshold</li>
              </ol>
            </div>
            <button className="btn-primary btn-large" onClick={handleStartTrial}>
              Start New Trial
            </button>
            {rmt.trialNumber > 0 && (
              <div className="trial-count">
                Completed trials: {rmt.trialNumber}
              </div>
            )}
          </div>
        );
        
      case 'hunt':
        return (
          <div className="phase-content hunt">
            <div className="phase-header">
              <span className="phase-badge hunt">Step 1: Hunt</span>
              <span className="trial-number">Trial #{rmt.trialNumber}</span>
            </div>
            
            <div className="phase-instruction">
              <p>Move the coil around the C3 region to find the motor hotspot.</p>
              <p>Fire single pulses and observe hand movement.</p>
            </div>
            
            {/* Intensity control */}
            <div className="intensity-control">
              <label>Intensity (% MSO)</label>
              <div className="intensity-slider-row">
                <button onClick={() => adjustRMTIntensity(-5)}>−5</button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rmt.intensity}
                  onChange={(e) => setRMTIntensity(parseInt(e.target.value, 10))}
                />
                <button onClick={() => adjustRMTIntensity(5)}>+5</button>
              </div>
              <div className="intensity-value">{rmt.intensity}%</div>
            </div>
            
            {/* Distance indicator */}
            {rmt.distanceToHotspot !== null && (
              <div className="distance-indicator">
                <span className="distance-label">Distance to hotspot:</span>
                <span className="distance-value">
                  {rmt.hotspotRevealed ? `${rmt.distanceToHotspot.toFixed(1)} mm` : '???'}
                </span>
              </div>
            )}
            
            {/* Last pulse result */}
            {rmt.lastPulseResult && (
              <div className={`pulse-result ${rmt.lastPulseResult.twitch ? 'movement' : 'no-movement'}`}>
                <div className="result-main">
                  {rmt.lastPulseResult.twitch ? '✓ Movement Seen' : '✗ No Movement'}
                </div>
                {rmt.lastPulseResult.twitch && (
                  <div className="result-amplitude">
                    Amplitude: {rmt.lastPulseResult.category}
                  </div>
                )}
              </div>
            )}
            
            {/* Actions */}
            <div className="phase-actions">
              <button className="btn-primary btn-pulse" onClick={handleFirePulse}>
                ⚡ Fire Pulse (Space)
              </button>
              <button className="btn-secondary" onClick={advanceToTitration}>
                → Advance to Titration
              </button>
              <button className="btn-ghost" onClick={() => revealHotspot()}>
                {rmt.hotspotRevealed ? 'Hotspot Revealed' : 'Reveal Hotspot'}
              </button>
            </div>
          </div>
        );
        
      case 'titration':
        return (
          <div className="phase-content titration">
            <div className="phase-header">
              <span className="phase-badge titration">Step 2: Titration</span>
              <span className="trial-number">Trial #{rmt.trialNumber}</span>
            </div>
            
            <div className="phase-instruction">
              <p>Adjust intensity to find 50% response rate (5/10 twitches).</p>
            </div>
            
            {/* Intensity control */}
            <div className="intensity-control">
              <label>Intensity (% MSO)</label>
              <div className="intensity-slider-row">
                <button onClick={() => adjustRMTIntensity(-2)}>−2</button>
                <button onClick={() => adjustRMTIntensity(-1)}>−1</button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rmt.intensity}
                  onChange={(e) => setRMTIntensity(parseInt(e.target.value, 10))}
                />
                <button onClick={() => adjustRMTIntensity(1)}>+1</button>
                <button onClick={() => adjustRMTIntensity(2)}>+2</button>
              </div>
              <div className="intensity-value">{rmt.intensity}%</div>
            </div>
            
            {/* Titration results */}
            <div className="titration-results">
              <div className="titration-summary">
                <span className="hits">{rmt.titrationHits}</span>
                <span className="divider">/</span>
                <span className="total">{rmt.titrationCount}</span>
                <span className="label">responses</span>
              </div>
              
              {rmt.titrationLog.length > 0 && (
                <div className="titration-log">
                  {rmt.titrationLog.map((entry, i) => (
                    <span key={i} className={`log-dot ${entry.hit ? 'hit' : 'miss'}`}>
                      {entry.hit ? '●' : '○'}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* Last pulse result */}
            {rmt.lastPulseResult && (
              <div className={`pulse-result small ${rmt.lastPulseResult.twitch ? 'movement' : 'no-movement'}`}>
                {rmt.lastPulseResult.twitch ? '✓ Movement' : '✗ No Movement'}
                {rmt.lastPulseResult.twitch && ` (${rmt.lastPulseResult.category})`}
              </div>
            )}
            
            {/* Actions */}
            <div className="phase-actions">
              <button className="btn-primary btn-pulse" onClick={handleFirePulse}>
                ⚡ Single Pulse (Space)
              </button>
              <button className="btn-secondary" onClick={handleRunTenPulse}>
                Run 10-Pulse Trial
              </button>
            </div>
            
            {/* Complete section */}
            <div className="complete-section">
              <label>Your claimed Motor Threshold:</label>
              <div className="complete-row">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={claimedMT}
                  onChange={(e) => setClaimedMT(e.target.value)}
                  placeholder="MT %"
                />
                <button 
                  className="btn-complete"
                  onClick={handleComplete}
                  disabled={!claimedMT}
                >
                  Complete Trial
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'complete':
        const results = rmt.completionResults;
        return (
          <div className="phase-content complete">
            <div className="phase-header">
              <span className={`phase-badge grade-${results?.grade}`}>
                Grade: {results?.grade}
              </span>
              <span className="trial-number">Trial #{rmt.trialNumber}</span>
            </div>
            
            <div className="results-display">
              <div className="result-row highlight">
                <span className="result-label">Error</span>
                <span className="result-value">{results?.percentDiff.toFixed(1)}%</span>
              </div>
              
              <div className="result-row">
                <span className="result-label">Your MT</span>
                <span className="result-value">{results?.userMT}%</span>
              </div>
              
              <div className="result-row">
                <span className="result-label">True MT</span>
                <span className="result-value">{results?.trueMT}%</span>
              </div>
              
              <div className="result-row">
                <span className="result-label">Absolute Error</span>
                <span className="result-value">{results?.absoluteError.toFixed(1)}%</span>
              </div>
              
              <div className="result-row">
                <span className="result-label">Final Distance</span>
                <span className="result-value">{results?.distance.toFixed(1)} mm</span>
              </div>
            </div>
            
            <div className="grade-scale">
              <div className="grade-item">A: &lt;{GRADE_THRESHOLDS.A}%</div>
              <div className="grade-item">B: &lt;{GRADE_THRESHOLDS.B}%</div>
              <div className="grade-item">C: &lt;{GRADE_THRESHOLDS.C}%</div>
              <div className="grade-item">D: &lt;{GRADE_THRESHOLDS.D}%</div>
              <div className="grade-item">F: ≥{GRADE_THRESHOLDS.D}%</div>
            </div>
            
            <div className="phase-actions">
              <button className="btn-primary" onClick={handleStartTrial}>
                Start New Trial
              </button>
              <button className="btn-ghost" onClick={handleReset}>
                Reset
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="rmt-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-icon">🎯</span>
          rMT Training
        </div>
      </div>
      
      {renderPhaseContent()}
    </div>
  );
}
