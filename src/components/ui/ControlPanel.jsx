/**
 * TMS Control Panel
 * =================
 * Premium medical device-style control panel for TMS parameters.
 * 
 * Features:
 * - Protocol presets with one-click loading
 * - Fine-grained parameter adjustment
 * - Session control (Start/Pause/Stop/Reset)
 * - Real-time progress and timing display
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { useTMSStore, PROTOCOL_PRESETS, TARGET_INFO } from '../../stores/tmsStore';
import './ControlPanel.css';

// Format time as MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Numeric input with +/- buttons
function NumericControl({ label, value, onChange, min, max, step = 1, unit = '', disabled = false }) {
  return (
    <div className="numeric-control">
      <label>{label}</label>
      <div className="numeric-input-group">
        <button 
          className="numeric-btn" 
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={disabled}
        >
          −
        </button>
        <div className="numeric-value">
          <span className="value">{value}</span>
          {unit && <span className="unit">{unit}</span>}
        </div>
        <button 
          className="numeric-btn" 
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={disabled}
        >
          +
        </button>
      </div>
    </div>
  );
}

// Dropdown selector
function SelectControl({ label, value, options, onChange, disabled = false }) {
  return (
    <div className="select-control">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// Progress bar component
function ProgressBar({ progress, isActive }) {
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div 
          className={`progress-fill ${isActive ? 'active' : ''}`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
        <div className="progress-glow" style={{ left: `${Math.min(100, progress)}%` }} />
      </div>
      <div className="progress-label">{progress.toFixed(1)}%</div>
    </div>
  );
}

// Pulse counter display
function PulseCounter({ delivered, total, isActive }) {
  const pulseRef = useRef(null);
  const lastDelivered = useRef(delivered);
  
  useEffect(() => {
    if (delivered > lastDelivered.current && pulseRef.current) {
      pulseRef.current.classList.remove('pulse-tick');
      void pulseRef.current.offsetWidth; // Trigger reflow
      pulseRef.current.classList.add('pulse-tick');
    }
    lastDelivered.current = delivered;
  }, [delivered]);
  
  return (
    <div className={`pulse-counter ${isActive ? 'active' : ''}`} ref={pulseRef}>
      <div className="pulse-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </div>
      <div className="pulse-numbers">
        <span className="delivered">{delivered.toLocaleString()}</span>
        <span className="separator">/</span>
        <span className="total">{total.toLocaleString()}</span>
      </div>
      <div className="pulse-label">pulses</div>
    </div>
  );
}

// Target lock status
function TargetStatus({ target, isLocked, onLock, onUnlock }) {
  const info = target ? TARGET_INFO[target] : null;
  
  return (
    <div className={`target-status ${isLocked ? 'locked' : ''}`}>
      <div className="target-header">
        <span className="target-label">Target</span>
        {target && (
          <button 
            className={`lock-btn ${isLocked ? 'locked' : ''}`}
            onClick={isLocked ? onUnlock : () => onLock(target)}
          >
            {isLocked ? '🔒 Locked' : '🔓 Lock'}
          </button>
        )}
      </div>
      {target ? (
        <div className="target-info">
          <div className="target-name">{target}</div>
          <div className="target-brain">{info?.brainTarget || 'Unknown'}</div>
        </div>
      ) : (
        <div className="target-empty">
          <span>Click a target marker to select</span>
        </div>
      )}
    </div>
  );
}

// Time display
function TimeDisplay({ elapsed, total, isRunning }) {
  return (
    <div className="time-display">
      <div className="time-row">
        <span className="time-label">Elapsed</span>
        <span className={`time-value ${isRunning ? 'active' : ''}`}>{formatTime(elapsed)}</span>
      </div>
      <div className="time-row">
        <span className="time-label">Remaining</span>
        <span className="time-value">{formatTime(Math.max(0, total - elapsed))}</span>
      </div>
      <div className="time-row total">
        <span className="time-label">Total</span>
        <span className="time-value">{formatTime(total)}</span>
      </div>
    </div>
  );
}

// Train indicator
function TrainIndicator({ trainNumber, isInTrain, trainProgress }) {
  return (
    <div className={`train-indicator ${isInTrain ? 'in-train' : 'iti'}`}>
      <div className="train-status">
        {isInTrain ? (
          <>
            <span className="train-icon">⚡</span>
            <span>Train {trainNumber}</span>
          </>
        ) : (
          <>
            <span className="iti-icon">⏸</span>
            <span>Inter-train Interval</span>
          </>
        )}
      </div>
      {isInTrain && (
        <div className="train-progress">
          <div className="train-bar" style={{ width: `${trainProgress * 100}%` }} />
        </div>
      )}
    </div>
  );
}

// Main Control Panel
export function ControlPanel() {
  const store = useTMSStore();
  const animationRef = useRef(null);
  const lastTimeRef = useRef(Date.now());
  
  const {
    stimulationType,
    frequency,
    intensity,
    pulsesPerTrain,
    interTrainInterval,
    totalPulses,
    isRunning,
    isPaused,
    elapsedTime,
    pulsesDelivered,
    currentTrainNumber,
    isInTrain,
    trainProgress,
    isCoilLocked,
    lockedTarget,
    selectedTarget,
    showAdvanced,
    speedMultiplier,
  } = store;
  
  // Calculate session duration
  const sessionDuration = useMemo(() => store.getSessionDuration(), [
    frequency, pulsesPerTrain, interTrainInterval, totalPulses, stimulationType
  ]);
  
  const progress = useMemo(() => store.getProgress(), [pulsesDelivered, totalPulses]);
  
  // Animation loop for session updates
  useEffect(() => {
    if (isRunning && !isPaused) {
      const animate = () => {
        const now = Date.now();
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;
        
        store.updateSession(delta);
        animationRef.current = requestAnimationFrame(animate);
      };
      
      lastTimeRef.current = Date.now();
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isRunning, isPaused, store]);
  
  const handleStart = () => {
    if (!isCoilLocked) {
      alert('Please lock the coil to a target before starting stimulation.');
      return;
    }
    store.startSession();
  };
  
  const isSessionActive = isRunning;
  
  return (
    <div className="control-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v15A2.5 2.5 0 0 0 9.5 22h5a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 14.5 2h-5Z" />
            <path d="M12 18h.01" />
            <path d="M8 6h8" />
            <path d="M8 9h8" />
            <path d="M8 12h8" />
          </svg>
        </div>
        <div className="panel-title">
          <h1>TMS Control</h1>
          <span className="panel-subtitle">Transcranial Magnetic Stimulation</span>
        </div>
      </div>
      
      {/* Target Status */}
      <TargetStatus
        target={selectedTarget}
        isLocked={isCoilLocked}
        onLock={store.lockCoilToTarget}
        onUnlock={store.unlockCoil}
      />
      
      {/* Presets Section */}
      <div className="panel-section">
        <h2>Protocol Presets</h2>
        <div className="preset-grid">
          {Object.entries(PROTOCOL_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className="preset-btn"
              onClick={() => store.loadPreset(key)}
              disabled={isSessionActive}
            >
              <span className="preset-name">{preset.name}</span>
              <span className="preset-desc">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Parameters Section */}
      <div className="panel-section">
        <h2>Protocol Parameters</h2>
        
        <SelectControl
          label="Stimulation Type"
          value={stimulationType}
          options={[
            { value: 'standard', label: 'Standard rTMS' },
            { value: 'iTBS', label: 'iTBS (Intermittent Theta Burst)' },
            { value: 'cTBS', label: 'cTBS (Continuous Theta Burst)' },
          ]}
          onChange={store.setStimulationType}
          disabled={isSessionActive}
        />
        
        {stimulationType === 'standard' && (
          <NumericControl
            label="Frequency"
            value={frequency}
            onChange={store.setFrequency}
            min={1}
            max={20}
            unit="Hz"
            disabled={isSessionActive}
          />
        )}
        
        <NumericControl
          label="Intensity (% MT)"
          value={intensity}
          onChange={store.setIntensity}
          min={0}
          max={100}
          step={5}
          unit="%"
          disabled={isSessionActive}
        />
        
        {stimulationType === 'standard' && (
          <>
            <NumericControl
              label="Pulses per Train"
              value={pulsesPerTrain}
              onChange={store.setPulsesPerTrain}
              min={1}
              max={100}
              disabled={isSessionActive}
            />
            
            <NumericControl
              label="Inter-train Interval"
              value={interTrainInterval}
              onChange={store.setInterTrainInterval}
              min={0}
              max={60}
              unit="s"
              disabled={isSessionActive}
            />
          </>
        )}
        
        <NumericControl
          label="Total Pulses"
          value={totalPulses}
          onChange={store.setTotalPulses}
          min={1}
          max={6000}
          step={100}
          disabled={isSessionActive}
        />
      </div>
      
      {/* Advanced Settings (hidden by default) */}
      <div className="panel-section advanced-toggle">
        <button className="toggle-advanced" onClick={store.toggleAdvanced}>
          {showAdvanced ? '▼' : '▶'} Advanced Settings
        </button>
        
        {showAdvanced && (
          <div className="advanced-content">
            <NumericControl
              label="Speed Multiplier"
              value={speedMultiplier}
              onChange={store.setSpeedMultiplier}
              min={1}
              max={100}
              unit="×"
            />
            <p className="advanced-note">
              For demo/testing only. Real-time = 1×
            </p>
          </div>
        )}
      </div>
      
      {/* Session Display */}
      <div className="panel-section session-section">
        <h2>Session Progress</h2>
        
        <ProgressBar progress={progress} isActive={isRunning && !isPaused} />
        
        <PulseCounter 
          delivered={pulsesDelivered} 
          total={totalPulses} 
          isActive={isRunning && !isPaused && isInTrain}
        />
        
        <TimeDisplay 
          elapsed={elapsedTime} 
          total={sessionDuration}
          isRunning={isRunning && !isPaused}
        />
        
        {isRunning && (
          <TrainIndicator
            trainNumber={currentTrainNumber}
            isInTrain={isInTrain}
            trainProgress={trainProgress}
          />
        )}
      </div>
      
      {/* Session Controls */}
      <div className="panel-section controls-section">
        <div className="control-buttons">
          {!isRunning ? (
            <button 
              className="control-btn start"
              onClick={handleStart}
              disabled={!isCoilLocked}
            >
              <span className="btn-icon">▶</span>
              Start Session
            </button>
          ) : (
            <>
              {isPaused ? (
                <button className="control-btn resume" onClick={store.resumeSession}>
                  <span className="btn-icon">▶</span>
                  Resume
                </button>
              ) : (
                <button className="control-btn pause" onClick={store.pauseSession}>
                  <span className="btn-icon">⏸</span>
                  Pause
                </button>
              )}
              <button className="control-btn stop" onClick={store.stopSession}>
                <span className="btn-icon">⏹</span>
                Stop
              </button>
            </>
          )}
          
          <button 
            className="control-btn reset"
            onClick={store.resetSession}
            disabled={isRunning && !isPaused}
          >
            <span className="btn-icon">↺</span>
            Reset
          </button>
        </div>
      </div>
      
      {/* Footer */}
      <div className="panel-footer">
        <div className="footer-text">
          TMS Simulator v1.0
        </div>
        <div className="footer-convention">
          Radiologic Convention: L=+X | R=−X
        </div>
      </div>
    </div>
  );
}
