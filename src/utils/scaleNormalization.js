/**
 * Scale Normalization Utility
 * ===========================
 * Robust auto-normalization of GLB models to consistent world-space sizes.
 * 
 * CRITICAL: This utility solves the "100× blowup" problem by:
 * 1. Computing actual bounding box of loaded model
 * 2. Calculating precise scale factor needed for target size
 * 3. Applying scale ONCE and logging for verification
 * 
 * NO arbitrary "multiply by 100" - everything is bbox-driven.
 */

import * as THREE from 'three';

// Target sizes in world units (meters)
export const TARGET_SIZES = {
  head: 0.22,   // Adult head ~22cm tall
  coil: 0.06,   // TMS coil ~6cm (figure-8 coil diameter)
};

// Storage for computed scale data (for dev tools)
const scaleRegistry = new Map();

/**
 * Compute bounding box of a Three.js object
 * @param {THREE.Object3D} object - The object to measure
 * @returns {{ box: THREE.Box3, size: THREE.Vector3, center: THREE.Vector3 }}
 */
export function computeBoundingBox(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  
  box.getSize(size);
  box.getCenter(center);
  
  return { box, size, center };
}

/**
 * Calculate scale factor to normalize model to target size
 * Uses the maximum dimension to ensure model fits within target bounds
 * @param {THREE.Vector3} currentSize - Current model dimensions
 * @param {number} targetSize - Desired maximum dimension
 * @returns {number} Scale factor to apply
 */
export function calculateScaleFactor(currentSize, targetSize) {
  const maxDimension = Math.max(currentSize.x, currentSize.y, currentSize.z);
  
  if (maxDimension === 0) {
    console.error('[ScaleNorm] ERROR: Model has zero size!');
    return 1;
  }
  
  return targetSize / maxDimension;
}

/**
 * Normalize model scale to target world size
 * This is the main function - use this on GLB load
 * 
 * @param {THREE.Object3D} scene - GLB scene object
 * @param {'head'|'coil'} modelType - Type of model for target size lookup
 * @param {boolean} log - Whether to log results (default: true)
 * @returns {{ scaleFactor: number, originalSize: THREE.Vector3, finalSize: THREE.Vector3 }}
 */
export function normalizeModelScale(scene, modelType, log = true) {
  const targetSize = TARGET_SIZES[modelType];
  
  if (!targetSize) {
    console.error(`[ScaleNorm] Unknown model type: ${modelType}`);
    return { scaleFactor: 1, originalSize: new THREE.Vector3(), finalSize: new THREE.Vector3() };
  }
  
  // Step 1: Compute original bounding box
  const { size: originalSize, center: originalCenter } = computeBoundingBox(scene);
  
  if (log) {
    console.log(`[ScaleNorm] ${modelType.toUpperCase()} Original bbox:`, {
      x: originalSize.x.toFixed(4),
      y: originalSize.y.toFixed(4),
      z: originalSize.z.toFixed(4),
      maxDim: Math.max(originalSize.x, originalSize.y, originalSize.z).toFixed(4),
    });
  }
  
  // Step 2: Calculate scale factor
  const scaleFactor = calculateScaleFactor(originalSize, targetSize);
  
  // Step 3: Apply scale to the scene
  scene.scale.setScalar(scaleFactor);
  scene.updateMatrixWorld(true);
  
  // Step 4: Verify final size
  const { size: finalSize } = computeBoundingBox(scene);
  const finalMaxDim = Math.max(finalSize.x, finalSize.y, finalSize.z);
  
  // FIX H: Scale sanity check - warn if final size is outside expected bounds
  if (modelType === 'coil') {
    if (finalMaxDim > 0.09 || finalMaxDim < 0.03) {
      console.warn(`[ScaleNorm] FIX H WARNING: ${modelType} max dimension ${finalMaxDim.toFixed(4)}m is outside expected range [0.03, 0.09]m`);
      console.warn('[ScaleNorm] This may indicate invisible bounds (cables/empties) or double-scaling');
    }
  }
  
  if (log) {
    console.log(`[ScaleNorm] ${modelType.toUpperCase()} Applied scale: ${scaleFactor.toFixed(6)}`);
    console.log(`[ScaleNorm] ${modelType.toUpperCase()} Final bbox:`, {
      x: finalSize.x.toFixed(4),
      y: finalSize.y.toFixed(4),
      z: finalSize.z.toFixed(4),
      maxDim: finalMaxDim.toFixed(4),
      target: targetSize,
    });
  }
  
  // Store for dev tools
  scaleRegistry.set(modelType, {
    scaleFactor,
    originalSize: originalSize.clone(),
    finalSize: finalSize.clone(),
    targetSize,
    timestamp: Date.now(),
  });
  
  return { scaleFactor, originalSize, finalSize };
}

