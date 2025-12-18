/**
 * MachinePanel.jsx
 * ================
 * Professional TMS neuromodulation control console.
 * Clean, medical-grade aesthetic without emoji clutter.
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
  
  // Local UI state
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
  
  // Session animation loop with pulse visual feedback
  useEffect(() => {
    if (!session.isRunning || session.isPaused) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      setIsPulsing(false); // Reset 3D coil animation
      setItiProgress({ inITI: false, progress: 0, remaining: 0 });
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
        
        // Track ITI progress
        const scheduler = schedulerRef.current;
        if (scheduler.isInITI && scheduler.isInITI()) {
          const iti = protocol.iti || 0;
          const elapsed = scheduler.itiAccumulator || 0;
          const progress = iti > 0 ? Math.min(1, elapsed / iti) : 0;
          const remaining = Math.max(0, iti - elapsed);
          setItiProgress({ inITI: true, progress, remaining });
        } else {
          if (itiProgress.inITI) {
            setItiProgress({ inITI: false, progress: 0, remaining: 0 });
          }
        }
        
        // Trigger visual pulse feedback - both UI and 3D coil
        if (pulses > 0) {
          setPulseFlash(true);
          setIsPulsing(true, protocol.intensity / 100); // Pass intensity for animation
          setTimeout(() => {
            setPulseFlash(false);
            setIsPulsing(false);
          }, 60);
        }
        
        for (let i = 0; i < pulses; i++) {
          incrementPulse();
        }
        
        if (session.pulsesDelivered >= protocol.totalPulses) {
          stopSession();
          setIsPulsing(false);
          setItiProgress({ inITI: false, progress: 0, remaining: 0 });
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
  }, [session.isRunning, session.isPaused, protocol, incrementPulse, stopSession, session.pulsesDelivered, setIsPulsing, itiProgress.inITI]);
  
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
  
  // Pulse animation CSS variable
  const pulseAnimationDuration = protocol.frequency ? `${1 / protocol.frequency}s` : '0.1s';
  
  return (
    <div className={`machine-panel ${session.isRunning ? 'session-active' : ''}`}>
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">
          <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span>TMS Control</span>
        </div>
        <div className="panel-header-actions">
          <button 
            className="btn-icon"
            onClick={onToggleExpand}
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              {isExpanded ? (
                <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
          <div className={`status-indicator ${session.isRunning ? (session.isPaused ? 'paused' : 'active') : 'ready'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {session.isRunning ? (session.isPaused ? 'PAUSED' : 'ACTIVE') : 'READY'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Scrollable Body */}
      <div className="panel-body">
        
        {/* Target Selection */}
        <section className="panel-section">
          <header className="section-header">
            <h3 className="section-title">Target Selection</h3>
          </header>
          <div className="section-content">
            <div className="target-grid">
              {Object.entries(TARGETS).map(([key, target]) => (
                <button
                  key={key}
                  className={`target-btn ${selectedTargetKey === key ? 'selected' : ''}`}
                  data-target={key}
                  onClick={() => handleTargetClick(key)}
                  disabled={session.isRunning}
                  style={{ '--target-color': target.color }}
                >
                  <span className="target-dot"></span>
                  <span className="target-code">{key}</span>
                  <span className="target-label">{target.label}</span>
                </button>
              ))}
            </div>
            
            <div className="target-actions">
              <button
                className="btn-subtle"
                onClick={handleResetCoil}
                disabled={session.isRunning}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Reset Position
              </button>
              
              {nearestTarget?.name && (
                <button 
                  className={`btn-lock ${isCoilLocked ? 'locked' : ''}`}
                  onClick={handleLockToggle}
                  disabled={!isCoilLocked && nearestTarget.distance > 20}
                >
                  {isCoilLocked ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                    </svg>
                  )}
                  {isCoilLocked ? 'Unlock' : 'Lock'} {nearestTarget.name}
                </button>
              )}
            </div>
          </div>
        </section>
        
        {/* Protocol Settings */}
        <section className="panel-section">
          <header 
            className="section-header clickable"
            onClick={() => setShowProtocol(!showProtocol)}
          >
            <h3 className="section-title">Protocol Settings</h3>
            <svg 
              className={`chevron ${showProtocol ? 'open' : ''}`} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              width="16" 
              height="16"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </header>
          
          {showProtocol && (
            <div className="section-content">
              <div className="param-grid">
                <div className="param-item">
                  <label>Frequency</label>
                  <div className="input-group">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={protocol.frequency || ''}
                      onChange={(e) => setProtocolField('frequency', e.target.value ? Number(e.target.value) : null)}
                      placeholder="—"
                      disabled={session.isRunning}
                    />
                    <span className="input-unit">Hz</span>
                  </div>
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
                  <label>Intensity</label>
                  <div className="input-group">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={protocol.intensity || ''}
                      onChange={(e) => setProtocolField('intensity', e.target.value ? Number(e.target.value) : null)}
                      placeholder="—"
                      disabled={session.isRunning}
                    />
                    <span className="input-unit">%MT</span>
                  </div>
                </div>
                
                <div className="param-item">
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
                
                <div className="param-item">
                  <label>ITI</label>
                  <div className="input-group">
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
                    <span className="input-unit">sec</span>
                  </div>
                </div>
                
                <div className="param-item">
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
              
              {timing && (
                <div className="timing-summary">
                  <div className="timing-item">
                    <span className="timing-value">{timing.trains}</span>
                    <span className="timing-label">trains</span>
                  </div>
                  <div className="timing-divider"></div>
                  <div className="timing-item">
                    <span className="timing-value">{timing.trainDuration.toFixed(1)}s</span>
                    <span className="timing-label">each</span>
                  </div>
                  <div className="timing-divider"></div>
                  <div className="timing-item">
                    <span className="timing-value">~{formatDuration(timing.sessionDuration)}</span>
                    <span className="timing-label">total</span>
                  </div>
                </div>
              )}
              
              {/* Quick Load Protocols */}
              <div className="presets-section">
                <button 
                  className="presets-toggle"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <span>{showAdvanced ? 'Hide' : 'Load'} preset protocols</span>
                  <svg 
                    className={`chevron-small ${showAdvanced ? 'open' : ''}`}
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    width="12" 
                    height="12"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                
                {showAdvanced && (
                  <div className="preset-grid">
                    {Object.keys(EXAMPLE_PROTOCOLS).map(name => (
                      <button
                        key={name}
                        className="btn-preset"
                        onClick={() => handleLoadExample(name)}
                        disabled={session.isRunning}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
        
        {/* Session Monitor */}
        <section className={`panel-section session-section ${session.isRunning ? 'active' : ''}`}>
          <header className="section-header">
            <h3 className="section-title">Session</h3>
            {session.isRunning && protocol.frequency && (
              <span className="freq-badge">{protocol.frequency} Hz</span>
            )}
          </header>
          <div className="section-content">
            {/* Pulse Visualization */}
            <div 
              className={`pulse-visualizer ${session.isRunning && !session.isPaused ? 'active' : ''} ${pulseFlash ? 'flash' : ''}`}
              style={{ '--pulse-duration': pulseAnimationDuration }}
            >
              <div className="pulse-rings">
                <div className="pulse-ring ring-1"></div>
                <div className="pulse-ring ring-2"></div>
                <div className="pulse-ring ring-3"></div>
              </div>
              <div className="pulse-center">
                <span className="pulse-count">{session.pulsesDelivered}</span>
                <span className="pulse-total">/ {protocol.totalPulses || '—'}</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="progress-wrapper">
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${session.isRunning ? 'animated' : ''}`}
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
              <div className="progress-info">
                <span className="progress-percent">{Math.round(progress)}%</span>
                <span className="progress-time">{formatDuration(session.elapsedTime)}</span>
              </div>
            </div>
            
            {/* Inter-train Interval Progress - only visible during ITI */}
            {itiProgress.inITI && (
              <div className="iti-progress-wrapper">
                <div className="iti-header">
                  <span className="iti-label">Inter-train interval</span>
                  <span className="iti-remaining">{itiProgress.remaining.toFixed(1)}s</span>
                </div>
                <div className="iti-progress-bar">
                  <div 
                    className="iti-progress-fill"
                    style={{ width: `${itiProgress.progress * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Control Buttons */}
            <div className="session-controls">
              {!session.isRunning ? (
                <button 
                  className="btn-start"
                  onClick={handleStart}
                  disabled={!isProtocolValid}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Start Session</span>
                </button>
              ) : (
                <button 
                  className={`btn-pause ${session.isPaused ? 'paused' : ''}`}
                  onClick={handlePause}
                >
                  {session.isPaused ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                      <span>Pause</span>
                    </>
                  )}
                </button>
              )}
              
              <button 
                className="btn-stop"
                onClick={handleStop}
                disabled={!session.isRunning}
                title="Stop"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </button>
              
              <button 
                className="btn-reset"
                onClick={handleReset}
                disabled={session.isRunning}
                title="Reset"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
            </div>
          </div>
        </section>
        
      </div>
    </div>
  );
}
