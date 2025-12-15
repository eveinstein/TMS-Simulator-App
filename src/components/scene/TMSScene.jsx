/**
 * TMSScene.jsx
 * ============
 * Main 3D scene container with head, coil, and UI overlays.
 * 
 * Features:
 * - Medical-grade lighting
 * - Radiologic convention indicators
 * - Distance to target display
 * - Camera controls with presets
 * - Hotspot visualization for rMT mode
 */

import React, { useState, useCallback, useRef, useEffect, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { HeadModel } from './HeadModel';
import { TMSCoil } from './TMSCoil';
import { useTMSStore } from '../../stores/tmsStore';
import { buildCoilProxySurface } from '../../utils/coilSurfaceProxy';
import * as THREE from 'three';

// Loading fallback component for 3D scene
function LoadingFallback() {
  return (
    <Html center>
      <div style={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '20px 40px',
        borderRadius: '8px',
        fontSize: '16px',
        fontFamily: 'system-ui, sans-serif',
      }}>
        Loading 3D models...
      </div>
    </Html>
  );
}

// Axis indicator showing radiologic convention
function AxisIndicator() {
  return (
    <group position={[-0.15, -0.05, 0]}>
      {/* X axis - Patient Left */}
      <arrowHelper args={[
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0),
        0.03,
        0x22c55e, // Green for left
        0.008,
        0.006
      ]} />
      <Html position={[0.04, 0, 0]}>
        <span style={{ 
          color: '#22c55e', 
          fontSize: '10px', 
          fontWeight: 'bold',
          whiteSpace: 'nowrap' 
        }}>
          +X (L)
        </span>
      </Html>
      
      {/* Y axis */}
      <arrowHelper args={[
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 0),
        0.03,
        0x3b82f6,
        0.008,
        0.006
      ]} />
      <Html position={[0, 0.04, 0]}>
        <span style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold' }}>+Y</span>
      </Html>
      
      {/* Z axis */}
      <arrowHelper args={[
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, 0),
        0.03,
        0xf97316,
        0.008,
        0.006
      ]} />
      <Html position={[0, 0, 0.04]}>
        <span style={{ color: '#f97316', fontSize: '10px', fontWeight: 'bold' }}>+Z</span>
      </Html>
    </group>
  );
}

// Orientation badges on head
function OrientationGuide() {
  return (
    <>
      {/* Left side badge */}
      <Html position={[0.12, 0.08, 0]} center>
        <div style={{
          background: 'rgba(34, 197, 94, 0.9)',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
        }}>
          L
        </div>
      </Html>
      
      {/* Right side badge */}
      <Html position={[-0.12, 0.08, 0]} center>
        <div style={{
          background: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
        }}>
          R
        </div>
      </Html>
    </>
  );
}

// Distance indicator floating badge
function DistanceIndicator({ position, targetName, distance }) {
  if (!position || distance === null) return null;
  
  const isClose = distance < 5;
  const color = isClose ? '#22c55e' : '#f97316';
  
  return (
    <Html position={[position.x, position.y + 0.04, position.z]} center>
      <div style={{
        background: `rgba(0, 0, 0, 0.85)`,
        border: `2px solid ${color}`,
        color: 'white',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        boxShadow: `0 0 10px ${color}40`,
      }}>
        <div style={{ fontWeight: 'bold', color }}>{targetName}</div>
        <div>{distance.toFixed(1)} mm</div>
      </div>
    </Html>
  );
}

// Hotspot marker for rMT mode
function HotspotMarker({ position, revealed }) {
  if (!position || !revealed) return null;
  
  return (
    <group position={position}>
      {/* Crosshair */}
      <mesh>
        <ringGeometry args={[0.008, 0.01, 32]} />
        <meshBasicMaterial color="#ff0000" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Inner circle */}
      <mesh>
        <circleGeometry args={[0.003, 32]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Label */}
      <Html position={[0, 0.02, 0]} center>
        <div style={{
          background: 'rgba(255, 0, 0, 0.9)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 'bold',
        }}>
          HOTSPOT
        </div>
      </Html>
    </group>
  );
}

