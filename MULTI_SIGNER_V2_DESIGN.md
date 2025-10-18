# Multi-Signer V2: Template-Level Workflow Configuration

## 🚨 CRITICAL FLAW IN V1

**V1 Problem:**
- Multi-signer configuration happens PER ASSIGNMENT
- Admin manually selects specific people: "Carly Taylor" → "Test User"
- To assign W-4 to 50 employees where each needs (Employee → HR Admin):
  - Must create 50 SEPARATE assignments manually
  - **COMPLETELY UNUSABLE FOR BULK OPERATIONS**

**V2 Solution:**
- Multi-signer configuration happens AT TEMPLATE LEVEL (one-time setup)
- Define ROLES, not specific people: "Assignee" → "HR Admin"
- When bulk assigning to 50 employees:
  - System AUTOMATICALLY creates 50 workflows
  - John Doe (Assignee) → You (HR Admin)
  - Jane Smith (Assignee) → You (HR Admin)
  - ... 48 more

---

## 🎯 USER FLOW

### 1️⃣ Template Setup (One-Time Per Template)

**Admin uploads W-4 template:**

```
┌──────────────────────────────────────────────────────────┐
│ 📄 Upload Template                                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Title: W-4 2025                                          │
│ Category: Tax Forms                                      │
│ Requires Signature: ☑                                    │
│                                                          │
│ ┌─ 🖊️ SIGNING WORKFLOW ───────────────────────────────┐ │
│ │                                                      │ │
│ │ Mode: ○ Single Signer (each employee signs own)     │ │
│ │       ● Multi-Signer (sequential signatures)        │ │
│ │                                                      │ │
│ │ ┌────────────────────────────────────────────────┐  │ │
│ │ │ STEP 1                                         │  │ │
│ │ │                                                │  │ │
│ │ │ Who signs?  [Assignee                    ▼]   │  │ │
│ │ │             └─ The employee being assigned     │  │ │
│ │ │                                                │  │ │
│ │ │ Role Name:  Employee                          │  │ │
│ │ │             └─ Shown in signing sequence       │  │ │
│ │ └────────────────────────────────────────────────┘  │ │
│ │                        ↓                            │ │
│ │ ┌────────────────────────────────────────────────┐  │ │
│ │ │ STEP 2                                         │  │ │
│ │ │                                                │  │ │
│ │ │ Who signs?  [HR Admin                    ▼]   │  │ │
│ │ │             └─ The person creating assignment  │  │ │
│ │ │                                                │  │ │
│ │ │ Role Name:  HR Reviewer                       │  │ │
│ │ └────────────────────────────────────────────────┘  │ │
│ │                                                      │ │
│ │ [+ Add Another Signer] (max 4)                       │ │
│ │                                                      │ │
│ │ Preview: Employee → HR Reviewer ✓                    │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ [Cancel]  [Save Template]                                │
└──────────────────────────────────────────────────────────┘
```

**Signer Type Dropdown Options:**

```
┌─────────────────────────────────────────┐
│ Assignee                          ⭐     │  ← Most common
│ └─ The employee(s) being assigned       │
│                                         │
│ HR Admin                                │
│ └─ The person creating the assignment   │
│                                         │
│ Assignee's Manager                      │
│ └─ Looked up from Bitrix24 hierarchy    │
│                                         │
│ Specific Person                         │
│ └─ Choose a specific employee ─────────→│
└─────────────────────────────────────────┘
```

### 2️⃣ Bulk Assignment (Simple & Fast)

**Admin assigns W-4 to 50 employees:**

```
┌──────────────────────────────────────────────────────────┐
│ 📋 Assign Document                                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Template: [W-4 2025                              ▼]     │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ℹ️ This template requires 2 signatures:           │  │
│ │                                                    │  │
│ │    1️⃣ Employee   →   2️⃣ HR Reviewer              │  │
│ │                                                    │  │
│ │ Each selected employee will sign first, then you   │  │
│ │ will review and sign their document.               │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Select Employees: ────────────────────────────────       │
│   🔍 Search...                    [Select All] [Clear]   │
│                                                          │
│   ☑ John Doe          #1001                              │
│   ☑ Jane Smith        #1002                              │
│   ☑ Mike Johnson      #1003                              │
│   ☑ Sarah Williams    #1004                              │
│   ... (46 more selected)                                 │
│                                                          │
│   ✓ 50 employees selected                                │
│                                                          │
│ Priority: [Medium ▼]    Due Date: [____________]         │
│                                                          │
│ Notes: ________________________________________________   │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 📊 This will create 50 multi-signer workflows:     │  │
│ │                                                    │  │
│ │ • John Doe → You                                   │  │
│ │ • Jane Smith → You                                 │  │
│ │ • ... 48 more                                      │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [Cancel]  [✓ Create 50 Assignments]                      │
└──────────────────────────────────────────────────────────┘
```

### 3️⃣ What Happens Behind the Scenes

**System automatically creates 50 separate workflows:**

```
Assignment #1: John Doe's W-4
├─ Signer 1: John Doe (Assignee → Employee)
└─ Signer 2: You (HR Admin → HR Reviewer)

Assignment #2: Jane Smith's W-4
├─ Signer 1: Jane Smith (Assignee → Employee)
└─ Signer 2: You (HR Admin → HR Reviewer)

... 48 more
```

