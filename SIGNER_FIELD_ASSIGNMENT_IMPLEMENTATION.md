# Signer-Specific Field Assignment Implementation Guide

## Problem Statement

**Current Gap**: The field editor doesn't indicate WHICH signer each field belongs to in multi-signer workflows.

When a template has a multi-signer workflow (Employee → Manager → HR Admin), the field editor currently shows generic field types (Signature, Initials, Date, etc.) without any indication of who each field is for.

**Impact**:
- Admins can't specify which signature field belongs to the employee vs. manager vs. HR admin
- When an employee opens the document, they won't know which fields are theirs
- The multi-signer workflow is incomplete without this functionality

## Proposed Solution

### UI Changes

**Sidebar Field Grouping** (when multi-signer workflow is configured):

```
┌─────────────────────────────────┐
│ Field Types                     │
│ Assign fields to each signer    │
├─────────────────────────────────┤
│                                 │
│ EMPLOYEE FIELDS                 │
│ ┌─────────────────────────────┐ │
│ │ 📝 Employee Signature       │ │
│ │ Drag to place               │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ✍️  Employee Initials       │ │
│ │ Drag to place               │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 📅 Employee Date            │ │
│ │ Drag to place               │ │
│ └─────────────────────────────┘ │
│                                 │
│ MANAGER FIELDS                  │
│ ┌─────────────────────────────┐ │
│ │ 📝 Manager Signature        │ │
│ │ Drag to place               │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ✍️  Manager Initials        │ │
│ │ Drag to place               │ │
│ └─────────────────────────────┘ │
│                                 │
│ HR ADMIN FIELDS                 │
│ ┌─────────────────────────────┐ │
│ │ 📝 HR Admin Signature       │ │
│ │ Drag to place               │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

**Field Visual Indicators**:
- Each signer gets a unique color
- Fields on the PDF show signer-specific colors and labels
- Example: Employee fields = Blue, Manager fields = Green, HR Admin fields = Purple

**Validation**:
- Warning if a signer has no fields assigned
- Error message before saving if critical signers (like assignee) have no fields

## Technical Implementation

### 1. Update Field Interface

**File**: `/frontend/src/app/admin/templates/page.tsx`

```typescript
interface Field {
  id: string;
  type: 'signature' | 'initials' | 'checkbox' | 'date' | 'text';
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  required: boolean;
  signerIndex?: number; // NEW: Index of signer in workflow (0 = first signer, 1 = second, etc.)
  signerRole?: string;  // NEW: Role name for display ("Employee", "Manager", etc.)
}
```

### 2. Parse Workflow Configuration in FieldEditorModal

```typescript
function FieldEditorModal({ template, mode, onClose, onSuccess }: Props) {
  // ... existing state ...

  // NEW: Parse workflow config
  const [workflowSigners, setWorkflowSigners] = useState<Array<{
    index: number;
    roleName: string;
    signerType: string;
    color: string;
  }>>([]);

  useEffect(() => {
    // Parse template.defaultSignerConfig
    if (template.defaultSignerConfig) {
      try {
        const config = JSON.parse(template.defaultSignerConfig);
        if (config.mode === 'multi_signer' && config.signers) {
          const signerColors = [
            'bg-blue-600',    // Signer 1 (usually Employee)
            'bg-green-600',   // Signer 2 (usually Manager)
            'bg-purple-600',  // Signer 3 (usually HR Admin)
            'bg-orange-600',  // Signer 4 (if exists)
            'bg-pink-600',    // Signer 5 (if exists)
          ];

          const parsedSigners = config.signers.map((signer: any, index: number) => ({
            index,
            roleName: signer.roleName || `Signer ${index + 1}`,
            signerType: signer.signerType,
            color: signerColors[index] || 'bg-gray-600'
          }));

          setWorkflowSigners(parsedSigners);
        }
      } catch (e) {
        console.error('Failed to parse workflow config:', e);
      }
    }
  }, [template.defaultSignerConfig]);

  // ... rest of component ...
}
```

### 3. Update Field Types Generation

```typescript
// Instead of single fieldTypes array, generate signer-specific field types
const generateSignerFieldTypes = () => {
  if (workflowSigners.length === 0) {
    // No multi-signer workflow - show generic fields
    return [
      { type: 'signature' as const, label: 'Signature', icon: MousePointer, color: 'bg-blue-600', example: 'John Doe', signerIndex: undefined }
      // ... other generic fields
    ];
  }

  // Multi-signer workflow - generate signer-specific fields
  const signerFieldTypes: any[] = [];

  workflowSigners.forEach((signer, signerIndex) => {
    // Add signature field for this signer
    signerFieldTypes.push({
      type: 'signature' as const,
      label: `${signer.roleName} Signature`,
      icon: MousePointer,
      color: signer.color,
      example: 'John Doe',
      signerIndex,
      signerRole: signer.roleName,
      groupLabel: `${signer.roleName.toUpperCase()} FIELDS`
    });

    // Add initials field for this signer
    signerFieldTypes.push({
      type: 'initials' as const,
      label: `${signer.roleName} Initials`,
      icon: Type,
      color: signer.color,
      example: 'JD',
      signerIndex,
      signerRole: signer.roleName,
      groupLabel: `${signer.roleName.toUpperCase()} FIELDS`
    });

    // Add date field for this signer
    signerFieldTypes.push({
      type: 'date' as const,
      label: `${signer.roleName} Date`,
      icon: Calendar,
      color: signer.color,
      example: new Date().toLocaleDateString(),
      signerIndex,
      signerRole: signer.roleName,
      groupLabel: `${signer.roleName.toUpperCase()} FIELDS`
    });
  });

  return signerFieldTypes;
};

