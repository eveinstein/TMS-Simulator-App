# TMS Simulator

A production-quality 3D TMS (Transcranial Magnetic Stimulation) training simulator built with React and Three.js.

## Features

### TMS Simulator Mode
- **3D Head Model** with EEG targets (F3, F4, FP2, C3, SMA) and fiducials
- **Interactive TMS Coil** with scalp-constrained physics
- **WASD Controls** for surface movement, Q/E for rotation
- **Mouse Drag** to snap coil to scalp positions
- **Protocol Configuration**: frequency, intensity, pulses, inter-train interval
- **Session Timing**: accurate pulse scheduling with progress tracking
- **Target Locking**: lock coil to targets within 20mm
- **Radiologic Convention**: validated left/right orientation

### Motor Threshold (rMT) Training Mode
- **Hunt Phase**: Find the motor hotspot with hidden target
- **Titration Phase**: Determine threshold with single/10-pulse trials
- **Grading System**: A-F grades based on accuracy
- **Realistic Physics**: Distance-dependent response probability

## Controls

| Key | Action |
|-----|--------|
| W/S | Move coil forward/backward on scalp |
| A/D | Move coil left/right on scalp |
| ↑/↓ | Move coil up/down on scalp |
| Q/E | Rotate coil clockwise/counter-clockwise |
| Space | Fire pulse (rMT mode) |
| Mouse Drag | Snap coil to scalp position |

## Installation

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Technology Stack

- React 18
- Three.js / React Three Fiber
- Zustand (state management)
- Vite (build tool)

## Project Structure

```
src/
├── components/
│   ├── scene/          # 3D scene components
│   │   ├── HeadModel.jsx
│   │   ├── TMSCoil.jsx
│   │   └── TMSScene.jsx
│   └── ui/             # Control panels
│       ├── MachinePanel.jsx/css
│       └── RMTPanel.jsx/css
├── stores/
│   └── tmsStore.js     # Zustand store
├── engine/
│   └── pulseScheduler.js
├── utils/
│   ├── scaleNormalization.js
│   └── surfaceMovement.js
├── App.jsx
├── App.css
└── main.jsx
```

## Protocols

Example protocols included:
- Depression 10Hz (standard)
- Depression 1Hz (inhibitory)
- iTBS (intermittent theta burst)
- cTBS (continuous theta burst)
- OCD SMA

## License

MIT
