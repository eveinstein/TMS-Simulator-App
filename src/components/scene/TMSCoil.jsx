/**
 * TMSCoil.jsx
 * ===========
 * TMS coil with surface-following movement.
 * 
 * FIXES APPLIED:
 * - Fix E: Pivot normalization so contact plane is at z=0
 * - Fix F: Dynamic scalpOffset = 0.002 + thickness * 0.05
 * - Fix G: Mouse drag uses canvas rect, not window size
 * - Fix C integration: Pass surface normal to keysToMoveDirection
 * - Fix D integration: Scale movement by delta time
 * 
 * Target size: 0.06m (TARGET_SIZES.coil)
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
import { clampToProxyBoundary } from '../../utils/coilSurfaceProxy';
import * as THREE from 'three';

// Pulse ring animation component
function PulseRings({ active, position }) {
  const [rings, setRings] = useState([]);
  
  useEffect(() => {
    if (!active) {
      setRings([]);
      return;
    }
    
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

/**
 * FIX E: Normalize coil pivot so contact plane is at local z=0
 * This ensures the group origin represents the contact plane
 * 
 * @param {THREE.Object3D} coilObject - The coil scene/group
 * @returns {{ thickness: number }} Coil dimensions for offset calculation
 */
function normalizeCoilPivot(coilObject) {
  const bbox = new THREE.Box3().setFromObject(coilObject);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);
  
  const thickness = size.z;
  
  // Recenter the coil so bbox center is at origin
  coilObject.traverse((child) => {
    if (child.isMesh) {
      child.position.sub(center);
    }
  });
  
  // Shift along local +Z so that minimum Z face (contact side) is at z=0
  const contactOffset = thickness / 2;
  coilObject.traverse((child) => {
    if (child.isMesh) {
      child.position.z += contactOffset;
    }
  });
  
  if (import.meta.env.DEV) {
    console.log('[TMSCoil] FIX E - Pivot normalized:', {
      thickness: thickness.toFixed(4),
      contactOffset: contactOffset.toFixed(4),
    });
  }
  
  return { thickness };
}

/**
 * FIX H: Validate coil scale is within expected bounds
 */
function validateCoilScale(coilObject) {
  const bbox = new THREE.Box3().setFromObject(coilObject);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  
  if (maxDim > 0.09 || maxDim < 0.03) {
    console.warn(`[TMSCoil] SCALE WARNING: Coil max dimension ${maxDim.toFixed(4)}m is outside expected range [0.03, 0.09]m`);
  }
  
  if (import.meta.env.DEV) {
    console.log('[TMSCoil] FIX H - Scale validation:', {
      maxDim: maxDim.toFixed(4),
      expected: '0.06m (±50%)',
      valid: maxDim >= 0.03 && maxDim <= 0.09,
    });
  }
}

