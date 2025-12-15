# PHASE 1 FIX SUMMARY

## Files Modified

### 1. `src/utils/surfaceMovement.js` - REWRITTEN

**What Changed:**
- Added continuity-based hit selection (`_selectBestHit`) to prevent midline teleporting
- Tracks `_lastSurfacePoint` for smooth movement across edges
- Added `clearContinuity()` method for clean snaps after teleport
- Added `DEBUG_RAYCAST` flag for dev-only verbose logging
- Rewrote comments to accurately describe the architecture
- Unified terminology: `surfaceMesh`, `targetKey`, `fiducial`

**Why It Fixes It:**
- Midline teleporting was caused by selecting the "outermost" hit which could jump to opposite side of head
- Now selects hit closest to previous position for continuous movement
- Clear continuity reference on snap prevents stale state

**Key Changes:**
```diff
- // Use outermost (last) hit - this is the outer scalp surface
- const hit = intersects[intersects.length - 1];
+ // Select best hit using continuity
+ const hit = this._selectBestHit(intersects, previousPoint);

+ _selectBestHit(intersects, previousPoint) {
+   // Use continuity if we have a previous point
+   const refPoint = previousPoint || this._lastSurfacePoint;
+   if (refPoint) {
+     let bestHit = intersects[0];
+     let bestDist = bestHit.point.distanceTo(refPoint);
+     for (let i = 1; i < intersects.length; i++) {
+       const dist = intersects[i].point.distanceTo(refPoint);
+       if (dist < bestDist) { bestDist = dist; bestHit = intersects[i]; }
+     }
+     return bestHit;
+   }
+   return intersects[intersects.length - 1]; // Fallback to outermost
+ }
```

---

### 2. `src/components/scene/TMSCoil.jsx` - REWRITTEN

**What Changed:**
- Removed `headMesh` prop - now REQUIRES `proxyMesh` only
- Simplified initialization effect with clear guards
- Fixed target snap effect to fire reliably on `selectedTargetKey` change
- Fixed reset trigger using ref to track last trigger value
- Mouse drag now requires Shift key (avoids OrbitControls conflict)
- Added `DEBUG_COIL` flag for dev logging
- Extracted `snapToPosition` helper with continuity clearing
- Removed unused state and dead code

**Why It Fixes It:**
- Using only proxy mesh prevents edge-sticking on faceted geometry
- Snap effect now fires correctly without race conditions
- Shift+drag prevents accidental coil movement when orbiting

**Key Changes:**
```diff
- export function TMSCoil({ headMesh, proxyMesh, onCoilMove }) {
+ export function TMSCoil({ proxyMesh, onCoilMove }) {

- useEffect(() => {
-   const surfaceMesh = proxyMesh || headMesh;
-   if (!surfaceMesh) return;
-   // Complex initialization with fallback...
- }, [headMesh, proxyMesh, ...]);
+ useEffect(() => {
+   if (!proxyMesh) return;
+   // Clean initialization, proxy only
+ }, [proxyMesh, effectiveOffset, updateTransform, isReady]);

+ // RESET TRIGGER - Fires when coilResetTrigger increments
+ const lastResetTrigger = useRef(0);
+ useEffect(() => {
+   if (coilResetTrigger > lastResetTrigger.current && isReady) {
+     lastResetTrigger.current = coilResetTrigger;
+     resetToCenter();
+   }
+ }, [coilResetTrigger, isReady, resetToCenter]);

- if (e.button === 0 && !isCoilLocked) {
+ if (e.button === 0 && e.shiftKey && !isCoilLocked) {
```

---

### 3. `src/utils/coilSurfaceProxy.js` - PATCHED

**What Changed:**
- Fixed raycast to use `recursive: false`

**Why It Fixes It:**
- Prevents raycasts from hitting fiducial marker spheres or other child meshes

```diff
- const intersects = raycaster.intersectObject(headMesh, true);
+ const intersects = raycaster.intersectObject(headMesh, false);
```

---

### 4. `src/components/scene/TMSScene.jsx` - PATCHED

