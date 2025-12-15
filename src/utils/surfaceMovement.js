/**
 * Surface Movement Utility
 * ========================
 * Implements scalp-constrained coil movement using raycasting.
 * 
 * The coil slides ALONG the scalp surface, not through it.
 * Uses raycast from head center outward to find scalp points.
 * 
 * COORDINATE SYSTEM (Radiologic Convention):
 * - +X = Patient Left (viewer's right)
 * - +Y = Superior (up)
 * - +Z = Anterior (toward face)
 * 
 * MOVEMENT APPROACH:
 * 1. Get current surface point and normal via raycast from head center
 * 2. Project desired movement onto tangent plane (perpendicular to normal)
 * 3. Re-project result onto scalp surface
 * 4. Add offset above surface to prevent clipping
 */

import * as THREE from 'three';

// Movement configuration - single source of truth
export const MOVEMENT_CONFIG = {
  moveSpeed: 0.003,       // Units per frame (world space, ~3mm)
  rotateSpeed: 0.04,      // Radians per frame for yaw
  pitchSpeed: 0.02,       // Radians per frame for pitch
  scalpOffset: 0.012,     // Distance above scalp surface (12mm)
  snapThreshold: 0.02,    // Distance to snap to target (20mm)
  maxPitch: Math.PI / 6,  // ±30 degrees pitch limit
};

/**
 * ScalpSurface class - manages raycasting and surface-following logic
 * 
 * Usage:
 *   const surface = new ScalpSurface(headMesh);
 *   const result = surface.moveAlongSurface(currentPos, direction, speed);
 */
export class ScalpSurface {
  /**
   * @param {THREE.Mesh} [mesh] - Optional head mesh for raycasting
   */
  constructor(mesh = null) {
    this.headMesh = null;
    this.headCenter = new THREE.Vector3(0, 0.05, 0);
    this.raycaster = new THREE.Raycaster();
    // Reusable vectors to avoid per-frame allocations
    this._tempVec = new THREE.Vector3();
    this._tempVec2 = new THREE.Vector3();
    this._tempVec3 = new THREE.Vector3();
    
    if (mesh) {
      this.setHeadMesh(mesh);
    }
  }
  
  /**
   * Initialize or update head mesh reference
   * @param {THREE.Mesh} mesh - The head mesh for raycasting
   */
  setHeadMesh(mesh) {
    if (!mesh) return;
    
    this.headMesh = mesh;
    
    // Compute head center from geometry bounding box
    if (mesh.geometry) {
      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox;
      if (box) {
        box.getCenter(this._tempVec);
        // Transform to world space
        this._tempVec.applyMatrix4(mesh.matrixWorld);
        this.headCenter.copy(this._tempVec);
      }
    }
    
    if (import.meta.env.DEV) {
      console.log('[ScalpSurface] Initialized with head center:', {
        x: this.headCenter.x.toFixed(4),
        y: this.headCenter.y.toFixed(4),
        z: this.headCenter.z.toFixed(4),
      });
    }
  }
  
