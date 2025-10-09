# PDF Signature Field Placement Refactor
## Comprehensive Technical Specification

**Date:** 2025-10-07
**Status:** Pre-Implementation - Consensus Reached
**Priority:** High - Fixes nested scrollbar issue permanently

---

## Executive Summary

Refactor the PDF signature field placement modal from iframe/object-based rendering to **react-pdf library** to eliminate nested scrollbars, gain precise control over PDF rendering, and enable dynamic height calculation.

**Key Change:** Replace `<iframe>` with react-pdf's `<Document>` and `<Page>` components for full rendering control.

---

## Current Problems

### Critical Issues
1. **Nested Scrollbars** - iframe/object internal PDF viewer creates second scrollbar despite `scrollbar=0` and `overflow:hidden`
2. **Fixed Height Mismatch** - 2400px hardcoded height doesn't match actual PDF content (causes extra white space or cut-off content)
3. **No PDF Metadata** - Cannot detect page count, dimensions, or orientation
4. **Browser Inconsistency** - `pointer-events-none` behavior varies across browsers
5. **Poor Mobile Support** - iframe rendering poor on mobile devices

### Technical Debt
- Manual height adjustments for different PDF sizes
- No way to validate PDF loaded correctly
- No accessibility features (text selection, screen readers)
- Cannot prevent PDF toolbar/controls reliably

---

## Requirements

### Functional Requirements
| ID | Requirement | Priority | Notes |
|----|------------|----------|-------|
| FR-1 | Multi-page PDF support (1-10 pages typical) | P0 | Admin template setup use case |
| FR-2 | Single parent scroll container only | P0 | No nested scrollbars ever |
| FR-3 | Drag-and-drop field placement | P0 | Must work pixel-perfect |
| FR-4 | Field overlay alignment during scroll | P0 | Fields must stay locked to PDF position |
| FR-5 | Required/optional field indicators | P1 | Already implemented, maintain |
| FR-6 | Mobile responsive | P2 | Admin UI, desktop-first acceptable |
| FR-7 | Fast load times (<3s for 5-page PDF) | P1 | Admin UX consideration |

### Technical Requirements
| ID | Requirement | Rationale |
|----|------------|-----------|
| TR-1 | Dynamic height calculation | Matches actual PDF content, no white space |
| TR-2 | Per-page coordinate systems | Each page can have different dimensions |
| TR-3 | Percentage-based positioning | Responsive scaling across viewports |
| TR-4 | Async loading state management | Handle progressive page rendering |
| TR-5 | Canvas rendering mode | Stable, proven, no SVG quirks |

---

## Debate Resolution

### Argument 1: Canvas vs SVG Rendering

**CLAUDE CLI Position:**
SVG rendering preferred for:
- Text selection capability
- Better accessibility
- Scalability without quality loss
- Easier coordinate mapping

**CLAUDE CODE Counter:**
Canvas rendering preferred because:
- Default mode, more stable and tested
- Text selection NOT needed in admin field placement UI
- Users aren't reading PDF, just placing fields
- Complex PDFs have SVG rendering quirks
- Canvas performance fine for 1-10 pages

**CONSENSUS: ✅ Canvas Rendering**
Rationale: Admin-only UI, stability over accessibility. Can revisit if end-user signing requires text selection.

---

### Argument 2: Render All Pages vs Virtualization

**CLAUDE CLI Position:**
Virtualization required because:
- Memory explosion for large PDFs (50+ pages)
- 50-page PDF at 1.5x scale = ~50MB+ canvas data
- Mobile devices will crash
- Performance degradation

**CLAUDE CODE Counter:**
Render all pages acceptable because:
- Use case is 1-10 pages typical, NOT 50 pages
- Admin interface, not end-user signing
- 10 pages at 1.5x = ~10MB memory, acceptable
- Simpler implementation, no virtualization complexity
- Can add warning for 10+ page documents

