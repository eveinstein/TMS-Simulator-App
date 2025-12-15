/**
 * TMSCoil.jsx
 * ===========
 * TMS coil with surface-following movement.
 * 
 * Features:
 * - Auto-normalization to 0.18m world size
 * - WASD/Arrow keys for scalp-constrained tangential movement
 * - Q/E for yaw rotation (around surface normal)
 * - R/F for pitch adjustment (tilt, clamped ±30°)
 * - Mouse drag to reposition
 * - Spacebar pulse firing in rMT mode
 * - Animated pulse rings during stimulation
 * 
 * COORDINATE SYSTEM (Radiologic Convention):
 * - +X = Patient Left
 * - Movement is always tangent to scalp surface
 */

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useTMSStore } from '../../stores/tmsStore';
import { normalizeModelScale } from '../../utils/scaleNormalization';
import { 
  ScalpSurface, 
  keysToMoveDirection, 
  calculateCoilOrientation,
  clampPitch,
  MOVEMENT_CONFIG 
} from '../../utils/surfaceMovement';
import * as THREE from 'three';

// Pulse ring animation component
function PulseRings({ active, position }) {
  const ringsRef = useRef([]);
  const [rings, setRings] = React.useState([]);
  
  useEffect(() => {
    if (!active) {
      setRings([]);
      return;
    }
    
    // Create new ring on each pulse
    const interval = setInterval(() => {
      const id = Date.now();
      setRings(prev => [...prev.slice(-5), { id, scale: 1, opacity: 1 }]);
    }, 100);
    
    return () => clearInterval(interval);
  }, [active]);
  
  useFrame((_, delta) => {
    setRings(prev => 
      prev
        .map(ring => ({
          ...ring,
          scale: ring.scale + delta * 8,
          opacity: Math.max(0, ring.opacity - delta * 3),
        }))
        .filter(ring => ring.opacity > 0)
    );
  });
  
  if (!position) return null;
  
  return (
    <group position={position}>
      {rings.map(ring => (
        <mesh key={ring.id} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.01 * ring.scale, 0.012 * ring.scale, 32]} />
          <meshBasicMaterial 
            color="#00ffff" 
            transparent 
            opacity={ring.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export function TMSCoil({ headMesh, onCoilMove }) {
  const groupRef = useRef();
  const coilRef = useRef();
  const scalpSurfaceRef = useRef(null);
  
  // Key state tracking - lowercase key names matching e.key.toLowerCase()
  const keysRef = useRef({
    w: false, a: false, s: false, d: false,
    arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
    q: false, e: false,
    r: false, f: false, // Pitch controls
  });
  
  // Coil state - position, normal, yaw, pitch
  const coilStateRef = useRef({
    position: new THREE.Vector3(0.05, 0.12, 0.05),
    normal: new THREE.Vector3(0, 1, 0),
    yaw: 0,
    pitch: 0,
  });
  
  const { camera } = useThree();
  const { gltf } = useGLTF('/models/coil.glb');
  
  const {
    coilPosition,
    coilRotation,
    isCoilLocked,
    setCoilPosition,
    setCoilRotation,
    mode,
    session,
    rmt,
    firePulse,
  } = useTMSStore();
  
  // Clone and process the coil model
  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    normalizeModelScale(clone, 'coil', true);
    return clone;
  }, [gltf]);
  
  // Initialize scalp surface when head mesh is ready
  useEffect(() => {
    if (headMesh && !scalpSurfaceRef.current) {
      scalpSurfaceRef.current = new ScalpSurface(headMesh);
      
      if (import.meta.env.DEV) {
        console.log('[TMSCoil] ScalpSurface initialized');
      }
      
      // Initial snap to surface
      const initial = scalpSurfaceRef.current.findClosestSurfacePoint(
        coilStateRef.current.position
      );
      if (initial) {
        coilStateRef.current.position.copy(initial.point);
        coilStateRef.current.position.add(
          initial.normal.clone().multiplyScalar(MOVEMENT_CONFIG.scalpOffset)
        );
        coilStateRef.current.normal.copy(initial.normal);
        updateCoilTransform();
      }
    }
  }, [headMesh]);
  
  // Update store and trigger callbacks - now uses quaternion directly
  const updateCoilTransform = useCallback(() => {
    const state = coilStateRef.current;
    const quaternion = calculateCoilOrientation(state.normal, state.yaw, state.pitch);
    
    setCoilPosition([state.position.x, state.position.y, state.position.z]);
    setCoilRotation([quaternion.x, quaternion.y, quaternion.z, quaternion.w]);
    
    onCoilMove?.(state.position, state.normal);
  }, [setCoilPosition, setCoilRotation, onCoilMove]);
  
  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      
      // Check if this key is tracked
      if (key in keysRef.current) {
        keysRef.current[key] = true;
        e.preventDefault();
      }
      
      // Spacebar fires pulse in rMT mode
      if (e.code === 'Space' && mode === 'rmt' && 
          (rmt.phase === 'hunt' || rmt.phase === 'titration')) {
        e.preventDefault();
        // Calculate distance to hotspot
        if (rmt.hotspotPosition) {
          const hotspot = new THREE.Vector3(...rmt.hotspotPosition);
          const distance = coilStateRef.current.position.distanceTo(hotspot) * 1000; // mm
          firePulse(distance);
        }
      }
    };
    
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key in keysRef.current) {
        keysRef.current[key] = false;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Cleanup - also reset all keys to prevent stuck keys
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      // Reset all keys on unmount
      Object.keys(keysRef.current).forEach(k => keysRef.current[k] = false);
    };
  }, [mode, rmt.phase, rmt.hotspotPosition, firePulse]);
  
  // Frame update for movement
  useFrame(() => {
    if (isCoilLocked || !scalpSurfaceRef.current) return;
    
    const keys = keysRef.current;
    const state = coilStateRef.current;
    let moved = false;
    
    // Get movement direction from WASD/arrow keys
    const moveDir = keysToMoveDirection(keys, camera);
    
    if (moveDir.lengthSq() > 0) {
      // Move along scalp surface
      const result = scalpSurfaceRef.current.moveAlongSurface(
        state.position,
        moveDir,
        MOVEMENT_CONFIG.moveSpeed
      );
      
      if (result) {
        state.position.copy(result.position);
        state.normal.copy(result.normal);
        moved = true;
      }
    }
    
    // Yaw rotation with Q/E
    if (keys.q) {
      state.yaw -= MOVEMENT_CONFIG.rotateSpeed;
      moved = true;
    }
    if (keys.e) {
      state.yaw += MOVEMENT_CONFIG.rotateSpeed;
      moved = true;
    }
    
    // Pitch adjustment with R/F (clamped)
    if (keys.r) {
      state.pitch = clampPitch(state.pitch + MOVEMENT_CONFIG.pitchSpeed);
      moved = true;
    }
    if (keys.f) {
      state.pitch = clampPitch(state.pitch - MOVEMENT_CONFIG.pitchSpeed);
      moved = true;
    }
    
    if (moved) {
      updateCoilTransform();
    }
  });
  
  // Sync visual position with store
  useEffect(() => {
    if (groupRef.current && coilPosition) {
      groupRef.current.position.set(...coilPosition);
    }
  }, [coilPosition]);
  
  useEffect(() => {
    if (groupRef.current && coilRotation) {
      groupRef.current.quaternion.set(...coilRotation);
    }
  }, [coilRotation]);
  
  // Mouse drag handler
  const handlePointerDown = useCallback((e) => {
    if (isCoilLocked) return;
    e.stopPropagation();
    
    const onPointerMove = (moveEvent) => {
      if (!scalpSurfaceRef.current) return;
      
      // Raycast from mouse to find new position on scalp
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(
        (moveEvent.clientX / window.innerWidth) * 2 - 1,
        -(moveEvent.clientY / window.innerHeight) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      
      const result = scalpSurfaceRef.current.raycastToSurface(raycaster);
      if (result) {
        // Apply offset above surface
        coilStateRef.current.position.copy(result.point).add(
          result.normal.clone().multiplyScalar(MOVEMENT_CONFIG.scalpOffset)
        );
        coilStateRef.current.normal.copy(result.normal);
        updateCoilTransform();
      }
    };
    
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [camera, isCoilLocked, updateCoilTransform]);
  
  // Determine if pulse animation should be active
  const isPulsing = session.isRunning && !session.isPaused;
  
  return (
    <group ref={groupRef}>
      <primitive 
        ref={coilRef}
        object={clonedScene} 
        onPointerDown={handlePointerDown}
      />
      
      {/* Pulse animation */}
      <PulseRings 
        active={isPulsing} 
        position={[0, -MOVEMENT_CONFIG.scalpOffset, 0]} 
      />
      
      {/* Lock indicator */}
      {isCoilLocked && (
        <mesh position={[0, 0.03, 0]}>
          <sphereGeometry args={[0.003, 8, 8]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      )}
    </group>
  );
}

useGLTF.preload('/models/coil.glb');
