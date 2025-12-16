/**
 * Surface Movement Utility
 * ========================
 * Scalp-constrained coil movement using raycasting against a smooth proxy surface.
 * 
 * Architecture:
 * - ScalpSurface wraps a single THREE.Mesh (the proxy dome)
 * - Raycasts from head center outward to find surface points
 * - Uses continuity-based hit selection to prevent teleporting
 * - All normals forced to point outward
 * 
 * Terminology:
 * - surfaceMesh: The smooth proxy dome mesh used for raycasting
 * - targetKey: EEG electrode name (F3, F4, C3, SMA, FP2)
 * - fiducial: Anatomical landmark (Nasion, Inion, LPA, RPA)
 */

import * as THREE from 'three';

// Debug flag - set to true to enable verbose raycast logging
const DEBUG_RAYCAST = false;

// Movement configuration
export const MOVEMENT_CONFIG = {
  moveSpeed: 0.15,        // Meters per second
  rotateSpeed: 1.8,       // Radians per second for yaw
  pitchSpeed: 0.9,        // Radians per second for pitch
  scalpOffset: 0.006,     // Default hover distance above surface (6mm)
  snapThreshold: 0.015,   // Distance to auto-snap to target (15mm)
  maxPitch: Math.PI / 6,  // ±30 degrees pitch limit
};

/**
 * ScalpSurface - Manages raycasting against a smooth proxy mesh
 */
export class ScalpSurface {
  constructor() {
    this.surfaceMesh = null;
    this.headCenter = new THREE.Vector3(0, 0.08, 0);
    this.raycaster = new THREE.Raycaster();
    this.isReady = false;
    
    // Track last known good position for continuity
    this._lastSurfacePoint = null;
    
    // Reusable vectors (avoid allocations in hot paths)
    this._direction = new THREE.Vector3();
    this._tempVec = new THREE.Vector3();
    this._farPoint = new THREE.Vector3();
  }
  
  /**
   * Initialize with the proxy surface mesh
   * @param {THREE.Mesh} mesh - The smooth proxy dome mesh
   */
  setMesh(mesh) {
    if (!mesh) {
      console.error('[ScalpSurface] setMesh called with null');
      return;
    }
    
    if (!mesh.geometry) {
      console.error('[ScalpSurface] Mesh has no geometry');
      return;
    }
    
    this.surfaceMesh = mesh;
    mesh.updateMatrixWorld(true);
    
    // CRITICAL: Use headCenter from proxy mesh userData if available
    // This was computed from the actual head mesh, not the proxy dome
    if (mesh.userData?.headCenter) {
      this.headCenter.copy(mesh.userData.headCenter);
      console.log('[ScalpSurface] Using stored headCenter from proxy userData');
    } else {
      // Fallback: compute from bounding sphere (less accurate for dome)
      mesh.geometry.computeBoundingSphere();
      const sphere = mesh.geometry.boundingSphere;
      if (sphere) {
        this.headCenter.copy(sphere.center);
        this.headCenter.applyMatrix4(mesh.matrixWorld);
      }
      console.warn('[ScalpSurface] No stored headCenter, computed from geometry');
    }
    
    this.isReady = true;
    this._lastSurfacePoint = null;
    
    console.log('[ScalpSurface] Initialized:', {
      meshName: mesh.name || 'unnamed',
      headCenter: this.headCenter.toArray().map(v => v.toFixed(4)),
    });
  }
  
  /**
   * Find surface point closest to a world position
   * Uses continuity-based selection to prevent teleporting
   * 
   * @param {THREE.Vector3} targetPos - Position to find surface for
   * @param {THREE.Vector3} [previousPoint] - Previous surface point for continuity
   * @returns {{ point: THREE.Vector3, normal: THREE.Vector3 } | null}
   */
  findSurfacePoint(targetPos, previousPoint = null) {
    if (!this.isReady || !this.surfaceMesh) {
      if (DEBUG_RAYCAST) console.warn('[ScalpSurface] Not ready');
      return null;
    }
    
    // Direction from head center to target
    this._direction.subVectors(targetPos, this.headCenter);
    const distToCenter = this._direction.length();
    
    if (distToCenter < 0.001) {
      if (DEBUG_RAYCAST) console.warn('[ScalpSurface] Target at head center');
      return null;
    }
    
    this._direction.normalize();
    
    // Primary raycast: from head center outward
    this.raycaster.set(this.headCenter, this._direction);
    let intersects = this.raycaster.intersectObject(this.surfaceMesh, false);
    
    if (DEBUG_RAYCAST && intersects.length > 0) {
      console.log('[Raycast] Center-out hits:', intersects.length);
    }
    
    // If no hits, try reverse ray (from outside looking in)
    if (intersects.length === 0) {
      this._farPoint.copy(this.headCenter).addScaledVector(this._direction, 0.5);
      this._tempVec.copy(this._direction).negate();
      this.raycaster.set(this._farPoint, this._tempVec);
      intersects = this.raycaster.intersectObject(this.surfaceMesh, false);
      
      if (DEBUG_RAYCAST && intersects.length > 0) {
        console.log('[Raycast] Reverse ray hits:', intersects.length);
      }
      
      if (intersects.length === 0) {
        if (DEBUG_RAYCAST) console.warn('[ScalpSurface] No surface hit');
        return null;
      }
      
      // For reverse ray, use first (closest) hit
      return this._processHit(intersects[0]);
    }
    
    // Select best hit using continuity
    const hit = this._selectBestHit(intersects, previousPoint);
    return this._processHit(hit);
  }
  