**CONSENSUS: ✅ Render All Pages (with safeguards)**
Rationale: Optimize for common case (1-10 pages). Add warning modal if PDF >10 pages. Can add virtualization later if needed.

---

### Argument 3: Percentage vs Absolute Coordinates

**CLAUDE CLI Position:**
Absolute coordinates (PDF points) required:
- OpenSign API uses PDF coordinate system (72 DPI)
- Each page can have different dimensions
- Percentages don't translate correctly across scales
- Letter vs Legal page sizing breaks percentage math

**CLAUDE CODE Counter:**
Percentage coordinates already working:
- Current implementation uses % (x, y, width, height all 0-100)
- Responsive scaling easier across viewport sizes
- Convert % to PDF points only when saving to backend
- Each page rendered at consistent width, % works fine

**CONSENSUS: ✅ Percentage for UI, PDF Points for Storage**
Rationale: Keep % in frontend for responsive behavior. Convert to absolute PDF points during save operation. Store both in database for flexibility.

---

### Argument 4: Single Overlay vs Per-Page Overlays

**CLAUDE CLI Position:**
Per-page overlays required:
- Each page has independent coordinate system
- Pages render with individual transforms/scales
- Total height calculation async and race-prone
- Cannot position absolutely across multiple canvases

**CLAUDE CODE Counter:**
Could use single overlay if:
- Stack pages vertically in one container
- Calculate cumulative offsets
- Map global Y position to page + page-relative Y

**CONSENSUS: ✅ Per-Page Overlays**
Rationale: Cleaner architecture, avoids complex offset math. Each page is self-contained unit with its own overlay div.

---

### Argument 5: Loading State Strategy

**Options Considered:**

**Option A: Spinner Until All Pages Loaded**
- Pros: No visual jumps, prevents premature field placement, simpler
- Cons: Blocks UI for 1-2 seconds

**Option B: Progressive Page Rendering**
- Pros: Faster perceived load time, pages appear incrementally
- Cons: Overlays appear asynchronously, potential positioning errors

**Option C: Fixed Aspect Ratio Assumption**
- Pros: Instant UI, adjusts when loaded
- Cons: Visual jumps, bad UX, complex state updates

**CONSENSUS: ✅ Option A - Loading Spinner**
Rationale: Admin UI can afford 1-2 second wait. Prevents positioning errors. Clean, simple implementation.

---

## Final Architecture

### Component Structure

```
FieldEditorModal
├── Loading State (spinner until allPagesLoaded)
├── PDF Container (overflow-y-auto, single scroll)
│   └── Document (react-pdf)
│       ├── Page 1
│       │   ├── Canvas (rendered PDF)
│       │   └── FieldOverlay 1 (absolute positioned)
│       │       ├── Field 1-1 (draggable, resizable)
│       │       └── Field 1-2 (draggable, resizable)
│       ├── Page 2
│       │   ├── Canvas (rendered PDF)
│       │   └── FieldOverlay 2 (absolute positioned)
│       │       └── Field 2-1 (draggable, resizable)
│       └── ...
└── Sidebar (field types palette)
```

### State Management

```typescript
// PDF Loading
const [numPages, setNumPages] = useState<number>(0);
const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
const [pageHeights, setPageHeights] = useState<number[]>([]);
const [pageWidths, setPageWidths] = useState<number[]>([]);

// Computed
const allPagesLoaded = loadedPages.size === numPages && numPages > 0;
const totalHeight = pageHeights.reduce((sum, h) => sum + h + GAP, 0);
const cumulativeOffsets = pageHeights.reduce((acc, h) =>
  [...acc, (acc[acc.length - 1] || 0) + h + GAP], [0]
);

// Fields
interface Field {
  id: string;
  type: 'signature' | 'initials' | 'checkbox' | 'date' | 'text';
  pageNumber: number; // NEW: Which page (1-indexed)
  x: number;          // Percentage (0-100) relative to page width
  y: number;          // Percentage (0-100) relative to page height
  width: number;      // Percentage (0-100) relative to page width
  height: number;     // Percentage (0-100) relative to page height
  label?: string;
  required: boolean;
}
```

