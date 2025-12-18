/**
 * TMSCoil.jsx
 * ===========
 * TMS coil component with surface-constrained movement using spherical ghost coordinates.
 * 
 * MOVEMENT SYSTEM:
 * - Ghost yaw/pitch: Spherical coordinates on head surface
 * - WASD/Arrows: Move ghost position (independent of camera view)
 * - Q/E: Rotate coil around surface normal (twist)
 * - R/F: Tilt coil forward/back
 * - Commit-on-hit: Ghost only moves when raycast succeeds (perfect boundary)
 * - Smooth transforms: Position and rotation are interpolated for smooth motion
 * 
 * KEY INSIGHT:
 * The coil's movement is defined in head-local spherical coordinates,
 * not camera-relative XZ. This means WASD always does the same thing
 * regardless of where the camera is looking.
 */

import React, { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useTMSStore } from '../../stores/tmsStore';
import { normalizeModelScale } from '../../utils/scaleNormalization';
import { 
  ScalpSurface, 
  ghostToRay,
  worldToGhost,
  keysToGhostDelta,
  calculateSlidingOrientation,
  clampGhostPitch,
  clampTilt,
  MOVEMENT_CONFIG,
} from '../../utils/surfaceMovement';
import * as THREE from 'three';

// Debug flag - enabled in development mode only (toggle with VITE_DEBUG_COIL=true)
const DEBUG_COIL = import.meta.env.DEV && import.meta.env.VITE_DEBUG_COIL === 'true';

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

