/**
 * App.jsx
 * =======
 * Main application component with tab navigation.
 * 
 * Modes:
 * - TMS Simulator: Protocol-based stimulation
 * - Motor Threshold Training (rMT): Training game
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TMSScene } from './components/scene/TMSScene';
import { MachinePanel } from './components/ui/MachinePanel';
import { RMTPanel } from './components/ui/RMTPanel';
import { useTMSStore } from './stores/tmsStore';
import { getScaleData } from './utils/scaleNormalization';
import './App.css';

// Target info popup component
function TargetPopup({ target, onClose }) {
  if (!target) return null;
  
  const targetInfo = {
    // EEG targets
    F3: {
      title: 'Left DLPFC (F3)',
      description: 'Left dorsolateral prefrontal cortex - Primary target for depression treatment.',
      note: 'The Beam F3 method uses a tape measure from nasion to locate this region without neuronavigation.',
    },
    F4: {
      title: 'Right DLPFC (F4)',
      description: 'Right dorsolateral prefrontal cortex.',
    },
    FP2: {
      title: 'Right OFC (FP2)',
      description: 'Right orbitofrontal cortex.',
    },
    C3: {
      title: 'Left Motor (C3)',
      description: 'Left primary motor cortex - Used for motor threshold determination.',
    },
    SMA: {
      title: 'Supplementary Motor Area',
      description: 'Involved in motor planning and coordination.',
    },
    // Fiducials
    Nasion: {
      title: 'Nasion',
      description: 'The intersection of the frontal and nasal bones at the bridge of the nose. A key anatomical landmark for EEG electrode positioning.',
    },
    Inion: {
      title: 'Inion',
      description: 'The most prominent point of the external occipital protuberance at the back of the skull.',
    },
    LPA: {
      title: 'Left Preauricular Point',
      description: 'The point just anterior to the left ear canal, used as a lateral reference for head measurements.',
    },
    RPA: {
      title: 'Right Preauricular Point', 
      description: 'The point just anterior to the right ear canal, used as a lateral reference for head measurements.',
    },
  };
  
  const info = targetInfo[target] || { title: target, description: '' };
  
  return (
    <div className="target-popup-overlay" onClick={onClose}>
      <div className="target-popup" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>×</button>
        <h3>{info.title}</h3>
        <p>{info.description}</p>
        {info.note && <p className="popup-note">{info.note}</p>}
      </div>
    </div>
  );
}

// Dev tools panel
function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [scaleData, setScaleData] = useState({});
  const { coilPosition, coilRotation, targetPositions, protocol, session, rmt, mode } = useTMSStore();
  
  // Update scale data when panel opens
  useEffect(() => {
    if (isOpen) {
      setScaleData(getScaleData());
    }
  }, [isOpen]);
  
  if (!isOpen) {
    return (
      <button 
        className="dev-toggle"
        onClick={() => setIsOpen(true)}
        title="Open Developer Tools"
      >
        🛠️ Dev
      </button>
    );
  }
  
  return (
    <div className="dev-panel">
      <button className="dev-close" onClick={() => setIsOpen(false)}>×</button>
      <h4>Dev Tools</h4>
      
      <div className="dev-section">
        <strong>Mode</strong>
        <pre>{mode}</pre>
      </div>
      
      <div className="dev-section">
        <strong>Coil Position</strong>
        <pre>{coilPosition ? 
          `X: ${coilPosition[0].toFixed(4)}
Y: ${coilPosition[1].toFixed(4)}
Z: ${coilPosition[2].toFixed(4)}` : 'Not set'}</pre>
      </div>
      
      <div className="dev-section">
        <strong>Coil Rotation (Quat)</strong>
        <pre>{coilRotation ? 
          `X: ${coilRotation[0].toFixed(4)}
Y: ${coilRotation[1].toFixed(4)}
Z: ${coilRotation[2].toFixed(4)}
W: ${coilRotation[3].toFixed(4)}` : 'Not set'}</pre>
      </div>
      
      <div className="dev-section">
        <strong>Scale Data</strong>
        <pre>{Object.keys(scaleData).length > 0 ? 
          Object.entries(scaleData).map(([k, v]) => 
            `${k}: scale=${v.scaleFactor.toFixed(4)}, target=${v.targetSize}m`
          ).join('\n') : 'No models loaded yet'}</pre>
      </div>
      
      <div className="dev-section">
        <strong>Targets Found</strong>
        <pre>{targetPositions ? Object.keys(targetPositions).join(', ') : 'None'}</pre>
      </div>
      
      {mode === 'rmt' && (
        <div className="dev-section">
          <strong>rMT State</strong>
          <pre>{JSON.stringify({
            phase: rmt.phase,
            trial: rmt.trialNumber,
            intensity: rmt.intensity,
            trueMT: rmt.trueMT ? Math.round(rmt.trueMT) : null,
            distToHotspot: rmt.distanceToHotspot?.toFixed(1),
            titration: `${rmt.titrationHits}/${rmt.titrationCount}`,
          }, null, 2)}</pre>
        </div>
      )}
      
      {mode === 'simulator' && (
        <>
          <div className="dev-section">
            <strong>Protocol</strong>
            <pre>{JSON.stringify(protocol, null, 2)}</pre>
          </div>
          
          <div className="dev-section">
            <strong>Session</strong>
            <pre>{JSON.stringify(session, null, 2)}</pre>
          </div>
        </>
      )}
    </div>
  );
}

// Target proximity indicator - shows when coil is near an EEG target
function TargetProximityIndicator({ target, distance }) {
  if (!target) return null;
  
  const targetLabels = {
    F3: 'F3 - Left DLPFC',
    F4: 'F4 - Right DLPFC',
    FP2: 'FP2 - Right OFC',
    C3: 'C3 - Left Motor',
    SMA: 'SMA - Supplementary Motor',
  };
  
  const label = targetLabels[target] || target;
  
  return (
    <div style={{
      position: 'absolute',
      top: '72px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(8, 8, 12, 0.95)',
      border: '1px solid rgba(0, 200, 240, 0.4)',
      borderRadius: '8px',
      padding: '12px 24px',
      zIndex: 100,
      textAlign: 'center',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(12px)',
      animation: 'fadeIn 0.15s ease-out',
    }}>
      <div style={{
        fontSize: '9px',
        fontWeight: '700',
        color: '#00c8f0',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: '4px',
      }}>
        Target Localized
      </div>
      <div style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#f0f0f5',
      }}>
        {label}
      </div>
    </div>
  );
}

function App() {
  const { mode, setMode, selectedTargetKey, requestSnap, hoverTargetKey } = useTMSStore();
  const [showPopup, setShowPopup] = useState(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const prevModeRef = useRef(mode);
  
  // Fiducial names that should NOT trigger snapping
  const FIDUCIAL_NAMES = ['Nasion', 'Inion', 'LPA', 'RPA'];
  
  // Task 11: Auto-snap to C3 when entering MT mode
  useEffect(() => {
    if (mode === 'rmt' && prevModeRef.current !== 'rmt') {
      // Entering MT mode - snap to C3 (without locking)
      requestSnap('C3');
      console.log('[App] Entering MT mode - auto-snapping to C3');
    }
    prevModeRef.current = mode;
  }, [mode, requestSnap]);
  
  const handleTargetClick = useCallback((name) => {
    console.log('[App] Target clicked:', name);
    
    // Only snap for EEG targets, not fiducials
    if (!FIDUCIAL_NAMES.includes(name)) {
      requestSnap(name);
    }
    
    // Show popup for both targets and fiducials
    setShowPopup(name);
  }, [requestSnap]);
  
  const handleClosePopup = useCallback(() => {
    setShowPopup(null);
  }, []);
  
  return (
    <div className="app">
      {/* Header with navigation */}
      <header className="app-header">
        <div className="app-title">
          <span className="app-logo">⚡</span>
          TMS Simulator
        </div>
        
        <nav className="app-nav">
          <button
            className={`nav-tab ${mode === 'simulator' ? 'active' : ''}`}
            onClick={() => setMode('simulator')}
          >
            TMS Simulator
          </button>
          <button
            className={`nav-tab ${mode === 'rmt' ? 'active' : ''}`}
            onClick={() => setMode('rmt')}
          >
            Motor Threshold Training
          </button>
        </nav>
        
        <div className="app-header-spacer" />
      </header>
      
      {/* Main content */}
      <main className="app-main">
        {/* 3D Scene */}
        <div className="scene-container">
          <TMSScene 
            onTargetClick={handleTargetClick}
            selectedTarget={selectedTargetKey}
          />
          
          {/* Proximity indicator overlay - uses hoverTargetKey from store */}
          <TargetProximityIndicator 
            target={hoverTargetKey} 
            distance={null} 
          />
        </div>
        
        {/* Control Panel */}
        <div className={`panel-container ${isPanelExpanded ? 'expanded' : ''}`}>
          {mode === 'simulator' ? (
            <MachinePanel 
              isExpanded={isPanelExpanded}
              onToggleExpand={() => setIsPanelExpanded(v => !v)}
            />
          ) : (
            <RMTPanel />
          )}
        </div>
      </main>
      
      {/* Target popup */}
      <TargetPopup target={showPopup} onClose={handleClosePopup} />
      
      {/* Dev tools */}
      <DevTools />
    </div>
  );
}

export default App;
