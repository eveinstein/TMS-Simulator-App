# TMS Simulator

A production-quality 3D Transcranial Magnetic Stimulation (TMS) Simulator built with React, Three.js, and premium medical device UI aesthetics.

## Features

### 3D Visualization
- **Realistic head model** with proper lighting (key, fill, rim lights)
- **Interactive target markers** (F3, F4, FP2, C3, SMA)
- **Anatomical fiducials** (Nasion, Inion, LPA, RPA)
- **TMS coil** with surface-attached sliding behavior

### Coil Interaction
- **Scalp-attached sliding**: Coil stays constrained to the scalp surface via raycasting
- **Rotation controls**: Hold Shift + drag to rotate coil around its local normal
- **Snap-to-target**: Click targets to snap and lock the coil
- **Distance indicator**: Real-time display of distance to nearest target (in mm)
- **Lock mechanism**: Prevents accidental coil movement during sessions

### Target Information
- Click any target or fiducial for educational popups
- **F3 popup** includes Left DLPFC info and Beam F3 tape-measure method description
- **SMA popup** includes Supplementary Motor Area explanation and positioning
- Coordinate convention clearly displayed

### TMS Machine Control Panel
- **Stimulation types**: Standard rTMS (1-20 Hz), iTBS, cTBS
- **Parameters**: Frequency, intensity, pulses per train, ITI, total pulses
- **Presets**: One-click protocol loading (10 Hz F3 depression, SMA OCD, etc.)
- **Session controls**: Start, Pause, Resume, Stop, Reset
- **Progress tracking**: Real-time pulse count, elapsed/remaining time, progress bar

## Radiologic Convention

**This simulator strictly enforces radiologic convention:**

```
Patient LEFT  = +X axis = Viewer's RIGHT
Patient RIGHT = −X axis = Viewer's LEFT
```

## Installation

```bash
npm install
npm run dev
```

## How Scalp Sliding Works

1. **Raycasting**: On pointer move, ray cast from camera through cursor
2. **Intersection**: Ray tested against head mesh
3. **Position**: Coil placed at intersection + offset along normal
4. **Orientation**: Rotation aligned with scalp tangent plane
5. **User rotation**: Shift+drag rotates around local normal

## Swapping GLB Models

### Head Model
Place at `public/models/head.glb`. Include:
- Main head mesh (named "head" or "scalp")
- Target markers: F3, F4, FP2, C3, SMA
- Fiducials: Nasion, Inion, LPA, RPA

### Coil Model
Place at `public/models/coil.glb` with contact surface facing -Y.

## Protocol Timing

```
train_duration = pulses_per_train / frequency_hz
session_duration = (num_trains × train_duration) + ((num_trains - 1) × ITI)
```

Example 10 Hz / 3000 pulses / 40 per train / 11s ITI ≈ 18.6 minutes