**Each workflow is independent:**
- John signs his W-4 → You review John's W-4
- Jane signs her W-4 → You review Jane's W-4
- No cross-contamination

---

## 🏗️ TECHNICAL ARCHITECTURE

### Database Schema

**Already exists! Using:**
```sql
-- document_templates table
default_signer_config TEXT  -- JSON configuration

-- Example value:
{
  "mode": "multi_signer",
  "signers": [
    {
      "order": 1,
      "signerType": "assignee",
      "roleName": "Employee"
    },
    {
      "order": 2,
      "signerType": "hr_admin",
      "roleName": "HR Reviewer"
    }
  ]
}
```

### Signer Types

```typescript
type SignerType =
  | 'assignee'           // The employee(s) being assigned
  | 'hr_admin'           // The person creating the assignment
  | 'assignees_manager'  // Looked up from Bitrix24
  | 'specific_person';   // Specific employee (requires bitrixId)

interface TemplateSignerConfig {
  order: number;
  signerType: SignerType;
  roleName: string;
  bitrixId?: number;  // Only for 'specific_person'
}
```

### Backend Workflow Expansion

**When creating assignment:**

```typescript
// Input: Template + 50 employee IDs
POST /api/admin/assignments
{
  templateId: "w4-template-id",
  employeeIds: [1001, 1002, ... 1050],  // 50 employees
  priority: "medium",
  dueDate: "2025-11-01"
}

// Backend logic:
1. Load template.default_signer_config
2. For EACH employee:
   a. Resolve signer types:
      - 'assignee' → current employee (1001, then 1002, etc.)
      - 'hr_admin' → session.bitrixId
      - 'assignees_manager' → fetch from Bitrix24
      - 'specific_person' → use provided bitrixId
   b. Create document_assignments record (is_multi_signer=1)
   c. Create document_signers records (one per signer)
3. Return: { success: true, created: 50 }
```

---

## 🎨 UI COMPONENTS TO BUILD

### 1. Template Workflow Configurator

**Location:** `/admin/templates` (upload/edit modal)

**Component:** `<TemplateWorkflowConfig>`

**Features:**
- Mode toggle: Single vs Multi-Signer
- Add/remove/reorder signers
- Signer type dropdown with descriptions
- Role name input
- Visual sequence preview
- Smart validation (max 4 signers, unique roles)

### 2. Assignment Modal Updates

**Location:** `/admin/assignments` (existing modal)

**Changes:**
- REMOVE: Per-assignment multi-signer UI
- ADD: Workflow summary badge
- ADD: Preview of what will be created
- KEEP: Bulk employee selection (checkboxes)

### 3. Template Card Enhancement

**Location:** `/admin/templates` (template list)

**Add workflow badge:**
```
┌─────────────────────────────┐
│ 📄 W-4 2025                 │
│                             │
│ 🔄 2 Signers                │
│ Employee → HR Reviewer      │
│                             │
│ Tax Forms  •  Updated 1d    │
└─────────────────────────────┘
```

---

## ✅ ADVANTAGES OF V2

1. **One-Time Setup**: Configure workflow once per template
2. **Bulk-Friendly**: Assign to 50 people = 1 click
3. **Reusable**: Same template, different employees = same workflow
4. **Clear Intent**: Workflow defined with the document type
5. **Flexible**: Supports dynamic roles (Assignee, Manager) + fixed roles
6. **Backward Compatible**: Single-signer templates still work

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Backend
- [ ] Update TypeScript types for template signer config
- [ ] Update template upload/edit endpoint to save workflow
- [ ] Update assignment creation to expand workflows
- [ ] Add workflow resolution logic (assignee, hr_admin, manager, specific)
- [ ] Handle edge cases (employee with no manager, duplicate signers)

### Phase 2: Frontend - Templates
- [ ] Build `<TemplateWorkflowConfig>` component
- [ ] Add to template upload modal
- [ ] Add to template edit modal
- [ ] Show workflow on template cards
- [ ] Validation and user feedback

### Phase 3: Frontend - Assignments
- [ ] Remove per-assignment multi-signer UI
- [ ] Add workflow summary display
- [ ] Show "X workflows will be created" preview
- [ ] Update success message

### Phase 4: Testing
- [ ] Test single-signer (backward compatibility)
- [ ] Test multi-signer with Assignee + HR Admin
- [ ] Test bulk assignment (1 template → 50 employees)
- [ ] Test edge cases (no manager, duplicate signers)

---

## 🚀 DEPLOYMENT STRATEGY

**Incremental rollout:**

1. **Deploy backend first** (with template workflow support)
   - Existing assignments continue working
   - New field is optional

2. **Deploy frontend** (template configurator)
   - Admins can start configuring workflows
   - Old templates remain single-signer

3. **Update assignment modal** (simplified bulk mode)
   - Show workflow summary
   - Remove per-assignment config

4. **Communicate change**
   - "New: Configure signing workflows at template level!"
   - "Bulk assign multi-signer documents with 1 click"

---

## 📊 SUCCESS METRICS

**Before (V1):**
- Assign W-4 to 50 employees with multi-signer
- Actions required: 50 separate assignments × 2 minutes = **100 minutes**

**After (V2):**
- Configure W-4 template once: **2 minutes**
- Assign to 50 employees: **30 seconds**
- Total: **2.5 minutes** (40x improvement!)

---

**Next Step:** Start with backend implementation of workflow resolution logic.