// Camera presets
function CameraController({ controlsRef, preset }) {
  useEffect(() => {
    if (!controlsRef.current) return;
    
    const controls = controlsRef.current;
    
    switch (preset) {
      case 'clinician':
        // Behind patient, looking at left side (C3 visible)
        controls.object.position.set(0.2, 0.12, 0.15);
        controls.target.set(0.05, 0.08, 0);
        break;
      case 'front':
        controls.object.position.set(0, 0.1, 0.35);
        controls.target.set(0, 0.08, 0);
        break;
      case 'top':
        controls.object.position.set(0, 0.4, 0);
        controls.target.set(0, 0.08, 0);
        break;
      default:
        controls.object.position.set(0, 0.12, 0.35);
        controls.target.set(0, 0.08, 0);
    }
    
    controls.update();
  }, [preset, controlsRef]);
  
  return null;
}

// Main scene content
function SceneContent({ 
  onTargetClick, 
  selectedTarget,
  cameraPreset,
  onCoilUpdate,
}) {
  const [headMesh, setHeadMesh] = useState(null);
  const [fiducials, setFiducials] = useState(null);
  const [coilSurfaceMesh, setCoilSurfaceMesh] = useState(null);
  const [coilPos, setCoilPos] = useState(null);
  const [nearestTarget, setNearestTarget] = useState({ name: null, distance: null });
  const controlsRef = useRef();
  
  const { targetPositions, mode, rmt } = useTMSStore();
  
  // Build proxy surface when headMesh and fiducials are both ready
  useEffect(() => {
    if (headMesh && fiducials && !coilSurfaceMesh) {
      if (import.meta.env.DEV) {
        console.log('[TMSScene] Building coil proxy surface...');
      }
      
      const proxy = buildCoilProxySurface({
        headMesh,
        fiducials,
        latSegments: 48,
        lonSegments: 64,
        offsetMm: 2,
        smoothingIters: 8,
      });
      
      setCoilSurfaceMesh(proxy);
    }
  }, [headMesh, fiducials, coilSurfaceMesh]);
  
  // Calculate nearest target when coil moves
  const handleCoilMove = useCallback((position, normal) => {
    setCoilPos(position.clone());
    
    // Pass to parent for debug overlay
    onCoilUpdate?.(position.clone(), normal?.clone());
    
    if (!targetPositions) return;
    
    let nearest = { name: null, distance: Infinity };
    
    for (const [name, targetPos] of Object.entries(targetPositions)) {
      const dist = position.distanceTo(targetPos) * 1000; // Convert to mm
      if (dist < nearest.distance) {
        nearest = { name, distance: dist };
      }
    }
    
    if (nearest.distance < 50) { // Only show if within 50mm
      setNearestTarget(nearest);
    } else {
      setNearestTarget({ name: null, distance: null });
    }
  }, [targetPositions, onCoilUpdate]);
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />
      <directionalLight position={[0, 5, -5]} intensity={0.3} />
      <directionalLight position={[0, -5, 0]} intensity={0.2} />
      
      {/* Environment for reflections */}
      <Environment preset="studio" />
      
      {/* Head model */}
      <HeadModel 
        onHeadMeshReady={setHeadMesh}
        onFiducialsReady={setFiducials}
        onTargetClick={onTargetClick}
        selectedTarget={selectedTarget}
      />
      
      {/* Coil proxy surface (invisible in prod, wireframe in dev) */}
      {coilSurfaceMesh && <primitive object={coilSurfaceMesh} />}
      
      {/* TMS Coil - uses proxy surface for smooth movement */}
      <TMSCoil 
        headMesh={headMesh}
        coilSurfaceMesh={coilSurfaceMesh}
        onCoilMove={handleCoilMove}
      />
      
      {/* UI Overlays */}
      <AxisIndicator />
      <OrientationGuide />
      
      {/* Distance indicator */}
      {coilPos && nearestTarget.name && (
        <DistanceIndicator 
          position={coilPos}
          targetName={nearestTarget.name}
          distance={nearestTarget.distance}
        />
      )}
      
      {/* Hotspot marker for rMT mode */}
      {mode === 'rmt' && rmt.hotspotPosition && (
        <HotspotMarker 
          position={rmt.hotspotPosition}
          revealed={rmt.hotspotRevealed}
        />
      )}
      
      {/* Camera controls */}
      <OrbitControls 
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={0.1}
        maxDistance={1}
        maxPolarAngle={Math.PI * 0.9}
      />
      
      <CameraController controlsRef={controlsRef} preset={cameraPreset} />
    </>
  );
}

