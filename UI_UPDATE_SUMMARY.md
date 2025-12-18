# TMS Simulator UI Updates Summary

## Overview
This document summarizes all UI improvements made to the TMS Simulator webapp across both TMS Simulator mode and Motor Threshold (MT) Training mode.

---

## Changes Made

### A) TMS Simulator Mode: Pulse Animation Improvements

**File Modified:** `src/components/scene/TMSCoil.jsx`

**What Changed:**
- Replaced omnidirectional ring-based pulse animation with a focused directional effect
- New animation uses:
  - **Directional cone**: Points INTO the head (negative Y in coil-local space)
  - **Inner bright core**: Sits at coil-scalp interface
  - **Surface contact ring**: Subtle ring at coil-scalp boundary
  - **Focused lobe gradient**: Ellipsoid that hugs the scalp surface

**Tunable Parameters (PULSE_CONFIG):**
```javascript
const PULSE_CONFIG = {
  coneRadius: 0.018,      // Base radius of the focused cone
  coneDepth: 0.025,       // How far the pulse extends "into" the head
  coreRadius: 0.012,      // Inner bright core
  glowRadius: 0.022,      // Outer subtle glow
  duration: 60,           // Animation duration in ms
};
```

**Visual Result:** Pulse effect now appears as a focused field entering the scalp rather than a spherical explosion.

---

### B) TMS Simulator Mode: Side Control Panel Scroll

**File Modified:** `src/components/ui/MachinePanel.css`

**What Changed:**
- Verified and maintained proper scroll chain:
  - `.machine-panel`: `height: 100%`, `min-height: 0`, `overflow: hidden`
  - `.panel-body`: `flex: 1 1 auto`, `min-height: 0`, `overflow-y: auto`
- Custom scrollbar styling with thin scrollbar appearance
- Touch scrolling support with `-webkit-overflow-scrolling: touch`
- Smooth scroll behavior enabled

**Result:** Panel now reliably scrolls when sections are expanded on any window size.

---

### C) Inter-train Interval (ITI) Progress Bar

**Files Modified:** 
- `src/components/ui/MachinePanel.jsx`
- `src/components/ui/MachinePanel.css`

**What Changed:**
- Added `itiProgress` state tracking: `{ inITI: boolean, progress: number, remaining: number }`
- Updated animation loop to expose ITI state from scheduler
- Added ITI progress bar UI component with:
  - Purple color scheme (distinct from main progress bar)
  - "Inter-train interval" label
  - Remaining time display in seconds
  - Smooth fill animation
  - Fade-in animation when appearing

**CSS Styling:**
```css
.iti-progress-wrapper {
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
}
.iti-label { color: #a78bfa; }
.iti-progress-fill { 
  background: linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%);
}
```

**Result:** During protocol execution, when between trains, a purple progress bar appears showing ITI progress.

---

### D) MT Simulator Mode: "Reset to C3" Button Repositioned

**File Modified:** `src/components/ui/RMTPanel.jsx`

**What Changed:**
- Moved "Reset to C3" button from within action-buttons group to a prominent position above the Intensity control section
- Added dedicated styling class `.reset-c3-btn` for full-width display

**Result:** "Reset to C3" is now clearly visible and easily accessible above intensity controls.

---

### E) MT Simulator Mode: Hotspot Target Improvements

**File Modified:** `src/components/scene/TMSScene.jsx`

**What Changed:**
- Reduced hotspot marker sizes:
  - Outer ring: 5-7mm (was 8-10mm)
  - Middle ring: 3-4mm (new)
  - Inner disc: 2.5mm (was 4mm)
  - Glow ring: 7-12mm (new outer glow for visibility)
- Fixed orientation to use proper surface normal alignment
- Added offset from scalp surface (2mm) to prevent z-fighting
- Improved visibility with:
  - Outer glow ring (translucent red)
  - White middle ring for contrast
  - Smaller, crisper overall appearance
- Label made smaller and positioned along surface normal

**Result:** Hotspot is now smaller, more visible between head and coil, and correctly oriented to scalp curvature.

---

### F) MT Simulator Titration: Submit Current Intensity Button