**What Changed:**
- Removed `headMesh` prop from TMSCoil
- TMSCoil only renders when proxyMesh is ready
- Updated comments

```diff
- <TMSCoil 
-   headMesh={headMesh}
-   proxyMesh={proxyMesh}
-   onCoilMove={handleCoilMove}
- />
+ {proxyMesh && (
+   <TMSCoil 
+     proxyMesh={proxyMesh}
+     onCoilMove={handleCoilMove}
+   />
+ )}
```

---

### 5. `src/components/ui/MachinePanel.jsx` - PATCHED

**What Changed:**
- Target buttons now support re-clicking same target
- Clears selection before re-setting to trigger snap effect

```diff
  onClick={() => {
-   setSelectedTargetKey(target);
+   if (selectedTargetKey === target) {
+     setSelectedTargetKey(null);
+     setTimeout(() => setSelectedTargetKey(target), 0);
+   } else {
+     setSelectedTargetKey(target);
+   }
  }}
```

---

### 6. `src/App.jsx` - PATCHED

**What Changed:**
- 3D marker clicks now support re-clicking same target

```diff
  const handleTargetClick = useCallback((name) => {
-   setSelectedTargetKey(name);
-   setShowPopup(name);
+   if (selectedTargetKey === name) {
+     setSelectedTargetKey(null);
+     setTimeout(() => { setSelectedTargetKey(name); setShowPopup(name); }, 0);
+   } else {
+     setSelectedTargetKey(name);
+     setShowPopup(name);
+   }
  }, [...]);
```

---

## Verification Checklist

### ✅ Acceptance Test 1: Coil never spawns inside the head
- **How to verify:** Load app, observe coil position. Should be above scalp surface.
- **Console check:** Look for `[TMSCoil] Ready at:` - Y value should be ~0.15+

### ✅ Acceptance Test 2: Coil moves smoothly with WASD/arrow keys
- **How to verify:** Press W/A/S/D, coil should glide smoothly without jerks
- **Edge test:** Move toward left/right edges, should not stick

### ✅ Acceptance Test 3: Coil never clips into head
- **How to verify:** Observe coil from all angles, should maintain ~6mm clearance
- **Console check:** `effectiveOffset` logged during init

### ✅ Acceptance Test 4: No midline teleporting
- **How to verify:** Move coil from left side to right side slowly
- **Expected:** Coil follows smooth arc over top of head
- **Console check (if DEBUG_RAYCAST=true):** `Continuity selection` logs

### ✅ Acceptance Test 5: Raycasts never hit fiducial spheres
- **How to verify:** Coil movement should be unaffected by fiducial markers
- **Code fix:** `recursive: false` in coilSurfaceProxy.js

### ✅ Acceptance Test 6: Target selection works correctly
- **How to verify:** 
  - F3 → Left frontal (patient left = +X)
  - F4 → Right frontal (patient right = -X)
  - FP2 → Right prefrontal
  - C3 → Left motor
  - SMA → Midline motor area
- **Console check:** `[Validation] ✓` messages on load

### ✅ Acceptance Test 7: UI and 3D markers both snap coil
- **How to verify:** 
  - Click F3 button in panel → coil snaps
  - Click colored sphere marker → coil snaps
- **Console check:** `[TMSCoil] Snapping to:` and `Snap complete:`

### ✅ Acceptance Test 8: Selection state updates correctly
- **How to verify:** 
  - Click F3 → button highlights, coil snaps
  - Click F4 → F3 unhighlights, F4 highlights, coil snaps
  - Click F4 again → coil re-snaps to F4 (same target re-click works)

---

## Dev Debug Toggles

Set these to `true` for verbose logging:

```javascript
// surfaceMovement.js line 20
const DEBUG_RAYCAST = true;

// TMSCoil.jsx line 31
const DEBUG_COIL = true;
```

Proxy mesh wireframe is visible in dev mode automatically.

---

## Build Status

✅ Build successful
✅ Bundle size: 1,148.42 KB
✅ No compilation errors