  /**
   * Find closest point on scalp surface to a world position
   * Uses raycast from head center toward the target position
   * 
   * @param {THREE.Vector3} worldPos - Target position in world space
   * @returns {{ point: THREE.Vector3, normal: THREE.Vector3, distance: number } | null}
   */
  findClosestSurfacePoint(worldPos) {
    if (!this.headMesh) return null;
    
    // Direction from head center to target
    const direction = this._tempVec.subVectors(worldPos, this.headCenter).normalize();
    
    // Cast ray from center outward
    this.raycaster.set(this.headCenter, direction);
    
    const intersects = this.raycaster.intersectObject(this.headMesh, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      
      // Get face normal in world space
      const normal = hit.face.normal.clone();
      normal.transformDirection(this.headMesh.matrixWorld);
      normal.normalize();
      
      return {
        point: hit.point.clone(),
        normal: normal,
        distance: hit.distance,
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
      
      return {
        point: hit.point.clone(),
        normal: normal,
      };
    }
    
    return null;
  }
  
  /**
   * Move along scalp surface in a given direction
   * Projects movement onto tangent plane, then re-projects onto scalp
   * 
   * @param {THREE.Vector3} currentWorldPos - Current coil position (world space)
   * @param {THREE.Vector3} moveDirection - Desired movement direction (world space, should be normalized)
   * @param {number} [stepSize] - Movement magnitude (default: MOVEMENT_CONFIG.moveSpeed)
   * @returns {{ position: THREE.Vector3, normal: THREE.Vector3, surfacePoint: THREE.Vector3 } | null}
   */
  moveAlongSurface(currentWorldPos, moveDirection, stepSize = MOVEMENT_CONFIG.moveSpeed) {
    if (!this.headMesh) return null;
    if (moveDirection.lengthSq() < 0.0001) return null;
    
    // Get current surface point and normal
    const current = this.findClosestSurfacePoint(currentWorldPos);
    if (!current) return null;
    
    // Project movement onto tangent plane (perpendicular to normal)
    // tangentMove = moveDirection - (moveDirection · normal) * normal
    const normalComponent = this._tempVec.copy(current.normal).multiplyScalar(
      moveDirection.dot(current.normal)
    );
    const tangentMove = this._tempVec2.copy(moveDirection).sub(normalComponent);
    
    // If no tangent component, we can't move
    if (tangentMove.lengthSq() < 0.0001) return null;
    
    tangentMove.normalize().multiplyScalar(stepSize);
    
    // Calculate new target position
    const newTarget = this._tempVec3.copy(current.point).add(tangentMove);
    
    // Project back onto scalp surface
    const newSurface = this.findClosestSurfacePoint(newTarget);
    if (!newSurface) return null;
    
    // Add offset above surface to prevent clipping
    const finalPosition = newSurface.point.clone().add(
      newSurface.normal.clone().multiplyScalar(MOVEMENT_CONFIG.scalpOffset)
    );
    
    return {
      position: finalPosition,
      normal: newSurface.normal,
      surfacePoint: newSurface.point,
    };
  }
  
  /**
   * Snap to a target position on the scalp
   * 
   * @param {THREE.Vector3} targetWorldPos - Target position
   * @returns {{ position: THREE.Vector3, normal: THREE.Vector3, surfacePoint: THREE.Vector3 } | null}
   */
  snapToTarget(targetWorldPos) {
    const surface = this.findClosestSurfacePoint(targetWorldPos);
    if (!surface) return null;
    
    const finalPosition = surface.point.clone().add(
      surface.normal.clone().multiplyScalar(MOVEMENT_CONFIG.scalpOffset)
    );
    
    return {
      position: finalPosition,
      normal: surface.normal,
      surfacePoint: surface.point,
    };
  }
  
  /**
   * Get initial position near a target
   * @param {THREE.Vector3} targetPos - Target position
   * @returns {{ position: THREE.Vector3, normal: THREE.Vector3, surfacePoint: THREE.Vector3 } | null}
   */
  getInitialPosition(targetPos) {
    return this.snapToTarget(targetPos);
  }
}

// Reusable objects for orientation calculation (avoid allocations)
const _orientQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _pitchQuat = new THREE.Quaternion();
const _matrix = new THREE.Matrix4();
const _targetDir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _right = new THREE.Vector3();

/**
 * Calculate coil orientation quaternion from surface normal and user angles
 * 
 * Coil orientation:
 * - Coil's -Z axis faces toward scalp (perpendicular to surface)
 * - User yaw rotates around the surface normal
 * - User pitch tilts the coil (for angled stimulation)
 * 
 * @param {THREE.Vector3} normal - Surface normal at coil position
 * @param {number} [userYaw=0] - User yaw rotation (radians)
 * @param {number} [userPitch=0] - User pitch rotation (radians)
 * @returns {THREE.Quaternion} Quaternion rotation for coil
 */
export function calculateCoilOrientation(normal, userYaw = 0, userPitch = 0) {
  // We want coil's -Z to align with -normal (facing toward scalp)
  _targetDir.copy(normal).negate();
  
  // Create matrix looking from origin toward -normal
  // Avoid gimbal lock near vertical
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
  
  // Apply user yaw around the surface normal axis
  if (userYaw !== 0) {
    _yawQuat.setFromAxisAngle(normal, userYaw);
    _orientQuat.premultiply(_yawQuat);
  }
  
  // Apply user pitch (tilt around local X axis)
  if (userPitch !== 0) {
    // Get the right vector in the current orientation
    _right.set(1, 0, 0).applyQuaternion(_orientQuat);
    _pitchQuat.setFromAxisAngle(_right, userPitch);
    _orientQuat.premultiply(_pitchQuat);
  }
  
  return _orientQuat.clone();
}

// Reusable vectors for key movement calculation
const _forward = new THREE.Vector3();
const _moveRight = new THREE.Vector3();
const _moveVec = new THREE.Vector3();

/**
 * Convert WASD/Arrow keys to movement direction based on camera view
 * 
 * @param {Object} keys - Key state object with boolean flags
 * @param {THREE.Camera} camera - Current camera for view direction
 * @returns {THREE.Vector3} Normalized movement direction in world space (or zero vector)
 */
export function keysToMoveDirection(keys, camera) {
  // Get camera forward vector projected onto XZ plane
  camera.getWorldDirection(_forward);
  _forward.y = 0;
  _forward.normalize();
  
  // Get right vector (perpendicular to forward on XZ plane)
  _moveRight.crossVectors(_forward, new THREE.Vector3(0, 1, 0)).normalize();
  
  // Build movement vector from key states
  _moveVec.set(0, 0, 0);
  
  // Forward/back (W/S or Up/Down arrows)
  if (keys.w || keys.arrowup) _moveVec.add(_forward);
  if (keys.s || keys.arrowdown) _moveVec.sub(_forward);
  
  // Right/left (D/A or Right/Left arrows)
  if (keys.d || keys.arrowright) _moveVec.add(_moveRight);
  if (keys.a || keys.arrowleft) _moveVec.sub(_moveRight);
  
  // Normalize if moving
  if (_moveVec.lengthSq() > 0) {
    _moveVec.normalize();
  }
  
  return _moveVec;
}

/**
 * Clamp pitch value within allowed range
 * @param {number} pitch - Current pitch in radians
 * @returns {number} Clamped pitch value
 */
export function clampPitch(pitch) {
  return Math.max(-MOVEMENT_CONFIG.maxPitch, Math.min(MOVEMENT_CONFIG.maxPitch, pitch));
}