  /**
   * Select the best hit from multiple intersections
   * Prefers hit closest to previousPoint for smooth movement
   * Falls back to outermost hit if no previous point
   */
  _selectBestHit(intersects, previousPoint) {
    if (intersects.length === 1) {
      return intersects[0];
    }
    
    // Use continuity if we have a previous point
    const refPoint = previousPoint || this._lastSurfacePoint;
    
    if (refPoint) {
      let bestHit = intersects[0];
      let bestDist = bestHit.point.distanceTo(refPoint);
      
      for (let i = 1; i < intersects.length; i++) {
        const dist = intersects[i].point.distanceTo(refPoint);
        if (dist < bestDist) {
          bestDist = dist;
          bestHit = intersects[i];
        }
      }
      
      if (DEBUG_RAYCAST) {
        console.log('[ScalpSurface] Continuity selection:', {
          hits: intersects.length,
          selectedDist: bestDist.toFixed(4),
        });
      }
      
      return bestHit;
    }
    
    // No reference point: use outermost hit (last in array, farthest from origin)
    return intersects[intersects.length - 1];
  }
  
  /**
   * Process a raycast hit into surface point + outward normal
   */
  _processHit(hit) {
    // Get face normal in world space
    const normal = hit.face.normal.clone();
    normal.transformDirection(this.surfaceMesh.matrixWorld);
    normal.normalize();
    
    // Force normal to point outward (away from head center)
    this._tempVec.subVectors(hit.point, this.headCenter).normalize();
    if (normal.dot(this._tempVec) < 0) {
      normal.negate();
    }
    
    // Update last known good point
    this._lastSurfacePoint = hit.point.clone();
    
    return {
      point: hit.point.clone(),
      normal: normal,
    };
  }
  
  /**
   * Move along surface in a direction
   * @param {THREE.Vector3} currentPos - Current coil position (with offset)
   * @param {THREE.Vector3} moveDir - Desired movement direction (normalized)
   * @param {number} stepSize - Distance to move (delta-scaled)
   * @param {number} offset - Hover distance above surface
   */
  moveAlongSurface(currentPos, moveDir, stepSize, offset = MOVEMENT_CONFIG.scalpOffset) {
    if (!this.isReady) return null;
    if (moveDir.lengthSq() < 0.0001) return null;
    
    // Find current surface point (use continuity)
    const current = this.findSurfacePoint(currentPos, this._lastSurfacePoint);
    if (!current) return null;
    
    // Project movement onto tangent plane
    const normalDot = moveDir.dot(current.normal);
    this._tempVec.copy(current.normal).multiplyScalar(normalDot);
    const tangentMove = this._direction.copy(moveDir).sub(this._tempVec);
    
    if (tangentMove.lengthSq() < 0.0001) return null;
    
    tangentMove.normalize().multiplyScalar(stepSize);
    
    // Compute new target and find its surface point (with continuity)
    const newTarget = this._tempVec.copy(current.point).add(tangentMove);
    const newSurface = this.findSurfacePoint(newTarget, current.point);
    
    if (!newSurface) return null;
    
    // Final position = surface point + offset along normal
    const finalPos = newSurface.point.clone();
    finalPos.addScaledVector(newSurface.normal, offset);
    
    return {
      position: finalPos,
      normal: newSurface.normal,
      surfacePoint: newSurface.point,
    };
  }
  
