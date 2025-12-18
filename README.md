# Vascular CPT Coding Assistant

A lightweight, high-utility web application for vascular surgeons to search CPT codes, calculate wRVUs, and generate operative reports.

## ✅ All Phases Complete

### Phase 1 - Core Shell
- Next.js 14 + TypeScript + Tailwind CSS
- 152 CPT codes from master database
- Zustand store with year toggle
- Fuse.js fuzzy search with 37799 fallback
- Cart with wRVU totals and smart suggestions

### Phase 2 - Intelligence Layer
- Popup engine with 7 trigger types
- Sidebar with 5 tabbed educational panels
- Contextual banners for coding alerts
- Code-specific tips and suggestions

### Phase 3 - Op-Note Generator
- 26+ template types for all vascular categories
- Patient context form (laterality, access, anesthesia)
- Live preview with placeholder counter
- Copy to clipboard and download functionality

### Phase 4 - Polish ✨ (NEW)
**Keyboard Shortcuts**
| Shortcut | Action |
|----------|--------|
| `/` or `Ctrl+K` | Focus search |
| `?` | Show keyboard shortcuts |
| `Esc` | Close modal / Clear search |
| `Ctrl+G` | Generate Op-Note |
| `Ctrl+R` | Open Quick Reference |
| `Ctrl+Shift+C` | Clear all selected codes |
| `1` | Switch to 2025 |
| `2` | Switch to 2026 |
| `↑↓` | Navigate search results |
| `Enter` | Select result |

**Accessibility**
- Skip to main content link
- ARIA labels and roles throughout
- Screen reader optimized
- Focus management
- Keyboard navigable dropdowns

**Mobile Responsiveness**
- Responsive typography and spacing
- Touch-friendly targets (44px minimum)
- Mobile-optimized search dropdown
- Safe area insets for notched devices
- Responsive quick reference panel

**UI Polish**
- Loading spinner during search
- "No results" empty state
- Smooth animations and transitions
- Gradient accents on headers
- Tooltips with keyboard hints
- Card entry animations
- Custom selection styling

**Performance**
- Debounced search (150ms)
- Memoized popup/banner evaluation
- ForwardRef for focus management
- Optimized re-renders with Zustand selectors

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
/src
  /app
    page.tsx              # Main page with all integrations
    layout.tsx            # Root layout
    globals.css           # Global styles + animations
  /components
    Header.tsx            # App header with year toggle
    KeyboardShortcutsModal.tsx
    /search
      SearchBar.tsx       # Search with forwardRef
      SearchResultRow.tsx # Result with ARIA
    /cart
      SelectedCodes.tsx   # Cart with animations
      CodeCard.tsx        # Selected code card
    /sidebar
      Sidebar.tsx         # Sheet drawer with tabs
      SidebarCard.tsx     # Expandable content
      ContextualBanner.tsx
    /popups
      PopupToast.tsx
    /opnote
      OpNoteModal.tsx
    /ui
      button, badge, input, card
      sheet, tabs, scroll-area
      dialog, select, label
      tooltip, skeleton
  /hooks
    useKeyboardShortcuts.ts
  /lib
    database.ts
    store.ts
    fuseSearch.ts
    popupEngine.ts
    opNoteTemplates.ts
    utils.ts
  /content
    sidebarContent.ts
  /data
    master_vascular_db.json
    popup_trigger_config.json
  /types
    index.ts
```

## Features Summary

| Feature | Description |
|---------|-------------|
| **Search** | Fuzzy search across 152 codes with keyboard nav |
| **Year Toggle** | Switch between 2025/2026 wRVU values |
| **Cart** | Add/remove codes, see totals with animations |
| **Popups** | Context-aware coding alerts and reminders |
| **Sidebar** | 5-tab educational reference (modifiers, add-ons, etc.) |
| **Op-Note** | Generate draft operative reports from codes |
| **Shortcuts** | Full keyboard navigation throughout |
| **Mobile** | Responsive design for all screen sizes |

## Database Stats

- **Total Codes:** 152
- **Active:** 90
- **New 2026:** 46
- **Deleted 2026:** 16
- **Categories:** 12
- **Template Types:** 26+

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Compliance Note

Educational reference only. Bill only when supported by medical necessity, documentation, and payer policy.

All generated op-notes are DRAFTS ONLY and must be edited to reflect the actual case.

---

**Vascular CPT Coding Assistant v1.0**  
Built with Next.js 14, TypeScript, Tailwind CSS, Zustand, Fuse.js, and Radix UI