### Drag-Drop Coordinate Mapping Algorithm

```typescript
// When user drops field at screen coordinates (clientX, clientY)

function handleFieldDrop(e: DragEvent, fieldType: FieldType) {
  const container = containerRef.current;
  const containerRect = container.getBoundingClientRect();

  // 1. Get scroll-adjusted Y position
  const scrollY = container.scrollTop;
  const absoluteY = e.clientY - containerRect.top + scrollY;

  // 2. Find which page using cumulative offsets
  let pageNumber = 1;
  for (let i = 0; i < cumulativeOffsets.length; i++) {
    if (absoluteY >= cumulativeOffsets[i]) {
      pageNumber = i + 1;
    } else {
      break;
    }
  }

  // 3. Calculate page-relative position
  const pageStartY = cumulativeOffsets[pageNumber - 1];
  const pageRelativeY = absoluteY - pageStartY;
  const pageRelativeX = e.clientX - containerRect.left;

  // 4. Convert to percentages
  const pageWidth = pageWidths[pageNumber - 1];
  const pageHeight = pageHeights[pageNumber - 1];

  const xPercent = (pageRelativeX / pageWidth) * 100;
  const yPercent = (pageRelativeY / pageHeight) * 100;

  // 5. Center field on cursor (subtract half field dimensions)
  const fieldWidth = FIELD_DIMENSIONS[fieldType].width;
  const fieldHeight = FIELD_DIMENSIONS[fieldType].height;

  const finalX = Math.max(0, Math.min(100 - fieldWidth, xPercent - fieldWidth / 2));
  const finalY = Math.max(0, Math.min(100 - fieldHeight, yPercent - fieldHeight / 2));

  // 6. Create field
  const newField: Field = {
    id: `field_${Date.now()}`,
    type: fieldType,
    pageNumber,
    x: finalX,
    y: finalY,
    width: fieldWidth,
    height: fieldHeight,
    label: `${fieldType} ${fields.length + 1}`,
    required: true
  };

  setFields([...fields, newField]);
}
```

### Save Operation: Convert to PDF Points

```typescript
async function handleSaveFields() {
  // Convert percentage coordinates to PDF points for OpenSign
  const fieldPositions = fields.map(field => {
    const pageWidth = pageWidths[field.pageNumber - 1];
    const pageHeight = pageHeights[field.pageNumber - 1];

    // PDF coordinate system: origin at bottom-left
    // React coordinate system: origin at top-left
    const xInPoints = (field.x / 100) * pageWidth;
    const yInPoints = pageHeight - ((field.y / 100) * pageHeight); // Flip Y axis
    const widthInPoints = (field.width / 100) * pageWidth;
    const heightInPoints = (field.height / 100) * pageHeight;

    return {
      type: field.type,
      page: field.pageNumber,
      x: xInPoints,
      y: yInPoints,
      width: widthInPoints,
      height: heightInPoints,
      label: field.label,
      required: field.required
    };
  });

  await api.updateTemplateFields(template.id, fieldPositions);
}
```

---

## Implementation Plan

### Phase 1: Setup Dependencies (30 min)

**Tasks:**
1. Install react-pdf and dependencies
   ```bash
   npm install react-pdf pdfjs-dist
   ```

2. Configure PDF.js worker in Next.js

3. Update TypeScript types

**Acceptance Criteria:**
- [ ] react-pdf installed and working
- [ ] PDF.js worker configured correctly
- [ ] No build errors

---

### Phase 2: Basic PDF Rendering (1 hour)

**Tasks:**
1. Replace iframe/object with react-pdf Document component
2. Implement Document onLoadSuccess handler (get numPages)
3. Render all Page components in map
4. Implement Page onLoadSuccess handler (get dimensions)
5. Track loaded pages state
6. Show loading spinner until allPagesLoaded

