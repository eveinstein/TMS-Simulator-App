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

// Debug flag - enabled in development mode only (toggle with VITE_DEBUG_RAYCAST=true)
const DEBUG_RAYCAST = import.meta.env.DEV && import.meta.env.VITE_DEBUG_RAYCAST === 'true';

// Movement configuration
export const MOVEMENT_CONFIG = {
  // Spherical ghost movement (radians per second)
  yawSpeed: 1.8,          // Speed rotating around head
  pitchSpeed: 1.2,        // Speed moving up/down on head
  
  // Pitch limits (radians from horizontal plane)
  pitchMin: 0.15,         // ~8° - don't go below equator
  pitchMax: 1.45,         // ~83° - don't go past top
  
  // Coil orientation controls
  rotateSpeed: 1.8,       // Radians per second for yaw (Q/E)
  pitchTiltSpeed: 0.9,    // Radians per second for pitch (R/F)
  maxTilt: Math.PI / 6,   // ±30 degrees tilt limit
  
  // Surface positioning
  scalpOffset: 0.006,     // Default hover distance above surface (6mm)
  snapThreshold: 0.015,   // Distance to auto-snap to target (15mm)
  
  // Smoothing (damping factors - higher = faster response)
  posDamping: 18,         // Position smoothing
  rotDamping: 14,         // Rotation smoothing
  
  // Boundary
  boundaryMargin: 0.008,  // 8mm margin from fiducial boundary (legacy)
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
      console.warn('[ScalpSurface] Not ready for findSurfacePoint');
      return null;
    }
    
    // Direction from head center to target
    this._direction.subVectors(targetPos, this.headCenter);
    const distToCenter = this._direction.length();
    
    if (distToCenter < 0.001) {
      console.warn('[ScalpSurface] Target at head center');
      return null;
    }
    
    this._direction.normalize();
    
    // Primary raycast: from head center outward
    this.raycaster.set(this.headCenter, this._direction);
    let intersects = this.raycaster.intersectObject(this.surfaceMesh, false);
    
    // If no hits, try reverse ray (from outside looking in)
    if (intersects.length === 0) {
      this._farPoint.copy(this.headCenter).addScaledVector(this._direction, 0.5);
      this._tempVec.copy(this._direction).negate();
      this.raycaster.set(this._farPoint, this._tempVec);
      intersects = this.raycaster.intersectObject(this.surfaceMesh, false);
      
      if (intersects.length === 0) {
        if (DEBUG_RAYCAST) {
          console.warn('[ScalpSurface] No surface hit from either direction');
        }
        return null;
      }
      
      // For reverse ray, use first (closest) hit
      return this._processHit(intersects[0]);
    }
    
    // Select best hit using continuity or outermost
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
    if (!this.isReady) {
      console.warn('[ScalpSurface] Not ready for snap');
      return null;
    }
    
    // Clear continuity for fresh snap
    this._lastSurfacePoint = null;
    
    // Strategy: Cast ray from headCenter THROUGH targetPos
    const direction = this._direction.subVectors(targetPos, this.headCenter).normalize();
    
    // Cast from head center outward
    this.raycaster.set(this.headCenter, direction);
    let intersects = this.raycaster.intersectObject(this.surfaceMesh, false);
    
    if (intersects.length === 0) {
      // Fallback: cast from far outside toward headCenter
      this._farPoint.copy(this.headCenter).addScaledVector(direction, 0.5);
      this._tempVec.copy(direction).negate();
      this.raycaster.set(this._farPoint, this._tempVec);
      intersects = this.raycaster.intersectObject(this.surfaceMesh, false);
      
      if (intersects.length === 0) {
        console.warn('[ScalpSurface] Snap failed - no intersection');
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
// SPHERICAL GHOST SYSTEM
// ============================================================================

/**
 * Convert spherical ghost coordinates to a world-space ray
 * @param {number} yaw - Rotation around head Y axis (radians)
 * @param {number} pitch - Elevation from horizontal (radians, 0 = equator, PI/2 = top)
 * @param {THREE.Vector3} headCenter - Center of head in world space
 * @param {number} radius - Distance from center to cast ray from
 * @returns {{ origin: THREE.Vector3, direction: THREE.Vector3 }}
 */
export function ghostToRay(yaw, pitch, headCenter, radius) {
  // Spherical to Cartesian (Y-up convention)
  // yaw=0 points toward +Z (front of head in radiologic convention)
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  
  // Direction vector from head center outward
  const direction = new THREE.Vector3(
    cosPitch * sinYaw,   // X: left/right
    sinPitch,            // Y: up/down
    cosPitch * cosYaw    // Z: front/back
  ).normalize();
  
  // Ray origin is outside the head, pointing inward
  const origin = headCenter.clone().addScaledVector(direction, radius);
  
  return {
    origin,
    direction: direction.clone().negate() // Point inward
  };
}

/**
 * Convert a world position back to ghost yaw/pitch coordinates
 * Used for snapping to targets
 * @param {THREE.Vector3} worldPos - World position to convert
 * @param {THREE.Vector3} headCenter - Center of head
 * @returns {{ yaw: number, pitch: number }}
 */
export function worldToGhost(worldPos, headCenter) {
  const dir = new THREE.Vector3().subVectors(worldPos, headCenter).normalize();
  
  // Extract pitch (elevation)
  const pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
  
  // Extract yaw (azimuth)
  const yaw = Math.atan2(dir.x, dir.z);
  
  return { yaw, pitch };
}

/**
 * Convert keyboard state to ghost coordinate deltas
 * Independent of camera orientation
 */
export function keysToGhostDelta(keys) {
  let yawDelta = 0;
  let pitchDelta = 0;
  
  // W/S or Up/Down: pitch (up/down on head)
  if (keys.w || keys.arrowup) pitchDelta += 1;
  if (keys.s || keys.arrowdown) pitchDelta -= 1;
  
  // A/D or Left/Right: yaw (around head)
  if (keys.a || keys.arrowleft) yawDelta -= 1;
  if (keys.d || keys.arrowright) yawDelta += 1;
  
  return { yawDelta, pitchDelta };
}

// ============================================================================
// ORIENTATION HELPERS
// ============================================================================

// Reusable objects for orientation calculation (avoid allocations in hot paths)
const _orientQuat = new THREE.Quaternion();
const _rotQuat = new THREE.Quaternion();
const _matrix = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _xAxis = new THREE.Vector3();
const _yAxis = new THREE.Vector3();
const _zAxis = new THREE.Vector3();
const _tiltAxis = new THREE.Vector3();

/**
 * Calculate coil orientation to keep it flat against scalp with controllable handle direction.
 * 
 * COIL MODEL CONVENTION (GLB file):
 * - Local -Z is the contact face (touches scalp)
 * - Local +Z points away from scalp (up from coil face)
 * - Handle extends along local -Y or -X
 * 
 * This function aligns Local +Z with the surface normal, ensuring the contact face
 * (-Z) touches the scalp. The handle direction is controlled via preferredHandleDir.
 * 
 * @param {THREE.Vector3} normal - The outward surface normal at the contact point
 * @param {number} userYaw - User rotation offset around normal (Q/E control), in radians
 * @param {number} tiltPitch - Forward/back tilt (R/F control), in radians
 * @param {boolean} isSMASnapped - Whether currently snapped to SMA (needs 180° flip)
 * @param {THREE.Vector3} [preferredHandleDir] - World direction handle should point (default: posterior -Z)
 * @returns {THREE.Quaternion}
 */
export function calculateSlidingOrientation(
  normal, 
  userYaw = 0, 
  tiltPitch = 0,
  isSMASnapped = false, 
  preferredHandleDir = new THREE.Vector3(0, 0, -1)
) {
  // 1. PRIMARY AXIS: Align Model's +Z with Surface Normal
  //    This ensures the contact face (Local -Z) touches the scalp
  //    (Fixes the "bisecting head" / coil-on-edge issue)
  _zAxis.copy(normal).normalize();

  // 2. SECONDARY AXIS: Tangent Stabilization via Projection
  //    Project preferredHandleDir onto tangent plane to get stable X-axis
  //    This prevents the handle from spinning wildly as coil moves across head
  
  // Check for singularity (normal nearly parallel to preferred direction)
  if (Math.abs(_zAxis.dot(preferredHandleDir)) > 0.99) {
    // Fallback: use world up projected onto tangent plane
    _xAxis.crossVectors(_up, _zAxis).normalize();
  } else {
    // Standard case: Cross (preferredHandle × normal) gives tangent vector
    _xAxis.crossVectors(preferredHandleDir, _zAxis).normalize();
  }

  // 3. TERTIARY AXIS: Complete orthonormal basis
  //    Y = Z × X (right-handed system)
  _yAxis.crossVectors(_zAxis, _xAxis).normalize();

  // 4. CONSTRUCT ROTATION MATRIX
  //    Matrix columns: [X, Y, Z] where Z = surface normal (coil faces scalp)
  _matrix.makeBasis(_xAxis, _yAxis, _zAxis);
  _orientQuat.setFromRotationMatrix(_matrix);

  // 5. APPLY USER YAW (Q/E rotation around surface normal)
  if (Math.abs(userYaw) > 0.001) {
    _rotQuat.setFromAxisAngle(_zAxis, userYaw);
    _orientQuat.premultiply(_rotQuat);
  }

  // 6. APPLY SMA FLIP (Critical Clinical Feature)
  //    At SMA, clinical convention is handle pointing anteriorly (opposite of default)
  //    This flips the coil 180° around the surface normal
  if (isSMASnapped) {
    _rotQuat.setFromAxisAngle(_zAxis, Math.PI);
    _orientQuat.premultiply(_rotQuat);
  }

  // 7. APPLY TILT (R/F forward/back tilt)
  //    Rotate around the coil's local X-axis (the "hinge" for nodding)
  if (Math.abs(tiltPitch) > 0.001) {
    // Get the current X-axis after yaw/SMA rotations
    _tiltAxis.set(1, 0, 0).applyQuaternion(_orientQuat);
    _rotQuat.setFromAxisAngle(_tiltAxis, tiltPitch);
    _orientQuat.premultiply(_rotQuat);
  }

  return _orientQuat.clone();
}

/**
 * Legacy wrapper for backward compatibility
 * Maps old function signature to new calculateSlidingOrientation
 */
export function buildStableCoilOrientation(surfaceNormal, referenceHandle, twistYaw = 0, tiltPitch = 0) {
  // Note: This legacy function doesn't have SMA flip support
  // New code should use calculateSlidingOrientation directly
  return calculateSlidingOrientation(surfaceNormal, twistYaw, tiltPitch, false, referenceHandle);
}

/**
 * Calculate coil orientation from surface normal and user angles
 * LEGACY - kept for compatibility
 */
export function calculateCoilOrientation(normal, userYaw = 0, userPitch = 0) {
  return calculateSlidingOrientation(normal, userYaw, userPitch, false);
}

/**
 * Convert keyboard state to camera-relative movement direction
 * LEGACY - kept for compatibility but prefer keysToGhostDelta for new code
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
 * Clamp tilt pitch to configured limits (R/F control)
 */
export function clampTilt(pitch) {
  return Math.max(-MOVEMENT_CONFIG.maxTilt, Math.min(MOVEMENT_CONFIG.maxTilt, pitch));
}

/**
 * Clamp ghost pitch (elevation on head) to configured limits
 */
export function clampGhostPitch(pitch) {
  return Math.max(MOVEMENT_CONFIG.pitchMin, Math.min(MOVEMENT_CONFIG.pitchMax, pitch));
}

/**
 * Legacy alias for clampTilt
 */
export function clampPitch(pitch) {
  return clampTilt(pitch);
}

// ============================================================================
// FIDUCIAL BOUNDARY CONSTRAINT (Task 1)
// ============================================================================

/**
 * Build a convex hull polygon from fiducial positions in XZ plane
 * Returns array of {x, z} points in CCW order
 */
export function buildFiducialBoundary(fiducials) {
  if (!fiducials || Object.keys(fiducials).length < 4) {
    return null;
  }
  
  const { Nasion, Inion, LPA, RPA } = fiducials;
  if (!Nasion || !Inion || !LPA || !RPA) {
    return null;
  }
  
  // Project to XZ plane
  const points = [
    { x: Nasion.x, z: Nasion.z, name: 'Nasion' },
    { x: Inion.x, z: Inion.z, name: 'Inion' },
    { x: LPA.x, z: LPA.z, name: 'LPA' },
    { x: RPA.x, z: RPA.z, name: 'RPA' },
  ];
  
  // Compute centroid
  const cx = points.reduce((s, p) => s + p.x, 0) / 4;
  const cz = points.reduce((s, p) => s + p.z, 0) / 4;
  
  // Sort by angle around centroid (CCW)
  points.sort((a, b) => {
    const angleA = Math.atan2(a.z - cz, a.x - cx);
    const angleB = Math.atan2(b.z - cz, b.x - cx);
    return angleA - angleB;
  });
  
  return { points, centroid: { x: cx, z: cz } };
}

/**
 * Check if point (x, z) is inside polygon using ray casting
 */
function pointInPolygon(x, z, polygon) {
  const pts = polygon.points;
  let inside = false;
  
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, zi = pts[i].z;
    const xj = pts[j].x, zj = pts[j].z;
    
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Find closest point on polygon boundary to given point
 */
function closestPointOnPolygon(x, z, polygon) {
  const pts = polygon.points;
  let closestDist = Infinity;
  let closestPoint = { x, z };
  
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const ax = pts[i].x, az = pts[i].z;
    const bx = pts[j].x, bz = pts[j].z;
    
    // Project point onto line segment
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    
    let t = 0;
    if (len2 > 0.000001) {
      t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    }
    
    const px = ax + t * dx;
    const pz = az + t * dz;
    const dist = Math.sqrt((x - px) * (x - px) + (z - pz) * (z - pz));
    
    if (dist < closestDist) {
      closestDist = dist;
      closestPoint = { x: px, z: pz };
    }
  }
  
  return closestPoint;
}

/**
 * Constrain a position to stay within fiducial boundary with margin
 * Returns clamped {x, z} or original if inside
 */
export function constrainToBoundary(x, z, boundary, margin = MOVEMENT_CONFIG.boundaryMargin) {
  if (!boundary) return { x, z, clamped: false };
  
  // Shrink boundary by margin for the test
  const cx = boundary.centroid.x;
  const cz = boundary.centroid.z;
  
  // Scale point toward centroid by margin factor for boundary check
  const shrunkPoints = boundary.points.map(p => {
    const dx = p.x - cx;
    const dz = p.z - cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const scale = Math.max(0, (dist - margin) / dist);
    return { x: cx + dx * scale, z: cz + dz * scale };
  });
  
  const shrunkBoundary = { points: shrunkPoints, centroid: boundary.centroid };
  
  if (pointInPolygon(x, z, shrunkBoundary)) {
    return { x, z, clamped: false };
  }
  
  // Clamp to shrunk boundary
  const clamped = closestPointOnPolygon(x, z, shrunkBoundary);
  return { x: clamped.x, z: clamped.z, clamped: true };
}
