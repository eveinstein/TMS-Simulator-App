# TMS Simulator: Physics & Mechanics Refactor Plan

**Author:** Principal Engineer  
**Date:** December 2024  
**Status:** ✅ IMPLEMENTATION COMPLETE

---

## Executive Summary

This document outlines a **pragmatic refactor** of the TMS coil movement system. The consultant's advice was technically sound but over-engineered for a medical training simulator. This plan extracts the essential improvements while maintaining simplicity.

---

## Implementation Status

### ✅ Completed Changes

| Item | File | Status |
|------|------|--------|
| Fix panel scrolling | `src/App.css` | ✅ Done |
| Spherical ghost movement | `src/components/scene/TMSCoil.jsx` | ✅ Done |
| Commit-on-hit boundary | `src/components/scene/TMSCoil.jsx` | ✅ Done |
| Transform smoothing | `src/components/scene/TMSCoil.jsx` | ✅ Done |
| Stable rotation basis | `src/utils/surfaceMovement.js` | ✅ Done |
| Updated controls legend | `src/components/scene/TMSScene.jsx` | ✅ Done |
| New helper functions | `src/utils/surfaceMovement.js` | ✅ Done |

### Build Verification

```bash
npm run build  # ✅ Success in 6.91s
```

---

## Problem Analysis

### Current Issues

1. **Scrolling Bug** - ControlPanel cannot scroll on smaller screens
   - **Root Cause:** `.panel-container` in App.css has `overflow: hidden`
   - **Impact:** Critical UX issue, content inaccessible

2. **Movement Jitter at Boundaries**
   - **Root Cause:** XZ clamp → reproject creates discontinuity
   - **Symptoms:** Coil "catches" on invisible walls, stutters

3. **Camera-Relative Movement Confusion**
   - **Root Cause:** WASD maps to camera forward/right, not head-relative
   - **Symptoms:** Same key does different things depending on view angle

4. **Rotation Instability Near Poles**
   - **Root Cause:** `lookAt()` has gimbal lock issues when normal ≈ up
   - **Symptoms:** Coil spins unexpectedly at top of head

5. **Transform Snapping**
   - **Root Cause:** No interpolation between positions/rotations
   - **Symptoms:** Jerky, non-smooth movement

---

## Solution Architecture

### Phase 1: Critical Fixes (Est. 30 min)

#### 1.1 Fix Scrolling
```css
/* App.css - Change line 141 */
.panel-container {
  overflow-y: auto;  /* Was: overflow: hidden */
}
```

#### 1.2 Add Transform Smoothing
Add exponential smoothing to coil transforms in `useFrame`:
```javascript
// New smoothed state
const smoothedPos = useRef(new THREE.Vector3());
const smoothedQuat = useRef(new THREE.Quaternion());

// In useFrame, after computing target:
smoothedPos.current.lerp(targetPos, 1 - Math.exp(-posDamp * delta));
smoothedQuat.current.slerp(targetQuat, 1 - Math.exp(-rotDamp * delta));
```

### Phase 2: Movement System Upgrade (Est. 2-3 hours)

#### 2.1 Spherical Ghost Coordinates

Replace camera-relative movement with head-local spherical coordinates:

```javascript
// New state structure
const ghostState = useRef({
  yaw: 0,          // Rotation around head Y axis (radians)
  pitch: Math.PI/4, // Elevation from equator (radians)
  twistYaw: 0,     // Coil rotation around surface normal
  tiltPitch: 0,    // Coil tilt forward/back
});

// WASD controls yaw/pitch, not XZ world movement
// W/S: adjust pitch (up/down on head)
// A/D: adjust yaw (left/right around head)
```

#### 2.2 Ghost-to-Ray Conversion

Convert spherical coordinates to a ray for surface intersection:

```javascript
function ghostToRay(yaw, pitch, headCenter, headRadius) {
  // Direction in head-local space
  const x = Math.cos(pitch) * Math.sin(yaw);
  const y = Math.sin(pitch);
  const z = Math.cos(pitch) * Math.cos(yaw);
  
  const direction = new THREE.Vector3(x, y, z);
  const origin = headCenter.clone().addScaledVector(direction, headRadius + 0.05);
  
  return {
    origin,
    direction: direction.negate() // Pointing inward
  };
}
```

#### 2.3 Commit-on-Hit Pattern

Only update ghost coordinates when raycast succeeds:

