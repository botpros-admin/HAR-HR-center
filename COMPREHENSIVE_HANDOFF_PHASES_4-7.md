# COMPREHENSIVE HANDOFF: Complete PDF Viewer Refactor
## Phases 4-7 Implementation Guide

**Project:** Hartzell HR Center - PDF Signature Field Placement
**Status:** Phases 1-3 Complete ✅ | Phases 4-7 Ready to Implement
**Total Estimated Time:** 6 hours
**Complexity:** High ⚠️

---

## Table of Contents

1. [Project Context & Background](#project-context--background)
2. [What Has Been Completed (Phases 1-3)](#what-has-been-completed-phases-1-3)
3. [Critical Architecture Decisions (From Debate)](#critical-architecture-decisions-from-debate)
4. [Phase 4: Drag-Drop Coordinate Mapping](#phase-4-drag-drop-coordinate-mapping)
5. [Phase 5: Field Interaction (Move, Resize, Toggle)](#phase-5-field-interaction-move-resize-toggle)
6. [Phase 6: Save/Load with PDF Point Conversion](#phase-6-saveload-with-pdf-point-conversion)
7. [Phase 7: Edge Cases & Polish](#phase-7-edge-cases--polish)
8. [Complete Testing Strategy](#complete-testing-strategy)
9. [Deployment Checklist](#deployment-checklist)

---

## Project Context & Background

### The Original Problem

**User reported:** "Nested scrollbar appearing in PDF signature field placement modal"

**Root Cause Analysis (From Claude-to-Claude Debate):**
- Using `<iframe>` or `<object>` tags to render PDFs
- Browser's internal PDF viewer created its own scrollbar despite `scrollbar=0` parameter
- Fixed height (2400px) didn't match actual PDF content
- No way to detect PDF dimensions or page count
- Couldn't disable PDF toolbar reliably

### The Solution: react-pdf Refactor

After critical debate between Claude Code and Claude CLI, consensus reached:
- ✅ **Canvas rendering** (stable, proven for admin UI)
- ✅ **Render all pages** (1-10 pages acceptable, add warning for 10+)
- ✅ **Percentage coordinates in UI** (convert to PDF points on save)
- ✅ **Per-page overlays** (cleaner architecture, no offset math)
- ✅ **Loading spinner until all pages loaded** (prevents positioning bugs)

### Technology Stack

**Frontend:**
- Next.js 14.2.33 (React 18, TypeScript)
- react-pdf 7.7.0 + pdfjs-dist 3.11.174
- TailwindCSS for styling
- React Query for data fetching

**Backend:**
- Cloudflare Workers (Hono framework)
- D1 Database (SQLite)
- R2 Object Storage (PDF files)

**Current Deployment:**
- Frontend: app.hartzell.work (Cloudflare Pages)
- Backend: hartzell.work/api/* (Cloudflare Workers)

---

## What Has Been Completed (Phases 1-3)

### ✅ Phase 1: Dependencies & Setup (COMPLETE)

**Installed Packages:**
```bash
npm install react-pdf pdfjs-dist
```

**PDF.js Worker Configuration:**
```typescript
// Dynamic import to avoid SSR issues
import dynamic from 'next/dynamic';

const Document = dynamic(
  () => import('react-pdf').then(mod => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then(mod => mod.Page),
  { ssr: false }
);

// Client-side worker setup
if (typeof window !== 'undefined') {
  import('react-pdf').then(({ pdfjs }) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  });
}
```

**TypeScript Interface Updated:**
```typescript
interface Field {
  id: string;
  type: 'signature' | 'initials' | 'checkbox' | 'date' | 'text';
  pageNumber: number; // NEW: Which page (1-indexed)
  x: number;          // Percentage (0-100) relative to page width
  y: number;          // Percentage (0-100) relative to page height
  width: number;      // Percentage (0-100) relative to page width
  height: number;     // Percentage (0-100) relative to page height
  label?: string;
  required: boolean;  // Mandatory vs optional
}
```

**Build Status:** ✅ Successful (no SSR errors)

---

### ✅ Phase 2: Document Rendering (COMPLETE)

**State Variables Added:**
```typescript
// PDF page tracking
const [numPages, setNumPages] = useState<number>(0);
const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
const [pageHeights, setPageHeights] = useState<number[]>([]);
const [pageWidths, setPageWidths] = useState<number[]>([]);

const allPagesLoaded = loadedPages.size === numPages && numPages > 0;
```

**Document Structure:**
```tsx
{/* Loading spinner until all pages loaded */}
{pdfBlobUrl && !pdfLoading && !pdfError && !allPagesLoaded && (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hartzell-blue mx-auto mb-4"></div>
      <p className="text-gray-600">Loading pages... ({loadedPages.size}/{numPages || '?'})</p>
    </div>
  </div>
)}

{/* PDF Document with all pages */}
{pdfBlobUrl && !pdfLoading && !pdfError && (
  <Document
    file={pdfBlobUrl}
    onLoadSuccess={({ numPages: pages }) => {
      setNumPages(pages);
      setPdfLoading(false);
    }}
    onLoadError={(error) => {
      console.error('PDF load error:', error);
      setPdfError('Failed to load PDF');
    }}
    loading=""
    className={allPagesLoaded ? '' : 'hidden'}
  >
    {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
      <div key={pageNum} className="relative mb-4 bg-white shadow-lg rounded-lg">
        <Page
          pageNumber={pageNum}
          width={800}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onLoadSuccess={(page) => {
            const { width, height } = page;
            setPageWidths(prev => {
              const updated = [...prev];
              updated[pageNum - 1] = width;
              return updated;
            });
            setPageHeights(prev => {
              const updated = [...prev];
              updated[pageNum - 1] = height;
              return updated;
            });
            setLoadedPages(prev => new Set([...prev, pageNum]));
          }}
          loading=""
        />
        {/* Per-page overlay goes here */}
      </div>
    ))}
  </Document>
)}
```

**Key Features:**
- Each page renders at 800px width with auto-calculated height
- Page dimensions stored in arrays (indexed by pageNum - 1)
- Loading state prevents UI from showing until all pages ready
- No text layer or annotations (admin doesn't need them)

---

### ✅ Phase 3: Per-Page Overlays (COMPLETE)

**Overlay Structure:**
```tsx
{/* Per-page field overlay */}
<div
  className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-lg"
  style={{ height: pageHeights[pageNum - 1] || 'auto' }}
>
  {fields
    .filter(field => field.pageNumber === pageNum)
    .map((field) => (
      <div
        key={field.id}
        className={`absolute pointer-events-auto ...`}
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`
        }}
      >
        {/* Field visual indicators */}
        {field.required && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 text-white rounded-full ...">
            *
          </div>
        )}

        {/* Field example text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-white drop-shadow-md ${getFieldExampleStyle(field.type)}`}>
            {getFieldExample(field.type)}
          </span>
        </div>

        {/* Hover label */}
        <div className="absolute inset-0 bg-black bg-opacity-80 ... opacity-0 group-hover:opacity-100">
          <span className="text-white text-xs font-semibold">{field.label}</span>
          <span className={`text-xs mt-1 ${field.required ? 'text-red-300' : 'text-gray-300'}`}>
            {field.required ? 'Required' : 'Optional'}
          </span>
        </div>

        {/* Delete button */}
        <button onClick={() => handleRemoveField(field.id)} className="...">
          <X className="w-3 h-3" />
        </button>

        {/* Toggle required/optional */}
        <button onClick={() => handleToggleRequired(field.id)} className="...">
          {field.required ? '*' : '?'}
        </button>

        {/* Resize handle */}
        <div onMouseDown={(e) => handleResizeMouseDown(e, field)} className="..." />
      </div>
    ))
  }
</div>
```

**Key Features:**
- Fields filtered by `pageNumber` - each overlay only shows its page's fields
- Percentage-based positioning works responsively
- Required fields show red asterisk and red border
- Optional fields show question mark and white border
- All interaction buttons present (delete, toggle, resize)

---

## Critical Architecture Decisions (From Debate)

### Decision 1: Canvas vs SVG Rendering

**Claude CLI Argued:**
- SVG for text selection
- Better accessibility
- Scalability without quality loss

**Claude Code Countered:**
- Canvas is default and more stable
- Text selection not needed in admin UI
- Users placing fields, not reading content
- Complex PDFs have SVG quirks

**CONSENSUS:** ✅ Canvas rendering
**Rationale:** Admin-only interface, stability over features. Can add SVG later if needed.

---

### Decision 2: Render All Pages vs Virtualization

**Claude CLI Warned:**
- 50-page PDF = 50MB+ memory
- Mobile devices will crash
- Need virtualization

**Claude Code Countered:**
- Use case is 1-10 pages typical
- Admin interface on desktop
- 10 pages = ~10MB, acceptable
- Simpler implementation

**CONSENSUS:** ✅ Render all pages (with safeguards)
**Rationale:** Optimize for common case. Add warning for 10+ pages. Virtualization Phase 7 if needed.

---

### Decision 3: Percentage vs Absolute Coordinates

**Claude CLI Argued:**
- OpenSign uses PDF points (72 DPI)
- Each page can have different dimensions
- Percentages don't work across scales

**Claude Code Defended:**
- Current code already uses percentages
- Responsive scaling easier
- Convert to points only on save
- Pages rendered at consistent width

**CONSENSUS:** ✅ Percentages in UI, PDF points in storage
**Rationale:** Keep responsive UI behavior, convert for backend storage.

---

### Decision 4: Single vs Per-Page Overlays

**Claude CLI Insisted:**
- Per-page overlays required
- Each page has independent coordinate system
- Can't absolute position across canvases

**Claude Code Conceded:**
- Cleaner architecture
- No complex offset math
- Self-contained pages

**CONSENSUS:** ✅ Per-page overlays
**Rationale:** Better separation of concerns, easier debugging.

---

### Decision 5: Loading Strategy

**Options Debated:**
- **A:** Spinner until all loaded (blocks UI 1-2s)
- **B:** Progressive rendering (complex state)
- **C:** Assume dimensions (visual jumps)

**CONSENSUS:** ✅ Option A - Spinner
**Rationale:** Admin UI can afford wait. Prevents positioning bugs. Simple implementation.

---

## Phase 4: Drag-Drop Coordinate Mapping

**Status:** READY TO IMPLEMENT
**Estimated Time:** 2 hours
**Complexity:** High ⚠️

### Objective

Implement multi-page aware drag-and-drop that allows dragging field types from sidebar onto ANY page of the PDF. System must:
1. Detect which page user dropped onto
2. Convert screen coordinates to page-relative percentages
3. Account for scroll position (if needed)
4. Center field on cursor
5. Constrain to page boundaries

---

### Current Problem

**Existing handlers are broken for multi-page:**

```typescript
// Line ~705 - Currently assumes page 1
const handleDrop = (e: React.DragEvent) => {
  // ...
  const newField: Field = {
    // ...
    pageNumber: 1, // ← HARDCODED! Wrong for multi-page
  };
};
```

**What's wrong:**
- No page detection
- Uses wrong coordinate reference (container vs page)
- Doesn't account for scroll offset
- Preview shows on all pages

---

### Implementation Steps

#### Step 4.1: Add Cumulative Offsets Helper

**Location:** Inside `FieldEditorModal`, after state declarations (~Line 622)

**Code:**
```typescript
// Calculate cumulative Y offsets for each page (for scroll mapping)
const cumulativeOffsets = useMemo(() => {
  const GAP = 16; // mb-4 in pixels (Tailwind default)
  const offsets: number[] = [0];

  for (let i = 0; i < pageHeights.length; i++) {
    const previousOffset = offsets[i];
    const pageHeight = pageHeights[i] || 0;
    offsets.push(previousOffset + pageHeight + GAP);
  }

  return offsets;
}, [pageHeights]);
```

**Purpose:** Track where each page starts in the scrollable container. Used for detecting which page was dropped onto (not needed with per-page approach, but useful for debugging).

---

#### Step 4.2: Update `handleDragOver` for Per-Page

**Location:** Find and replace (~Line 690)

**Current (BROKEN):**
```typescript
const handleDragOver = (e: React.DragEvent) => {
  if (isViewMode || !draggingNewField) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';

  if (!containerRef) return; // ← Wrong ref
  const rect = containerRef.getBoundingClientRect(); // ← Wrong element
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  setDraggingNewField({ type: draggingNewField.type, x, y });
};
```

**New (FIXED):**
```typescript
const handleDragOver = (e: React.DragEvent, pageNum: number) => {
  if (isViewMode || !allPagesLoaded) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';

  if (!draggingNewField) return;

  // Get the page overlay element (event.currentTarget)
  const pageOverlay = e.currentTarget as HTMLElement;
  const rect = pageOverlay.getBoundingClientRect();

  // Calculate position relative to THIS page
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  setDraggingNewField({ type: draggingNewField.type, x, y });
};
```

**Key Changes:**
- Accept `pageNum` parameter (we'll pass this from overlay)
- Use `e.currentTarget` (the page overlay) instead of containerRef
- No scroll offset needed (coordinates relative to page element)

---

#### Step 4.3: Rewrite `handleDrop` for Multi-Page

**Location:** Find and replace (~Line 705)

**Current (BROKEN):**
```typescript
const handleDrop = (e: React.DragEvent) => {
  if (isViewMode || !containerRef) return;
  e.preventDefault();

  const fieldType = e.dataTransfer.getData('fieldType') as Field['type'];
  if (!fieldType) return;

  const rect = containerRef.getBoundingClientRect(); // ← Wrong
  const cursorX = ((e.clientX - rect.left) / rect.width) * 100;
  const cursorY = ((e.clientY - rect.top) / rect.height) * 100;

  // ... field creation with pageNumber: 1 ← HARDCODED
};
```

**New (FIXED):**
```typescript
const handleDrop = (e: React.DragEvent, pageNum: number) => {
  if (isViewMode || !allPagesLoaded) return;
  e.preventDefault();

  const fieldType = e.dataTransfer.getData('fieldType') as Field['type'];
  if (!fieldType) return;

  // Get the page overlay element
  const pageOverlay = e.currentTarget as HTMLElement;
  const rect = pageOverlay.getBoundingClientRect();

  // Calculate cursor position relative to THIS page
  const cursorX = ((e.clientX - rect.left) / rect.width) * 100;
  const cursorY = ((e.clientY - rect.top) / rect.height) * 100;

  // Get field dimensions
  const fieldWidth = fieldDimensions[fieldType].width;
  const fieldHeight = fieldDimensions[fieldType].height;

  // Center field on cursor (subtract half dimensions)
  const x = Math.max(0, Math.min(100 - fieldWidth, cursorX - fieldWidth / 2));
  const y = Math.max(0, Math.min(100 - fieldHeight, cursorY - fieldHeight / 2));

  // Create new field with correct page number
  const newField: Field = {
    id: `field_${Date.now()}`,
    type: fieldType,
    pageNumber: pageNum, // ← THIS IS THE KEY FIX
    x,
    y,
    width: fieldWidth,
    height: fieldHeight,
    label: `${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} ${fields.filter(f => f.type === fieldType).length + 1}`,
    required: true
  };

  setFields([...fields, newField]);
  setDraggingNewField(null);
};
```

**Key Changes:**
- Accept `pageNum` parameter
- Use page overlay rect (not container)
- Set `pageNumber: pageNum` on new field
- Constrain to page bounds: `Math.max(0, Math.min(100 - width, x))`

---

#### Step 4.4: Update Per-Page Overlay with Event Handlers

**Location:** Document structure (~Line 1017)

**Current:**
```tsx
<div
  className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-lg"
  style={{ height: pageHeights[pageNum - 1] || 'auto' }}
>
```

**New:**
```tsx
<div
  className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-lg"
  onDragOver={(e) => handleDragOver(e, pageNum)}
  onDrop={(e) => handleDrop(e, pageNum)}
  onDragLeave={handleDragLeave}
  style={{ height: pageHeights[pageNum - 1] || 'auto' }}
>
```

**Key Changes:**
- Add `onDragOver` with `pageNum`
- Add `onDrop` with `pageNum`
- Keep existing `onDragLeave`

---

#### Step 4.5: Verify Sidebar Drag Start

**Location:** Sidebar field types (~Line 1080)

**Should exist:**
```typescript
<div
  key={type}
  draggable
  onDragStart={(e) => {
    if (isViewMode) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('fieldType', type);
    setDraggingNewField({ type, x: 0, y: 0 });
  }}
  onDragEnd={() => setDraggingNewField(null)}
  className={`${color} text-white p-4 rounded-lg cursor-move ...`}
>
  {/* Field type content */}
</div>
```

**Verify this exists.** Should be working from Phase 3.

---

### Phase 4 Testing

**Manual Tests:**

1. **Single Page Drop**
   - [ ] Upload 1-page PDF
   - [ ] Drag signature to top, middle, bottom
   - [ ] Verify appears at cursor

2. **Multi-Page Drop**
   - [ ] Upload 2-page PDF
   - [ ] Drop signature on page 1
   - [ ] Drop date on page 2
   - [ ] Verify correct pages

3. **Scroll and Drop**
   - [ ] Upload 5-page PDF
   - [ ] Scroll to page 3
   - [ ] Drop field on page 3
   - [ ] Verify no offset

4. **All Field Types**
   - [ ] Test signature, initials, checkbox, date, text
   - [ ] Verify dimensions and colors

5. **Boundary Constraints**
   - [ ] Drop at corners
   - [ ] Verify stays in bounds

**Debug Tips:**
- If wrong page: Check `pageNum` parameter
- If offset: Check using page overlay rect, not container
- If preview doesn't show: Check `draggingNewField` state

---

## Phase 5: Field Interaction (Move, Resize, Toggle)

**Status:** READY TO IMPLEMENT
**Estimated Time:** 1.5 hours
**Complexity:** Medium

### Objective

Update existing field interaction handlers to work with multi-page architecture:
- Move existing fields within page boundaries
- Resize fields with constraints
- Toggle required/optional (should work)
- Delete fields (should work)

---

### Current Problem

**Handlers reference old `containerRef`:**

```typescript
// Line ~759 - BROKEN
const handleFieldMouseDown = (e: React.MouseEvent, field: Field) => {
  if (!containerRef) return; // ← Wrong ref
  const rect = containerRef.getBoundingClientRect(); // ← Wrong element
  // ...
};

// Line ~772 - BROKEN
const handleResizeMouseDown = (e: React.MouseEvent, field: Field) => {
  if (!containerRef) return; // ← Wrong ref
  // ...
};

// Line ~784 - BROKEN
const handleMouseMove = (e: React.MouseEvent) => {
  if (!containerRef) return; // ← Wrong ref
  const rect = containerRef.getBoundingClientRect(); // ← Wrong element
  // ...
};
```

**What's wrong:**
- Uses container rect instead of page rect
- No page number tracking
- Can drag fields across pages (should be constrained)

---

### Implementation Steps

#### Step 5.1: Add Page Ref Tracking

**Location:** Add to state (~Line 618)

**Code:**
```typescript
// Store refs to page overlay elements
const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
```

**Purpose:** Track page overlay DOM elements for getting bounding rects.

---

#### Step 5.2: Update Per-Page Overlay with Ref

**Location:** Overlay div (~Line 1017)

**Current:**
```tsx
<div
  className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-lg"
  onDragOver={(e) => handleDragOver(e, pageNum)}
  onDrop={(e) => handleDrop(e, pageNum)}
  onDragLeave={handleDragLeave}
  style={{ height: pageHeights[pageNum - 1] || 'auto' }}
>
```

**New:**
```tsx
<div
  ref={(el) => {
    if (el) pageRefs.current.set(pageNum, el);
  }}
  className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-lg"
  onDragOver={(e) => handleDragOver(e, pageNum)}
  onDrop={(e) => handleDrop(e, pageNum)}
  onDragLeave={handleDragLeave}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseLeave}
  style={{ height: pageHeights[pageNum - 1] || 'auto' }}
>
```

**Key Changes:**
- Add `ref` callback to store page element
- Add `onMouseMove`, `onMouseUp`, `onMouseLeave` for field dragging

---

#### Step 5.3: Update Dragging State Types

**Location:** State declarations (~Line 607-608)

**Current:**
```typescript
const [draggingField, setDraggingField] = useState<{ id: string; startX: number; startY: number; fieldX: number; fieldY: number } | null>(null);
const [resizingField, setResizingField] = useState<{ id: string; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
```

**New:**
```typescript
const [draggingField, setDraggingField] = useState<{
  id: string;
  pageNumber: number;
  startX: number;
  startY: number;
  fieldX: number;
  fieldY: number;
  pageWidth: number;
  pageHeight: number;
} | null>(null);

const [resizingField, setResizingField] = useState<{
  id: string;
  pageNumber: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  pageWidth: number;
  pageHeight: number;
} | null>(null);
```

**Key Changes:**
- Add `pageNumber` to track which page
- Add `pageWidth` and `pageHeight` to avoid rect lookups in mousemove

---

#### Step 5.4: Rewrite `handleFieldMouseDown`

**Location:** Find and replace (~Line 759)

**Current (BROKEN):**
```typescript
const handleFieldMouseDown = (e: React.MouseEvent, field: Field) => {
  if (!containerRef) return;
  e.stopPropagation();

  const rect = containerRef.getBoundingClientRect();
  setDraggingField({
    id: field.id,
    startX: e.clientX,
    startY: e.clientY,
    fieldX: field.x,
    fieldY: field.y
  });
};
```

**New (FIXED):**
```typescript
const handleFieldMouseDown = (e: React.MouseEvent, field: Field) => {
  e.stopPropagation();

  // Get the page overlay element for this field's page
  const pageOverlay = pageRefs.current.get(field.pageNumber);
  if (!pageOverlay) return;

  const rect = pageOverlay.getBoundingClientRect();

  setDraggingField({
    id: field.id,
    pageNumber: field.pageNumber,
    startX: e.clientX,
    startY: e.clientY,
    fieldX: field.x,
    fieldY: field.y,
    pageWidth: rect.width,
    pageHeight: rect.height
  });
};
```

**Key Changes:**
- Get page overlay from `pageRefs.current.get(field.pageNumber)`
- Store `pageNumber`, `pageWidth`, `pageHeight`

---

#### Step 5.5: Rewrite `handleResizeMouseDown`

**Location:** Find and replace (~Line 772)

**Current (BROKEN):**
```typescript
const handleResizeMouseDown = (e: React.MouseEvent, field: Field) => {
  if (!containerRef) return;
  e.stopPropagation();

  setResizingField({
    id: field.id,
    startX: e.clientX,
    startY: e.clientY,
    startWidth: field.width,
    startHeight: field.height
  });
};
```

**New (FIXED):**
```typescript
const handleResizeMouseDown = (e: React.MouseEvent, field: Field) => {
  e.stopPropagation();

  // Get the page overlay element for this field's page
  const pageOverlay = pageRefs.current.get(field.pageNumber);
  if (!pageOverlay) return;

  const rect = pageOverlay.getBoundingClientRect();

  setResizingField({
    id: field.id,
    pageNumber: field.pageNumber,
    startX: e.clientX,
    startY: e.clientY,
    startWidth: field.width,
    startHeight: field.height,
    pageWidth: rect.width,
    pageHeight: rect.height
  });
};
```

**Key Changes:**
- Get page overlay rect
- Store `pageNumber`, `pageWidth`, `pageHeight`

---

#### Step 5.6: Rewrite `handleMouseMove`

**Location:** Find and replace (~Line 784)

**Current (BROKEN):**
```typescript
const handleMouseMove = (e: React.MouseEvent) => {
  if (!containerRef) return;

  const rect = containerRef.getBoundingClientRect();

  if (draggingField) {
    const deltaX = ((e.clientX - draggingField.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - draggingField.startY) / rect.height) * 100;

    setFields(fields.map(f =>
      f.id === draggingField.id
        ? {
            ...f,
            x: Math.max(0, Math.min(100 - f.width, draggingField.fieldX + deltaX)),
            y: Math.max(0, Math.min(100 - f.height, draggingField.fieldY + deltaY))
          }
        : f
    ));
  } else if (resizingField) {
    // Similar broken logic
  }
};
```

**New (FIXED):**
```typescript
const handleMouseMove = (e: React.MouseEvent) => {
  if (draggingField) {
    // Calculate delta in percentage relative to page dimensions
    const deltaX = ((e.clientX - draggingField.startX) / draggingField.pageWidth) * 100;
    const deltaY = ((e.clientY - draggingField.startY) / draggingField.pageHeight) * 100;

    setFields(fields.map(f => {
      if (f.id !== draggingField.id) return f;

      // Only update if field is on the same page (prevent cross-page dragging)
      if (f.pageNumber !== draggingField.pageNumber) return f;

      const newX = Math.max(0, Math.min(100 - f.width, draggingField.fieldX + deltaX));
      const newY = Math.max(0, Math.min(100 - f.height, draggingField.fieldY + deltaY));

      return { ...f, x: newX, y: newY };
    }));
  } else if (resizingField) {
    // Calculate delta for resizing
    const deltaX = ((e.clientX - resizingField.startX) / resizingField.pageWidth) * 100;
    const deltaY = ((e.clientY - resizingField.startY) / resizingField.pageHeight) * 100;

    setFields(fields.map(f => {
      if (f.id !== resizingField.id) return f;

      // Only update if field is on the same page
      if (f.pageNumber !== resizingField.pageNumber) return f;

      const newWidth = Math.max(3, Math.min(50, resizingField.startWidth + deltaX));
      const newHeight = Math.max(2, Math.min(15, resizingField.startHeight + deltaY));

      return { ...f, width: newWidth, height: newHeight };
    }));
  }
};
```

**Key Changes:**
- Use `draggingField.pageWidth/pageHeight` instead of container rect
- Check `f.pageNumber === draggingField.pageNumber` to prevent cross-page dragging
- Constrain to bounds: `Math.max(min, Math.min(max, value))`
- Min/max for resize: width 3-50%, height 2-15%

---

#### Step 5.7: Verify `handleMouseUp` and `handleMouseLeave`

**Location:** Lines ~820-828

**Should be:**
```typescript
const handleMouseUp = () => {
  setDraggingField(null);
  setResizingField(null);
};

const handleMouseLeave = () => {
  setDraggingField(null);
  setResizingField(null);
};
```

**These should work as-is.** Just clear state.

---

#### Step 5.8: Verify Toggle and Delete Handlers

**Location:** Lines ~749-757

**Should be:**
```typescript
const handleRemoveField = (fieldId: string) => {
  setFields(fields.filter(f => f.id !== fieldId));
};

const handleToggleRequired = (fieldId: string) => {
  setFields(fields.map(f =>
    f.id === fieldId ? { ...f, required: !f.required } : f
  ));
};
```

**These should work as-is.** No coordinate logic.

---

### Phase 5 Testing

**Manual Tests:**

1. **Move Field Within Page**
   - [ ] Place field on page 1
   - [ ] Drag to different position
   - [ ] Verify stays on page 1

2. **Cannot Drag Across Pages**
   - [ ] Place field on page 1
   - [ ] Try to drag to page 2
   - [ ] Verify constrained to page 1

3. **Resize Field**
   - [ ] Drag corner handle
   - [ ] Verify smooth resizing
   - [ ] Test min/max constraints

4. **Toggle Required/Optional**
   - [ ] Click blue toggle button
   - [ ] Verify asterisk ↔ question mark
   - [ ] Verify border color changes

5. **Delete Field**
   - [ ] Click red X button
   - [ ] Verify field deleted

**Debug Tips:**
- If field jumps: Check using page overlay rect, not container
- If cross-page drag works: Check `pageNumber` comparison
- If resize broken: Check `resizingField` state has pageWidth/Height

---

## Phase 6: Save/Load with PDF Point Conversion

**Status:** READY TO IMPLEMENT
**Estimated Time:** 1 hour
**Complexity:** Medium

### Objective

Convert percentage coordinates to PDF points when saving and back to percentages when loading. Handle Y-axis flip (PDF origin is bottom-left, React is top-left).

---

### Coordinate Systems

**React (UI):**
```
Origin: Top-Left
X-axis: Right (→)
Y-axis: Down (↓)

(0, 0) ──────> (100%, 0)
  │
  ↓
(0, 100%) ──> (100%, 100%)
```

**PDF (72 DPI):**
```
Origin: Bottom-Left
X-axis: Right (→)
Y-axis: Up (↑)

(0, pageHeight) ──> (pageWidth, pageHeight)
  ↑
  │
(0, 0) ────────> (pageWidth, 0)
```

---

### Implementation Steps

#### Step 6.1: Update `handleSaveFields`

**Location:** Find (~Line 830)

**Current:**
```typescript
const handleSaveFields = async () => {
  setIsSaving(true);

  try {
    // Convert fields to format expected by OpenSign
    const fieldPositions = fields.map(field => ({
      type: field.type,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      page: field.pageNumber,
      label: field.label,
      required: field.required ?? true
    }));

    // Save to backend
    await api.updateTemplateFields(template.id, fieldPositions);

    setSaveSuccess(true);
    setTimeout(() => {
      onSuccess();
    }, 1500);
  } catch (error: any) {
    console.error('Failed to save fields:', error);
  } finally {
    setIsSaving(false);
  }
};
```

**New (with PDF point conversion):**
```typescript
const handleSaveFields = async () => {
  setIsSaving(true);

  try {
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
        x: Math.round(xInPoints),
        y: Math.round(yInPoints),
        width: Math.round(widthInPoints),
        height: Math.round(heightInPoints),
        label: field.label,
        required: field.required ?? true,
        // Also store percentages for easier reload
        x_percent: field.x,
        y_percent: field.y,
        width_percent: field.width,
        height_percent: field.height
      };
    });

    // Save to backend
    await api.updateTemplateFields(template.id, fieldPositions);

    setSaveSuccess(true);
    setTimeout(() => {
      onSuccess();
    }, 1500);
  } catch (error: any) {
    console.error('Failed to save fields:', error);
  } finally {
    setIsSaving(false);
  }
};
```

**Key Changes:**
- Get page dimensions: `pageWidths[field.pageNumber - 1]`
- Convert X: `(x% / 100) * pageWidth`
- Convert Y with flip: `pageHeight - ((y% / 100) * pageHeight)`
- Round to integers for PDF points
- Store both points and percentages

---

#### Step 6.2: Update Field Loading

**Location:** Find useEffect that loads fields (~Line 663)

**Current:**
```typescript
useEffect(() => {
  if (template.fieldPositions) {
    try {
      const parsed = typeof template.fieldPositions === 'string'
        ? JSON.parse(template.fieldPositions)
        : template.fieldPositions;
      setFields(parsed.map((f: any, i: number) => ({ ...f, id: f.id || `field_${i}` })));
    } catch (e) {
      console.error('Failed to parse field positions:', e);
    }
  }
}, [template]);
```

**New (with PDF point to percentage conversion):**
```typescript
useEffect(() => {
  if (template.fieldPositions && allPagesLoaded) {
    try {
      const parsed = typeof template.fieldPositions === 'string'
        ? JSON.parse(template.fieldPositions)
        : template.fieldPositions;

      const loadedFields = parsed.map((f: any, i: number) => {
        // If percentages are stored, use them
        if (f.x_percent !== undefined && f.y_percent !== undefined) {
          return {
            id: f.id || `field_${i}`,
            type: f.type,
            pageNumber: f.page,
            x: f.x_percent,
            y: f.y_percent,
            width: f.width_percent,
            height: f.height_percent,
            label: f.label,
            required: f.required ?? true
          };
        }

        // Otherwise, convert from PDF points to percentages
        const pageWidth = pageWidths[f.page - 1];
        const pageHeight = pageHeights[f.page - 1];

        if (!pageWidth || !pageHeight) {
          console.warn('Page dimensions not loaded for page', f.page);
          return null;
        }

        // Convert PDF points to percentages
        const xPercent = (f.x / pageWidth) * 100;
        const yPercent = ((pageHeight - f.y) / pageHeight) * 100; // Flip Y axis
        const widthPercent = (f.width / pageWidth) * 100;
        const heightPercent = (f.height / pageHeight) * 100;

        return {
          id: f.id || `field_${i}`,
          type: f.type,
          pageNumber: f.page,
          x: xPercent,
          y: yPercent,
          width: widthPercent,
          height: heightPercent,
          label: f.label,
          required: f.required ?? true
        };
      });

      setFields(loadedFields.filter(Boolean)); // Remove nulls
    } catch (e) {
      console.error('Failed to parse field positions:', e);
    }
  }
}, [template, allPagesLoaded, pageWidths, pageHeights]);
```

**Key Changes:**
- Wait for `allPagesLoaded` before loading fields
- Check if percentages stored (use directly)
- Otherwise convert from PDF points
- Flip Y axis when converting: `(pageHeight - y) / pageHeight`
- Filter out null fields (pages not loaded)

---

### Phase 6 Testing

**Manual Tests:**

1. **Save and Reload**
   - [ ] Place 3 fields on page 1
   - [ ] Click "Save Fields"
   - [ ] Close modal
   - [ ] Reopen modal (reload template)
   - [ ] Verify fields in exact same positions

2. **Multi-Page Round Trip**
   - [ ] Place field on page 1, page 2, page 3
   - [ ] Save
   - [ ] Reload
   - [ ] Verify all fields on correct pages

3. **Y-Axis Flip Test**
   - [ ] Place field at top of page (y near 0%)
   - [ ] Save (should be high Y in PDF points)
   - [ ] Console log saved value
   - [ ] Reload
   - [ ] Verify appears at top

4. **Coordinate Drift Test**
   - [ ] Place field at exact position
   - [ ] Note position: x=25%, y=50%
   - [ ] Save and reload 5 times
   - [ ] Verify no drift (still 25%, 50%)

**Debug Tips:**
- If positions wrong: Check Y-axis flip formula
- If drift: Check rounding errors, use stored percentages
- If fields disappear: Check page dimensions loaded before conversion

---

## Phase 7: Edge Cases & Polish

**Status:** READY TO IMPLEMENT
**Estimated Time:** 1 hour
**Complexity:** Low-Medium

### Objective

Handle edge cases, add warnings, improve UX, and ensure production readiness.

---

### Implementation Checklist

#### 7.1: Add Warning for Large PDFs

**Location:** After `onLoadSuccess` in Document (~Line 981)

**Code:**
```typescript
<Document
  file={pdfBlobUrl}
  onLoadSuccess={({ numPages: pages }) => {
    setNumPages(pages);
    setPdfLoading(false);

    // Warn for large PDFs
    if (pages > 10) {
      const confirmed = confirm(
        `This PDF has ${pages} pages. Large PDFs may cause performance issues. ` +
        `Consider splitting into smaller documents. Continue anyway?`
      );

      if (!confirmed) {
        onClose();
        return;
      }
    }
  }}
  // ...
>
```

**Purpose:** Prevent memory issues with very large PDFs.

---

#### 7.2: Handle Empty/Invalid PDFs

**Location:** Add error handling (~Line 985)

**Code:**
```typescript
onLoadError={(error) => {
  console.error('PDF load error:', error);

  let errorMessage = 'Failed to load PDF';

  if (error.message.includes('Invalid PDF')) {
    errorMessage = 'This file is not a valid PDF document.';
  } else if (error.message.includes('encrypted')) {
    errorMessage = 'This PDF is password-protected. Please remove the password and try again.';
  }

  setPdfError(errorMessage);
}}
```

**Purpose:** User-friendly error messages.

---

#### 7.3: Handle Mixed Orientation Pages

**Test Scenario:** PDF with portrait and landscape pages

**Current Code Should Work:**
- Each page has own dimensions in `pageWidths` and `pageHeights`
- Percentage coordinates are relative to each page

**Verify:**
- [ ] Upload PDF with mixed orientations
- [ ] Place fields on portrait and landscape pages
- [ ] Save and reload
- [ ] Verify positions correct

---

#### 7.4: Add Keyboard Shortcuts

**Location:** Add useEffect for keyboard (~Line 675)

**Code:**
```typescript
useEffect(() => {
  if (isViewMode) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    // Delete selected field
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (draggingField) {
        e.preventDefault();
        handleRemoveField(draggingField.id);
        setDraggingField(null);
      }
    }

    // Escape cancels drag
    if (e.key === 'Escape') {
      setDraggingField(null);
      setResizingField(null);
      setDraggingNewField(null);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isViewMode, draggingField]);
```

**Purpose:** Better UX for field management.

---

#### 7.5: Mobile Responsive Adjustments

**Issue:** 800px page width may be too wide on mobile

**Location:** Page component (~Line 995)

**Current:**
```typescript
<Page
  pageNumber={pageNum}
  width={800}
  // ...
/>
```

**Responsive:**
```typescript
const pageWidth = Math.min(800, window.innerWidth - 64); // 64px for padding

<Page
  pageNumber={pageNum}
  width={pageWidth}
  // ...
/>
```

**Alternative:** Use CSS media query to scale pages on mobile.

---

#### 7.6: Add Field Count Limits

**Location:** In `handleDrop` (~Line 705)

**Code:**
```typescript
const handleDrop = (e: React.DragEvent, pageNum: number) => {
  // ... existing code ...

  // Limit fields per page (prevent UI clutter)
  const fieldsOnThisPage = fields.filter(f => f.pageNumber === pageNum);
  if (fieldsOnThisPage.length >= 20) {
    alert('Maximum 20 fields per page. Please use multiple pages or remove existing fields.');
    setDraggingNewField(null);
    return;
  }

  // ... create field ...
};
```

**Purpose:** Prevent excessive field placement.

---

#### 7.7: Improve Loading UX

**Location:** Loading spinner (~Line 970)

**Current:**
```tsx
<p className="text-gray-600">Loading pages... ({loadedPages.size}/{numPages || '?'})</p>
```

**Enhanced:**
```tsx
<p className="text-gray-600">
  Loading pages... ({loadedPages.size}/{numPages || '?'})
  {loadedPages.size > 0 && (
    <span className="ml-2 text-hartzell-blue">
      ({Math.round((loadedPages.size / numPages) * 100)}%)
    </span>
  )}
</p>
```

**Purpose:** Show progress percentage.

---

#### 7.8: Add Unsaved Changes Warning

**Location:** Add state and effect (~Line 620)

**Code:**
```typescript
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// Track unsaved changes
useEffect(() => {
  if (fields.length > 0 && !saveSuccess) {
    setHasUnsavedChanges(true);
  } else {
    setHasUnsavedChanges(false);
  }
}, [fields, saveSuccess]);

// Warn before closing
const handleClose = () => {
  if (hasUnsavedChanges) {
    const confirmed = confirm('You have unsaved changes. Close anyway?');
    if (!confirmed) return;
  }
  onClose();
};
```

**Update close button:**
```tsx
<button onClick={handleClose} className="...">
  <X className="w-5 h-5" />
</button>
```

**Purpose:** Prevent accidental data loss.

---

### Phase 7 Testing

**Edge Case Tests:**

1. **Large PDF (11+ pages)**
   - [ ] Upload 15-page PDF
   - [ ] Verify warning appears
   - [ ] Test cancel and continue

2. **Invalid PDF**
   - [ ] Upload corrupt file
   - [ ] Verify error message

3. **Password-Protected PDF**
   - [ ] Upload encrypted PDF
   - [ ] Verify specific error

4. **Mixed Orientations**
   - [ ] Upload portrait + landscape PDF
   - [ ] Verify fields work on both

5. **Very Small PDF (< 1 page)**
   - [ ] Upload tiny PDF
   - [ ] Verify doesn't break

6. **Keyboard Shortcuts**
   - [ ] Press Delete while dragging field
   - [ ] Press Escape during drag
   - [ ] Verify cancels

7. **Mobile (Tablet)**
   - [ ] Resize to 768px
   - [ ] Verify pages scale
   - [ ] Verify drag-drop works

8. **Unsaved Changes**
   - [ ] Place field
   - [ ] Try to close
   - [ ] Verify warning

9. **Field Limit**
   - [ ] Place 20 fields on page
   - [ ] Try to place 21st
   - [ ] Verify blocked

---

## Complete Testing Strategy

### Unit Tests (Optional - if time permits)

**Coordinate Conversion:**
```typescript
describe('Coordinate Conversion', () => {
  it('converts percentage to PDF points', () => {
    const pageWidth = 800;
    const pageHeight = 1000;
    const xPercent = 50; // 50%
    const yPercent = 25; // 25%

    const xPoints = (xPercent / 100) * pageWidth;
    const yPoints = pageHeight - ((yPercent / 100) * pageHeight);

    expect(xPoints).toBe(400);
    expect(yPoints).toBe(750); // Flipped
  });

  it('converts PDF points to percentage', () => {
    const pageWidth = 800;
    const pageHeight = 1000;
    const xPoints = 400;
    const yPoints = 750;

    const xPercent = (xPoints / pageWidth) * 100;
    const yPercent = ((pageHeight - yPoints) / pageHeight) * 100;

    expect(xPercent).toBe(50);
    expect(yPercent).toBe(25);
  });
});
```

---

### Integration Test Plan

**Test 1: End-to-End Field Placement**
1. Upload W-4 form (2 pages)
2. Place signature on page 1, top-right
3. Place date on page 1, bottom-left
4. Place initials on page 2, center
5. Toggle signature to optional
6. Resize date field
7. Save fields
8. Close modal
9. Reopen modal
10. Verify all fields in correct positions
11. Verify required/optional states preserved

**Test 2: Multi-Page Document Flow**
1. Upload 5-page employment contract
2. Place fields on pages 1, 3, 5
3. Scroll through all pages
4. Verify fields only on assigned pages
5. Try to drag page 1 field to page 2 (should fail)
6. Delete field from page 3
7. Save
8. Reload
9. Verify page 3 field gone, others remain

**Test 3: Error Handling**
1. Upload corrupt PDF → Verify error message
2. Upload 15-page PDF → Verify warning, cancel
3. Upload encrypted PDF → Verify specific error
4. Close modal with unsaved changes → Verify warning

---

### Performance Testing

**Metrics to Track:**

1. **Load Time**
   - 1-page PDF: < 1 second
   - 5-page PDF: < 3 seconds
   - 10-page PDF: < 5 seconds

2. **Memory Usage**
   - 5-page PDF: < 50MB
   - 10-page PDF: < 100MB
   - Monitor: Chrome DevTools → Performance → Memory

3. **Drag Responsiveness**
   - Field drag should be 60fps
   - No lag or stuttering
   - Monitor: Chrome DevTools → Performance → FPS

4. **Scroll Performance**
   - Scrolling multi-page PDF should be smooth
   - No jank on scroll
   - Test with 5+ page documents

---

### Browser Compatibility

**Test Matrix:**

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 90+     | ✅ Primary |
| Firefox | 88+     | ✅ Test |
| Safari  | 14+     | ✅ Test |
| Edge    | 90+     | ✅ Test |

**Known Issues:**
- IE11: Not supported (PDF.js requires modern browsers)
- Mobile Safari: Touch drag may need adjustments

---

## Deployment Checklist

### Pre-Deployment

**Code Quality:**
- [ ] All TypeScript errors resolved
- [ ] No console errors in production
- [ ] No console.log statements (use console.error only)
- [ ] Build succeeds: `npm run build`
- [ ] Bundle size acceptable (< 220 kB for /admin/templates)

**Testing:**
- [ ] All 9 manual tests pass (Phase 4)
- [ ] All 9 manual tests pass (Phase 5)
- [ ] All 4 save/load tests pass (Phase 6)
- [ ] All 9 edge case tests pass (Phase 7)
- [ ] Integration tests pass
- [ ] Performance metrics acceptable

**Documentation:**
- [ ] REFACTOR_PDF_VIEWER.md updated with results
- [ ] Any deviations from plan documented
- [ ] Known issues listed

---

### Deployment Steps

**1. Build Frontend:**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/frontend
npm run build
```

**2. Deploy to Cloudflare Pages:**
```bash
npx wrangler pages deploy out --project-name hartzell-hr-frontend --commit-dirty=true
```

**3. Verify Deployment:**
- [ ] Visit app.hartzell.work/admin/templates
- [ ] Upload test PDF
- [ ] Place fields
- [ ] Save and reload
- [ ] Verify works in production

**4. Smoke Test in Production:**
- [ ] Test with 1-page PDF
- [ ] Test with 3-page PDF
- [ ] Test save/reload
- [ ] Test on mobile (iPad)
- [ ] Check console for errors

---

### Post-Deployment

**Monitor:**
- User-reported issues (first 24 hours)
- Performance metrics (Cloudflare Analytics)
- Error logs (Cloudflare Workers logs)

**Success Metrics:**
- ✅ Zero nested scrollbars
- ✅ Fields save/load without drift
- ✅ Multi-page support working
- ✅ No regressions from old behavior

**Rollback Trigger:**
- Critical bug preventing field placement
- Data loss issues
- Performance regression (> 5s load time)

**Rollback Procedure:**
```bash
# List recent deployments
npx wrangler pages deployment list --project-name hartzell-hr-frontend

# Promote previous deployment
npx wrangler pages deployment tail <DEPLOYMENT_ID>
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Using Wrong Coordinate Reference

❌ **Wrong:**
```typescript
const rect = containerRef.current.getBoundingClientRect();
```

✅ **Correct:**
```typescript
const pageOverlay = pageRefs.current.get(field.pageNumber);
const rect = pageOverlay.getBoundingClientRect();
```

---

### Pitfall 2: Forgetting Y-Axis Flip

❌ **Wrong:**
```typescript
const yInPoints = (field.y / 100) * pageHeight; // Same as React
```

✅ **Correct:**
```typescript
const yInPoints = pageHeight - ((field.y / 100) * pageHeight); // Flipped
```

---

### Pitfall 3: Loading Fields Before Pages Ready

❌ **Wrong:**
```typescript
useEffect(() => {
  if (template.fieldPositions) {
    // Load immediately
  }
}, [template]);
```

✅ **Correct:**
```typescript
useEffect(() => {
  if (template.fieldPositions && allPagesLoaded) {
    // Wait for page dimensions
  }
}, [template, allPagesLoaded]);
```

---

### Pitfall 4: Allowing Cross-Page Dragging

❌ **Wrong:**
```typescript
setFields(fields.map(f =>
  f.id === draggingField.id ? { ...f, x: newX, y: newY } : f
));
```

✅ **Correct:**
```typescript
setFields(fields.map(f => {
  if (f.id !== draggingField.id) return f;
  if (f.pageNumber !== draggingField.pageNumber) return f; // Check page
  return { ...f, x: newX, y: newY };
}));
```

---

## File Locations Reference

**Primary File:**
```
/mnt/c/Users/Agent/Desktop/HR Center/frontend/src/app/admin/templates/page.tsx
```

**Key Line Numbers (approximate):**
- State declarations: ~603-621
- Field interface: ~580-590
- PDF blob loading: ~623-661
- Field loading from template: ~663-677
- Drag handlers: ~690-746
- Mouse handlers: ~759-828
- Save handler: ~830-856
- Document rendering: ~978-1121
- Sidebar field types: ~1127-1173

---

## Questions for Next Developer

1. **Are all pages loading correctly?**
   - Check `loadedPages.size === numPages`
   - Console log: `console.log('Loaded pages:', loadedPages, 'Total:', numPages)`

2. **Are page dimensions being captured?**
   - Check `pageWidths` and `pageHeights` arrays
   - Console log: `console.log('Page 1 dims:', pageWidths[0], pageHeights[0])`

3. **Is drag-drop working on all pages?**
   - Test specifically page 2, page 3
   - Verify `pageNum` parameter being passed

4. **Are fields constrained to page bounds?**
   - Try dragging field off edge
   - Should stop at 0% and (100% - field.width)

5. **Is Y-axis flip working correctly?**
   - Place field at top of page
   - Save and check backend data
   - Should have high Y value in PDF points

6. **Are saved fields loading back correctly?**
   - No position drift after save/reload?
   - Fields on correct pages?

---

## Success Criteria

### Phase 4 Complete When:
✅ Can drag fields from sidebar to any page
✅ Fields assigned correct `pageNumber`
✅ Drag preview shows on hovered page
✅ Works with scrolled content
✅ All field types work

### Phase 5 Complete When:
✅ Can move fields within page
✅ Fields cannot be dragged across pages
✅ Can resize fields
✅ Toggle required/optional works
✅ Delete works

### Phase 6 Complete When:
✅ Fields save with PDF point coordinates
✅ Fields load back to correct positions
✅ No coordinate drift after save/reload
✅ Y-axis flip working correctly

### Phase 7 Complete When:
✅ Large PDF warning works
✅ Error handling graceful
✅ Keyboard shortcuts work
✅ Unsaved changes warning works
✅ All edge cases tested

### Overall Project Complete When:
✅ Zero nested scrollbars ⭐
✅ Multi-page PDFs fully supported ⭐
✅ All manual tests pass ⭐
✅ Production deployment successful ⭐
✅ No regressions from old behavior ⭐

---

**Document Version:** 1.0
**Last Updated:** 2025-10-07
**Created By:** Claude Code + Claude CLI (Post-Debate Consensus)
**Status:** Ready for Next Developer
**Total Estimated Time:** 6 hours (2h + 1.5h + 1h + 1h + 0.5h buffer)

**Good luck! 🚀**