**Files Modified:**
- `src/components/ui/RMTPanel.jsx`
- `src/components/ui/RMTPanel.css`

**What Changed:**
- Added "Submit current intensity (XX%)" button below the typed input submission row
- Button uses current `rmt.intensity` value when clicked
- Disabled until at least one trial has been run (`rmt.titrationCount === 0`)
- Purple styling to distinguish from other actions
- Tooltip explains requirement when disabled

**CSS Styling:**
```css
.btn-action.submit-current {
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #a78bfa;
}
```

**Result:** Users can complete titration by clicking "Submit current intensity" without re-typing the value.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/scene/TMSCoil.jsx` | Directional pulse animation |
| `src/components/scene/TMSScene.jsx` | Improved HotspotMarker component |
| `src/components/ui/MachinePanel.jsx` | ITI progress tracking and display |
| `src/components/ui/MachinePanel.css` | ITI progress bar styles |
| `src/components/ui/RMTPanel.jsx` | Reset button position, Submit current intensity button |
| `src/components/ui/RMTPanel.css` | New button styles |

---

## Manual Test Checklist

### TMS Simulator Mode Tests

- [ ] **Pulse Animation**
  1. Load a protocol (e.g., "Depression 10Hz")
  2. Start session
  3. Observe pulse effect - should appear directional, focused into the head
  4. Verify effect appears beneath coil, not omnidirectional
  5. Effect should be subtle, professional, not flashy

- [ ] **Panel Scroll**
  1. Reduce window height to minimum
  2. Expand Protocol Settings section
  3. Verify all controls remain accessible via scroll
  4. Test scroll with trackpad and mouse wheel
  5. Verify no controls are permanently hidden

- [ ] **ITI Progress Bar**
  1. Load protocol with ITI > 0 (e.g., "Depression 10Hz" with 11s ITI)
  2. Start session and wait for first train to complete
  3. Verify purple "Inter-train interval" bar appears
  4. Bar should fill from 0% to 100% over ITI duration
  5. Remaining time counter should count down
  6. Bar should disappear when next train starts

### MT Simulator Mode Tests

- [ ] **Reset to C3 Button Position**
  1. Start MT Training mode
  2. Begin a new trial
  3. Verify "Reset to C3" button appears above Intensity controls
  4. Button should be full-width and easily visible
  5. Click should snap coil to C3 position

- [ ] **Hotspot Visibility**
  1. Start a trial in MT mode
  2. Click "Reveal Hotspot" button
  3. Verify hotspot marker is:
     - Smaller than before
     - Visible between head and coil GLBs
     - Has glow/outline for visibility
     - Correctly oriented to scalp surface
  4. Move coil near hotspot - target should remain visible

- [ ] **Submit Current Intensity Button**
  1. Start trial and advance to Titration phase
  2. Verify "Submit current intensity" button is disabled initially
  3. Run a 10-pulse trial
  4. Button should now be enabled and show current intensity value
  5. Click button - should complete trial using displayed intensity
  6. Verify typed submission still works separately

---

## State Transitions (ITI Timing)

The ITI progress tracking follows this state flow:

```
Session Started
      │
      ▼
┌─────────────────┐
│   Train Active  │ ◄──────────────────────┐
│ (isPulsing=true)│                        │
└────────┬────────┘                        │
         │ Train complete                  │
         │ (trainPulseCount >= pulsesPerTrain)
         ▼                                 │
┌─────────────────┐                        │
│   ITI Phase     │                        │
│ (inITI=true)    │                        │
│ itiAccumulator  │                        │
│ counting up     │                        │
└────────┬────────┘                        │
         │ ITI complete                    │
         │ (itiAccumulator >= protocol.iti)│
         └────────────────────────────────►┘
```

The `itiProgress` state exposed to React:
- `inITI`: boolean - whether currently in inter-train interval
- `progress`: number (0-1) - percentage of ITI elapsed
- `remaining`: number - seconds remaining in ITI

---

## Performance Notes

- Pulse animation uses `depthWrite: false` on all materials to prevent z-fighting
- ITI progress updates at 60fps during animation loop
- No heavy post-processing effects added
- All animations use CSS transitions where possible for GPU acceleration