// Legend overlay
function SceneLegend() {
  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.85)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'system-ui, sans-serif',
      zIndex: 10,
      maxWidth: '220px',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#60a5fa' }}>
        Radiologic Convention
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ color: '#22c55e', fontWeight: 'bold' }}>L</span>
        <span>= Patient Left = +X</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>R</span>
        <span>= Patient Right = -X</span>
      </div>
      
      <div style={{ borderTop: '1px solid #333', paddingTop: '8px', marginTop: '8px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#60a5fa' }}>Controls</div>
        <div>WASD / Arrows: Move coil</div>
        <div>Q / E: Yaw rotation</div>
        <div>R / F: Pitch tilt (±30°)</div>
        <div>Space: Fire pulse (rMT)</div>
        <div>Drag: Reposition coil</div>
      </div>
    </div>
  );
}

// Dev-only debug overlay showing coil position and surface normal
function DebugOverlay({ coilPos, coilNormal }) {
  if (!import.meta.env.DEV || !coilPos) return null;
  
  return (
    <div style={{
      position: 'absolute',
      top: '60px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.85)',
      color: '#22c55e',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '10px',
      fontFamily: 'monospace',
      zIndex: 10,
      opacity: 0.9,
    }}>
      <div style={{ marginBottom: '4px', color: '#60a5fa', fontWeight: 'bold' }}>Debug Info</div>
      <div>Pos: ({coilPos.x.toFixed(3)}, {coilPos.y.toFixed(3)}, {coilPos.z.toFixed(3)})</div>
      {coilNormal && (
        <div>Nrm: ({coilNormal.x.toFixed(3)}, {coilNormal.y.toFixed(3)}, {coilNormal.z.toFixed(3)})</div>
      )}
    </div>
  );
}

// Main exported component
export function TMSScene({ onTargetClick, selectedTarget }) {
  const [cameraPreset, setCameraPreset] = useState('default');
  const [debugInfo, setDebugInfo] = useState({ pos: null, normal: null });
  const { mode } = useTMSStore();
  
  // Set clinician view by default in rMT mode
  useEffect(() => {
    if (mode === 'rmt') {
      setCameraPreset('clinician');
    } else {
      setCameraPreset('default');
    }
  }, [mode]);
  
  // Handle coil updates for debug overlay
  const handleCoilUpdate = useCallback((pos, normal) => {
    setDebugInfo({ pos, normal });
  }, []);
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ 
          position: [0, 0.12, 0.35], 
          fov: 45,
          near: 0.001,
          far: 10,
        }}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}
        onCreated={({ gl }) => {
          // Log WebGL context creation for debugging
          if (import.meta.env.DEV) {
            console.log('[TMSScene] WebGL context created');
          }
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent 
            onTargetClick={onTargetClick}
            selectedTarget={selectedTarget}
            cameraPreset={cameraPreset}
            onCoilUpdate={handleCoilUpdate}
          />
        </Suspense>
      </Canvas>
      
      {/* Camera preset buttons */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        gap: '8px',
        zIndex: 10,
      }}>
        <button
          onClick={() => setCameraPreset('default')}
          style={{
            padding: '6px 12px',
            background: cameraPreset === 'default' ? '#3b82f6' : 'rgba(0,0,0,0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Front
        </button>
        <button
          onClick={() => setCameraPreset('clinician')}
          style={{
            padding: '6px 12px',
            background: cameraPreset === 'clinician' ? '#3b82f6' : 'rgba(0,0,0,0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Clinician
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          style={{
            padding: '6px 12px',
            background: cameraPreset === 'top' ? '#3b82f6' : 'rgba(0,0,0,0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Top
        </button>
      </div>
      
      <SceneLegend />
      <DebugOverlay coilPos={debugInfo.pos} coilNormal={debugInfo.normal} />
    </div>
  );
}