export function TMSCoil({ proxyMesh, fiducials, onCoilMove }) {
  const groupRef = useRef();
  const scalpSurfaceRef = useRef(null);
  
  // State
  const [isReady, setIsReady] = useState(false);
  const [effectiveOffset, setEffectiveOffset] = useState(MOVEMENT_CONFIG.scalpOffset);
  
  // Ghost state: spherical coordinates for movement
  const ghostRef = useRef({
    yaw: 0,           // Rotation around head Y axis
    pitch: Math.PI/4, // Elevation from horizontal (start ~45° = top-front)
    twistYaw: 0,      // Coil rotation around surface normal (Q/E)
    tiltPitch: 0,     // Coil tilt forward/back (R/F)
  });
  
  // Target state: what we're interpolating toward
  const targetRef = useRef({
    position: new THREE.Vector3(0, 0.15, 0),
    normal: new THREE.Vector3(0, 1, 0),
    quaternion: new THREE.Quaternion(),
  });
  
  // Smoothed display state: what's actually rendered
  const smoothedRef = useRef({
    position: new THREE.Vector3(0, 0.15, 0),
    quaternion: new THREE.Quaternion(),
  });
  
  // Computed head geometry
  const headGeomRef = useRef({
    center: new THREE.Vector3(0, 0.08, 0),
    radius: 0.12,
  });
  
  // Keyboard state
  const keysRef = useRef({
    w: false, a: false, s: false, d: false,
    arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
    q: false, e: false,
    r: false, f: false,
  });
  
  // Snap guard - prevents re-entrancy
  const snappingRef = useRef(false);
  const lastSnapNonceRef = useRef(0);
  
  // Proximity tracking with hysteresis
  const lastHoverTargetRef = useRef(null);
  const PROXIMITY_ENTER = 0.015;
  const PROXIMITY_EXIT = 0.020;
  
  // Three.js context
  const { camera, gl } = useThree();
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/coil.glb`);
  
  // Store selectors
  const coilPosition = useTMSStore(s => s.coilPosition);
  const coilRotation = useTMSStore(s => s.coilRotation);
  const isCoilLocked = useTMSStore(s => s.isCoilLocked);
  const isPulsing = useTMSStore(s => s.isPulsing);
  const pulseIntensity = useTMSStore(s => s.pulseIntensity);
  const setCoilPosition = useTMSStore(s => s.setCoilPosition);
  const setCoilRotation = useTMSStore(s => s.setCoilRotation);
  const mode = useTMSStore(s => s.mode);
  const rmt = useTMSStore(s => s.rmt);
  const firePulse = useTMSStore(s => s.firePulse);
  const targetPositions = useTMSStore(s => s.targetPositions);
  const coilResetTrigger = useTMSStore(s => s.coilResetTrigger);
  
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
   * Project ghost coordinates to surface and update targets
   * Returns true if successful (hit found)
   */
  const projectGhostToSurface = useCallback((yaw, pitch) => {
    if (!scalpSurfaceRef.current) return false;
    
    const { center, radius } = headGeomRef.current;
    const ray = ghostToRay(yaw, pitch, center, radius + 0.1);
    
    // Raycast against proxy surface
    const raycaster = new THREE.Raycaster();
    raycaster.set(ray.origin, ray.direction);
    const intersects = raycaster.intersectObject(scalpSurfaceRef.current.surfaceMesh, false);
    
    if (intersects.length === 0) {
      return false;
    }
    
    // Use first hit (outermost from our external ray)
    const hit = intersects[0];
    
    // Get normal and ensure it points outward
    const normal = hit.face.normal.clone();
    normal.transformDirection(scalpSurfaceRef.current.surfaceMesh.matrixWorld);
    normal.normalize();
    
    // Force outward
    const outward = new THREE.Vector3()
      .subVectors(hit.point, center)
      .normalize();
    if (normal.dot(outward) < 0) {
      normal.negate();
    }
    
    // Update targets
    targetRef.current.position.copy(hit.point).addScaledVector(normal, effectiveOffset);
    targetRef.current.normal.copy(normal);
    
    // Compute orientation - handle points posterior, naturally rotates upward on forehead
    const ghost = ghostRef.current;
    
    // Reference direction: -Z world (posterior) - handle always tries to point backward
    // On forehead (FP2), this projects to "upward" as the tangent plane becomes vertical
    const refPosterior = new THREE.Vector3(0, 0, -1);
    
    targetRef.current.quaternion.copy(
      calculateSlidingOrientation(
        normal,              // Surface normal
        ghost.twistYaw,      // User yaw (Q/E)
        ghost.tiltPitch,     // User tilt (R/F)
        refPosterior         // Preferred handle direction
      )
    );
    
    return true;
  }, [effectiveOffset]);
  
  /**
   * Snap coil to a target position
   */
  const snapToPosition = useCallback((targetVec) => {
    if (DEBUG_COIL) {
      console.log('[TMSCoil] snapToPosition:', targetVec.toArray());
    }
    
    if (!scalpSurfaceRef.current) return false;
    
    // Convert world position to ghost coordinates
    const { center } = headGeomRef.current;
    const { yaw, pitch } = worldToGhost(targetVec, center);
    
    // Clamp pitch
    const clampedPitch = clampGhostPitch(pitch);
    
    // Project to surface
    if (projectGhostToSurface(yaw, clampedPitch)) {
      // Commit ghost state
      ghostRef.current.yaw = yaw;
      ghostRef.current.pitch = clampedPitch;
      ghostRef.current.twistYaw = 0;
      ghostRef.current.tiltPitch = 0;
      
      // Immediately snap smoothed to target (no interpolation for direct snap)
      smoothedRef.current.position.copy(targetRef.current.position);
      smoothedRef.current.quaternion.copy(targetRef.current.quaternion);
      
      // Update store
      const pos = smoothedRef.current.position;
      const quat = smoothedRef.current.quaternion;
      setCoilPosition([pos.x, pos.y, pos.z]);
      setCoilRotation([quat.x, quat.y, quat.z, quat.w]);
      
      onCoilMove?.(pos, targetRef.current.normal);
      
      return true;
    }
    
    return false;
  }, [projectGhostToSurface, setCoilPosition, setCoilRotation, onCoilMove]);
  
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
    
    // Compute head geometry from proxy mesh
    proxyMesh.geometry.computeBoundingSphere();
    const sphere = proxyMesh.geometry.boundingSphere;
    if (sphere) {
      headGeomRef.current.center.copy(sphere.center);
      headGeomRef.current.center.applyMatrix4(proxyMesh.matrixWorld);
      headGeomRef.current.radius = sphere.radius;
    }
    
    // Use stored head center if available (more accurate)
    if (proxyMesh.userData?.headCenter) {
      headGeomRef.current.center.copy(proxyMesh.userData.headCenter);
    }
    
    // Initialize ghost to top-front of head
    ghostRef.current.yaw = 0;
    ghostRef.current.pitch = Math.PI / 4;
    
    // Project initial position
    if (projectGhostToSurface(ghostRef.current.yaw, ghostRef.current.pitch)) {
      smoothedRef.current.position.copy(targetRef.current.position);
      smoothedRef.current.quaternion.copy(targetRef.current.quaternion);
      
      const pos = smoothedRef.current.position;
      const quat = smoothedRef.current.quaternion;
      setCoilPosition([pos.x, pos.y, pos.z]);
      setCoilRotation([quat.x, quat.y, quat.z, quat.w]);
      
      setIsReady(true);
      console.log('[TMSCoil] Ready at:', pos.toArray().map(v => v.toFixed(4)));
    } else {
      console.error('[TMSCoil] Failed to find initial surface point');
    }
  }, [proxyMesh, effectiveOffset, projectGhostToSurface, setCoilPosition, setCoilRotation, isReady]);
  
  // ============================================================================
  // RESET TRIGGER
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
          const dist = smoothedRef.current.position.distanceTo(hotspot) * 1000;
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
  // FRAME UPDATE - Movement loop + smoothing + snap handling
  // ============================================================================
  useFrame((_, delta) => {
    // Cap delta to prevent huge jumps after tab switches
    const dt = Math.min(delta, 0.1);
    
    // Check for pending snap request
    const store = useTMSStore.getState();
    const { snapRequest, targetPositions: positions } = store;
    
    if (snapRequest.nonce !== lastSnapNonceRef.current && 
        !snappingRef.current && 
        isReady && 
        scalpSurfaceRef.current) {
      
      lastSnapNonceRef.current = snapRequest.nonce;
      
      if (snapRequest.key && positions) {
        const targetPos = positions[snapRequest.key];
        
        if (targetPos) {
          snappingRef.current = true;
          
          let targetVec;
          if (targetPos instanceof THREE.Vector3) {
            targetVec = targetPos.clone();
          } else if (targetPos && typeof targetPos.x === 'number') {
            targetVec = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
          } else {
            console.error('[TMSCoil] Invalid target position format');
            snappingRef.current = false;
            return;
          }
          
          const result = snapToPosition(targetVec);
          
          if (result) {
            console.log('[TMSCoil] Snap complete:', snapRequest.key);
            lastHoverTargetRef.current = snapRequest.key;
            store.setHoverTargetKey(snapRequest.key);
          }
          
          snappingRef.current = false;
        }
      }
    }
    
    // Skip movement if locked or not ready
    if (isCoilLocked || !isReady || !scalpSurfaceRef.current) {
      return;
    }
    
    const keys = keysRef.current;
    const ghost = ghostRef.current;
    let moved = false;
    
    // === SPHERICAL GHOST MOVEMENT ===
    const { yawDelta, pitchDelta } = keysToGhostDelta(keys);
    
    if (yawDelta !== 0 || pitchDelta !== 0) {
      // Compute candidate ghost position
      const candYaw = ghost.yaw + yawDelta * MOVEMENT_CONFIG.yawSpeed * dt;
      const candPitch = clampGhostPitch(ghost.pitch + pitchDelta * MOVEMENT_CONFIG.pitchSpeed * dt);
      
      // COMMIT-ON-HIT: Only update if raycast succeeds
      if (projectGhostToSurface(candYaw, candPitch)) {
        ghost.yaw = candYaw;
        ghost.pitch = candPitch;
        moved = true;
      }
      // If no hit, ghost doesn't move (perfect boundary behavior)
    }
    
    // === COIL ORIENTATION CONTROLS ===
    
    // Twist (Q/E) - rotation around surface normal
    if (keys.q) {
      ghost.twistYaw -= MOVEMENT_CONFIG.rotateSpeed * dt;
      moved = true;
    }
    if (keys.e) {
      ghost.twistYaw += MOVEMENT_CONFIG.rotateSpeed * dt;
      moved = true;
    }
    
    // Tilt (R/F) - forward/back tilt
    if (keys.r) {
      ghost.tiltPitch = clampTilt(ghost.tiltPitch + MOVEMENT_CONFIG.pitchTiltSpeed * dt);
      moved = true;
    }
    if (keys.f) {
      ghost.tiltPitch = clampTilt(ghost.tiltPitch - MOVEMENT_CONFIG.pitchTiltSpeed * dt);
      moved = true;
    }
    
    // Update orientation target if controls changed
    if (moved && (keys.q || keys.e || keys.r || keys.f)) {
      const refPosterior = new THREE.Vector3(0, 0, -1);
      targetRef.current.quaternion.copy(
        calculateSlidingOrientation(
          targetRef.current.normal,
          ghost.twistYaw,
          ghost.tiltPitch,
          refPosterior
        )
      );
    }
    
    // === SMOOTH INTERPOLATION ===
    // Always interpolate toward target, even if no input (catches up from snaps)
    const posFactor = 1 - Math.exp(-MOVEMENT_CONFIG.posDamping * dt);
    const rotFactor = 1 - Math.exp(-MOVEMENT_CONFIG.rotDamping * dt);
    
    smoothedRef.current.position.lerp(targetRef.current.position, posFactor);
    smoothedRef.current.quaternion.slerp(targetRef.current.quaternion, rotFactor);
    
    // Update store with smoothed values
    const pos = smoothedRef.current.position;
    const quat = smoothedRef.current.quaternion;
    setCoilPosition([pos.x, pos.y, pos.z]);
    setCoilRotation([quat.x, quat.y, quat.z, quat.w]);
    
    // Notify move callback
    if (moved) {
      onCoilMove?.(pos, targetRef.current.normal);
    }
    
    // === PROXIMITY DETECTION ===
    if (positions) {
      const coilPos = smoothedRef.current.position;
      let nearestTarget = null;
      let nearestDist = Infinity;
      
      for (const [name, tpos] of Object.entries(positions)) {
        const dist = coilPos.distanceTo(tpos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestTarget = name;
        }
      }
      
      const currentHover = lastHoverTargetRef.current;
      
      if (currentHover === null) {
        if (nearestDist < PROXIMITY_ENTER) {
          lastHoverTargetRef.current = nearestTarget;
          store.setHoverTargetKey(nearestTarget);
        }
      } else {
        if (nearestDist > PROXIMITY_EXIT) {
          lastHoverTargetRef.current = null;
          store.setHoverTargetKey(null);
        } else if (currentHover !== nearestTarget && nearestDist < PROXIMITY_ENTER) {
          lastHoverTargetRef.current = nearestTarget;
          store.setHoverTargetKey(nearestTarget);
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
      
      const intersects = raycaster.intersectObject(scalpSurfaceRef.current.surfaceMesh, false);
      
      if (intersects.length > 0) {
        const hit = intersects[0];
        
        // Convert hit point to ghost coordinates
        const { center } = headGeomRef.current;
        const { yaw, pitch } = worldToGhost(hit.point, center);
        
        // Update ghost and project
        ghostRef.current.yaw = yaw;
        ghostRef.current.pitch = clampGhostPitch(pitch);
        
        projectGhostToSurface(ghostRef.current.yaw, ghostRef.current.pitch);
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
  }, [camera, gl, isCoilLocked, isReady, projectGhostToSurface]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Pulse animation parameters (tunable)
  const PULSE_CONFIG = {
    coneRadius: 0.018,      // Base radius of the focused cone
    coneDepth: 0.025,       // How far the pulse extends "into" the head
    coreRadius: 0.012,      // Inner bright core
    glowRadius: 0.022,      // Outer subtle glow
    duration: 60,           // Animation duration in ms (handled by caller)
  };
  
  // Calculate directional pulse animation properties
  const pulseProgress = isPulsing ? 1 : 0;
  const baseOpacity = (pulseIntensity || 1) * 0.85;
  
  return (
    <group ref={groupRef}>
      <primitive
        object={clonedScene}
        position={coilPosition}
        quaternion={new THREE.Quaternion(...coilRotation)}
      />
      
      {/* Directional pulse effect - focused electromagnetic field entering scalp */}
      <group 
        position={coilPosition}
        quaternion={new THREE.Quaternion(...coilRotation)}
      >
        {/* Primary focused cone - points INTO the head (negative Y in coil-local space) */}
        <mesh 
          position={[0, -PULSE_CONFIG.coneDepth * 0.5 * pulseProgress, 0]}
          rotation={[Math.PI, 0, 0]}
          scale={isPulsing ? [1, 1, 1] : [0.8, 0.5, 0.8]}
        >
          <coneGeometry args={[
            PULSE_CONFIG.coneRadius * (0.8 + 0.2 * pulseProgress), 
            PULSE_CONFIG.coneDepth * pulseProgress, 
            32, 
            1, 
            true
          ]} />
          <meshBasicMaterial 
            color="#00d4ff" 
            transparent 
            opacity={isPulsing ? baseOpacity * 0.7 : 0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        
        {/* Inner bright core - sits at coil surface */}
        <mesh 
          position={[0, -0.001, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[PULSE_CONFIG.coreRadius * (isPulsing ? 1 : 0.7), 32]} />
          <meshBasicMaterial 
            color="#80ffff" 
            transparent 
            opacity={isPulsing ? baseOpacity * 0.9 : 0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        
        {/* Surface contact ring - subtle ring at coil-scalp interface */}
        <mesh 
          position={[0, -0.002, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={isPulsing ? [1.1, 1.1, 1] : [1, 1, 1]}
        >
          <ringGeometry args={[
            PULSE_CONFIG.coreRadius * 0.9, 
            PULSE_CONFIG.glowRadius * (isPulsing ? 1 : 0.8), 
            48
          ]} />
          <meshBasicMaterial 
            color="#00c8f0" 
            transparent 
            opacity={isPulsing ? baseOpacity * 0.5 : 0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        
        {/* Focused lobe gradient - ellipsoid that hugs the scalp */}
        <mesh 
          position={[0, -PULSE_CONFIG.coneDepth * 0.3, 0]}
          scale={isPulsing ? [1.2, 0.6, 1.2] : [0.9, 0.3, 0.9]}
        >
          <sphereGeometry args={[PULSE_CONFIG.coneRadius * 0.8, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial 
            color="#00a8d0" 
            transparent 
            opacity={isPulsing ? baseOpacity * 0.35 : 0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
      
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