```javascript
// In useFrame:
const candidateYaw = ghostState.yaw + yawDelta;
const candidatePitch = clamp(ghostState.pitch + pitchDelta, pitchMin, pitchMax);

const ray = ghostToRay(candidateYaw, candidatePitch, headCenter, radius);
const hit = raycastSurface(ray, proxyMesh);

if (hit) {
  // SUCCESS: commit the move
  ghostState.yaw = candidateYaw;
  ghostState.pitch = candidatePitch;
  targetPos.copy(hit.point).addScaledVector(hit.normal, offset);
  targetNormal.copy(hit.normal);
} else {
  // FAIL: ghost doesn't move, coil stays put
  // No action needed
}
```

### Phase 3: Rotation Stability (Est. 1 hour)

#### 3.1 Stable Basis Construction

Replace `lookAt()` with explicit orthonormal basis:

```javascript
function buildCoilBasis(surfaceNormal, referenceForward) {
  // up = surface normal (coil faces into head)
  const up = surfaceNormal.clone().negate();
  
  // Project reference forward onto tangent plane
  const dot = referenceForward.dot(up);
  let forward = referenceForward.clone().addScaledVector(up, -dot);
  
  // Handle degenerate case (looking straight down)
  if (forward.lengthSq() < 0.001) {
    forward.set(0, 0, 1); // Fallback
  }
  forward.normalize();
  
  // Complete the basis
  const right = new THREE.Vector3().crossVectors(up, forward).normalize();
  forward.crossVectors(right, up).normalize(); // Re-orthogonalize
  
  // Build rotation matrix → quaternion
  const matrix = new THREE.Matrix4().makeBasis(right, up, forward);
  return new THREE.Quaternion().setFromRotationMatrix(matrix);
}
```

### Phase 4: Parameter Tuning

| Parameter | Current | Recommended | Notes |
|-----------|---------|-------------|-------|
| moveSpeed | 0.10 m/s | 1.5 rad/s (yaw/pitch) | Now angular |
| posDamp | N/A | 15 | Smoothing factor |
| rotDamp | N/A | 12 | Smoothing factor |
| pitchMin | N/A | 0.1 rad | ~6° from equator |
| pitchMax | N/A | 1.4 rad | ~80° from equator |
| scalpOffset | 0.006 m | 0.006 m | Keep same |

---

## Implementation Checklist

### File Changes

| File | Changes |
|------|---------|
| `src/App.css` | Fix panel-container overflow |
| `src/components/scene/TMSCoil.jsx` | Major refactor - new movement system |
| `src/utils/surfaceMovement.js` | Add `buildCoilBasis()`, update `keysToGhostDelta()` |
| `src/components/ui/ControlPanel.css` | Minor cleanup (optional) |

### Testing Plan

1. **Scrolling Test**
   - Resize browser to small height
   - Verify ControlPanel scrolls smoothly
   - Verify all controls accessible

2. **Movement Test**
   - Press W: coil should move toward top of head (regardless of camera)
   - Press A: coil should move toward patient's right (viewer's left)
   - At boundaries: coil should stop, not jitter

3. **Smoothness Test**
   - Tap W repeatedly: motion should be smooth, not jerky
   - Spin camera during movement: coil motion should be consistent

4. **Rotation Test**
   - Move to top of head: coil should not spin wildly
   - Q/E should rotate coil predictably at all positions

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing snap-to-target | Medium | High | Preserve snapToPosition API, just change internals |
| rMT mode regression | Low | High | Test hotspot distance calculation post-refactor |
| Performance regression | Low | Low | Smoothing adds minimal overhead |

---

## What We're NOT Doing (and Why)

1. **InvisibleCap mesh** - Proxy dome already defines boundary via raycast misses
2. **Spider-leg 5-ray sampling** - Overkill; single ray + smoothing is sufficient
3. **Full ScalpSurface rewrite** - Incremental changes to existing class
4. **Blender asset changes** - Code-only solution

---

## Timeline

- **Phase 1 (Critical):** 30 minutes - Can deploy immediately
- **Phase 2 (Movement):** 2-3 hours - Core refactor
- **Phase 3 (Rotation):** 1 hour - Polish
- **Phase 4 (Tuning):** 30 minutes - Iterate

**Total:** ~4-5 hours for complete implementation

---

## Approval

Ready to proceed with implementation. Starting with Phase 1 to unblock the scrolling issue immediately.