**Code Changes:**
```typescript
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// In component
<Document
  file={pdfBlobUrl}
  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
  loading={<LoadingSpinner />}
>
  {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
    <div key={pageNum} className="relative mb-4">
      <Page
        pageNumber={pageNum}
        width={800}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onLoadSuccess={(page) => {
          const { width, height } = page;
          setPageWidths(prev => { prev[pageNum - 1] = width; return [...prev]; });
          setPageHeights(prev => { prev[pageNum - 1] = height; return [...prev]; });
          setLoadedPages(prev => new Set([...prev, pageNum]));
        }}
      />
      {/* Overlay will go here */}
    </div>
  ))}
</Document>
```

**Acceptance Criteria:**
- [ ] PDF renders correctly using react-pdf
- [ ] All pages visible
- [ ] Loading spinner shows until complete
- [ ] Page dimensions captured correctly

---

### Phase 3: Field Overlay System (1.5 hours)

**Tasks:**
1. Create per-page overlay divs (absolute positioned over each Page)
2. Filter fields by pageNumber
3. Render fields on correct page overlays
4. Update field rendering to use per-page coordinates

**Code Changes:**
```typescript
{Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
  <div key={pageNum} className="relative mb-4">
    <Page ... />

    {/* Per-page field overlay */}
    <div
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ height: pageHeights[pageNum - 1] }}
    >
      {fields
        .filter(field => field.pageNumber === pageNum)
        .map(field => (
          <FieldComponent
            key={field.id}
            field={field}
            onMove={(dx, dy) => handleFieldMove(field.id, dx, dy)}
            onResize={(dw, dh) => handleFieldResize(field.id, dw, dh)}
            onToggleRequired={() => handleToggleRequired(field.id)}
            onDelete={() => handleRemoveField(field.id)}
          />
        ))
      }
    </div>
  </div>
))}
```

**Acceptance Criteria:**
- [ ] Fields render on correct pages
- [ ] Fields positioned correctly using percentages
- [ ] No overlap between pages
- [ ] Required/optional indicators visible

---

### Phase 4: Drag-Drop Implementation (2 hours)

**Tasks:**
1. Implement handleDragOver on per-page containers
2. Implement handleDrop with coordinate mapping
3. Calculate cumulative offsets for multi-page scrolling
4. Map drop coordinates to page number + page-relative position
5. Test field placement across all pages

**Code Changes:**
Implement algorithm from "Drag-Drop Coordinate Mapping Algorithm" section above.

**Acceptance Criteria:**
- [ ] Can drag fields from sidebar to any page
- [ ] Fields land at cursor position (centered)
- [ ] Coordinates mapped correctly with scroll offset
- [ ] Works on first and last pages
- [ ] Works mid-scroll

---

### Phase 5: Field Interaction (1.5 hours)

