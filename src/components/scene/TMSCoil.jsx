/**
 * TMSCoil.jsx
 * ===========
 * TMS coil component with surface-constrained movement.
 * 
 * Features:
 * - WASD/Arrow keys for movement along scalp
 * - Q/E for yaw rotation around surface normal
 * - R/F for pitch tilt
 * - Shift+drag to reposition with mouse
 * - Snap-to-target on selection
 * - Reset to Cz (center) position
 * 
 * IMPORTANT: This component REQUIRES the proxy mesh for smooth movement.
 * It will wait for proxyMesh prop before initializing.
 */

import React, { useRef, useMemo, useEffect, useCallback, useState } from 'react';
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

// Debug flag - enables verbose logging
const DEBUG_COIL = false;

/**
 * Normalize coil pivot so contact surface is at local origin
 */
function normalizeCoilPivot(scene) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  
  // Move pivot to bottom center (contact surface)
  scene.position.y = -center.y + size.y / 2;
  
  return { thickness: size.z };
}

/**
 * Validate coil dimensions are reasonable
 */
function validateCoilScale(scene) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  
  if (maxDim < 0.01 || maxDim > 0.5) {
    console.warn('[TMSCoil] Unusual dimensions:', maxDim.toFixed(4), 'm');
  }
  
  return maxDim;
}

