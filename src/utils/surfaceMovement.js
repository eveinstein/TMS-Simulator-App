/**
 * Surface Movement Utility
 * ========================
 * Implements scalp-constrained coil movement using raycasting.
 * 
 * FIXES APPLIED:
 * - Fix A: findClosestSurfacePoint picks OUTERMOST hit, forces outward normals, has fallback
 * - Fix B: setHeadMesh uses bounding sphere center (more stable than bbox)
 * - Fix C: keysToMoveDirection accepts surfaceNormal and projects onto tangent plane
 * - Fix D: Movement uses units/second, scaled by delta time
 */

import * as THREE from 'three';

// Movement configuration - single source of truth
// FIX D: moveSpeed is now units per SECOND (not per frame)
export const MOVEMENT_CONFIG = {
  moveSpeed: 0.15,        // Units per second (world space)
  rotateSpeed: 1.8,       // Radians per second for yaw
  pitchSpeed: 0.9,        // Radians per second for pitch
  scalpOffset: 0.006,     // Default distance above scalp surface (6mm)
  snapThreshold: 0.015,   // Distance to snap to target (15mm)
  maxPitch: Math.PI / 6,  // ±30 degrees pitch limit
};

/**
 * ScalpSurface class - manages raycasting and surface-following logic
 */
export class ScalpSurface {
  /**
   * @param {THREE.Mesh} [mesh] - Optional head mesh for raycasting
   * @param {Object} [options] - Configuration options
   * @param {THREE.Vector3} [options.headCenterOverride] - Manual head center override
   */
  constructor(mesh = null, options = {}) {
    this.headMesh = null;
    this.headCenter = new THREE.Vector3(0, 0.05, 0);
    this.headCenterOverride = options.headCenterOverride || null;
    this.raycaster = new THREE.Raycaster();
    
    // Reusable vectors to avoid per-frame allocations
    this._tempVec = new THREE.Vector3();
    this._tempVec2 = new THREE.Vector3();
    this._tempVec3 = new THREE.Vector3();
    this._outwardDir = new THREE.Vector3();
    
    if (mesh) {
      this.setHeadMesh(mesh);
    }
  }
  
  /**
   * FIX B: Manually set head center (for hard cases)
   * @param {THREE.Vector3} center - The head center position in world space
   */
  setHeadCenter(center) {
    this.headCenterOverride = center.clone();
    this.headCenter.copy(center);
    
    if (import.meta.env.DEV) {
      console.log('[ScalpSurface] Manual head center set:', {
        x: this.headCenter.x.toFixed(4),
        y: this.headCenter.y.toFixed(4),
        z: this.headCenter.z.toFixed(4),
      });
    }
  }
  
  /**
   * FIX B: Initialize or update head mesh reference using bounding sphere center
   * @param {THREE.Mesh} mesh - The head mesh for raycasting
   */
  setHeadMesh(mesh) {
    if (!mesh) return;
    
    this.headMesh = mesh;
    mesh.updateMatrixWorld(true);
    
    // If manual override is set, use it
    if (this.headCenterOverride) {
      this.headCenter.copy(this.headCenterOverride);
    } else if (mesh.geometry) {
      // FIX B: Use bounding sphere center (more stable than bbox for open meshes)
      mesh.geometry.computeBoundingSphere();
      const sphere = mesh.geometry.boundingSphere;
      
      if (sphere) {
        this._tempVec.copy(sphere.center);
        this._tempVec.applyMatrix4(mesh.matrixWorld);
        this.headCenter.copy(this._tempVec);
      } else {
        // Fallback to bounding box if sphere fails
        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox;
        if (box) {
          box.getCenter(this._tempVec);
          this._tempVec.applyMatrix4(mesh.matrixWorld);
          this.headCenter.copy(this._tempVec);
        }
      }
    }
    
    if (import.meta.env.DEV) {
      console.log('[ScalpSurface] Initialized with head center (bounding sphere):', {
        x: this.headCenter.x.toFixed(4),
        y: this.headCenter.y.toFixed(4),
        z: this.headCenter.z.toFixed(4),
      });
    }
  }
  
