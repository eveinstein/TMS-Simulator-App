/**
 * App.jsx
 * =======
 * Main application component with tab navigation.
 * 
 * Modes:
 * - TMS Simulator: Protocol-based stimulation
 * - Motor Threshold Training (rMT): Training game
 */

import React, { useState, useCallback, useEffect } from 'react';
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
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 212, 255, 0.1) 100%)',
      border: '2px solid #00d4ff',
      borderRadius: '12px',
      padding: '16px 32px',
      zIndex: 100,
      textAlign: 'center',
      boxShadow: '0 0 30px rgba(0, 212, 255, 0.4), 0 4px 20px rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#00d4ff',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        marginBottom: '4px',
      }}>
        Target Acquired
      </div>
      <div style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#ffffff',
        textShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
      }}>
        {label}
      </div>
      {distance !== null && distance !== undefined && (
        <div style={{
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.7)',
          marginTop: '4px',
          fontFamily: 'monospace',
        }}>
          {distance.toFixed(1)} mm
        </div>
      )}
    </div>
  );
}

function App() {
  const { mode, setMode, selectedTargetKey, requestSnap, hoverTargetKey } = useTMSStore();
  const [showPopup, setShowPopup] = useState(null);
  
  const handleTargetClick = useCallback((name) => {
    console.log('[App] Target clicked:', name);
    // requestSnap always triggers via nonce - no need for clear-then-set
    requestSnap(name);
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
        <div className="panel-container">
          {mode === 'simulator' ? (
            <MachinePanel />
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
