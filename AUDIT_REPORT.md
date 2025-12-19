# TMS Simulator - Position-Based Layout (No Flex Compression)

## Status: ✅ BULLETPROOF LAYOUT

The panel uses **position: absolute** instead of flexbox for the header/body split.
This guarantees sections cannot be compressed by flex algorithms.

---

## Layout Architecture

```css
.machine-panel {
  position: relative;    /* Establishes positioning context */
  height: 100%;
  overflow: hidden;
}

.panel-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;          /* Fixed height */
}

.panel-body {
  position: absolute;
  top: 56px;             /* Below header */
  left: 0;
  right: 0;
  bottom: 0;             /* Fills to bottom */
  overflow-y: auto;      /* Scrolls when content exceeds */
}
```

**Why this works:**
- Header has explicit fixed height (56px)
- Body uses `top`/`bottom` positioning to fill remaining space
- No flex algorithm involved in height calculation
- Sections inside panel-body are regular block elements
- `overflow-y: auto` creates scrollbar when needed

---

## What Flex IS Used For

Flex is only used for **horizontal layouts within components**:
- `.panel-header` - horizontal layout for title/status
- `.panel-title` - icon + text alignment
- `.section-header` - title row + chevron
- `.target-chips` - grid of buttons (actually CSS grid)
- `.param-grid-compact` - form field grid (CSS grid)

These are all **horizontal** or **grid** layouts that don't affect vertical compression.

---

## Visual Design

- Deep space black (#08090c)
- Electric cyan accent (#00e5ff)
- Glassmorphism cards with backdrop blur
- Circular SVG progress indicator
- Responsive at 750px and 600px heights

---

## Files Using Position-Absolute Layout

| File | Layout |
|------|--------|
| `MachinePanel.css` | position: absolute for header/body |
| `RMTPanel.css` | position: absolute for header/body |

---

## Test Results

All 22 MT Training tests pass ✅