export function TMSCoil({ proxyMesh, onCoilMove }) {
  const groupRef = useRef();
  const scalpSurfaceRef = useRef(null);
  
  // State
  const [isReady, setIsReady] = useState(false);
  const [effectiveOffset, setEffectiveOffset] = useState(MOVEMENT_CONFIG.scalpOffset);
  
  // Refs for mutable state (avoid re-renders)
  const keysRef = useRef({
    w: false, a: false, s: false, d: false,
    arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
    q: false, e: false,
    r: false, f: false,
  });
  
  const coilStateRef = useRef({
    position: new THREE.Vector3(0, 0.15, 0),
    normal: new THREE.Vector3(0, 1, 0),
    yaw: 0,
    pitch: 0,
  });
  
  // Snap guard - prevents re-entrancy
  const snappingRef = useRef(false);
  const lastSnapNonceRef = useRef(0);
  
  // Proximity tracking with hysteresis
  const lastHoverTargetRef = useRef(null);
  const PROXIMITY_ENTER = 0.015; // 15mm - enter zone
  const PROXIMITY_EXIT = 0.020;  // 20mm - exit zone (hysteresis)
  
  // Three.js context
  const { camera, gl } = useThree();
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/coil.glb`);
  
  // Store selectors
  const coilPosition = useTMSStore(s => s.coilPosition);
  const coilRotation = useTMSStore(s => s.coilRotation);
  const isCoilLocked = useTMSStore(s => s.isCoilLocked);
  const setCoilPosition = useTMSStore(s => s.setCoilPosition);
  const setCoilRotation = useTMSStore(s => s.setCoilRotation);
  const mode = useTMSStore(s => s.mode);
  const rmt = useTMSStore(s => s.rmt);
  const firePulse = useTMSStore(s => s.firePulse);
  const targetPositions = useTMSStore(s => s.targetPositions);
  const coilResetTrigger = useTMSStore(s => s.coilResetTrigger);
  
  // Nonce-based snap request - select primitives to ensure re-render
  const snapRequestKey = useTMSStore(s => s.snapRequest.key);
  const snapRequestNonce = useTMSStore(s => s.snapRequest.nonce);
  const setHoverTargetKey = useTMSStore(s => s.setHoverTargetKey);
  
  // Process coil model once
  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    
    normalizeModelScale(clone, 'coil', true);
    const maxDim = validateCoilScale(clone);
    const { thickness } = normalizeCoilPivot(clone);
    
    // Calculate offset based on coil thickness
    const offset = 0.002 + thickness * 0.05;
    clone.userData.effectiveOffset = offset;
    
    if (DEBUG_COIL) {
      console.log('[TMSCoil] Model processed:', { maxDim: maxDim.toFixed(4), offset: offset.toFixed(4) });
    }
    
    return clone;
  }, [gltf]);
  
  // Extract offset from processed model
  useEffect(() => {
    if (clonedScene.userData.effectiveOffset) {
      setEffectiveOffset(clonedScene.userData.effectiveOffset);
    }
  }, [clonedScene]);
  
  /**
   * Update Three.js transform from internal state
   */
  const updateTransform = useCallback(() => {
    const state = coilStateRef.current;
    const quat = calculateCoilOrientation(state.normal, state.yaw, state.pitch);
    
    setCoilPosition([state.position.x, state.position.y, state.position.z]);
    setCoilRotation([quat.x, quat.y, quat.z, quat.w]);
    
    onCoilMove?.(state.position, state.normal);
  }, [setCoilPosition, setCoilRotation, onCoilMove]);
  
  /**
   * Snap coil to a target position
   */
  const snapToPosition = useCallback((targetVec) => {
    if (!scalpSurfaceRef.current) return false;
    
    const result = scalpSurfaceRef.current.snapToTarget(targetVec, effectiveOffset);
    if (!result) return false;
    
    const state = coilStateRef.current;
    state.position.copy(result.position);
    state.normal.copy(result.normal);
    state.yaw = 0;
    state.pitch = 0;
    
    // Clear continuity after snap
    scalpSurfaceRef.current.clearContinuity();
    
    updateTransform();
    return true;
  }, [effectiveOffset, updateTransform]);
  
  /**
   * Reset coil to center (Cz position)
   */
  const resetToCenter = useCallback(() => {
    const czPos = new THREE.Vector3(0, 0.2, 0);
    if (snapToPosition(czPos)) {
      console.log('[TMSCoil] Reset to Cz');
    }
  }, [snapToPosition]);
  
  // ============================================================================
  // INITIALIZATION - Wait for proxy mesh
  // ============================================================================
  useEffect(() => {
    if (!proxyMesh) {
      if (DEBUG_COIL) console.log('[TMSCoil] Waiting for proxy mesh...');
      return;
    }
    
    // Already initialized with this mesh
    if (isReady && scalpSurfaceRef.current?.surfaceMesh === proxyMesh) {
      return;
    }
    
    console.log('[TMSCoil] Initializing with proxy mesh');
    
    // Create ScalpSurface wrapper
    const surface = new ScalpSurface();
    surface.setMesh(proxyMesh);
    scalpSurfaceRef.current = surface;
    
    // Find initial position at top of head
    const startPos = new THREE.Vector3(0, 0.2, 0);
    const initial = surface.findSurfacePoint(startPos, null);
    
    if (initial) {
      const state = coilStateRef.current;
      state.position.copy(initial.point).addScaledVector(initial.normal, effectiveOffset);
      state.normal.copy(initial.normal);
      state.yaw = 0;
      state.pitch = 0;
      
      updateTransform();
      setIsReady(true);
      
      console.log('[TMSCoil] Ready at:', state.position.toArray().map(v => v.toFixed(4)));
    } else {
      console.error('[TMSCoil] Failed to find initial surface point');
    }
  }, [proxyMesh, effectiveOffset, updateTransform, isReady]);
  
  // ============================================================================
  // TARGET SNAP - Fires ONLY when snapRequestNonce changes (event-based)
  // ============================================================================
  useEffect(() => {
    // Skip if no new request, not ready, or already snapping
    if (snapRequestNonce === lastSnapNonceRef.current || !isReady || snappingRef.current) {
      return;
    }
    
    // Skip if no target key
    if (!snapRequestKey || !targetPositions) {
      lastSnapNonceRef.current = snapRequestNonce;
      return;
    }
    
    const targetPos = targetPositions[snapRequestKey];
    if (!targetPos) {
      console.warn('[TMSCoil] Unknown target:', snapRequestKey);
      lastSnapNonceRef.current = snapRequestNonce;
      return;
    }
    
    // Set re-entrancy guard
    snappingRef.current = true;
    lastSnapNonceRef.current = snapRequestNonce;
    
    // Convert to Vector3 if needed
    const targetVec = targetPos instanceof THREE.Vector3
      ? targetPos.clone()
      : new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
    
    console.log('[TMSCoil] Snap requested:', snapRequestKey, 'nonce:', snapRequestNonce);
    
    if (snapToPosition(targetVec)) {
      console.log('[TMSCoil] Snap complete:', snapRequestKey);
      
      // Update hover state immediately (coil is at target)
      lastHoverTargetRef.current = snapRequestKey;
      setHoverTargetKey(snapRequestKey);
    } else {
      console.error('[TMSCoil] Snap failed:', snapRequestKey);
    }
    
    // Clear re-entrancy guard
    snappingRef.current = false;
  }, [snapRequestNonce, snapRequestKey, targetPositions, isReady, snapToPosition, setHoverTargetKey]);
  
  // ============================================================================
  // RESET TRIGGER - Fires when coilResetTrigger increments
  // ============================================================================
  const lastResetTrigger = useRef(0);
  useEffect(() => {
    if (coilResetTrigger > lastResetTrigger.current && isReady) {
      lastResetTrigger.current = coilResetTrigger;
      resetToCenter();
    }
  }, [coilResetTrigger, isReady, resetToCenter]);
  
  // ============================================================================
  // KEYBOARD INPUT
  // ============================================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      
      if (key in keysRef.current) {
        keysRef.current[key] = true;
        e.preventDefault();
      }
      
      // Space fires pulse in rMT mode
      if (e.code === 'Space' && mode === 'rmt' && 
          (rmt.phase === 'hunt' || rmt.phase === 'titration')) {
        e.preventDefault();
        if (rmt.hotspotPosition) {
          const hotspot = new THREE.Vector3(...rmt.hotspotPosition);
          const dist = coilStateRef.current.position.distanceTo(hotspot) * 1000;
          firePulse(dist);
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
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, rmt.phase, rmt.hotspotPosition, firePulse]);
  
  // ============================================================================
  // FRAME UPDATE - Movement loop
  // ============================================================================
  useFrame((_, delta) => {
    if (isCoilLocked || !isReady || !scalpSurfaceRef.current) return;
    
    const keys = keysRef.current;
    const state = coilStateRef.current;
    let moved = false;
    
    // Keyboard movement
    const moveDir = keysToMoveDirection(keys, camera, state.normal);
    
    if (moveDir.lengthSq() > 0) {
      const step = MOVEMENT_CONFIG.moveSpeed * delta;
      const result = scalpSurfaceRef.current.moveAlongSurface(
        state.position, moveDir, step, effectiveOffset
      );
      
      if (result) {
        state.position.copy(result.position);
        state.normal.copy(result.normal);
        moved = true;
      }
    }
    
    // Yaw rotation (Q/E)
    if (keys.q) {
      state.yaw -= MOVEMENT_CONFIG.rotateSpeed * delta;
      moved = true;
    }
    if (keys.e) {
      state.yaw += MOVEMENT_CONFIG.rotateSpeed * delta;
      moved = true;
    }
    
    // Pitch tilt (R/F)
    if (keys.r) {
      state.pitch = clampPitch(state.pitch + MOVEMENT_CONFIG.pitchSpeed * delta);
      moved = true;
    }
    if (keys.f) {
      state.pitch = clampPitch(state.pitch - MOVEMENT_CONFIG.pitchSpeed * delta);
      moved = true;
    }
    
    if (moved) {
      updateTransform();
    }
    
    // Proximity detection with hysteresis for educational indicator
    if (targetPositions) {
      const coilPos = state.position;
      let nearestTarget = null;
      let nearestDist = Infinity;
      
      for (const [name, pos] of Object.entries(targetPositions)) {
        const dist = coilPos.distanceTo(pos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestTarget = name;
        }
      }
      
      const currentHover = lastHoverTargetRef.current;
      
      // Hysteresis logic: different thresholds for enter vs exit
      if (currentHover === null) {
        // Not hovering - check ENTER threshold
        if (nearestDist < PROXIMITY_ENTER) {
          lastHoverTargetRef.current = nearestTarget;
          setHoverTargetKey(nearestTarget);
        }
      } else {
        // Currently hovering - check EXIT threshold (larger = sticky)
        if (nearestDist > PROXIMITY_EXIT) {
          lastHoverTargetRef.current = null;
          setHoverTargetKey(null);
        } else if (currentHover !== nearestTarget && nearestDist < PROXIMITY_ENTER) {
          // Switched to a different nearby target
          lastHoverTargetRef.current = nearestTarget;
          setHoverTargetKey(nearestTarget);
        }
      }
    }
  });
  
  // ============================================================================
  // MOUSE DRAG - Shift+drag to reposition
  // ============================================================================
  useEffect(() => {
    if (!isReady || !scalpSurfaceRef.current) return;
    
    let isDragging = false;
    
    const handleMouseDown = (e) => {
      // Require Shift key to avoid conflict with OrbitControls
      if (e.button === 0 && e.shiftKey && !isCoilLocked) {
        isDragging = true;
        e.preventDefault();
      }
    };
    
    const handleMouseUp = () => {
      isDragging = false;
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging || !scalpSurfaceRef.current) return;
      
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      
      // Raycast against proxy mesh only
      const intersects = raycaster.intersectObject(scalpSurfaceRef.current.surfaceMesh, false);
      
      if (intersects.length > 0) {
        const hit = intersects[0];
        const state = coilStateRef.current;
        
        // Extract normal
        const normal = hit.face.normal.clone();
        normal.transformDirection(scalpSurfaceRef.current.surfaceMesh.matrixWorld);
        normal.normalize();
        
        // Force outward
        const outward = new THREE.Vector3()
          .subVectors(hit.point, scalpSurfaceRef.current.headCenter)
          .normalize();
        if (normal.dot(outward) < 0) normal.negate();
        
        state.position.copy(hit.point).addScaledVector(normal, effectiveOffset);
        state.normal.copy(normal);
        
        updateTransform();
      }
    };
    
    const canvas = gl.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera, gl, isCoilLocked, isReady, effectiveOffset, updateTransform]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <group ref={groupRef}>
      <primitive
        object={clonedScene}
        position={coilPosition}
        quaternion={new THREE.Quaternion(...coilRotation)}
      />
      
      {/* Lock indicator */}
      {isCoilLocked && (
        <mesh position={[coilPosition[0], coilPosition[1] + 0.02, coilPosition[2]]}>
          <ringGeometry args={[0.015, 0.018, 32]} />
          <meshBasicMaterial color="#ff4444" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// Preload model
try {
  useGLTF.preload(`${import.meta.env.BASE_URL || './'}models/coil.glb`);
} catch (e) {
  // Non-critical
}
