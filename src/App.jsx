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

function App() {
  const { mode, setMode, selectedTargetKey, setSelectedTargetKey } = useTMSStore();
  const [showPopup, setShowPopup] = useState(null);
  
  const handleTargetClick = useCallback((name) => {
    console.log('[App] Target clicked:', name);
    // Clear first to allow re-snapping to same target
    if (selectedTargetKey === name) {
      setSelectedTargetKey(null);
      setTimeout(() => {
        setSelectedTargetKey(name);
        setShowPopup(name);
      }, 0);
    } else {
      setSelectedTargetKey(name);
      setShowPopup(name);
    }
  }, [selectedTargetKey, setSelectedTargetKey]);
  
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