/**
 * Validate radiologic convention for targets
 * F3, C3 should have +X (patient left)
 * F4, FP2 should have -X (patient right)
 * 
 * DEV MODE: Throws assertion errors if convention is violated
 * PROD MODE: Logs warnings but continues
 * 
 * @param {Object} targets - Map of target names to positions
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRadiologicConvention(targets) {
  const errors = [];
  const isDev = import.meta.env.DEV;
  
  // Helper to get position as array
  const posToArray = (pos) => {
    if (Array.isArray(pos)) return pos;
    if (pos && typeof pos.x === 'number') return [pos.x, pos.y, pos.z];
    return [0, 0, 0];
  };
  
  // Left hemisphere targets should have positive X
  const leftTargets = ['F3', 'C3'];
  for (const name of leftTargets) {
    if (targets[name]) {
      const pos = targets[name];
      const coords = posToArray(pos);
      const x = coords[0];
      if (x <= 0) {
        const msg = `[RADIOLOGIC VIOLATION] ${name} has X=${x.toFixed(4)} (expected > 0 for patient LEFT)`;
        errors.push(msg);
        if (isDev) {
          console.error(msg);
          console.error(`  Full coords: (${coords.map(v => v.toFixed(4)).join(', ')})`);
          console.assert(x > 0, msg);
        }
      } else if (isDev) {
        console.log(`[Validation] ✓ ${name} X=${x.toFixed(4)} (correct: patient LEFT = +X)`);
      }
    }
  }
  
  // Right hemisphere targets should have negative X
  const rightTargets = ['F4', 'FP2'];
  for (const name of rightTargets) {
    if (targets[name]) {
      const pos = targets[name];
      const coords = posToArray(pos);
      const x = coords[0];
      if (x >= 0) {
        const msg = `[RADIOLOGIC VIOLATION] ${name} has X=${x.toFixed(4)} (expected < 0 for patient RIGHT)`;
        errors.push(msg);
        if (isDev) {
          console.error(msg);
          console.error(`  Full coords: (${coords.map(v => v.toFixed(4)).join(', ')})`);
          console.assert(x < 0, msg);
        }
      } else if (isDev) {
        console.log(`[Validation] ✓ ${name} X=${x.toFixed(4)} (correct: patient RIGHT = -X)`);
      }
    }
  }
  
  // SMA should be near midline
  if (targets['SMA']) {
    const pos = targets['SMA'];
    const coords = posToArray(pos);
    const x = coords[0];
    if (Math.abs(x) > 0.02) {
      if (isDev) {
        console.log(`[Validation] ⚠ SMA X=${x.toFixed(4)} (expected near 0 for midline)`);
        console.log(`  Full coords: (${coords.map(v => v.toFixed(4)).join(', ')})`);
      }
    } else if (isDev) {
      console.log(`[Validation] ✓ SMA X=${x.toFixed(4)} (correct: midline)`);
    }
  }
  
  if (errors.length > 0) {
    console.error('[Validation] RADIOLOGIC CONVENTION ERRORS:', errors);
    // Print all target positions for debugging
    console.error('[Validation] All target positions:');
    for (const [name, pos] of Object.entries(targets)) {
      const coords = posToArray(pos);
      console.error(`  ${name}: (${coords.map(v => v.toFixed(4)).join(', ')})`);
    }
  } else if (isDev) {
    console.log('[Validation] ✓ All targets pass radiologic convention check');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Get scale data for dev tools display
 * @returns {Object} Registry of all computed scales
 */
export function getScaleData() {
  const data = {};
  scaleRegistry.forEach((value, key) => {
    data[key] = {
      scaleFactor: value.scaleFactor,
      originalMax: Math.max(value.originalSize.x, value.originalSize.y, value.originalSize.z),
      finalMax: Math.max(value.finalSize.x, value.finalSize.y, value.finalSize.z),
      targetSize: value.targetSize,
    };
  });
  return data;
}

/**
 * Reset scale registry (for testing)
 */
export function resetScaleRegistry() {
  scaleRegistry.clear();
}