  /**
   * FIX A: Find closest point on scalp surface to a world position
   * - Picks the OUTERMOST (farthest) intersection, not intersects[0]
   * - Ensures normal points OUTWARD relative to head center
   * - Falls back to reverse ray if center-out fails
   * 
   * @param {THREE.Vector3} worldPos - Target position in world space
   * @returns {{ point: THREE.Vector3, normal: THREE.Vector3, distance: number, isOutermost: boolean } | null}
   */
  findClosestSurfacePoint(worldPos) {
    if (!this.headMesh) return null;
    
    // Direction from head center to target
    const direction = this._tempVec.subVectors(worldPos, this.headCenter).normalize();
    
    // Skip if direction is zero (target is at head center)
    if (direction.lengthSq() < 0.0001) return null;
    
    // Cast ray from center outward
    this.raycaster.set(this.headCenter, direction);
    const intersects = this.raycaster.intersectObject(this.headMesh, true);
    
    let hit = null;
    let isOutermost = false;
    
    if (intersects.length > 0) {
      // FIX A: Pick the OUTERMOST (farthest) intersection - this is the outer scalp surface
      hit = intersects[intersects.length - 1];
      isOutermost = true;
    }
    
    // FIX A: Fallback - if center-out ray fails, try reverse direction
    if (!hit) {
      const reverseDir = this._tempVec2.subVectors(this.headCenter, worldPos).normalize();
      this.raycaster.set(worldPos, reverseDir);
      
      const reverseIntersects = this.raycaster.intersectObject(this.headMesh, true);
      if (reverseIntersects.length > 0) {
        hit = reverseIntersects[0];
        isOutermost = false;
      }
    }
    
    if (hit) {
      // Get face normal in world space
      const normal = hit.face.normal.clone();
      normal.transformDirection(this.headMesh.matrixWorld);
      normal.normalize();
      
      // FIX A: Ensure normal points OUTWARD (away from head center)
      this._outwardDir.subVectors(hit.point, this.headCenter).normalize();
      if (normal.dot(this._outwardDir) < 0) {
        normal.negate();
      }
      
      return {
        point: hit.point.clone(),
        normal: normal,
        distance: hit.distance,
        isOutermost: isOutermost,
      };
    }
    
    return null;
  }
  
  /**
   * Raycast from camera/mouse to find surface point
   * @param {THREE.Raycaster} raycaster - Configured raycaster
   * @returns {{ point: THREE.Vector3, normal: THREE.Vector3 } | null}
   */
  raycastToSurface(raycaster) {
    if (!this.headMesh) return null;
    
    const intersects = raycaster.intersectObject(this.headMesh, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      const normal = hit.face.normal.clone();
      normal.transformDirection(this.headMesh.matrixWorld);
      normal.normalize();
      
      // Ensure normal points outward
      this._outwardDir.subVectors(hit.point, this.headCenter).normalize();
      if (normal.dot(this._outwardDir) < 0) {
        normal.negate();
      }
      
      return {
        point: hit.point.clone(),
        normal: normal,
      };
    }
    
    return null;
  }
  
  /**
   * Move along scalp surface in a given direction
   * 
   * @param {THREE.Vector3} currentWorldPos - Current coil position (world space)
   * @param {THREE.Vector3} moveDirection - Desired movement direction (normalized)
   * @param {number} [stepSize] - Movement magnitude (delta-adjusted)
   * @param {number} [offset] - Distance above scalp
   * @returns {{ position: THREE.Vector3, normal: THREE.Vector3, surfacePoint: THREE.Vector3 } | null}
   */
  moveAlongSurface(currentWorldPos, moveDirection, stepSize = MOVEMENT_CONFIG.moveSpeed * 0.016, offset = MOVEMENT_CONFIG.scalpOffset) {
    if (!this.headMesh) return null;
    if (moveDirection.lengthSq() < 0.0001) return null;
    
    const current = this.findClosestSurfacePoint(currentWorldPos);
    if (!current) return null;
    
    // Project movement onto tangent plane
    const normalComponent = this._tempVec.copy(current.normal).multiplyScalar(
      moveDirection.dot(current.normal)
    );
    const tangentMove = this._tempVec2.copy(moveDirection).sub(normalComponent);
    
    if (tangentMove.lengthSq() < 0.0001) return null;
    
    tangentMove.normalize().multiplyScalar(stepSize);
    
    const newTarget = this._tempVec3.copy(current.point).add(tangentMove);
    const newSurface = this.findClosestSurfacePoint(newTarget);
    if (!newSurface) return null;
    
    const finalPosition = newSurface.point.clone().add(
      newSurface.normal.clone().multiplyScalar(offset)
    );
    
    return {
      position: finalPosition,
      normal: newSurface.normal,
      surfacePoint: newSurface.point,
    };
  }
  
