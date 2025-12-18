# TMS Simulator - Manual QA Verification Script

**Date:** December 2024  
**Version:** Post-Audit Release  
**Time Required:** ~30 minutes

---

## Pre-Test Setup

1. Run fresh install: `npm install`
2. Start dev server: `npm run dev`
3. Open browser to http://localhost:5173
4. Open browser DevTools (F12) → Console tab

---

## Test 1: Coil Initializes on Surface

**Steps:**
1. Load the application fresh (hard refresh with Ctrl+Shift+R)
2. Wait for "Loading 3D models..." to disappear
3. Observe coil position

**Expected:**
- [ ] Coil appears above head surface (not inside)
- [ ] Console shows `[TMSCoil] Ready at:` with reasonable Y value (~0.15+)
- [ ] No "no surface hit" errors in console

**Pass/Fail:** ____

---

## Test 2: WASD Movement in Both Modes

**Steps:**
1. In TMS Simulator mode, press W, A, S, D keys
2. Switch to rMT Training mode
3. Press W, A, S, D keys again

**Expected:**
- [ ] Coil moves smoothly in TMS Simulator mode
- [ ] Coil moves smoothly in rMT Training mode
- [ ] Movement is tangent to surface (follows scalp curvature)
- [ ] No jitter or stuttering

**Pass/Fail:** ____

---

## Test 3: Target Snapping Works, Doesn't Disable Movement

**Steps:**
1. Click F3 target button in panel
2. Observe coil snap to F3
3. Press W, A, S, D to move away
4. Click F3 again to re-snap

**Expected:**
- [ ] Coil snaps to F3 position
- [ ] WASD still works after snap
- [ ] Re-clicking same target snaps again
- [ ] Console shows `[TMSCoil] Snapping to:` messages

**Pass/Fail:** ____

---

## Test 4: Target Proximity Shows Name Only

**Steps:**
1. Move coil near F3 target (within ~15mm)
2. Observe position display in panel

**Expected:**
- [ ] Shows target name (e.g., "F3")
- [ ] Does NOT show distance in mm
- [ ] Lock button appears when close

**Pass/Fail:** ____

---

## Test 5: Fiducials are Grey and Info-Only

**Steps:**
1. Locate Nasion, Inion, LPA, RPA markers on head model
2. Click on a fiducial marker
3. Observe marker appearance

**Expected:**
- [ ] Fiducials are silver/grey colored (not colored like targets)
- [ ] Clicking shows info popup only
- [ ] Clicking fiducials does NOT snap coil to them
- [ ] Target buttons (F3, F4, etc.) have unique colors

**Pass/Fail:** ____

---

## Test 6: Panel Scroll Works

**Steps:**
1. Resize browser window to be shorter (~600px height)
2. In TMS Simulator mode, try to scroll the right panel
3. Scroll to reach "Load Example Protocol" section
4. Scroll to reach all Session Controls

**Expected:**
- [ ] Panel body scrolls smoothly
- [ ] Can reach all controls at bottom
- [ ] Header stays fixed at top
- [ ] Scrollbar appears inside panel (not whole page)

**Pass/Fail:** ____

---

## Test 7: DevTools Doesn't Obscure Panel

**Steps:**
1. Look for 🛠️ Dev button (development mode only)
2. If visible, observe its position
3. Click to expand DevTools

**Expected:**
- [ ] DevTools button is on LEFT side (not right)
- [ ] Does not overlap right control panel
- [ ] DevTools panel opens without covering essential controls

**Pass/Fail:** ____

---

## Test 8: Boundary Constraints Without Jitter

**Steps:**
1. Move coil toward edge of scalp (near fiducials)
2. Try to move past the boundary
3. Hold key down at boundary

**Expected:**
- [ ] Coil stops at boundary (doesn't teleport through)
- [ ] No jitter or oscillation at boundary
- [ ] Can move back from boundary smoothly

**Pass/Fail:** ____

---

## Test 9: Q/E Twist and R/F Tilt Controls

**Steps:**
1. Position coil on head
2. Press Q and E keys repeatedly
3. Press R and F keys repeatedly

**Expected:**
- [ ] Q rotates coil counterclockwise (yaw)
- [ ] E rotates coil clockwise (yaw)
- [ ] R tilts coil forward (pitch up)
- [ ] F tilts coil backward (pitch down)
- [ ] Tilt is clamped (~30° max each direction)

**Pass/Fail:** ____

---

## Test 10: rMT Training Mode Flow

**Steps:**
1. Switch to "rMT Training" mode
2. Click "New Trial" button
3. Use WASD to move coil around C3 area
4. Press Spacebar to fire pulses
5. Observe twitch feedback
6. Click "Complete Trial" when ready

**Expected:**
- [ ] Camera moves to side view when entering rMT mode
- [ ] Hotspot marker appears near C3
- [ ] Moving near hotspot shows "Getting warmer" feedback
- [ ] Spacebar fires pulses with twitch probability display
- [ ] Complete Trial shows grade (A/B/C/D/F) and reveals true MT

**Pass/Fail:** ____

---

## Test 11: DevTools Shows Correct State (DEV Mode Only)

**Steps:**
1. Open DevTools panel (🛠️ Dev button)
2. Move coil near F3 target
3. Observe "Target/Proximity State" section

**Expected:**
- [ ] Shows nearestTarget: "F3" when near
- [ ] Shows nearestDistance in mm
- [ ] Shows hoverTargetKey when within threshold
- [ ] selectedTargetKey shows last clicked target
- [ ] isCoilLocked shows false (unless locked)

**Pass/Fail:** ____

---

## Test 12: Build Verification

**Steps:**
1. Stop dev server
2. Run `npm run build`
3. Run `npm run preview`
4. Open preview URL

**Expected:**
- [ ] Build completes without errors
- [ ] Preview loads and works correctly
- [ ] DevTools button is NOT visible in production build
- [ ] All functionality works in built version

**Pass/Fail:** ____

---

## Summary

| Test | Status |
|------|--------|
| 1. Coil initializes on surface | |
| 2. WASD in both modes | |
| 3. Snapping works, doesn't disable movement | |
| 4. Target proximity shows name only | |
| 5. Fiducials grey and info-only | |
| 6. Panel scroll works | |
| 7. DevTools doesn't obscure panel | |
| 8. Boundary constraints without jitter | |
| 9. Q/E twist and R/F tilt controls | |
| 10. rMT training mode flow | |
| 11. DevTools shows correct state | |
| 12. Build verification | |

**Overall Result:** ____/12 tests passing

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

**Tester:** _____________________  
**Date:** _____________________
