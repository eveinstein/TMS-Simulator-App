/**
 * RMTPanel.jsx
 * ============
 * Motor Threshold Training interface.
 * Professional UI with clean design, no emoji clutter.
 */

import React, { useState, useCallback } from 'react';
import { useTMSStore, GRADE_THRESHOLDS } from '../../stores/tmsStore';
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
    requestSnap,
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
  
  const handleResetToC3 = useCallback(() => {
    requestSnap('C3');
  }, [requestSnap]);
  
  // Render Idle State
  const renderIdleState = () => (
    <div className="idle-content">
      <div className="idle-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
        </svg>
      </div>
      <h3 className="idle-title">Motor Threshold Training</h3>
      <p className="idle-description">
        Practice locating the motor hotspot and determining resting motor threshold through guided simulation.
      </p>
      <button className="btn-action primary" onClick={handleStartTrial}>
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Start New Trial
      </button>
      {rmt.trialNumber > 0 && (
        <p className="trial-count">
          Completed trials: {rmt.trialNumber}
        </p>
      )}
    </div>
  );
  
  // Render Find Hand Hotspot Phase
  const renderHuntPhase = () => (
    <div className="phase-content">
      <div className="phase-header">
        <span className="phase-badge hunt">Find Hotspot</span>
        <span className="trial-number">Trial #{rmt.trialNumber}</span>
      </div>
      
      {/* Instructions */}
      <div className="instructions">
        <div className="instructions-title">Objective</div>
        <div className="instructions-text">
          Move the coil around C3 to find the motor hotspot. Fire single pulses and observe responses.
        </div>
      </div>
      
      {/* Reset to C3 Button - Positioned above intensity for easy access */}
      <button className="btn-action secondary reset-c3-btn" onClick={handleResetToC3}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        Reset to C3
      </button>
      
      {/* Intensity Control */}
      <div className="rmt-section">
        <div className="rmt-section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span>Intensity</span>
        </div>
        <div className="rmt-section-content">
          <div className="intensity-control">
            <div className="intensity-display">
              <span className="intensity-value">{rmt.intensity}</span>
              <span className="intensity-unit">% MSO</span>
            </div>
            <div className="intensity-slider-container">
              <input
                type="range"
                className="intensity-slider"
                min="0"
                max="100"
                value={rmt.intensity}
                onChange={(e) => setRMTIntensity(parseInt(e.target.value, 10))}
              />
              <div className="slider-labels">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="intensity-buttons">
              <button className="btn-intensity" onClick={() => adjustRMTIntensity(-5)}>−5</button>
              <button className="btn-intensity" onClick={() => adjustRMTIntensity(-1)}>−1</button>
              <button className="btn-intensity" onClick={() => adjustRMTIntensity(1)}>+1</button>
              <button className="btn-intensity" onClick={() => adjustRMTIntensity(5)}>+5</button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Distance Display */}
      {rmt.distanceToHotspot !== null && (
        <div className="distance-display">
          <span className="distance-label">Distance to hotspot</span>
          <span className={`distance-value ${rmt.distanceToHotspot < 10 ? 'good' : 'far'}`}>
            {rmt.hotspotRevealed ? `${rmt.distanceToHotspot.toFixed(1)} mm` : '???'}
          </span>
        </div>
      )}
      
      {/* Last Pulse Result */}
      {rmt.lastPulseResult && (
        <div className={`pulse-result ${rmt.lastPulseResult.twitch ? 'twitch' : 'no-twitch'}`}>
          <div className="result-icon">
            {rmt.lastPulseResult.twitch ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>
          <div className="result-text">
            {rmt.lastPulseResult.twitch ? 'Movement Detected' : 'No Movement'}
          </div>
          {rmt.lastPulseResult.twitch && (
            <div className="result-amplitude">
              Amplitude: {rmt.lastPulseResult.category}
            </div>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="action-buttons">
        <button className="btn-action primary" onClick={handleFirePulse}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Fire Pulse
        </button>
        <button className="btn-action secondary" onClick={advanceToTitration}>
          Advance to Titration
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
        <button 
          className="btn-action secondary" 
          onClick={() => revealHotspot()}
          disabled={rmt.hotspotRevealed}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {rmt.hotspotRevealed ? 'Hotspot Revealed' : 'Reveal Hotspot'}
        </button>
      </div>
      
      {/* Keyboard Hint */}
      <div className="keyboard-hint">
        <span className="key">Space</span>
        <span>to fire pulse</span>
      </div>
    </div>
  );
  
  // Render Titration Phase
  const renderTitrationPhase = () => (
    <div className="phase-content">
      <div className="phase-header">
        <span className="phase-badge titration">Titration</span>
        <span className="trial-number">Trial #{rmt.trialNumber}</span>
      </div>
      
      {/* Instructions */}
      <div className="instructions">
        <div className="instructions-title">Objective</div>
        <div className="instructions-text">
          Adjust intensity to find 50% response rate (5/10 twitches). This is your motor threshold.
        </div>
      </div>
      
      {/* Intensity Control */}
      <div className="rmt-section">
        <div className="rmt-section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span>Intensity</span>
        </div>
        <div className="rmt-section-content">
          <div className="intensity-control">
            <div className="intensity-display">
              <span className="intensity-value">{rmt.intensity}</span>
              <span className="intensity-unit">% MSO</span>
            </div>
            <div className="intensity-buttons titration-buttons">
              <button className="btn-intensity" onClick={() => adjustRMTIntensity(-2)}>−2</button>
              <button className="btn-intensity" onClick={() => adjustRMTIntensity(-1)}>−1</button>
              <button className="btn-intensity primary" onClick={handleFirePulse}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </button>
              <button className="btn-intensity" onClick={() => adjustRMTIntensity(1)}>+1</button>
              <button className="btn-intensity" onClick={() => adjustRMTIntensity(2)}>+2</button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Titration Results */}
      <div className="rmt-section">
        <div className="rmt-section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>Response Log</span>
        </div>
        <div className="rmt-section-content">
          <div className="titration-score">
            <span className="score-hits">{rmt.titrationHits}</span>
            <span className="score-divider">/</span>
            <span className="score-total">{rmt.titrationCount}</span>
            <span className="score-label">responses</span>
          </div>
          
          {/* Visual Log */}
          <div className="titration-log">
            {Array.from({ length: 10 }).map((_, i) => {
              const entry = rmt.titrationLog[i];
              return (
                <span 
                  key={i} 
                  className={`log-pulse ${entry ? (entry.hit ? 'hit' : 'miss') : 'pending'}`}
                >
                  {entry ? (i + 1) : '–'}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Last Pulse Result */}
      {rmt.lastPulseResult && (
        <div className={`pulse-result compact ${rmt.lastPulseResult.twitch ? 'twitch' : 'no-twitch'}`}>
          <div className="result-text">
            {rmt.lastPulseResult.twitch ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            {rmt.lastPulseResult.twitch ? 'Movement' : 'No Movement'}
            {rmt.lastPulseResult.twitch && ` (${rmt.lastPulseResult.category})`}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="action-buttons">
        <button className="btn-action secondary" onClick={handleRunTenPulse}>
          Run 10-Pulse Trial
        </button>
      </div>
      
      {/* Complete Section */}
      <div className="rmt-section">
        <div className="rmt-section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Submit Answer</span>
        </div>
        <div className="rmt-section-content">
          <div className="submit-row">
            <input
              type="number"
              min="0"
              max="100"
              value={claimedMT}
              onChange={(e) => setClaimedMT(e.target.value)}
              placeholder="Your MT %"
              className="mt-input"
            />
            <button 
              className="btn-action success"
              onClick={handleComplete}
              disabled={!claimedMT}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Complete
            </button>
          </div>
          
          {/* Submit current intensity shortcut */}
          <button 
            className="btn-action submit-current"
            onClick={() => {
              if (rmt.intensity > 0 && rmt.titrationCount > 0) {
                completeTrial(rmt.intensity, rmt.distanceToHotspot || 0);
              }
            }}
            disabled={rmt.titrationCount === 0}
            title={rmt.titrationCount === 0 ? 'Run at least one trial first' : `Submit ${rmt.intensity}% as your answer`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Submit current intensity ({rmt.intensity}%)
          </button>
        </div>
      </div>
    </div>
  );
  
  // Render Complete Phase
  const renderCompletePhase = () => {
    const results = rmt.completionResults;
    if (!results) return null;
    
    return (
      <div className="phase-content">
        <div className="phase-header">
          <span className={`phase-badge grade-${results.grade}`}>
            Grade: {results.grade}
          </span>
          <span className="trial-number">Trial #{rmt.trialNumber}</span>
        </div>
        
        {/* Grade Display */}
        <div className="grade-display">
          <div className={`grade-letter ${results.grade}`}>
            {results.grade}
          </div>
          <div className="grade-description">
            {results.percentDiff.toFixed(1)}% error
          </div>
        </div>
        
        {/* Results Grid */}
        <div className="results-grid">
          <div className="result-item">
            <span className="result-item-label">Your MT</span>
            <span className="result-item-value">{results.userMT}%</span>
          </div>
          <div className="result-item">
            <span className="result-item-label">True MT</span>
            <span className="result-item-value highlight">{results.trueMT}%</span>
          </div>
          <div className="result-item">
            <span className="result-item-label">Abs Error</span>
            <span className="result-item-value">{results.absoluteError.toFixed(1)}%</span>
          </div>
          <div className="result-item">
            <span className="result-item-label">Distance</span>
            <span className="result-item-value">{results.distance.toFixed(1)}mm</span>
          </div>
        </div>
        
        {/* Grade Scale */}
        <div className="grade-scale">
          <span>A: &lt;{GRADE_THRESHOLDS.A}%</span>
          <span>B: &lt;{GRADE_THRESHOLDS.B}%</span>
          <span>C: &lt;{GRADE_THRESHOLDS.C}%</span>
          <span>D: &lt;{GRADE_THRESHOLDS.D}%</span>
          <span>F: ≥{GRADE_THRESHOLDS.D}%</span>
        </div>
        
        {/* Actions */}
        <div className="action-buttons">
          <button className="btn-action primary" onClick={handleStartTrial}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start New Trial
          </button>
          <button className="btn-action secondary" onClick={handleReset}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset All
          </button>
        </div>
      </div>
    );
  };
  
  // Main render
  const renderPhaseContent = () => {
    switch (rmt.phase) {
      case 'idle': return renderIdleState();
      case 'hunt': return renderHuntPhase();
      case 'titration': return renderTitrationPhase();
      case 'complete': return renderCompletePhase();
      default: return null;
    }
  };
  
  return (
    <div className="rmt-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">
          <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
          <span>rMT Training</span>
        </div>
        <span className={`phase-badge ${rmt.phase}`}>
          {rmt.phase === 'idle' ? 'READY' : 
           rmt.phase === 'hunt' ? 'FIND HOTSPOT' : 
           rmt.phase.toUpperCase()}
        </span>
      </div>
      
      {/* Body */}
      <div className="panel-body">
        {renderPhaseContent()}
      </div>
    </div>
  );
}
