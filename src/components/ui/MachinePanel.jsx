/**
 * MachinePanel.jsx
 * ================
 * Premium TMS neuromodulation control console.
 * 
 * Design: Dark theme with cyan/purple accents, soft glows,
 * clear visual hierarchy, and micro-interactions.
 * 
 * Sections:
 * 1. Target Selection (primary)
 * 2. Coil Controls (keyboard hints)
 * 3. Protocol Settings (collapsible)
 * 4. Session Progress
 * 5. Session Controls
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
import { TARGETS } from '../../constants/targets';
import './MachinePanel.css';

export function MachinePanel({ isExpanded = false, onToggleExpand }) {
  // Store selectors
  const protocol = useTMSStore(s => s.protocol);
  const setProtocolField = useTMSStore(s => s.setProtocolField);
  const session = useTMSStore(s => s.session);
  const startSession = useTMSStore(s => s.startSession);
  const pauseSession = useTMSStore(s => s.pauseSession);
  const resumeSession = useTMSStore(s => s.resumeSession);
  const stopSession = useTMSStore(s => s.stopSession);
  const resetSession = useTMSStore(s => s.resetSession);
  const incrementPulse = useTMSStore(s => s.incrementPulse);
  const coilPosition = useTMSStore(s => s.coilPosition);
  const targetPositions = useTMSStore(s => s.targetPositions);
  const isCoilLocked = useTMSStore(s => s.isCoilLocked);
  const lockCoil = useTMSStore(s => s.lockCoil);
  const unlockCoil = useTMSStore(s => s.unlockCoil);
  const nearestTarget = useTMSStore(s => s.nearestTarget);
  const setNearestTarget = useTMSStore(s => s.setNearestTarget);
  const selectedTargetKey = useTMSStore(s => s.selectedTargetKey);
  const requestSnap = useTMSStore(s => s.requestSnap);
  const resetCoilPosition = useTMSStore(s => s.resetCoilPosition);
  
  // Local UI state
  const [showProtocol, setShowProtocol] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const schedulerRef = useRef(null);
  const frameRef = useRef(null);
  
  // Calculate timing
  const timing = React.useMemo(() => {
    if (!protocol.frequency || !protocol.pulsesPerTrain || 
        !protocol.totalPulses || protocol.iti === null) {
      return null;
    }
    return calculateSessionTiming(protocol);
  }, [protocol]);
  
  // Protocol validation
  const isProtocolValid = protocol.frequency && 
    protocol.pulsesPerTrain && 
    protocol.totalPulses && 
    protocol.iti !== null &&
    protocol.intensity;
  
  // Update nearest target on coil move
  useEffect(() => {
    if (!coilPosition || !targetPositions) return;
    
    const coilVec = new THREE.Vector3(...coilPosition);
    let nearest = { name: null, distance: Infinity };
    
    for (const [name, pos] of Object.entries(targetPositions)) {
      const dist = coilVec.distanceTo(pos) * 1000;
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
        const pulses = schedulerRef.current.update(delta);
        for (let i = 0; i < pulses; i++) {
          incrementPulse();
        }
        
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
  
  // Handlers
  const handleStart = useCallback(() => {
    if (!isProtocolValid) return;
    schedulerRef.current = null;
    startSession();
  }, [isProtocolValid, startSession]);
  
  const handlePause = useCallback(() => {
    session.isPaused ? resumeSession() : pauseSession();
  }, [session.isPaused, pauseSession, resumeSession]);
  
  const handleStop = useCallback(() => {
    schedulerRef.current = null;
    stopSession();
  }, [stopSession]);
  
  const handleReset = useCallback(() => {
    schedulerRef.current = null;
    resetSession();
  }, [resetSession]);
  
  const handleLoadExample = useCallback((name) => {
    const example = EXAMPLE_PROTOCOLS[name];
    if (example) {
      Object.entries(example).forEach(([key, value]) => {
        setProtocolField(key, value);
      });
    }
    setShowAdvanced(false);
  }, [setProtocolField]);
  
  const handleTargetClick = useCallback((target) => {
    console.log('[MachinePanel] handleTargetClick called with:', target);
    // requestSnap always triggers a new snap via nonce increment
    // No need for clear-then-set pattern anymore
    requestSnap(target);
  }, [requestSnap]);
  
  const handleLockToggle = useCallback(() => {
    if (isCoilLocked) {
      unlockCoil();
    } else if (nearestTarget?.distance < 20) {
      lockCoil(nearestTarget.name);
    }
  }, [isCoilLocked, nearestTarget, lockCoil, unlockCoil]);
  
  const handleResetCoil = useCallback(() => {
    requestSnap(null); // Clear selection
    resetCoilPosition();
  }, [requestSnap, resetCoilPosition]);
  
  // Progress
  const progress = timing && protocol.totalPulses 
    ? (session.pulsesDelivered / protocol.totalPulses) * 100 
    : 0;
  
  return (
    <div className="machine-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-icon">⚡</span>
          TMS Control
        </div>
        <div className="panel-header-actions">
          <button 
            className="btn-expand"
            onClick={onToggleExpand}
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
            aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? '◂▸' : '◂  ▸'}
          </button>
          <div className="panel-status">
            <span className={`status-badge ${session.isRunning ? 'running' : 'idle'}`}>
              {session.isRunning ? (session.isPaused ? 'PAUSED' : 'ACTIVE') : 'READY'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Scrollable Body */}
      <div className="panel-body">
        
        {/* ============================================================
            TARGET SELECTION (Primary Section)
            ============================================================ */}
        <div className="panel-section target-section highlight">
          <div className="section-header" onClick={() => {}}>
            <div className="section-title">
              <span className="section-title-icon">🎯</span>
              Target Selection
            </div>
          </div>
          <div className="section-content">
            {/* Target Grid */}
            <div className="target-grid">
              {Object.entries(TARGETS).map(([key, target]) => (
                <button
                  key={key}
                  className={`target-btn ${selectedTargetKey === key ? 'selected' : ''}`}
                  data-target={key}
                  onClick={() => handleTargetClick(key)}
                  disabled={session.isRunning}
                >
                  <span className="target-code">{key}</span>
                  <span className="target-label">{target.label}</span>
                </button>
              ))}
            </div>
            
            {/* Reset Button */}
            <button
              className="btn-reset-coil"
              onClick={handleResetCoil}
              disabled={session.isRunning}
            >
              <span>↺</span>
              Reset to Center (Cz)
            </button>
            
            {/* Position Display */}
            <div className="position-display">
              {nearestTarget?.name ? (
                <>
                  <div className="target-info">
                    <span className="target-name">{nearestTarget.name}</span>
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
                <span className="no-target">Move coil near a target</span>
              )}
            </div>
          </div>
        </div>
        
        {/* ============================================================
            COIL CONTROLS (Keyboard Reference)
            ============================================================ */}
        <div className="panel-section">
          <div 
            className="section-header"
            onClick={() => {}}
          >
            <div className="section-title">
              <span className="section-title-icon">🎮</span>
              Coil Controls
            </div>
          </div>
          <div className="section-content">
            <div className="controls-info">
              <div className="control-row">
                <span className="control-label">Move</span>
                <div className="control-keys">
                  <span className="key-badge">W</span>
                  <span className="key-badge">A</span>
                  <span className="key-badge">S</span>
                  <span className="key-badge">D</span>
                </div>
              </div>
              <div className="control-row">
                <span className="control-label">Rotate</span>
                <div className="control-keys">
                  <span className="key-badge">Q</span>
                  <span className="key-badge">E</span>
                </div>
              </div>
              <div className="control-row">
                <span className="control-label">Tilt</span>
                <div className="control-keys">
                  <span className="key-badge">R</span>
                  <span className="key-badge">F</span>
                </div>
              </div>
              <div className="control-row">
                <span className="control-label">Drag</span>
                <div className="control-keys">
                  <span className="key-badge">⇧ Shift</span>
                  <span className="key-badge">+ Drag</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* ============================================================
            PROTOCOL SETTINGS (Collapsible)
            ============================================================ */}
        <div className="panel-section">
          <div 
            className="section-header"
            onClick={() => setShowProtocol(!showProtocol)}
          >
            <div className="section-title">
              <span className="section-title-icon">⚙️</span>
              Protocol Settings
            </div>
            <span className={`section-chevron ${showProtocol ? 'open' : ''}`}>▼</span>
          </div>
          <div className={`section-content ${showProtocol ? '' : 'collapsed'}`}>
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
                <label>Intensity (%RMT)</label>
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
            
            {/* Timing Summary */}
            {timing && (
              <div className="timing-summary">
                <span className="timing-badge">
                  <strong>{timing.trains}</strong> trains
                </span>
                <span className="timing-badge">
                  <strong>{timing.trainDuration.toFixed(1)}s</strong> each
                </span>
                <span className="timing-badge">
                  <strong>~{formatDuration(timing.sessionDuration)}</strong> total
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* ============================================================
            SESSION PROGRESS
            ============================================================ */}
        <div className="panel-section">
          <div className="section-header" onClick={() => {}}>
            <div className="section-title">
              <span className="section-title-icon">📊</span>
              Session Progress
            </div>
          </div>
          <div className="section-content">
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
              <div className="progress-text">
                <span className="pulse-count">
                  {session.pulsesDelivered}
                  <span className="separator">/</span>
                  {protocol.totalPulses || '—'}
                </span>
                <span className="time-elapsed">
                  {formatDuration(session.elapsedTime)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* ============================================================
            SESSION CONTROLS
            ============================================================ */}
        <div className="panel-section">
          <div className="section-content">
            <div className="control-buttons">
              {!session.isRunning ? (
                <button 
                  className="btn-primary"
                  onClick={handleStart}
                  disabled={!isProtocolValid}
                >
                  ▶ Start Session
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
        </div>
        
        {/* ============================================================
            ADVANCED (Example Protocols)
            ============================================================ */}
        <div className="panel-section">
          <button 
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span>{showAdvanced ? '▼' : '▶'} Load Example Protocol</span>
          </button>
          
          {showAdvanced && (
            <div className="advanced-content">
              <div className="section-subtitle">Quick Load</div>
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
          )}
        </div>
        
      </div>
    </div>
  );
}