export function TMSCoil({ headMesh, coilSurfaceMesh, onCoilMove }) {
  const groupRef = useRef();
  const coilRef = useRef();
  const scalpSurfaceRef = useRef(null);
  
  // Track which mesh we're using for raycasting
  const [surfaceMeshReady, setSurfaceMeshReady] = useState(false);
  
  // FIX F: Store effective scalp offset based on coil thickness
  const [effectiveOffset, setEffectiveOffset] = useState(MOVEMENT_CONFIG.scalpOffset);
  
  const keysRef = useRef({
    w: false, a: false, s: false, d: false,
    arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
    q: false, e: false,
    r: false, f: false,
  });
  
  const coilStateRef = useRef({
    position: new THREE.Vector3(0, 0.2, -0.02),  // Above head, slightly posterior (scalp, not face)
    normal: new THREE.Vector3(0, 1, 0),
    yaw: 0,
    pitch: 0,
  });
  
  // FIX G: Get gl for canvas rect
  const { camera, gl } = useThree();
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/coil.glb`);
  
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
    selectedTargetKey,
    targetPositions,
  } = useTMSStore();
  
  // Clone and process the coil model
  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    
    // Apply scale normalization (target: 0.06m)
    normalizeModelScale(clone, 'coil', true);
    
    // FIX H: Validate scale is reasonable
    validateCoilScale(clone);
    
    // FIX E: Normalize pivot so contact plane is at z=0
    const { thickness } = normalizeCoilPivot(clone);
    
    // FIX F: Calculate effective offset = 0.002 + thickness * 0.05
    const calculatedOffset = 0.002 + thickness * 0.05;
    
    if (import.meta.env.DEV) {
      console.log('[TMSCoil] FIX F - Effective offset:', {
        thickness: thickness.toFixed(4),
        calculatedOffset: calculatedOffset.toFixed(4),
      });
    }
    
    clone.userData.effectiveOffset = calculatedOffset;
    
    return clone;
  }, [gltf]);
  
  // Set effective offset after clone is processed
  useEffect(() => {
    if (clonedScene.userData.effectiveOffset) {
      setEffectiveOffset(clonedScene.userData.effectiveOffset);
    }
  }, [clonedScene]);
  
  // Initialize scalp surface - prefer proxy mesh for smooth movement
  useEffect(() => {
    // Use proxy mesh if available, otherwise fall back to headMesh
    const targetMesh = coilSurfaceMesh || headMesh;
    
    if (!targetMesh) return;
    
    // If we already have a surface and it's using the same mesh type, skip
    if (scalpSurfaceRef.current && surfaceMeshReady) {
      // Only reinitialize if we're switching to proxy for first time
      if (coilSurfaceMesh && !scalpSurfaceRef.current._usingProxy) {
        // Upgrade to proxy mesh
      } else {
        return;
      }
    }
    
    targetMesh.updateMatrixWorld(true);
    scalpSurfaceRef.current = new ScalpSurface(targetMesh);
    scalpSurfaceRef.current._usingProxy = !!coilSurfaceMesh;
    
    if (import.meta.env.DEV) {
      console.log('[TMSCoil] ScalpSurface initialized:', {
        usingProxy: !!coilSurfaceMesh,
        meshName: targetMesh.name || 'unnamed',
      });
    }
    
    // Initial snap to surface - target top of scalp (not face)
    const startPos = new THREE.Vector3(0, 0.2, -0.02);
    const initial = scalpSurfaceRef.current.findClosestSurfacePoint(startPos);
    if (initial) {
      coilStateRef.current.position.copy(initial.point);
      coilStateRef.current.position.add(
        initial.normal.clone().multiplyScalar(effectiveOffset)
      );
      coilStateRef.current.normal.copy(initial.normal);
      
      // Clamp to proxy boundary if using proxy
      if (coilSurfaceMesh) {
        clampToProxyBoundary(coilStateRef.current.position, coilSurfaceMesh);
      }
      
      updateCoilTransform();
      
      if (import.meta.env.DEV) {
        console.log('[TMSCoil] Initial position:', {
          x: coilStateRef.current.position.x.toFixed(4),
          y: coilStateRef.current.position.y.toFixed(4),
          z: coilStateRef.current.position.z.toFixed(4),
          isOutermost: initial.isOutermost,
        });
      }
    }
    
    setSurfaceMeshReady(true);
  }, [headMesh, coilSurfaceMesh, effectiveOffset, surfaceMeshReady]);
  
  const updateCoilTransform = useCallback(() => {
    const state = coilStateRef.current;
    const quaternion = calculateCoilOrientation(state.normal, state.yaw, state.pitch);
    
    setCoilPosition([state.position.x, state.position.y, state.position.z]);
    setCoilRotation([quaternion.x, quaternion.y, quaternion.z, quaternion.w]);
    
    onCoilMove?.(state.position, state.normal);
  }, [setCoilPosition, setCoilRotation, onCoilMove]);
  
  // Snap coil to selected target when selectedTargetKey changes
  useEffect(() => {
    console.log('[TMSCoil] Snap effect triggered:', {
      selectedTargetKey,
      hasTargetPositions: !!targetPositions,
      targetKeys: targetPositions ? Object.keys(targetPositions) : [],
      surfaceMeshReady,
      hasScalpSurface: !!scalpSurfaceRef.current,
      effectiveOffset,
    });
    
    // Need all of these to be ready
    if (!selectedTargetKey) {
      console.log('[TMSCoil] No target selected');
      return;
    }
    
    if (!targetPositions) {
      console.log('[TMSCoil] No target positions yet');
      return;
    }
    
    if (!surfaceMeshReady || !scalpSurfaceRef.current) {
      console.log('[TMSCoil] Surface not ready yet');
      return;
    }
    
    const targetPos = targetPositions[selectedTargetKey];
    if (!targetPos) {
      console.warn('[TMSCoil] Target not found:', selectedTargetKey, 'Available:', Object.keys(targetPositions));
      return;
    }
    
    // Ensure targetPos is a Vector3
    const targetVec = targetPos instanceof THREE.Vector3 
      ? targetPos 
      : new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
    
    console.log('[TMSCoil] Snapping to target:', selectedTargetKey, 'at', targetVec.toArray());
    
    // Snap to the target position
    const result = scalpSurfaceRef.current.snapToTarget(targetVec, effectiveOffset);
    if (result) {
      coilStateRef.current.position.copy(result.position);
      coilStateRef.current.normal.copy(result.normal);
      coilStateRef.current.yaw = 0; // Reset rotation
      coilStateRef.current.pitch = 0;
      
      // Clamp to proxy boundary if using proxy
      if (coilSurfaceMesh) {
        clampToProxyBoundary(coilStateRef.current.position, coilSurfaceMesh);
      }
      
      updateCoilTransform();
      
      console.log('[TMSCoil] Snapped successfully:', {
        target: selectedTargetKey,
        position: result.position.toArray().map(v => v.toFixed(4)),
      });
    } else {
      console.warn('[TMSCoil] snapToTarget returned null for:', selectedTargetKey);
    }
  }, [selectedTargetKey, targetPositions, effectiveOffset, coilSurfaceMesh, surfaceMeshReady, updateCoilTransform]);
  
  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      
      if (key in keysRef.current) {
        keysRef.current[key] = true;
        e.preventDefault();
      }
      
      if (e.code === 'Space' && mode === 'rmt' && 
          (rmt.phase === 'hunt' || rmt.phase === 'titration')) {
        e.preventDefault();
        if (rmt.hotspotPosition) {
          const hotspot = new THREE.Vector3(...rmt.hotspotPosition);
          const distance = coilStateRef.current.position.distanceTo(hotspot) * 1000;
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
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      Object.keys(keysRef.current).forEach(k => keysRef.current[k] = false);
    };
  }, [mode, rmt.phase, rmt.hotspotPosition, firePulse]);
  
  // FIX D: Frame update with delta time scaling
  useFrame((_, delta) => {
    if (isCoilLocked || !scalpSurfaceRef.current) return;
    
    const keys = keysRef.current;
    const state = coilStateRef.current;
    let moved = false;
    
    // FIX C: Pass surface normal to keysToMoveDirection
    const moveDir = keysToMoveDirection(keys, camera, state.normal);
    
    if (moveDir.lengthSq() > 0) {
      // FIX D: Scale movement by delta time
      const frameStep = MOVEMENT_CONFIG.moveSpeed * delta;
      
      const result = scalpSurfaceRef.current.moveAlongSurface(
        state.position,
        moveDir,
        frameStep,
        effectiveOffset
      );
      
      if (result) {
        state.position.copy(result.position);
        state.normal.copy(result.normal);
        
        // Clamp to proxy boundary if using proxy
        if (coilSurfaceMesh) {
          clampToProxyBoundary(state.position, coilSurfaceMesh);
        }
        
        moved = true;
      }
    }
    
    // FIX D: Yaw rotation scaled by delta
    if (keys.q) {
      state.yaw -= MOVEMENT_CONFIG.rotateSpeed * delta;
      moved = true;
    }
    if (keys.e) {
      state.yaw += MOVEMENT_CONFIG.rotateSpeed * delta;
      moved = true;
    }
    
    // FIX D: Pitch scaled by delta
    if (keys.r) {
      state.pitch = clampPitch(state.pitch + MOVEMENT_CONFIG.pitchSpeed * delta);
      moved = true;
    }
    if (keys.f) {
      state.pitch = clampPitch(state.pitch - MOVEMENT_CONFIG.pitchSpeed * delta);
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
  
  // FIX G: Mouse drag handler using canvas rect
  const handlePointerDown = useCallback((e) => {
    if (isCoilLocked) return;
    e.stopPropagation();
    
    const onPointerMove = (moveEvent) => {
      if (!scalpSurfaceRef.current) return;
      
      // FIX G: Get canvas rect for proper NDC calculation
      const rect = gl.domElement.getBoundingClientRect();
      
      const mouse = new THREE.Vector2(
        ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1,
        -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1
      );
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      
      const result = scalpSurfaceRef.current.raycastToSurface(raycaster);
      if (result) {
        coilStateRef.current.position.copy(result.point).add(
          result.normal.clone().multiplyScalar(effectiveOffset)
        );
        coilStateRef.current.normal.copy(result.normal);
        
        // Clamp to proxy boundary if using proxy
        if (coilSurfaceMesh) {
          clampToProxyBoundary(coilStateRef.current.position, coilSurfaceMesh);
        }
        
        updateCoilTransform();
      }
    };
    
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [camera, gl, isCoilLocked, updateCoilTransform, effectiveOffset, coilSurfaceMesh]);
  
  const isPulsing = session.isRunning && !session.isPaused;
  
  return (
    <group ref={groupRef}>
      <primitive 
        ref={coilRef}
        object={clonedScene} 
        onPointerDown={handlePointerDown}
      />
      
      <PulseRings 
        active={isPulsing} 
        position={[0, -effectiveOffset, 0]} 
      />
      
      {isCoilLocked && (
        <mesh position={[0, 0.015, 0]}>
          <sphereGeometry args={[0.002, 8, 8]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      )}
    </group>
  );
}

try {
  useGLTF.preload(`${import.meta.env.BASE_URL || './'}models/coil.glb`);
} catch (e) {
  // Preload failure is not critical
}