  /**
   * Snap to a target position on the scalp
   */
  snapToTarget(targetWorldPos, offset = MOVEMENT_CONFIG.scalpOffset) {
    const surface = this.findClosestSurfacePoint(targetWorldPos);
    if (!surface) return null;
    
    const finalPosition = surface.point.clone().add(
      surface.normal.clone().multiplyScalar(offset)
    );
    
    return {
      position: finalPosition,
      normal: surface.normal,
      surfacePoint: surface.point,
    };
  }
  
  getInitialPosition(targetPos, offset = MOVEMENT_CONFIG.scalpOffset) {
    return this.snapToTarget(targetPos, offset);
  }
}

// Reusable objects for orientation calculation
const _orientQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _pitchQuat = new THREE.Quaternion();
const _matrix = new THREE.Matrix4();
const _targetDir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _right = new THREE.Vector3();

/**
 * Calculate coil orientation quaternion from surface normal and user angles
 */
export function calculateCoilOrientation(normal, userYaw = 0, userPitch = 0) {
  _targetDir.copy(normal).negate();
  
  if (Math.abs(_targetDir.y) > 0.99) {
    _matrix.lookAt(
      new THREE.Vector3(0, 0, 0),
      _targetDir,
      new THREE.Vector3(0, 0, _targetDir.y > 0 ? -1 : 1)
    );
  } else {
    _up.set(0, 1, 0);
    _matrix.lookAt(
      new THREE.Vector3(0, 0, 0),
      _targetDir,
      _up
    );
  }
  
  _orientQuat.setFromRotationMatrix(_matrix);
  
  if (userYaw !== 0) {
    _yawQuat.setFromAxisAngle(normal, userYaw);
    _orientQuat.premultiply(_yawQuat);
  }
  
  if (userPitch !== 0) {
    _right.set(1, 0, 0).applyQuaternion(_orientQuat);
    _pitchQuat.setFromAxisAngle(_right, userPitch);
    _orientQuat.premultiply(_pitchQuat);
  }
  
  return _orientQuat.clone();
}

// Reusable vectors for key movement calculation
const _forward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _moveVec = new THREE.Vector3();
const _tempNormal = new THREE.Vector3();

/**
 * FIX C: Convert WASD/Arrow keys to movement direction based on camera view
 * Now accepts surfaceNormal and projects movement onto tangent plane
 * 
 * @param {Object} keys - Key state object with boolean flags
 * @param {THREE.Camera} camera - Current camera for view direction
 * @param {THREE.Vector3} [surfaceNormal] - Optional surface normal for tangent projection
 * @returns {THREE.Vector3} Normalized movement direction in world space (or zero vector)
 */
export function keysToMoveDirection(keys, camera, surfaceNormal = null) {
  camera.getWorldDirection(_forward);
  _camRight.crossVectors(_forward, camera.up).normalize();
  
  _moveVec.set(0, 0, 0);
  
  if (keys.w || keys.arrowup) _moveVec.add(_forward);
  if (keys.s || keys.arrowdown) _moveVec.sub(_forward);
  if (keys.d || keys.arrowright) _moveVec.add(_camRight);
  if (keys.a || keys.arrowleft) _moveVec.sub(_camRight);
  
  if (_moveVec.lengthSq() < 0.0001) {
    return _moveVec;
  }
  
  // FIX C: If surface normal provided, project onto tangent plane
  if (surfaceNormal) {
    const dot = _moveVec.dot(surfaceNormal);
    _moveVec.sub(_tempNormal.copy(surfaceNormal).multiplyScalar(dot));
    
    if (_moveVec.lengthSq() < 0.0001) {
      _moveVec.set(0, 0, 0);
      return _moveVec;
    }
  }
  
  _moveVec.normalize();
  return _moveVec;
}

/**
 * Clamp pitch value within allowed range
 */
export function clampPitch(pitch) {
  return Math.max(-MOVEMENT_CONFIG.maxPitch, Math.min(MOVEMENT_CONFIG.maxPitch, pitch));
}
