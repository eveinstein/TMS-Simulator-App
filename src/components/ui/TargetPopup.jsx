/**
 * Target Popup Component
 * ======================
 * Educational micro-overlays for TMS targets and fiducials.
 * Shows clinical meanings, brain targets, and common uses.
 */

import React, { useEffect, useRef } from 'react';
import { useTMSStore, TARGET_INFO } from '../../stores/tmsStore';
import './TargetPopup.css';

export function TargetPopup() {
  const { showPopup, popupTarget, closePopup, lockCoilToTarget, isCoilLocked, lockedTarget } = useTMSStore();
  const popupRef = useRef(null);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        closePopup();
      }
    };
    
    if (showPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPopup, closePopup]);
  
  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') closePopup();
    };
    
    if (showPopup) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showPopup, closePopup]);
  
  if (!showPopup || !popupTarget) return null;
  
  const info = TARGET_INFO[popupTarget];
  if (!info) return null;
  
  const isFiducial = info.brainTarget === 'N/A - Anatomical Landmark';
  const isTarget = !isFiducial;
  const isCurrentlyLocked = isCoilLocked && lockedTarget === popupTarget;
  
  return (
    <div className="popup-overlay">
      <div className="target-popup" ref={popupRef}>
        {/* Header */}
        <div className="popup-header">
          <div className="popup-badge">
            {isFiducial ? (
              <span className="badge fiducial">Fiducial</span>
            ) : (
              <span className="badge target">TMS Target</span>
            )}
          </div>
          <button className="popup-close" onClick={closePopup}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Title */}
        <div className="popup-title">
          <h2>{info.name}</h2>
          <span className="full-name">{info.fullName}</span>
        </div>
        
        {/* Brain Target */}
        <div className="popup-section brain-target">
          <div className="section-label">
            {isFiducial ? 'Role' : 'Underlying Brain Target'}
          </div>
          <div className="section-value">{info.brainTarget}</div>
        </div>
        
        {/* Clinical Meaning */}
        <div className="popup-section">
          <div className="section-label">Clinical Meaning</div>
          <p className="section-text">{info.clinicalMeaning}</p>
        </div>
        
        {/* Beam F3 Method (only for F3) */}
        {popupTarget === 'F3' && info.beamF3Method && (
          <div className="popup-section beam-f3">
            <div className="section-label">
              <span className="beam-icon">📏</span>
              Beam F3 Method
            </div>
            <p className="section-text">{info.beamF3Method}</p>
          </div>
        )}
        
        {/* SMA Calculation (only for SMA) */}
        {popupTarget === 'SMA' && info.calculation && (
          <div className="popup-section calculation">
            <div className="section-label">
              <span className="calc-icon">📐</span>
              Position Calculation
            </div>
            <p className="section-text">{info.calculation}</p>
          </div>
        )}
        
        {/* Common Use */}
        {info.commonUse && (
          <div className="popup-section">
            <div className="section-label">Common Clinical Uses</div>
            <p className="section-text muted">{info.commonUse}</p>
          </div>
        )}
        
        {/* Coordinate Convention */}
        {info.convention && (
          <div className="popup-section convention">
            <div className="section-label">Coordinate Convention</div>
            <code className="convention-code">{info.convention}</code>
          </div>
        )}
        
        {/* Actions (only for targets) */}
        {isTarget && (
          <div className="popup-actions">
            {isCurrentlyLocked ? (
              <div className="locked-status">
                <span className="lock-icon">🔒</span>
                Coil locked to {popupTarget}
              </div>
            ) : (
              <button 
                className="snap-btn"
                onClick={() => {
                  lockCoilToTarget(popupTarget);
                  closePopup();
                }}
              >
                <span className="snap-icon">⎯⊕</span>
                Snap &amp; Lock Coil to {popupTarget}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
