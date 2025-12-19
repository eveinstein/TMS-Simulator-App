/**
 * targets.js
 * ===========
 * Single source of truth for all EEG target metadata.
 * Import this file instead of defining target info inline.
 * 
 * Radiologic Convention:
 * - Patient LEFT = +X (viewer's RIGHT)
 * - Patient RIGHT = -X (viewer's LEFT)
 * - F3/C3 should have positive X coordinates
 * - F4/FP2 should have negative X coordinates
 */

/**
 * Complete target information including name, description, hemisphere, and UI label.
 */
export const TARGETS = {
  F3: {
    key: 'F3',
    name: 'Left DLPFC (F3)',
    label: 'L-DLPFC',
    hemisphere: 'left',
    description: 'Left dorsolateral prefrontal cortex - Depression treatment target. Beam F3 method uses tape measure from nasion.',
    color: '#00d4ff',  // Cyan
  },
  F4: {
    key: 'F4',
    name: 'Right DLPFC (F4)',
    label: 'R-DLPFC',
    hemisphere: 'right',
    description: 'Right dorsolateral prefrontal cortex',
    color: '#a855f7',  // Purple
  },
  FP2: {
    key: 'FP2',
    name: 'Right OFC (FP2)',
    label: 'R-OFC',
    hemisphere: 'right',
    description: 'Right orbitofrontal cortex',
    color: '#f97316',  // Orange
  },
  C3: {
    key: 'C3',
    name: 'Left Motor (C3)',
    label: 'L-Motor',
    hemisphere: 'left',
    description: 'Left primary motor cortex - Motor threshold hotspot region',
    color: '#22c55e',  // Green
  },
  SMA: {
    key: 'SMA',
    name: 'SMA',
    label: 'SMA',
    hemisphere: 'midline',
    description: 'Supplementary Motor Area - Motor planning and coordination',
    color: '#3b82f6',  // Blue
  },
};

/**
 * Target colors for 3D markers
 */
export const TARGET_COLORS = {
  F3: '#00d4ff',   // Cyan
  F4: '#a855f7',   // Purple
  FP2: '#f97316',  // Orange
  C3: '#22c55e',   // Green
  SMA: '#3b82f6',  // Blue
};

/**
 * Fiducial marker color (silver/grey)
 */
export const FIDUCIAL_COLOR = '#b0b0b0';

/**
 * All target keys as an array
 */
export const TARGET_KEYS = Object.keys(TARGETS);

/**
 * Validate radiologic convention for extracted positions
 * @param {Object} positions - Map of target key to Vector3 position
 * @returns {boolean} - True if positions follow radiologic convention
 */
export function validateRadiologicConvention(positions) {
  if (import.meta.env.DEV) {
    const leftTargets = ['F3', 'C3'];
    const rightTargets = ['F4', 'FP2'];
    
    for (const key of leftTargets) {
      if (positions[key]) {
        console.assert(
          positions[key].x > 0,
          `[Radiologic Convention] ${key} should have positive X (patient left), got ${positions[key].x}`
        );
      }
    }
    
    for (const key of rightTargets) {
      if (positions[key]) {
        console.assert(
          positions[key].x < 0,
          `[Radiologic Convention] ${key} should have negative X (patient right), got ${positions[key].x}`
        );
      }
    }
    
    console.log('[Validation] ✓ Radiologic convention validated');
  }
  return true;
}

export default TARGETS;