**Tasks:**
1. Implement field dragging (move existing fields)
2. Implement field resizing (corner handles)
3. Implement required/optional toggle
4. Implement field deletion
5. Constrain fields to page boundaries (can't drag off edge)

**Acceptance Criteria:**
- [ ] Can move fields within same page
- [ ] Cannot drag field to different page (constraint to page bounds)
- [ ] Can resize fields with corner handle
- [ ] Can toggle required/optional
- [ ] Can delete fields

---

### Phase 6: Save/Load Integration (1 hour)

**Tasks:**
1. Update handleSaveFields to convert % to PDF points
2. Implement Y-axis flip for PDF coordinate system
3. Load existing fields from template.fieldPositions
4. Convert PDF points back to % for display
5. Test round-trip (save → reload → display)

**Acceptance Criteria:**
- [ ] Fields save with correct PDF coordinates
- [ ] Backend stores field positions correctly
- [ ] Reload template shows fields in correct positions
- [ ] No coordinate drift after save/reload

---

### Phase 7: Edge Cases & Polish (1 hour)

**Tasks:**
1. Handle PDFs with mixed orientations (portrait/landscape)
2. Handle very small PDFs (<1 page)
3. Handle exactly 10 pages (boundary condition)
4. Add warning modal for 11+ page PDFs
5. Error handling for corrupt/invalid PDFs
6. Mobile responsive adjustments

**Acceptance Criteria:**
- [ ] Mixed orientation PDFs render correctly
- [ ] Small PDFs don't break layout
- [ ] Warning shown for large PDFs
- [ ] Graceful error messages for invalid PDFs
- [ ] Works on tablet devices (768px width)

---

## Testing Strategy

### Unit Tests
- [ ] Coordinate mapping function (drop → page + % position)
- [ ] Percentage → PDF points conversion
- [ ] PDF points → percentage conversion (Y-axis flip)
- [ ] Cumulative offset calculation
- [ ] Field boundary constraints

### Integration Tests
- [ ] Load 1-page PDF, place field, save, reload
- [ ] Load 5-page PDF, place fields on pages 1, 3, 5
- [ ] Load PDF, place field, move field, save, reload
- [ ] Load PDF, place field, resize field, save, reload
- [ ] Load PDF with existing fields, verify positions

### Manual Testing Checklist
- [ ] Upload W-4 form (2 pages), place signature on page 2
- [ ] Upload I-9 form (3 pages), place multiple fields across pages
- [ ] Scroll through multi-page PDF while dragging field
- [ ] Resize browser window, verify fields stay aligned
- [ ] Toggle required/optional, verify visual indicators
- [ ] Delete fields, verify they're removed from all pages

---

## Performance Considerations

### Memory Usage
- **Current:** ~5MB per page (canvas rendering at 1.5x scale)
- **10 pages:** ~50MB total
- **Acceptable:** Yes for admin UI on desktop
- **Mitigation:** Add warning for 11+ pages, suggest splitting PDFs

### Render Performance
- **Initial Load:** 1-2 seconds for 5-page PDF
- **Scroll Performance:** 60fps (canvas already rendered, no re-rendering)
- **Drag-Drop:** <16ms per frame (DOM updates only)

### Optimization Opportunities (Future)
1. Lazy load pages (virtualization) if >10 pages becomes common
2. Cache rendered canvases in IndexedDB
3. Use Web Workers for coordinate calculations
4. Implement requestIdleCallback for non-critical updates

---

## Rollback Plan

### If Refactor Fails
1. Revert to previous object tag implementation
2. Add temporary iframe scrollbar override CSS hack
3. Accept nested scrollbar as known issue
4. Schedule refactor for later sprint

### Success Criteria for Ship
- [ ] Zero nested scrollbars in Chrome, Firefox, Safari
- [ ] Fields save/load correctly (no coordinate drift)
- [ ] Performance acceptable (<3s load for 5 pages)
- [ ] No regressions in field placement UX
- [ ] QA approval on 5 test PDFs

---

## Dependencies

### NPM Packages
```json
{
  "react-pdf": "^7.7.0",
  "pdfjs-dist": "^3.11.174"
}
```

### Breaking Changes
None - backend API unchanged, only frontend rendering method.

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Timeline Estimate

| Phase | Task | Estimated Time | Risk Level |
|-------|------|---------------|------------|
| 1 | Setup Dependencies | 30 min | Low |
| 2 | Basic PDF Rendering | 1 hour | Low |
| 3 | Field Overlay System | 1.5 hours | Medium |
| 4 | Drag-Drop Implementation | 2 hours | High |
| 5 | Field Interaction | 1.5 hours | Medium |
| 6 | Save/Load Integration | 1 hour | Medium |
| 7 | Edge Cases & Polish | 1 hour | Low |
| **TOTAL** | | **8.5 hours** | |

**With buffer:** 12 hours (1.5 business days)

---

## Success Metrics

### Must Have (P0)
✅ Zero nested scrollbars
✅ Single parent scroll container
✅ Drag-drop works on all pages
✅ Fields save/load without drift

### Should Have (P1)
✅ Load time <3s for 5-page PDF
✅ Responsive on desktop (1920px to 1280px)
✅ Required/optional indicators work

### Nice to Have (P2)
✅ Mobile tablet support (768px)
✅ Accessibility improvements
✅ Text layer rendering (future)

---

## Post-Implementation Review

### Questions to Answer
1. Did react-pdf fully eliminate nested scrollbars?
2. Are percentage coordinates still the right choice?
3. Is canvas rendering fast enough at scale?
4. Do we need virtualization for 10+ pages?
5. Should we render text layer for accessibility?

### Metrics to Track
- PDF load time (p50, p95)
- Field placement accuracy (% coordinate drift)
- User-reported scroll issues
- Memory usage (DevTools profiling)
- Mobile usage patterns

---

## Appendix A: Alternative Approaches Considered

### Alternative 1: PDF.js Direct Integration
**Pros:** Most control, no library dependency
**Cons:** 200+ lines of boilerplate, manual canvas management, high complexity
**Verdict:** ❌ Rejected - reinventing wheel

### Alternative 2: Mozilla pdf.js Viewer
**Pros:** Full-featured viewer out of box
**Cons:** Hard to customize, brings toolbar UI, iframe-based
**Verdict:** ❌ Rejected - same scrollbar issues

### Alternative 3: Server-Side PDF → Image Conversion
**Pros:** Simple img tags, no client-side PDF parsing
**Cons:** Server load, slower, loses quality at zoom, costs money
**Verdict:** ❌ Rejected - unnecessary complexity

### Alternative 4: react-pdf (CHOSEN)
**Pros:** Maintained, popular, handles edge cases, TypeScript support
**Cons:** 400KB bundle size, PDF.js worker required
**Verdict:** ✅ **SELECTED** - best balance of control and simplicity

---

## Appendix B: Coordinate System Reference

### React Coordinate System
```
Origin: Top-Left
X-axis: Right (→)
Y-axis: Down (↓)

(0, 0) ─────────────> (100%, 0)
  │
  │        Page
  │
  ↓
(0, 100%) ─────────> (100%, 100%)
```

### PDF Coordinate System (72 DPI)
```
Origin: Bottom-Left
X-axis: Right (→)
Y-axis: Up (↑)

(0, pageHeight) ───> (pageWidth, pageHeight)
  ↑
  │        Page
  │
  │
(0, 0) ────────────> (pageWidth, 0)
```

### Conversion Formula
```typescript
// React % to PDF points
const xPDF = (xPercent / 100) * pageWidth;
const yPDF = pageHeight - ((yPercent / 100) * pageHeight); // FLIP Y

// PDF points to React %
const xPercent = (xPDF / pageWidth) * 100;
const yPercent = ((pageHeight - yPDF) / pageHeight) * 100; // FLIP Y
```

---

## Appendix C: Key Files to Modify

```
frontend/src/app/admin/templates/page.tsx
├── FieldEditorModal function (lines 586-1157)
│   ├── Add react-pdf imports
│   ├── Add page tracking state
│   ├── Replace iframe/object with <Document>
│   ├── Add per-page rendering loop
│   ├── Add per-page field overlays
│   └── Update drag-drop handlers
├── Field interface (lines 574-584)
│   └── Add pageNumber: number property
└── handleSaveFields (lines 830-856)
    └── Add coordinate conversion logic

frontend/package.json
└── Add react-pdf and pdfjs-dist dependencies

frontend/next.config.js
└── Add PDF.js worker configuration (if needed)
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-07
**Authors:** Claude Code + Claude CLI (Consensus Document)
**Next Review:** Post-Implementation

---