  /**
   * Snap directly to a target position
   * Uses robust raycasting: from headCenter through targetPos to find surface
   */
  snapToTarget(targetPos, offset = MOVEMENT_CONFIG.scalpOffset) {
    console.log('[ScalpSurface] snapToTarget called:', {
      targetPos: targetPos.toArray(),
      offset,
      isReady: this.isReady,
      hasMesh: !!this.surfaceMesh,
      headCenter: this.headCenter?.toArray(),
    });
    
    if (!this.isReady) {
      console.warn('[ScalpSurface] Not ready for snap');
      return null;
    }
    
    // Clear continuity for fresh snap
    this._lastSurfacePoint = null;
    
    // Strategy: Cast ray from headCenter THROUGH targetPos
    // This ensures we find the surface point closest to target
    const direction = this._direction.subVectors(targetPos, this.headCenter).normalize();
    
    console.log('[ScalpSurface] Raycasting:', {
      from: this.headCenter.toArray(),
      direction: direction.toArray(),
    });
    
    // Cast from head center outward
    this.raycaster.set(this.headCenter, direction);
    let intersects = this.raycaster.intersectObject(this.surfaceMesh, false);
    
    console.log('[ScalpSurface] Center-out raycast hits:', intersects.length);
    
    if (intersects.length === 0) {
      // Fallback: cast from far outside toward headCenter
      this._farPoint.copy(this.headCenter).addScaledVector(direction, 0.5);
      this._tempVec.copy(direction).negate();
      this.raycaster.set(this._farPoint, this._tempVec);
      intersects = this.raycaster.intersectObject(this.surfaceMesh, false);
      
      console.log('[ScalpSurface] Outside-in raycast hits:', intersects.length);
      
      if (intersects.length === 0) {
        console.warn('[ScalpSurface] Snap failed - no intersection on ray through target');
        // Last resort: use generic findSurfacePoint
        const surface = this.findSurfacePoint(targetPos, null);
        if (!surface) {
          console.error('[ScalpSurface] Snap completely failed');
          return null;
        }
        return this._finishSnap(surface, offset);
      }
      
      // Use first hit from outside
      return this._finishSnap(this._processHit(intersects[0]), offset);
    }
    
    // Use outermost hit (last in array for center-out ray)
    const hit = intersects[intersects.length - 1];
    return this._finishSnap(this._processHit(hit), offset);
  }
  
  /**
   * Helper to finish snap with offset
   */
  _finishSnap(surface, offset) {
    if (!surface) return null;
    
    const finalPos = surface.point.clone();
    finalPos.addScaledVector(surface.normal, offset);
    
    // Store for continuity
    this._lastSurfacePoint = surface.point.clone();
    
    console.log('[ScalpSurface] Snap success:', {
      surface: surface.point.toArray().map(v => v.toFixed(4)),
      final: finalPos.toArray().map(v => v.toFixed(4)),
    });
    
    return {
      position: finalPos,
      normal: surface.normal,
      surfacePoint: surface.point,
    };
  }
  
  /**
   * Clear continuity tracking (call after teleporting coil)
   */
  clearContinuity() {
    this._lastSurfacePoint = null;
  }
}

// ============================================================================
// ORIENTATION HELPERS
// ============================================================================

// Reusable objects for orientation calculation
const _orientQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _pitchQuat = new THREE.Quaternion();
const _matrix = new THREE.Matrix4();
const _targetDir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _right = new THREE.Vector3();

/**
 * Calculate coil orientation from surface normal and user angles
 * Coil's contact face (-Z local) points into the scalp
 */
export function calculateCoilOrientation(normal, userYaw = 0, userPitch = 0) {
  // Coil -Z points into scalp (opposite of outward normal)
  _targetDir.copy(normal).negate();
  
  // Create base rotation aligning -Z with target direction
  _matrix.lookAt(new THREE.Vector3(0, 0, 0), _targetDir, _up);
  _orientQuat.setFromRotationMatrix(_matrix);
  
  // Apply user yaw (rotation around surface normal)
  _yawQuat.setFromAxisAngle(normal, userYaw);
  _orientQuat.premultiply(_yawQuat);
  
  // Apply user pitch (tilt forward/back)
  _right.crossVectors(_up, normal).normalize();
  if (_right.lengthSq() < 0.01) {
    _right.set(1, 0, 0);
  }
  _pitchQuat.setFromAxisAngle(_right, userPitch);
  _orientQuat.premultiply(_pitchQuat);
  
  return _orientQuat.clone();
}

/**
 * Convert keyboard state to camera-relative movement direction
 */
export function keysToMoveDirection(keys, camera, surfaceNormal = null) {
  const dir = new THREE.Vector3();
  
  // Get camera forward/right on XZ plane
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() > 0.001) {
    forward.normalize();
  } else {
    forward.set(0, 0, -1);
  }
  
  right.crossVectors(forward, _up).normalize();
  
  // Accumulate input
  if (keys.w || keys.arrowup) dir.add(forward);
  if (keys.s || keys.arrowdown) dir.sub(forward);
  if (keys.a || keys.arrowleft) dir.sub(right);
  if (keys.d || keys.arrowright) dir.add(right);
  
  if (dir.lengthSq() < 0.0001) return dir;
  
  dir.normalize();
  
  // Project onto tangent plane if normal provided
  if (surfaceNormal) {
    const dot = dir.dot(surfaceNormal);
    dir.addScaledVector(surfaceNormal, -dot);
    if (dir.lengthSq() > 0.0001) {
      dir.normalize();
    }
  }
  
  return dir;
}

/**
 * Clamp pitch to configured limits
 */
export function clampPitch(pitch) {
  return Math.max(-MOVEMENT_CONFIG.maxPitch, Math.min(MOVEMENT_CONFIG.maxPitch, pitch));
}
