/**
 * TMSScene.jsx
 * ============
 * Main 3D scene container with head, coil, and UI overlays.
 * 
 * Features:
 * - Medical-grade lighting
 * - Distance to target display
 * - Camera controls with presets
 * - Hotspot visualization for MT mode
 */

import React, { useState, useCallback, useRef, useEffect, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { HeadModel } from './HeadModel';
import { TMSCoil } from './TMSCoil';
import { SceneErrorBoundary } from './SceneErrorBoundary';
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

// Target proximity indicator floating badge (no distance text)
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
      </div>
    </Html>
  );
}

// Hotspot marker for rMT mode - improved visibility with glow effect
function HotspotMarker({ position, revealed, headCenter }) {
  if (!position || !revealed) return null;
  
  // Compute surface normal (outward from head center)
  const normal = useMemo(() => {
    if (!headCenter) return new THREE.Vector3(0, 1, 0);
    const pos = Array.isArray(position) ? new THREE.Vector3(...position) : position;
    const center = Array.isArray(headCenter) ? new THREE.Vector3(...headCenter) : headCenter;
    return pos.clone().sub(center).normalize();
  }, [position, headCenter]);
  
  // Compute rotation quaternion to align disc with surface
  // Use the surface normal to orient the marker flat against the scalp
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0); // Disc faces +Y by default
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(up, normal);
    return quat;
  }, [normal]);
  
  // Position slightly offset from scalp surface to prevent z-fighting
  const offsetPosition = useMemo(() => {
    const pos = Array.isArray(position) ? new THREE.Vector3(...position) : position.clone();
    // Offset slightly along normal to sit just above scalp
    return pos.clone().addScaledVector(normal, 0.002);
  }, [position, normal]);
  
  const pos = [offsetPosition.x, offsetPosition.y, offsetPosition.z];
  
  // Smaller sizes for better appearance between coil and head
  const HOTSPOT_SIZE = {
    outerRing: { inner: 0.005, outer: 0.007 },
    middleRing: { inner: 0.003, outer: 0.004 },
    innerDisc: 0.0025,
    glowRing: { inner: 0.007, outer: 0.012 },
  };
  
  return (
    <group position={pos} quaternion={quaternion}>
      {/* Outer glow ring for visibility */}
      <mesh position={[0, 0.0001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[HOTSPOT_SIZE.glowRing.inner, HOTSPOT_SIZE.glowRing.outer, 48]} />
        <meshBasicMaterial 
          color="#ff3333" 
          transparent 
          opacity={0.25} 
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* Main outer ring */}
      <mesh position={[0, 0.0002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[HOTSPOT_SIZE.outerRing.inner, HOTSPOT_SIZE.outerRing.outer, 48]} />
        <meshBasicMaterial color="#ff4444" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Middle ring - white for contrast */}
      <mesh position={[0, 0.0003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[HOTSPOT_SIZE.middleRing.inner, HOTSPOT_SIZE.middleRing.outer, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Inner filled disc - bright center */}
      <mesh position={[0, 0.0004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[HOTSPOT_SIZE.innerDisc, 32]} />
        <meshBasicMaterial color="#ff6666" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Label - positioned above the marker along surface normal */}
      <Html position={[0, 0.018, 0]} center>
        <div style={{
          background: 'rgba(255, 50, 50, 0.95)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '3px',
          fontSize: '8px',
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
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
      case 'physician':
        // Physician POV: in +X and -Z relative to head, looking toward C3
        controls.object.position.set(0.25, 0.15, -0.1);
        controls.target.set(0.06, 0.08, 0);
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
  const [proxyMesh, setProxyMesh] = useState(null);
  const [coilPos, setCoilPos] = useState(null);
  const [nearestTarget, setNearestTarget] = useState({ name: null, distance: null });
  const [headCenter, setHeadCenter] = useState(null);
  const controlsRef = useRef();
  
  const { targetPositions, mode, rmt } = useTMSStore();
  
  // Build smooth proxy surface when headMesh and fiducials are ready
  useEffect(() => {
    if (!headMesh || !fiducials || proxyMesh) return;
    
    console.log('[TMSScene] Building smooth proxy surface...');
    
    try {
      const proxy = buildCoilProxySurface({
        headMesh,
        fiducials,
        latSegments: 48,
        lonSegments: 64,
        offsetMm: 2,
        smoothingIters: 8,
      });
      
      // Capture head center for hotspot orientation
      if (proxy.userData?.headCenter) {
        setHeadCenter(proxy.userData.headCenter);
      } else {
        headMesh.geometry.computeBoundingSphere();
        const sphere = headMesh.geometry.boundingSphere;
        if (sphere) {
          const center = sphere.center.clone();
          center.applyMatrix4(headMesh.matrixWorld);
          setHeadCenter(center);
        }
      }
      
      // Make proxy visible in dev mode for debugging
      if (import.meta.env.DEV) {
        proxy.visible = true;
        proxy.material.opacity = 0.1;
        proxy.material.wireframe = true;
      }
      
      setProxyMesh(proxy);
      console.log('[TMSScene] Proxy surface built successfully');
    } catch (err) {
      console.error('[TMSScene] Failed to build proxy surface:', err);
    }
  }, [headMesh, fiducials, proxyMesh]);
  
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
      
      {/* Proxy surface for smooth coil movement (visible in dev) */}
      {proxyMesh && <primitive object={proxyMesh} />}
      
      {/* TMS Coil - REQUIRES proxy mesh for smooth movement */}
      {proxyMesh && (
        <TMSCoil 
          proxyMesh={proxyMesh}
          fiducials={fiducials}
          onCoilMove={handleCoilMove}
        />
      )}
      
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
          headCenter={headCenter}
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

// Controls legend overlay - Polished minimal design
function SceneLegend() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div style={{
      position: 'absolute',
      bottom: '16px',
      left: '16px',
      background: 'rgba(12, 12, 16, 0.95)',
      color: 'rgba(240, 240, 245, 0.6)',
      borderRadius: '8px',
      fontSize: '10px',
      fontFamily: "'Inter', -apple-system, sans-serif",
      zIndex: 10,
      border: '1px solid rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      overflow: 'hidden',
      transition: 'all 0.2s ease-out',
      minWidth: isCollapsed ? '40px' : '160px',
    }}>
      {/* Header */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          cursor: 'pointer',
          borderBottom: isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <span style={{
          fontWeight: '600',
          color: 'rgba(0, 200, 240, 0.85)',
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          display: isCollapsed ? 'none' : 'block',
        }}>
          Controls
        </span>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{
            width: '12px',
            height: '12px',
            color: 'rgba(255, 255, 255, 0.4)',
            transform: isCollapsed ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      
      {/* Content */}
      {!isCollapsed && (
        <div style={{ padding: '8px 10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <ControlRow label="Move" keys={['W', 'A', 'S', 'D']} />
            <ControlRow label="Rotate" keys={['Q', 'E']} />
            <ControlRow label="Tilt" keys={['R', 'F']} />
            <ControlRow label="Drag" keys={['⇧', 'Drag']} />
            <ControlRow label="Fire" keys={['Space']} accent />
          </div>
        </div>
      )}
    </div>
  );
}

// Control row helper component
function ControlRow({ label, keys, accent }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
    }}>
      <span style={{ 
        color: accent ? 'rgba(0, 200, 240, 0.7)' : 'rgba(255, 255, 255, 0.4)',
        fontSize: '9px',
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: '2px' }}>
        {keys.map((key, i) => (
          <span 
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: key.length > 1 ? 'auto' : '18px',
              height: '18px',
              padding: '0 4px',
              background: accent ? 'rgba(0, 200, 240, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${accent ? 'rgba(0, 200, 240, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '3px',
              fontSize: '9px',
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
              fontWeight: '500',
              color: accent ? 'rgba(0, 200, 240, 0.9)' : 'rgba(255, 255, 255, 0.6)',
            }}
          >
            {key}
          </span>
        ))}
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
  
  // Set physician view by default in MT mode
  useEffect(() => {
    if (mode === 'rmt') {
      setCameraPreset('physician');
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
      <SceneErrorBoundary>
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
      </SceneErrorBoundary>
      
      {/* Camera preset buttons */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        gap: '4px',
        zIndex: 10,
      }}>
        {[
          { key: 'default', label: 'Front' },
          { key: 'physician', label: 'Side' },
          { key: 'top', label: 'Top' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setCameraPreset(key)}
            style={{
              padding: '5px 12px',
              background: cameraPreset === key ? '#141419' : 'rgba(8, 8, 12, 0.85)',
              color: cameraPreset === key ? '#00c8f0' : 'rgba(240, 240, 245, 0.5)',
              border: `1px solid ${cameraPreset === key ? 'rgba(0, 200, 240, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: '600',
              letterSpacing: '0.3px',
              transition: 'all 0.1s ease-out',
              backdropFilter: 'blur(8px)',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      
      <SceneLegend />
      <DebugOverlay coilPos={debugInfo.pos} coilNormal={debugInfo.normal} />
    </div>
  );
}