const fieldTypes = generateSignerFieldTypes();
```

### 4. Update Sidebar Rendering with Signer Groups

```typescript
{/* Sidebar - Field Types */}
{!isViewMode && (
  <div className="w-64 border-l border-gray-200 bg-gray-50 flex flex-col flex-shrink-0">
    <div className="p-4 border-b border-gray-200">
      <h3 className="font-semibold text-gray-900">Field Types</h3>
      <p className="text-xs text-gray-600 mt-1">
        {workflowSigners.length > 0
          ? 'Assign fields to each signer'
          : 'Drag onto document'}
      </p>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {/* Group by signer if multi-signer workflow */}
      {workflowSigners.length > 0 ? (
        // Multi-signer: Show grouped fields
        workflowSigners.map((signer, signerIndex) => (
          <div key={signerIndex} className="mb-4">
            {/* Signer Group Header */}
            <div className="text-xs font-bold text-gray-700 mb-2 px-2">
              {signer.roleName.toUpperCase()} FIELDS
            </div>

            {/* Fields for this signer */}
            {fieldTypes
              .filter(ft => ft.signerIndex === signerIndex)
              .map(({ type, label, icon: Icon, color, example, signerRole }) => (
                <div
                  key={`${signerIndex}-${type}`}
                  draggable
                  onDragStart={(e) => {
                    handleSidebarDragStart(e, type, signerIndex, signerRole);
                    setDraggingNewField({
                      type,
                      x: 0,
                      y: 0,
                      signerIndex,
                      signerRole
                    });
                  }}
                  onDragEnd={() => setDraggingNewField(null)}
                  className={`${color} text-white p-3 rounded-lg cursor-move shadow-md hover:shadow-lg transition-all flex items-center gap-2 mb-2`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{label}</div>
                    <div className="text-xs opacity-80">Drag to place</div>
                  </div>
                </div>
              ))}
          </div>
        ))
      ) : (
        // Single-signer: Show generic fields
        fieldTypes.map(({ type, label, icon: Icon, color, example }) => (
          // ... existing field rendering ...
        ))
      )}
    </div>

    {/* Validation Warning */}
    {workflowSigners.length > 0 && (
      <div className="p-4 border-t border-gray-200 bg-yellow-50">
        <div className="text-xs text-yellow-800">
          <div className="font-semibold mb-1">⚠️ Signer Field Check</div>
          {workflowSigners.map((signer, idx) => {
            const signerFieldCount = fields.filter(f => f.signerIndex === idx).length;
            return (
              <div key={idx} className={signerFieldCount === 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                {signer.roleName}: {signerFieldCount} field{signerFieldCount !== 1 ? 's' : ''}
                {signerFieldCount === 0 && ' ⚠️'}
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
)}
```

### 5. Update Field Drop Handler

```typescript
const handleDrop = (e: React.DragEvent, pageNum: number) => {
  if (isViewMode) return;
  e.preventDefault();

  const fieldType = e.dataTransfer.getData('fieldType') as Field['type'];
  const signerIndex = parseInt(e.dataTransfer.getData('signerIndex') || '-1');
  const signerRole = e.dataTransfer.getData('signerRole');

  if (!fieldType) return;

  // ... calculate position ...

  const newField: Field = {
    id: `field_${Date.now()}`,
    type: fieldType,
    x,
    y,
    width: fieldWidth,
    height: fieldHeight,
    pageNumber: pageNum,
    label: signerRole
      ? `${signerRole} ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}`
      : `${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} ${fields.filter(f => f.type === fieldType).length + 1}`,
    required: true,
    signerIndex: signerIndex >= 0 ? signerIndex : undefined, // NEW
    signerRole: signerRole || undefined // NEW
  };

  setFields([...fields, newField]);
  setDraggingNewField(null);
};
```

### 6. Update Drag Start Handler

```typescript
const handleSidebarDragStart = (
  e: React.DragEvent,
  fieldType: Field['type'],
  signerIndex?: number,
  signerRole?: string
) => {
  if (isViewMode) return;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('fieldType', fieldType);
  if (signerIndex !== undefined) {
    e.dataTransfer.setData('signerIndex', String(signerIndex));
  }
  if (signerRole) {
    e.dataTransfer.setData('signerRole', signerRole);
  }
};
```

### 7. Update Field Rendering with Signer Colors

```typescript
// Update getFieldColor to use signer-specific colors
const getFieldColor = (field: Field) => {
  if (field.signerIndex !== undefined && workflowSigners[field.signerIndex]) {
    return workflowSigners[field.signerIndex].color;
  }
  // Fallback to type-based color for single-signer mode
  return fieldTypes.find(ft => ft.type === field.type)?.color || 'bg-gray-500';
};

// In field rendering:
<div
  className={`absolute pointer-events-auto ${getFieldColor(field)} border-2 ...`}
  // ... rest of field ...
>
  {/* Show signer role in hover label */}
  <div className="absolute inset-0 bg-black bg-opacity-80 rounded flex flex-col items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
    <span className="text-white text-xs font-semibold">
      {field.label}
    </span>
    {field.signerRole && (
      <span className="text-xs text-blue-300 mt-1">
        {field.signerRole}
      </span>
    )}
    <span className={`text-xs mt-1 ${field.required ? 'text-red-300' : 'text-gray-300'}`}>
      {field.required ? 'Required' : 'Optional'}
    </span>
  </div>
</div>
```

### 8. Add Validation Before Save

```typescript
const handleSaveFields = async () => {
  // Validation: Check if all signers have at least one field
  if (workflowSigners.length > 0) {
    const signersWithoutFields = workflowSigners.filter((signer, idx) => {
      return fields.filter(f => f.signerIndex === idx).length === 0;
    });

    if (signersWithoutFields.length > 0) {
      const signerNames = signersWithoutFields.map(s => s.roleName).join(', ');
      const confirmed = confirm(
        `Warning: The following signers have no fields assigned: ${signerNames}\n\n` +
        `This means they won't have anything to sign. Continue anyway?`
      );

      if (!confirmed) return;
    }
  }

  setIsSaving(true);

  try {
    // Convert fields from percentage coordinates to PDF points
    const fieldPositions = fields.map(field => ({
      type: field.type,
      x: pdfX,
      y: pdfY,
      width: pdfWidth,
      height: pdfHeight,
      page: field.pageNumber,
      label: field.label,
      required: field.required ?? true,
      signerIndex: field.signerIndex, // NEW: Save signer assignment
      signerRole: field.signerRole,   // NEW: Save signer role
      pageHeight,
      pageWidth
    }));

    // Save to backend
    await api.updateTemplateFields(template.id, fieldPositions);
    // ... rest of save logic ...
  }
};
```

## Backend Changes (if needed)

The backend already stores `field_positions` as JSON, so it will automatically include the new `signerIndex` and `signerRole` fields. No schema changes needed.

However, when employees sign documents, you'll need to filter fields by signer:

**File**: `/cloudflare-app/workers/routes/signatures.ts` (or employee portal)

```typescript
// When employee logs in to sign a document:
const currentSignerIndex = getCurrentSignerIndex(assignmentId, employeeBitrixId);

// Filter fields to only show fields for current signer
const fieldsForCurrentSigner = allFields.filter(field =>
  field.signerIndex === undefined || // Backward compatibility
  field.signerIndex === currentSignerIndex
);
```

## Testing Checklist

1. ✅ Upload template with multi-signer workflow (Employee → Manager → HR Admin)
2. ✅ Open field editor - verify sidebar shows signer-grouped fields
3. ✅ Drag "Employee Signature" onto PDF - verify it's blue and labeled correctly
4. ✅ Drag "Manager Signature" onto PDF - verify it's green and labeled correctly
5. ✅ Drag "HR Admin Signature" onto PDF - verify it's purple and labeled correctly
6. ✅ Try to save without assigning fields to Employee - verify warning appears
7. ✅ Save fields - verify signerIndex is saved in field_positions JSON
8. ✅ View template in field editor - verify colors and labels persist
9. ✅ Create assignment - verify each signer only sees their fields

## Migration Strategy

**Backward Compatibility**:
- Templates without multi-signer workflows work as before
- Existing field configurations (without `signerIndex`) still work
- New templates with workflows get signer-specific fields

**Gradual Rollout**:
1. Deploy field editor changes first
2. Test with new templates
3. Gradually update existing multi-signer templates to add signer assignments

## Summary

This enhancement completes the multi-signer workflow by:
- ✅ Clearly showing WHICH signer each field belongs to
- ✅ Color-coding fields by signer for visual clarity
- ✅ Validating that each signer has fields assigned
- ✅ Enabling employees to only see/complete their own fields

**Priority**: HIGH - This is essential for multi-signer workflows to function correctly.
