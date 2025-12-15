/**
 * MachinePanel.jsx
 * ================
 * Premium TMS machine control panel.
 * 
 * Features:
 * - No default protocols (neutral start)
 * - Manual input for all parameters
 * - Example protocols hidden in Advanced dropdown
 * - Session progress and timing
 * - Lock to target functionality
 * 
 * CRITICAL: Protocols are NOT auto-loaded.
 * User must manually configure or select from examples.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTMSStore, EXAMPLE_PROTOCOLS } from '../../stores/tmsStore';
import { 
  calculateSessionTiming, 
  PulseScheduler, 
  ThetaBurstScheduler,
  formatDuration 
} from '../../engine/pulseScheduler';
import './MachinePanel.css';

export function MachinePanel() {
  const {
    protocol,
    setProtocolField,
    session,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    resetSession,
    incrementPulse,
    coilPosition,
    targetPositions,
    isCoilLocked,
    lockCoil,
    unlockCoil,
    nearestTarget,
    setNearestTarget,
  } = useTMSStore();
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const schedulerRef = useRef(null);
  const frameRef = useRef(null);
  
  // Calculate timing when protocol changes
  const timing = React.useMemo(() => {
    if (!protocol.frequency || !protocol.pulsesPerTrain || 
        !protocol.totalPulses || protocol.iti === null) {
      return null;
    }
    return calculateSessionTiming(protocol);
  }, [protocol]);
  
  // Check if protocol is valid for starting
  const isProtocolValid = protocol.frequency && 
    protocol.pulsesPerTrain && 
    protocol.totalPulses && 
    protocol.iti !== null &&
    protocol.intensity;
  
  // Calculate distance to nearest target
  useEffect(() => {
    if (!coilPosition || !targetPositions) return;
    
    const coilVec = new THREE.Vector3(...coilPosition);
    let nearest = { name: null, distance: Infinity };
    
    for (const [name, pos] of Object.entries(targetPositions)) {
      const dist = coilVec.distanceTo(pos) * 1000; // mm
      if (dist < nearest.distance) {
        nearest = { name, distance: dist };
      }
    }
    
    setNearestTarget(nearest);
  }, [coilPosition, targetPositions, setNearestTarget]);
  
  // Session animation loop
  useEffect(() => {
    if (!session.isRunning || session.isPaused) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }
    
    // Create scheduler if needed
    if (!schedulerRef.current) {
      if (protocol.stimType === 'iTBS' || protocol.stimType === 'cTBS') {
        schedulerRef.current = new ThetaBurstScheduler(protocol);
      } else {
        schedulerRef.current = new PulseScheduler(protocol);
      }
    }
    
    let lastTime = performance.now();
    
    const animate = (currentTime) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      if (schedulerRef.current && session.isRunning && !session.isPaused) {
        // Simple call - scheduler tracks state internally
        const pulses = schedulerRef.current.update(delta);
        for (let i = 0; i < pulses; i++) {
          incrementPulse();
        }
        
        // Check if session complete
        if (session.pulsesDelivered >= protocol.totalPulses) {
          stopSession();
          return;
        }
      }
      
      frameRef.current = requestAnimationFrame(animate);
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [session.isRunning, session.isPaused, protocol, incrementPulse, stopSession, session.pulsesDelivered]);
  
  // Handle session controls
  const handleStart = useCallback(() => {
    if (!isProtocolValid) return;
    schedulerRef.current = null;
    startSession();
  }, [isProtocolValid, startSession]);
  
  const handlePause = useCallback(() => {
    if (session.isPaused) {
      resumeSession();
    } else {
      pauseSession();
    }
  }, [session.isPaused, pauseSession, resumeSession]);
  
  const handleStop = useCallback(() => {
    schedulerRef.current = null;
    stopSession();
  }, [stopSession]);
  
  const handleReset = useCallback(() => {
    schedulerRef.current = null;
    resetSession();
  }, [resetSession]);
  
  // Load example protocol
  const handleLoadExample = useCallback((name) => {
    const example = EXAMPLE_PROTOCOLS[name];
    if (example) {
      Object.entries(example).forEach(([key, value]) => {
        setProtocolField(key, value);
      });
    }
    setShowAdvanced(false);
  }, [setProtocolField]);
  
  // Handle lock toggle
  const handleLockToggle = useCallback(() => {
    if (isCoilLocked) {
      unlockCoil();
    } else if (nearestTarget?.distance < 20) {
      lockCoil(nearestTarget.name);
    }
  }, [isCoilLocked, nearestTarget, lockCoil, unlockCoil]);
  
  // Progress calculation
  const progress = timing && protocol.totalPulses 
    ? (session.pulsesDelivered / protocol.totalPulses) * 100 
    : 0;
  
  return (
    <div className="machine-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-icon">⚡</span>
          TMS Control
        </div>
        <div className="panel-status">
          {session.isRunning ? (
            <span className="status-badge running">
              {session.isPaused ? 'PAUSED' : 'RUNNING'}
            </span>
          ) : (
            <span className="status-badge idle">READY</span>
          )}
        </div>
      </div>
      
      {/* Protocol Configuration */}
      <div className="panel-section">
        <div className="section-title">Protocol Parameters</div>
        
        <div className="param-grid">
          <div className={`param-item ${!protocol.frequency ? 'empty' : ''}`}>
            <label>Frequency (Hz)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={protocol.frequency || ''}
              onChange={(e) => setProtocolField('frequency', e.target.value ? Number(e.target.value) : null)}
              placeholder="—"
              disabled={session.isRunning}
            />
          </div>
          
          <div className="param-item">
            <label>Stim Type</label>
            <select
              value={protocol.stimType || 'standard'}
              onChange={(e) => setProtocolField('stimType', e.target.value)}
              disabled={session.isRunning}
            >
              <option value="standard">Standard</option>
              <option value="iTBS">iTBS</option>
              <option value="cTBS">cTBS</option>
            </select>
          </div>
          
          <div className="param-item">
            <label>Intensity (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={protocol.intensity || ''}
              onChange={(e) => setProtocolField('intensity', e.target.value ? Number(e.target.value) : null)}
              placeholder="—"
              disabled={session.isRunning}
            />
          </div>
          
          <div className={`param-item ${!protocol.pulsesPerTrain ? 'empty' : ''}`}>
            <label>Pulses/Train</label>
            <input
              type="number"
              min="1"
              max="100"
              value={protocol.pulsesPerTrain || ''}
              onChange={(e) => setProtocolField('pulsesPerTrain', e.target.value ? Number(e.target.value) : null)}
              placeholder="—"
              disabled={session.isRunning}
            />
          </div>
          
          <div className={`param-item ${protocol.iti === null ? 'empty' : ''}`}>
            <label>ITI (sec)</label>
            <input
              type="number"
              min="0"
              max="60"
              step="0.5"
              value={protocol.iti ?? ''}
              onChange={(e) => setProtocolField('iti', e.target.value !== '' ? Number(e.target.value) : null)}
              placeholder="—"
              disabled={session.isRunning}
            />
          </div>
          
          <div className={`param-item ${!protocol.totalPulses ? 'empty' : ''}`}>
            <label>Total Pulses</label>
            <input
              type="number"
              min="1"
              max="10000"
              value={protocol.totalPulses || ''}
              onChange={(e) => setProtocolField('totalPulses', e.target.value ? Number(e.target.value) : null)}
              placeholder="—"
              disabled={session.isRunning}
            />
          </div>
        </div>
        
        {/* Timing summary */}
        {timing && (
          <div className="timing-summary">
            <span>Trains: {timing.trains}</span>
            <span>Train Duration: {timing.trainDuration.toFixed(1)}s</span>
            <span>Session: ~{formatDuration(timing.sessionDuration)}</span>
          </div>
        )}
      </div>
      
      {/* Progress Section */}
      <div className="panel-section">
        <div className="section-title">Session Progress</div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="progress-text">
            <span className="pulse-count">
              {session.pulsesDelivered} / {protocol.totalPulses || '—'}
            </span>
            <span className="time-elapsed">
              {formatDuration(session.elapsedTime)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Coil Position */}
      <div className="panel-section">
        <div className="section-title">Coil Position</div>
        
        <div className="position-display">
          {nearestTarget?.name ? (
            <>
              <div className="target-info">
                <span className="target-name">{nearestTarget.name}</span>
                <span className="target-distance">{nearestTarget.distance?.toFixed(1)} mm</span>
              </div>
              <button 
                className={`btn-lock ${isCoilLocked ? 'locked' : ''}`}
                onClick={handleLockToggle}
                disabled={!isCoilLocked && nearestTarget.distance > 20}
              >
                {isCoilLocked ? '🔒 Locked' : '🔓 Lock'}
              </button>
            </>
          ) : (
            <span className="no-target">No target nearby</span>
          )}
        </div>
      </div>
      
      {/* Session Controls */}
      <div className="panel-section controls">
        <div className="control-buttons">
          {!session.isRunning ? (
            <button 
              className="btn-primary btn-start"
              onClick={handleStart}
              disabled={!isProtocolValid}
            >
              ▶ Start
            </button>
          ) : (
            <button 
              className="btn-secondary"
              onClick={handlePause}
            >
              {session.isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}
          
          <button 
            className="btn-danger"
            onClick={handleStop}
            disabled={!session.isRunning}
          >
            ⏹ Stop
          </button>
          
          <button 
            className="btn-ghost"
            onClick={handleReset}
            disabled={session.isRunning}
          >
            ↺ Reset
          </button>
        </div>
      </div>
      
      {/* Advanced Section */}
      <div className="panel-section advanced">
        <button 
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▼' : '▶'} Advanced
        </button>
        
        {showAdvanced && (
          <div className="advanced-content">
            <div className="example-protocols">
              <div className="section-subtitle">Example Protocols</div>
              <div className="example-buttons">
                {Object.keys(EXAMPLE_PROTOCOLS).map(name => (
                  <button
                    key={name}
                    className="btn-example"
                    onClick={() => handleLoadExample(name)}
                    disabled={session.isRunning}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
