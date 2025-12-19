/**
 * MTDebugOverlay.jsx
 * ==================
 * Development-only debug overlay for MT Training mode.
 * Shows real-time values for distance, penalty, probability, etc.
 * 
 * Only renders in development mode (import.meta.env.DEV)
 */

import React from 'react';
import { useTMSStore, MT_CONSTANTS, calculateDistancePenalty, calculateApparentMT, calculateTwitchProbability } from '../../stores/tmsStore';

export function MTDebugOverlay() {
  // Only render in dev mode
  if (!import.meta.env.DEV) return null;
  
  const { rmt, currentCoilWorldPos, getCurrentDistanceMm, mode } = useTMSStore();
  
  // Only show in rMT mode during active trial
  if (mode !== 'rmt' || rmt.phase === 'idle') return null;
  
  // Compute real-time values
  const distMm = getCurrentDistanceMm();
  const trueMT = rmt.trueMT || 50;
  const intensity = rmt.intensity;
  const penalty = calculateDistancePenalty(distMm);
  const apparentMT = calculateApparentMT(trueMT, distMm);
  const probability = calculateTwitchProbability(intensity, apparentMT);
  
  // Format position arrays
  const formatPos = (pos) => {
    if (!pos) return 'null';
    if (Array.isArray(pos)) {
      return `[${pos.map(v => v.toFixed(4)).join(', ')}]`;
    }
    return `[${pos.x?.toFixed(4)}, ${pos.y?.toFixed(4)}, ${pos.z?.toFixed(4)}]`;
  };
  
  // Color coding for distance
  const distColor = distMm < 5 ? '#22c55e' : distMm < 15 ? '#f59e0b' : '#ef4444';
  
  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '320px',
      background: 'rgba(0, 0, 0, 0.9)',
      border: '1px solid #333',
      borderRadius: '8px',
      padding: '12px',
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#e0e0e0',
      zIndex: 1000,
      minWidth: '280px',
      pointerEvents: 'none',
    }}>
      <div style={{ 
        color: '#60a5fa', 
        fontWeight: 'bold', 
        marginBottom: '8px',
        borderBottom: '1px solid #444',
        paddingBottom: '4px',
      }}>
        🔬 MT Debug Overlay
      </div>
      
      {/* Trial Info */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ color: '#888', marginBottom: '2px' }}>Trial Info:</div>
        <div>Phase: <span style={{ color: '#fbbf24' }}>{rmt.phase}</span></div>
        <div>True MT: <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{trueMT.toFixed(1)}%</span></div>
        <div>Intensity: <span style={{ color: '#60a5fa' }}>{intensity}%</span></div>
      </div>
      
      {/* Position Info */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ color: '#888', marginBottom: '2px' }}>Positions (world):</div>
        <div style={{ fontSize: '10px' }}>
          Coil: <span style={{ color: '#a78bfa' }}>{formatPos(currentCoilWorldPos)}</span>
        </div>
        <div style={{ fontSize: '10px' }}>
          Hotspot: <span style={{ color: '#f472b6' }}>{formatPos(rmt.hotspotPosition)}</span>
        </div>
      </div>
      
      {/* Distance & Penalty */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ color: '#888', marginBottom: '2px' }}>Distance & Penalty:</div>
        <div>
          d = <span style={{ color: distColor, fontWeight: 'bold' }}>{distMm.toFixed(2)} mm</span>
        </div>
        <div>
          penalty(d) = <span style={{ color: '#f97316' }}>{penalty.toFixed(2)}%</span>
          <span style={{ color: '#666', marginLeft: '4px' }}>
            (Pmax={MT_CONSTANTS.Pmax}, σ={MT_CONSTANTS.sigma})
          </span>
        </div>
        <div>
          apparentMT = {trueMT.toFixed(1)} + {penalty.toFixed(2)} = 
          <span style={{ color: '#fb923c', fontWeight: 'bold' }}> {apparentMT.toFixed(2)}%</span>
        </div>
      </div>
      
      {/* Probability */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ color: '#888', marginBottom: '2px' }}>Twitch Probability:</div>
        <div>
          p = 1/(1 + exp(-({intensity} - {apparentMT.toFixed(1)})/{MT_CONSTANTS.k}))
        </div>
        <div>
          p = <span style={{ 
            color: probability > 0.5 ? '#22c55e' : probability > 0.2 ? '#fbbf24' : '#ef4444',
            fontWeight: 'bold',
            fontSize: '13px',
          }}>{(probability * 100).toFixed(1)}%</span>
        </div>
      </div>
      
      {/* Last Pulse Result */}
      {rmt.debugData && (
        <div style={{ 
          marginTop: '8px', 
          paddingTop: '8px', 
          borderTop: '1px solid #444',
        }}>
          <div style={{ color: '#888', marginBottom: '2px' }}>Last Pulse:</div>
          <div>
            Random: {rmt.debugData.randomDraw?.toFixed(4)} 
            {rmt.debugData.twitch ? 
              <span style={{ color: '#22c55e', marginLeft: '8px' }}>✓ TWITCH</span> : 
              <span style={{ color: '#ef4444', marginLeft: '8px' }}>✗ No twitch</span>
            }
          </div>
        </div>
      )}
      
      {/* Titration Stats */}
      {rmt.phase === 'titration' && (
        <div style={{ 
          marginTop: '8px', 
          paddingTop: '8px', 
          borderTop: '1px solid #444',
        }}>
          <div style={{ color: '#888', marginBottom: '2px' }}>Titration:</div>
          <div>
            Hits: <span style={{ color: '#22c55e' }}>{rmt.titrationHits}</span>
            / {rmt.titrationCount}
            <span style={{ color: '#666', marginLeft: '8px' }}>
              ({rmt.titrationCount > 0 ? ((rmt.titrationHits / rmt.titrationCount) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>
      )}
      
      {/* Completion Results */}
      {rmt.phase === 'complete' && rmt.completionResults && (
        <div style={{ 
          marginTop: '8px', 
          paddingTop: '8px', 
          borderTop: '1px solid #444',
          background: 'rgba(34, 197, 94, 0.1)',
          margin: '8px -12px -12px -12px',
          padding: '8px 12px 12px 12px',
          borderRadius: '0 0 8px 8px',
        }}>
          <div style={{ color: '#22c55e', marginBottom: '4px', fontWeight: 'bold' }}>
            Grade Results:
          </div>
          <div>User MT: {rmt.completionResults.userMT}%</div>
          <div>True MT: {rmt.completionResults.trueMT}%</div>
          <div>
            % Diff: <span style={{ 
              color: rmt.completionResults.grade === 'A' ? '#22c55e' : 
                     rmt.completionResults.grade === 'B' ? '#fbbf24' : '#ef4444'
            }}>{rmt.completionResults.percentDiff.toFixed(2)}%</span>
          </div>
          <div>
            Grade: <span style={{ 
              fontSize: '16px', 
              fontWeight: 'bold',
              color: rmt.completionResults.grade === 'A' ? '#22c55e' : 
                     rmt.completionResults.grade === 'B' ? '#fbbf24' : '#ef4444'
            }}>{rmt.completionResults.grade}</span>
          </div>
          <div>Final Distance: {rmt.completionResults.distance?.toFixed(2)} mm</div>
        </div>
      )}
    </div>
  );
}

export default MTDebugOverlay;
