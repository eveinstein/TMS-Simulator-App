/**
 * MachinePanel.jsx
 * ================
 * Professional TMS neuromodulation control console.
 * Compact, responsive design with dynamic layout.
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
  const setIsPulsing = useTMSStore(s => s.setIsPulsing);
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
  
  // Local UI state - sections collapsed by default for compact view
  const [showTargets, setShowTargets] = useState(false);
  const [showProtocol, setShowProtocol] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pulseFlash, setPulseFlash] = useState(false);
  const [itiProgress, setItiProgress] = useState({ inITI: false, progress: 0, remaining: 0 });
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
  
  // Session animation loop with pulse visual feedback and ITI tracking
  useEffect(() => {
    if (!session.isRunning || session.isPaused) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      setIsPulsing(false);
      setItiProgress({ inITI: false, progress: 0, remaining: 0 });
      return;
    }
    
    // Create scheduler only once when session starts
    if (!schedulerRef.current) {
      if (protocol.stimType === 'iTBS' || protocol.stimType === 'cTBS') {
        schedulerRef.current = new ThetaBurstScheduler(protocol);
      } else {
        schedulerRef.current = new PulseScheduler(protocol);
      }
    }
    
    let lastTime = performance.now();
    let localPulseCount = session.pulsesDelivered; // Track locally to avoid stale closures
    
    const animate = (currentTime) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      if (schedulerRef.current) {
        const pulses = schedulerRef.current.update(delta);
        
        // Get ITI progress from scheduler
        if (schedulerRef.current.getITIProgress) {
          const itiState = schedulerRef.current.getITIProgress();
          setItiProgress(itiState);
        }
        
        // Trigger visual pulse feedback
        if (pulses > 0) {
          localPulseCount += pulses;
          setPulseFlash(true);
          setIsPulsing(true, protocol.intensity / 100);
          
          // Increment store pulse count
          for (let i = 0; i < pulses; i++) {
            incrementPulse();
          }
          
          setTimeout(() => {
            setPulseFlash(false);
            setIsPulsing(false);
          }, 60);
        }
        
        // Check completion using local count
        if (localPulseCount >= protocol.totalPulses) {
          stopSession();
          setIsPulsing(false);
          setItiProgress({ inITI: false, progress: 0, remaining: 0 });
          schedulerRef.current = null;
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
  }, [session.isRunning, session.isPaused, protocol, incrementPulse, stopSession, setIsPulsing]);
  
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
    setItiProgress({ inITI: false, progress: 0, remaining: 0 });
  }, [stopSession]);
  
  const handleReset = useCallback(() => {
    schedulerRef.current = null;
    resetSession();
    setItiProgress({ inITI: false, progress: 0, remaining: 0 });
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
    requestSnap(null);
    resetCoilPosition();
  }, [requestSnap, resetCoilPosition]);
  
  // Progress calculation
  const progress = timing && protocol.totalPulses 
    ? (session.pulsesDelivered / protocol.totalPulses) * 100 
    : 0;
  
  return (
    <div className={`machine-panel ${session.isRunning ? 'session-active' : ''}`}>
      {/* Compact Header */}
      <div className="panel-header">
        <div className="panel-title">
          <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span>TMS Control</span>
        </div>
        <div className={`status-indicator ${session.isRunning ? (session.isPaused ? 'paused' : 'active') : 'ready'}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            {session.isRunning ? (session.isPaused ? 'PAUSED' : 'ACTIVE') : 'READY'}
          </span>
        </div>
      </div>
      
      {/* Scrollable Body */}
      <div className="panel-body">
        
        {/* === LIVE SESSION MONITOR === Always visible when running */}
        {(session.isRunning || session.pulsesDelivered > 0) && (
          <section className={`panel-section session-section ${session.isRunning ? 'active' : ''}`}>
            <div className="session-monitor">
              {/* Compact pulse counter */}
              <div className={`pulse-display ${pulseFlash ? 'flash' : ''}`}>
                <span className="pulse-current">{session.pulsesDelivered}</span>
                <span className="pulse-separator">/</span>
                <span className="pulse-total">{protocol.totalPulses || '—'}</span>
                {protocol.frequency && (
                  <span className="freq-tag">{protocol.frequency}Hz</span>
                )}
              </div>
              
              {/* Progress bar */}
              <div className="session-progress">
                <div 
                  className={`session-progress-fill ${session.isRunning && !session.isPaused ? 'animated' : ''}`}
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
              
              {/* ITI Progress - only during inter-train interval */}
              {itiProgress.inITI && (
                <div className="iti-indicator">
                  <div className="iti-info">
                    <span className="iti-label">Inter-train interval</span>
                    <span className="iti-time">{itiProgress.remaining.toFixed(1)}s</span>
                  </div>
                  <div className="iti-bar">
                    <div 
                      className="iti-fill"
                      style={{ width: `${itiProgress.progress * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Compact controls */}
              <div className="session-controls-compact">
                {!session.isRunning ? (
                  <button className="btn-control start" onClick={handleStart} disabled={!isProtocolValid}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Start
                  </button>
                ) : (
                  <button className={`btn-control ${session.isPaused ? 'resume' : 'pause'}`} onClick={handlePause}>
                    {session.isPaused ? (
                      <><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3" /></svg>Resume</>
                    ) : (
                      <><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>Pause</>
                    )}
                  </button>
                )}
                <button className="btn-control stop" onClick={handleStop} disabled={!session.isRunning}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                </button>
                <button className="btn-control reset" onClick={handleReset} disabled={session.isRunning}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
              </div>
            </div>
          </section>
        )}
        
        {/* === QUICK START - Show when no session === */}
        {!session.isRunning && session.pulsesDelivered === 0 && (
          <section className="panel-section quick-start">
            <div className="quick-start-content">
              <div className="quick-presets">
                <span className="quick-label">Quick Start</span>
                <div className="preset-chips">
                  {Object.keys(EXAMPLE_PROTOCOLS).slice(0, 3).map(name => (
                    <button
                      key={name}
                      className="preset-chip"
                      onClick={() => handleLoadExample(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                className="btn-start-large"
                onClick={handleStart}
                disabled={!isProtocolValid}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {isProtocolValid ? 'Start Session' : 'Configure Protocol'}
              </button>
            </div>
          </section>
        )}
        
        {/* === TARGET SELECTION - Collapsible === */}
        <section className="panel-section collapsible">
          <header 
            className="section-header clickable"
            onClick={() => setShowTargets(!showTargets)}
          >
            <div className="section-title-row">
              <h3 className="section-title">Target</h3>
              {selectedTargetKey && (
                <span className="section-value">{selectedTargetKey}</span>
              )}
            </div>
            <svg 
              className={`chevron ${showTargets ? 'open' : ''}`} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              width="14" 
              height="14"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </header>
          
          {showTargets && (
            <div className="section-content">
              <div className="target-chips">
                {Object.entries(TARGETS).map(([key, target]) => (
                  <button
                    key={key}
                    className={`target-chip ${selectedTargetKey === key ? 'selected' : ''}`}
                    onClick={() => handleTargetClick(key)}
                    disabled={session.isRunning}
                    style={{ '--target-color': target.color }}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <div className="target-actions-row">
                <button className="btn-tiny" onClick={handleResetCoil} disabled={session.isRunning}>
                  Reset Position
                </button>
                {nearestTarget?.name && nearestTarget.distance < 20 && (
                  <button 
                    className={`btn-tiny ${isCoilLocked ? 'active' : ''}`}
                    onClick={handleLockToggle}
                  >
                    {isCoilLocked ? 'Unlock' : 'Lock'} {nearestTarget.name}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
        
        {/* === PROTOCOL SETTINGS - Collapsible === */}
        <section className="panel-section collapsible">
          <header 
            className="section-header clickable"
            onClick={() => setShowProtocol(!showProtocol)}
          >
            <div className="section-title-row">
              <h3 className="section-title">Protocol</h3>
              {protocol.frequency && (
                <span className="section-value">
                  {protocol.frequency}Hz · {protocol.intensity}%
                </span>
              )}
            </div>
            <svg 
              className={`chevron ${showProtocol ? 'open' : ''}`} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              width="14" 
              height="14"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </header>
          
          {showProtocol && (
            <div className="section-content">
              {/* Compact 3-column grid */}
              <div className="param-grid-compact">
                <div className="param-cell">
                  <label>Freq</label>
                  <div className="param-input-wrap">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={protocol.frequency || ''}
                      onChange={(e) => setProtocolField('frequency', e.target.value ? Number(e.target.value) : null)}
                      placeholder="—"
                      disabled={session.isRunning}
                    />
                    <span className="param-unit">Hz</span>
                  </div>
                </div>
                
                <div className="param-cell">
                  <label>Intensity</label>
                  <div className="param-input-wrap">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={protocol.intensity || ''}
                      onChange={(e) => setProtocolField('intensity', e.target.value ? Number(e.target.value) : null)}
                      placeholder="—"
                      disabled={session.isRunning}
                    />
                    <span className="param-unit">%</span>
                  </div>
                </div>
                
                <div className="param-cell">
                  <label>Type</label>
                  <select
                    value={protocol.stimType || 'standard'}
                    onChange={(e) => setProtocolField('stimType', e.target.value)}
                    disabled={session.isRunning}
                  >
                    <option value="standard">Std</option>
                    <option value="iTBS">iTBS</option>
                    <option value="cTBS">cTBS</option>
                  </select>
                </div>
                
                <div className="param-cell">
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
                
                <div className="param-cell">
                  <label>ITI</label>
                  <div className="param-input-wrap">
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
                    <span className="param-unit">s</span>
                  </div>
                </div>
                
                <div className="param-cell">
                  <label>Total</label>
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
              
              {/* Timing summary - inline */}
              {timing && (
                <div className="timing-inline">
                  <span>{timing.trains} trains</span>
                  <span className="timing-dot">·</span>
                  <span>{timing.trainDuration.toFixed(1)}s each</span>
                  <span className="timing-dot">·</span>
                  <span>~{formatDuration(timing.sessionDuration)}</span>
                </div>
              )}
              
              {/* Preset toggle */}
              <button 
                className="presets-toggle-compact"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Hide presets' : 'Load preset'}
                <svg 
                  className={`chevron-tiny ${showAdvanced ? 'open' : ''}`}
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  width="10" 
                  height="10"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              
              {showAdvanced && (
                <div className="preset-list">
                  {Object.keys(EXAMPLE_PROTOCOLS).map(name => (
                    <button
                      key={name}
                      className="preset-item"
                      onClick={() => handleLoadExample(name)}
                      disabled={session.isRunning}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
        
      </div>
    </div>
  );
}
