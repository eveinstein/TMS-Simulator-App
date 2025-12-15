/**
 * TMS Simulator - Main Application
 * =================================
 * Production-quality 3D Transcranial Magnetic Stimulation Simulator
 * 
 * RADIOLOGIC CONVENTION (enforced throughout):
 * Patient LEFT = +X = viewer's RIGHT
 * Patient RIGHT = −X = viewer's LEFT
 * 
 * Features:
 * - 3D head model with interactive targets
 * - Surface-attached TMS coil with snap-to-target
 * - Real-time session timing with accurate pulse delivery
 * - Premium medical device UI
 * 
 * Architecture:
 * - React + Vite
 * - @react-three/fiber + drei for 3D
 * - Zustand for state management
 * - Modular component structure
 * 
 * @author TMS Clinical Simulation Team
 * @version 1.0.0
 */

import React from 'react';
import { TMSScene } from './components/3d/TMSScene';
import { ControlPanel } from './components/ui/ControlPanel';
import { TargetPopup } from './components/ui/TargetPopup';
import { useTMSStore } from './stores/tmsStore';
import './App.css';

function App() {
  const { selectTarget } = useTMSStore();
  
  const handleTargetClick = (targetName) => {
    selectTarget(targetName);
  };
  
  return (
    <div className="app">
      {/* 3D Scene Container */}
      <main className="scene-container">
        <TMSScene onTargetClick={handleTargetClick} />
        
        {/* Top header overlay */}
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">
              <span className="title-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l2 2" />
                </svg>
              </span>
              TMS Simulator
            </h1>
            <div className="header-badge">
              Educational Demo
            </div>
          </div>
        </header>
        
        {/* Instructions overlay */}
        <div className="instructions-overlay">
          <div className="instruction-item">
            <span className="instruction-key">Click</span>
            <span className="instruction-text">targets for info</span>
          </div>
          <div className="instruction-item">
            <span className="instruction-key">WASD</span>
            <span className="instruction-text">move coil</span>
          </div>
          <div className="instruction-item">
            <span className="instruction-key">Q/E</span>
            <span className="instruction-text">rotate coil</span>
          </div>
          <div className="instruction-item">
            <span className="instruction-key">Scroll</span>
            <span className="instruction-text">to zoom</span>
          </div>
          <div className="instruction-item">
            <span className="instruction-key">Right-drag</span>
            <span className="instruction-text">to orbit</span>
          </div>
        </div>
      </main>
      
      {/* Control Panel Sidebar */}
      <aside className="control-sidebar">
        <ControlPanel />
      </aside>
      
      {/* Target Popup Modal */}
      <TargetPopup />
    </div>
  );
}

export default App;

/**
 * EXTENSION POINT:
 * ================
 * To add a second major feature (e.g., neuronavigation mode, MEP recording,
 * multi-coil setup), create a new component folder and import here.
 * 
 * Example structure for future features:
 * - src/components/navigation/   - Neuronavigation components
 * - src/components/mep/          - MEP recording interface
 * - src/stores/navigationStore.js - Separate state for navigation
 * 
 * The modular architecture supports adding features without modifying
 * existing components significantly.
 */
