/**
 * RMTPanel.jsx
 * ============
 * Motor Threshold Training interface.
 * Premium UI matching MachinePanel design system.
 * 
 * Workflow:
 * 1. Find Hand Hotspot - Locate motor hotspot near C3
 * 2. Titration - Determine threshold
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
  
  // Task 14: Reset coil to C3 without locking
  const handleResetToC3 = useCallback(() => {
    requestSnap('C3');
  }, [requestSnap]);
  
  // Render Idle State
  const renderIdleState = () => (
    <div className="idle-content">
      <div className="idle-icon">🎯</div>
      <h3 className="idle-title">Motor Threshold Training</h3>
      <p className="idle-description">
        Practice locating the motor hotspot and determining resting motor threshold through guided simulation.
      </p>
      <button className="btn-action primary" onClick={handleStartTrial}>
        ▶ Start New Trial
      </button>
      {rmt.trialNumber > 0 && (
        <p style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
          Completed trials: {rmt.trialNumber}
        </p>
      )}
    </div>
  );
  
  // Render Find Hand Hotspot Phase
  const renderHuntPhase = () => (
    <div className="phase-content">
      <div className="phase-header">
        <span className="phase-badge hunt">Find Hand Hotspot</span>
        <span className="trial-number">Trial #{rmt.trialNumber}</span>
      </div>
      
      {/* Instructions */}
      <div className="instructions">
        <div className="instructions-title">Objective</div>
        <div className="instructions-text">
          Move the coil around C3 to find the motor hotspot. Fire single pulses and observe responses.
        </div>
      </div>
      
      {/* Intensity Control */}
      <div className="rmt-section">
        <div className="rmt-section-header">
          <span>⚡</span> Intensity
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
            {rmt.lastPulseResult.twitch ? '✓' : '✗'}
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
          ⚡ Fire Pulse
        </button>
        <button className="btn-action secondary" onClick={handleResetToC3}>
          ↺ Reset to C3
        </button>
        <button className="btn-action secondary" onClick={advanceToTitration}>
          → Advance to Titration
        </button>
        <button 
          className="btn-action secondary" 
          onClick={() => revealHotspot()}
          disabled={rmt.hotspotRevealed}
        >
          {rmt.hotspotRevealed ? '✓ Hotspot Revealed' : '👁 Reveal Hotspot'}
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
        <span className="phase-badge titration">Titration Phase</span>
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
          <span>⚡</span> Intensity
        </div>
        <div className="rmt-section-content">
          <div className="intensity-control">
            <div className="intensity-display">
              <span className="intensity-value">{rmt.intensity}</span>
              <span className="intensity-unit">% MSO</span>
            </div>
            <div className="intensity-buttons">
              <button className="btn-intensity" onClick={() => adjustRMTIntensity(-2)}>−2</button>
              <button className="btn-intensity" onClick={() => adjustRMTIntensity(-1)}>−1</button>
              <button className="btn-intensity primary" onClick={handleFirePulse}>⚡</button>
              <button className="btn-intensity" onClick={() => adjustRMTIntensity(1)}>+1</button>
              <button className="btn-intensity" onClick={() => adjustRMTIntensity(2)}>+2</button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Titration Results */}
      <div className="rmt-section">
        <div className="rmt-section-header">
          <span>📊</span> Response Log
        </div>
        <div className="rmt-section-content">
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--accent-green)' }}>{rmt.titrationHits}</span>
              <span style={{ color: 'var(--text-muted)' }}> / </span>
              <span style={{ color: 'var(--text-primary)' }}>{rmt.titrationCount}</span>
            </span>
            <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              responses
            </span>
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
        <div className={`pulse-result ${rmt.lastPulseResult.twitch ? 'twitch' : 'no-twitch'}`}>
          <div className="result-text">
            {rmt.lastPulseResult.twitch ? '✓ Movement' : '✗ No Movement'}
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
          <span>🎯</span> Submit Answer
        </div>
        <div className="rmt-section-content">
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              min="0"
              max="100"
              value={claimedMT}
              onChange={(e) => setClaimedMT(e.target.value)}
              placeholder="Your MT %"
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
              }}
            />
            <button 
              className="btn-action success"
              onClick={handleComplete}
              disabled={!claimedMT}
              style={{ whiteSpace: 'nowrap' }}
            >
              Complete ✓
            </button>
          </div>
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
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '8px', 
          flexWrap: 'wrap',
          marginTop: '12px',
          fontSize: '10px',
          color: 'var(--text-muted)',
        }}>
          <span>A: &lt;{GRADE_THRESHOLDS.A}%</span>
          <span>B: &lt;{GRADE_THRESHOLDS.B}%</span>
          <span>C: &lt;{GRADE_THRESHOLDS.C}%</span>
          <span>D: &lt;{GRADE_THRESHOLDS.D}%</span>
          <span>F: ≥{GRADE_THRESHOLDS.D}%</span>
        </div>
        
        {/* Actions */}
        <div className="action-buttons" style={{ marginTop: '16px' }}>
          <button className="btn-action primary" onClick={handleStartTrial}>
            Start New Trial
          </button>
          <button className="btn-action secondary" onClick={handleReset}>
            Reset
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
          <span className="panel-icon">🎯</span>
          rMT Training
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
