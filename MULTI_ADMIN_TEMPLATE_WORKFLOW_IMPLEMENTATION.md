# Multi-Admin + Template-Level Workflow Implementation Plan

**Start Time:** 2025-10-16 16:35 UTC
**Estimated Completion:** 6-8 hours
**Status:** 🔄 IN PROGRESS

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Backend Foundation ⏳ IN PROGRESS

#### 1.1 Database Schema ✅ COMPLETE
- [x] Create `hr_admins` table
- [x] Create `admin_activity_log` table
- [x] Set Carly Taylor (bitrix_id: 6509) as super admin
- [x] Run migration on production database
- [x] Verify tables created successfully

**Result:** Migration 007 deployed successfully (11 queries, 20 rows written)

---

#### 1.2 TypeScript Types ✅ COMPLETE
- [x] Update `DefaultSignerConfig` interface
- [x] Add `SignerType` enum
- [x] Add `TemplateSignerConfig` interface
- [x] Verify types compile without errors

**Files Modified:**
- `/cloudflare-app/workers/types.ts`

---

#### 1.3 Admin Management API Endpoints ✅ COMPLETE

**Location:** `/cloudflare-app/workers/routes/admin.ts`

**Endpoints Created:**

1. **GET `/api/admin/admins`** - List all admins
   - [x] Create endpoint
   - [x] Return active admins with employee details
   - [x] Include super_admin flag
   - [x] Include activity counts
   - [ ] Test with Postman/curl (pending backend deployment)

2. **POST `/api/admin/admins`** - Promote employee to admin
   - [x] Create endpoint
   - [x] Check if requester is super_admin
   - [x] Validate employee exists
   - [x] Check if already admin (reactivates if deactivated)
   - [x] Insert into hr_admins table
   - [x] Log activity to admin_activity_log
   - [x] Return success with admin details
   - [ ] Test with Postman/curl (pending backend deployment)

3. **DELETE `/api/admin/admins/:bitrixId`** - Remove admin
   - [x] Create endpoint
   - [x] Check if requester is super_admin
   - [x] Prevent removing super_admin
   - [x] Prevent removing self
   - [x] Soft delete (set is_active=0)
   - [x] Log activity to admin_activity_log
   - [x] Return success
   - [ ] Test with Postman/curl (pending backend deployment)

4. **Middleware: `requireSuperAdmin`**
   - [x] Create middleware function
   - [x] Check session.role === 'hr_admin'
   - [x] Query hr_admins table for is_super_admin
   - [x] Return 403 if not super admin
   - [x] Add to protected routes

**Implementation Notes:**
- Added `c.set('session', session)` to main admin middleware for easy access
- All endpoints include comprehensive error handling
- Activity logging captures IP address, user agent, and metadata

**Code Template:**
```typescript
// GET /api/admin/admins
adminRoutes.get('/admins', async (c) => {
  const env = c.env;
  const session = c.get('session');

  // Check if requester is admin
  if (session.role !== 'hr_admin') {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  // Fetch all active admins
  const admins = await env.DB.prepare(`
    SELECT ha.*, ec.full_name, ec.email, ec.badge_number, ec.position
    FROM hr_admins ha
    LEFT JOIN employee_cache ec ON ha.bitrix_id = ec.bitrix_id
    WHERE ha.is_active = 1
    ORDER BY ha.is_super_admin DESC, ha.promoted_at ASC
  `).all();

  return c.json({ admins: admins.results });
});
```

**Testing Checklist:**
- [ ] Can list all admins as regular admin
- [ ] Can promote employee as super admin
- [ ] Cannot promote as regular admin (403)
- [ ] Cannot remove super admin
- [ ] Can remove regular admin as super admin
- [ ] Activity logged correctly

---

#### 1.4 Signer Type Resolution Logic ✅ COMPLETE

**Location:** `/cloudflare-app/workers/lib/workflow-resolver.ts` (NEW FILE)

**Functions Implemented:**
- `resolveTemplateWorkflow()` - Main entry point for resolving template workflows
- `resolveWorkflowForAssignee()` - Resolves workflow for a single assignee
- `resolveSignerType()` - Resolves individual signer configurations
- `resolveAssigneeSigner()` - Handles 'assignee' signer type
- `resolveCreatingAdminSigner()` - Handles 'creating_admin' signer type
- `resolveManagerSigner()` - Handles 'assignees_manager' signer type (fetches from Bitrix24)
- `resolveSpecificPersonSigner()` - Handles 'specific_person' signer type
- `fetchEmployeeDetails()` - Queries employee_cache for employee info
- `convertToSignerRecords()` - Helper to convert resolved data for DB insertion

**Tasks:**
- [x] Create `/cloudflare-app/workers/lib/workflow-resolver.ts`
- [x] Implement `resolveTemplateWorkflow` function
- [x] Implement `resolveSignerType` function
- [x] Implement manager lookup (from employee_cache.data.assignedById)
- [x] Handle edge cases (no manager, duplicate signers)
- [x] Add error handling
- [ ] Write unit tests (will do after integration testing)

**Edge Cases Handled:**
- [x] Employee has no manager (throws descriptive error)
- [x] Duplicate signers (deduplication with warning log)
- [x] Employee not found in cache (throws error)
- [x] Template has no workflow config (returns single-signer mode)
- [x] Zero signers after deduplication (throws error)
- [x] Order renumbering after deduplication

**Implementation Notes:**
- Uses employee_cache table for fast lookups
- Manager ID extracted from data.assignedById (Bitrix24 standard field)
- Deduplication prevents same person from appearing twice in workflow
- Orders automatically renumbered after deduplication (1, 2, 3...)
- Comprehensive error messages for debugging

---

#### 1.5 Update Assignment Creation API ✅ COMPLETE

**Location:** `/cloudflare-app/workers/routes/admin.ts`

**Modify:** `POST /api/admin/assignments`

**Implementation:**
- [x] Import workflow resolver functions (line 7)
- [x] Fetch template with `default_signer_config` column
- [x] Parse workflow configuration JSON
- [x] Add mode detection (single vs multi)
- [x] Preserve existing single-signer logic (backward compatible)
- [x] Add multi-signer workflow expansion using `resolveTemplateWorkflow()`
- [x] Create document_assignments records with resolved workflows
- [x] Create document_signers records for each resolved signer
- [x] Update response format with workflow details
- [x] Add comprehensive error handling

**Key Features:**
- Single-signer mode: Creates one assignment per employee (backward compatible)
- Multi-signer mode: Resolves template workflow for each employee
- Uses `c.get('session')` to get creating admin's Bitrix ID
- Sends email to first signer only (multi-signer mode)
- Returns detailed response with signer information

**Testing Checklist:**
- [ ] Single-signer templates still work (backward compat) - pending deployment
- [ ] Multi-signer with assignee + creating_admin works - pending deployment
- [ ] Multi-signer with assignee + specific_person works - pending deployment
- [ ] Multi-signer with assignee + assignees_manager works - pending deployment
- [ ] Bulk assignment (50 employees) creates 50 workflows - pending deployment
- [ ] Error handling works (no manager, etc.) - pending deployment

**Implementation Notes:**
- Lines 1571-1814 contain the complete V2 implementation
- Removed old V1 per-assignment signer configuration logic
- Frontend will be simplified (no more per-assignment workflow UI)

---

### Phase 2: Backend Deployment ⏳ TODO

#### 2.1 Backend Code Review
- [ ] Review all new TypeScript code
- [ ] Check for type errors
- [ ] Verify backward compatibility
- [ ] Test locally if possible

#### 2.2 Deploy Backend to Production
- [ ] Run `wrangler deploy` from `/cloudflare-app`
- [ ] Verify deployment successful
- [ ] Check logs for errors
- [ ] Test API endpoints with curl

**Deployment Command:**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/cloudflare-app
wrangler deploy
```

#### 2.3 Backend Testing
- [ ] Test GET /api/admin/admins (list admins)
- [ ] Test POST /api/admin/admins (promote admin)
- [ ] Test DELETE /api/admin/admins/:id (remove admin)
- [ ] Test POST /api/admin/assignments (single-signer)
- [ ] Test POST /api/admin/assignments (multi-signer)
- [ ] Verify logs show no errors

---

### Phase 3: Frontend - Admin Management UI ⏳ TODO

#### 3.1 Admin Management Page

**Location:** `/frontend/src/app/admin/settings/page.tsx`

**Components to Add:**

1. **Admin List Section**
   ```tsx
   <div className="bg-white rounded-lg shadow p-6">
     <h2>HR Administrators</h2>
     <div className="space-y-4">
       {admins.map(admin => (
         <AdminCard
           key={admin.bitrix_id}
           admin={admin}
           canRemove={isSuperAdmin && !admin.is_super_admin}
           onRemove={() => removeAdmin(admin.bitrix_id)}
         />
       ))}
     </div>
   </div>
   ```

2. **Add Admin Modal**
   ```tsx
   <AddAdminModal
     isOpen={showAddAdmin}
     onClose={() => setShowAddAdmin(false)}
     onSuccess={() => {
       refetch();
       showToast('Admin added successfully');
     }}
   />
   ```

**Tasks:**
- [ ] Read current settings page
- [ ] Add admin list section
- [ ] Create `<AdminCard>` component
- [ ] Create `<AddAdminModal>` component
- [ ] Add "Add Admin" button (super admin only)
- [ ] Add remove admin functionality
- [ ] Add API client methods
- [ ] Style components
- [ ] Test UI interactions

**UI Requirements:**
- [ ] Show super admin badge for Carly
- [ ] Show "You" label for current user
- [ ] Disable remove button for super admin
- [ ] Show "Super Admin Only" message for regular admins
- [ ] Show promoted by and date
- [ ] Confirmation modal before removing admin

---

#### 3.2 Update API Client

**Location:** `/frontend/src/lib/api.ts`

**Methods to Add:**
```typescript
// Get all admins
async getAdmins(): Promise<{ admins: any[] }> {
  return this.request('/admin/admins');
}

// Promote employee to admin
async promoteAdmin(bitrixId: number): Promise<{ success: boolean }> {
  return this.request('/admin/admins', {
    method: 'POST',
    body: JSON.stringify({ bitrixId })
  });
}

// Remove admin
async removeAdmin(bitrixId: number): Promise<{ success: boolean }> {
  return this.request(`/admin/admins/${bitrixId}`, {
    method: 'DELETE'
  });
}
```

**Tasks:**
- [ ] Add getAdmins method
- [ ] Add promoteAdmin method
- [ ] Add removeAdmin method
- [ ] Test methods with backend

---

### Phase 4: Frontend - Template Workflow Configurator ⏳ TODO

#### 4.1 Create Workflow Configurator Component

**Location:** `/frontend/src/components/TemplateWorkflowConfig.tsx` (NEW FILE)

**Component Structure:**
```tsx
interface TemplateWorkflowConfigProps {
  value: DefaultSignerConfig | null;
  onChange: (config: DefaultSignerConfig) => void;
}

export function TemplateWorkflowConfig({ value, onChange }: Props) {
  // Mode toggle (single vs multi)
  // Signer list (add/remove/reorder)
  // Signer type dropdown
  // Role name input
  // Visual sequence preview
}
```

**Features:**
- [ ] Mode toggle (Single/Multi-Signer)
- [ ] Add signer button (max 4)
- [ ] Remove signer button
- [ ] Reorder signers (up/down arrows)
- [ ] Signer type dropdown with descriptions
- [ ] Role name input
- [ ] Specific person selector (for specific_admin/specific_person)
- [ ] Visual sequence preview ("Employee → HR Admin")
- [ ] Validation (2-4 signers, unique roles)
- [ ] Help tooltips

**Signer Type Dropdown:**
```tsx
<select value={signer.signerType} onChange={handleChange}>
  <option value="assignee">
    Assignee - The employee(s) being assigned
  </option>
  <option value="creating_admin">
    Creating Admin - The admin who creates the assignment
  </option>
  <option value="specific_admin">
    Specific Admin - Choose which admin should always sign
  </option>
  <option value="assignees_manager">
    Assignee's Manager - Looked up from Bitrix24
  </option>
  <option value="specific_person">
    Specific Person - Choose any specific employee
  </option>
</select>
```

**Tasks:**
- [ ] Create component file
- [ ] Build mode toggle UI
- [ ] Build signer list UI
- [ ] Build add/remove/reorder logic
- [ ] Build signer type dropdown
- [ ] Build role name inputs
- [ ] Build specific person selector
- [ ] Build visual sequence preview
- [ ] Add validation logic
- [ ] Style component
- [ ] Test all interactions

---

#### 4.2 Update Template Upload Modal

**Location:** `/frontend/src/app/admin/templates/page.tsx`

**Modifications:**
```tsx
// Add to upload modal state
const [workflowConfig, setWorkflowConfig] = useState<DefaultSignerConfig>({
  mode: 'single_signer'
});

// Add to form
<TemplateWorkflowConfig
  value={workflowConfig}
  onChange={setWorkflowConfig}
/>

// Include in API call
await api.uploadTemplate({
  ...formData,
  defaultSignerConfig: JSON.stringify(workflowConfig)
});
```

**Tasks:**
- [ ] Read current upload modal
- [ ] Add workflow config state
- [ ] Add `<TemplateWorkflowConfig>` component
- [ ] Update uploadTemplate API call
- [ ] Test template upload with workflow
- [ ] Verify JSON stored correctly

---

#### 4.3 Update Template Edit Modal

**Location:** `/frontend/src/app/admin/templates/page.tsx`

**Similar to upload modal:**
- [ ] Add workflow config to edit modal
- [ ] Load existing workflow from template
- [ ] Allow editing workflow
- [ ] Save updated workflow
- [ ] Test template edit with workflow

---

#### 4.4 Update Template Cards

**Location:** `/frontend/src/app/admin/templates/page.tsx`

**Add workflow badge to template cards:**
```tsx
{template.defaultSignerConfig && (
  <div className="mt-2 text-xs text-gray-600">
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded">
      🔄 {config.signers.length} Signers
    </span>
    <div className="mt-1">
      {config.signers.map(s => s.roleName).join(' → ')}
    </div>
  </div>
)}
```

**Tasks:**
- [ ] Parse workflow config from template
- [ ] Add workflow badge
- [ ] Show signer count
- [ ] Show sequence preview
- [ ] Style badges
- [ ] Test display

---

### Phase 5: Frontend - Simplified Assignment Modal ⏳ TODO

#### 5.1 Remove Per-Assignment Multi-Signer UI

**Location:** `/frontend/src/app/admin/assignments/page.tsx`

**Remove:**
- [ ] Multi-signer mode toggle
- [ ] Per-assignment signer selection
- [ ] Role name inputs
- [ ] Reorder buttons
- [ ] All multi-signer state management

**Keep:**
- [ ] Template selection
- [ ] Bulk employee selection (checkboxes)
- [ ] Priority and due date
- [ ] Notes field

---

#### 5.2 Add Workflow Summary Display

**Add to assignment modal:**
```tsx
{template && template.defaultSignerConfig && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div className="flex items-center gap-2 text-sm">
      <InfoIcon className="w-4 h-4 text-hartzell-blue" />
      <span className="font-medium">
        This template requires {signerCount} signatures:
      </span>
    </div>
    <div className="mt-2 text-sm text-gray-700">
      {config.signers.map((s, i) => (
        <span key={i}>
          {i + 1}️⃣ {s.roleName}
          {i < config.signers.length - 1 && ' → '}
        </span>
      ))}
    </div>
    <p className="mt-2 text-xs text-gray-600">
      {getWorkflowDescription(config)}
    </p>
  </div>
)}
```

**Tasks:**
- [ ] Add workflow summary component
- [ ] Parse template workflow config
- [ ] Show signer sequence
- [ ] Show description based on signer types
- [ ] Style summary box
- [ ] Test with different workflows

**Description Examples:**
- "Each selected employee will sign first, then you will review."
- "Each selected employee will sign first, then John (Payroll Admin) will review."
- "Each selected employee will sign first, then their manager will review."

---

#### 5.3 Add "Workflows Created" Preview

**Add below employee selection:**
```tsx
{selectedEmployees.length > 0 && workflowConfig && (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
    <div className="text-sm font-medium text-gray-900 mb-2">
      📊 This will create {selectedEmployees.length} multi-signer workflows:
    </div>
    <div className="text-xs text-gray-600 space-y-1">
      {selectedEmployees.slice(0, 3).map(emp => (
        <div key={emp.id}>
          • {emp.name} → {getSecondSignerName(workflowConfig)}
        </div>
      ))}
      {selectedEmployees.length > 3 && (
        <div>... and {selectedEmployees.length - 3} more</div>
      )}
    </div>
  </div>
)}
```

**Tasks:**
- [ ] Add preview component
- [ ] Calculate workflows count
- [ ] Show first 3 examples
- [ ] Resolve signer names for display
- [ ] Style preview box
- [ ] Test with different configs

---

#### 5.4 Update Submit Button

**Update button text:**
```tsx
<button type="submit">
  {isMultiSigner
    ? `Create ${selectedEmployees.length} Multi-Signer Assignments`
    : `Assign to ${selectedEmployees.length} Employee${selectedEmployees.length === 1 ? '' : 's'}`
  }
</button>
```

**Tasks:**
- [ ] Update button text based on mode
- [ ] Update success message
- [ ] Test button behavior

---

### Phase 6: Frontend Deployment ⏳ TODO

#### 6.1 Frontend Code Review
- [ ] Review all new React components
- [ ] Check for TypeScript errors
- [ ] Verify UI matches design
- [ ] Test locally if possible
- [ ] Check responsive design

#### 6.2 Deploy Frontend to Production
- [ ] Run `npm run deploy` from `/frontend`
- [ ] Verify deployment successful
- [ ] Check deployment URL
- [ ] Hard refresh browser (Ctrl+Shift+R)

**Deployment Command:**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/frontend
npm run deploy
```

#### 6.3 Frontend Testing
- [ ] Test admin management page
- [ ] Test template workflow configurator
- [ ] Test template upload with workflow
- [ ] Test template edit with workflow
- [ ] Test assignment modal (simplified)
- [ ] Test workflow summary display
- [ ] Test on mobile (responsive)

---

### Phase 7: End-to-End Testing ⏳ TODO

#### 7.1 Admin Management Testing
- [ ] Login as Carly (super admin)
- [ ] Navigate to Settings → Admins
- [ ] View list of admins
- [ ] Promote employee to admin
- [ ] Verify new admin appears in list
- [ ] Login as new admin
- [ ] Verify admin portal access
- [ ] Verify cannot promote others (not super admin)
- [ ] Logout, login as Carly
- [ ] Remove admin
- [ ] Verify admin removed from list

#### 7.2 Template Workflow Testing
- [ ] Login as admin
- [ ] Navigate to Templates
- [ ] Upload new template
- [ ] Configure workflow: Assignee → Creating Admin
- [ ] Save template
- [ ] Verify workflow shows on template card
- [ ] Edit template
- [ ] Change workflow: Assignee → Specific Admin (select someone)
- [ ] Save and verify update

#### 7.3 Single-Signer Assignment (Backward Compat)
- [ ] Select template with no workflow (old template)
- [ ] Select 5 employees
- [ ] Create assignments
- [ ] Verify 5 separate single-signer assignments created
- [ ] Verify employees can sign individually

#### 7.4 Multi-Signer Assignment Testing

**Test 1: Assignee → Creating Admin**
- [ ] Create template with workflow: Employee → HR Admin
- [ ] Select template in assignment modal
- [ ] Verify workflow summary shows correctly
- [ ] Select 10 employees
- [ ] Verify preview shows "10 multi-signer workflows"
- [ ] Create assignments
- [ ] Verify 10 assignments created (is_multi_signer=1)
- [ ] Verify each has 2 signers in document_signers
- [ ] Verify first signer is employee, second is you
- [ ] Login as employee
- [ ] Sign document
- [ ] Verify moves to you for review
- [ ] Login as admin
- [ ] Review and sign document
- [ ] Verify marked as completed

**Test 2: Assignee → Specific Admin**
- [ ] Create template: Employee → John (specific admin)
- [ ] Carly assigns to 5 employees
- [ ] Verify all 5 workflows: Employee → John
- [ ] Login as employee, sign
- [ ] Verify routes to John (not Carly)
- [ ] Login as John, review and sign
- [ ] Verify completed

**Test 3: Assignee → Manager → HR Admin** (if time permits)
- [ ] Create 3-step workflow template
- [ ] Assign to employee with manager
- [ ] Verify 3 signers created
- [ ] Test full sequence

#### 7.5 Edge Case Testing
- [ ] Try to assign doc with "assignees_manager" to employee without manager
- [ ] Verify error message shown
- [ ] Try to create duplicate signer (assignee + specific person = same ID)
- [ ] Verify validation works
- [ ] Try to promote already-admin employee
- [ ] Verify error message shown
- [ ] Try to remove super admin
- [ ] Verify blocked with error

#### 7.6 Performance Testing
- [ ] Create assignment to 50 employees
- [ ] Verify completes in reasonable time (<5 seconds)
- [ ] Verify all 50 workflows created correctly
- [ ] Check database size
- [ ] Check R2 storage usage

---

### Phase 8: Documentation & Cleanup ⏳ TODO

#### 8.1 Update Documentation
- [ ] Update README.md with admin management
- [ ] Update SPECIFICATION.md with workflow system
- [ ] Add workflow examples to docs
- [ ] Document signer types
- [ ] Add troubleshooting section

#### 8.2 Code Cleanup
- [ ] Remove debug console.logs
- [ ] Add code comments where needed
- [ ] Format code consistently
- [ ] Remove unused imports
- [ ] Check for TODOs left in code

#### 8.3 Update This Implementation Doc
- [ ] Mark all tasks complete
- [ ] Add final notes
- [ ] Add lessons learned
- [ ] Update completion time

---

## 📊 PROGRESS TRACKING

### Overall Progress
- **Phase 1:** Backend Foundation - ✅ 100% COMPLETE (5/5 sub-tasks)
  - ✅ 1.1 Database Schema (completed)
  - ✅ 1.2 TypeScript Types (completed)
  - ✅ 1.3 Admin Management API (completed - pending testing)
  - ✅ 1.4 Signer Type Resolution Logic (completed)
  - ✅ 1.5 Update Assignment Creation API (completed)
- **Phase 2:** Backend Deployment - 0% COMPLETE
- **Phase 3:** Frontend Admin UI - 0% COMPLETE (working on this next)
- **Phase 4:** Frontend Workflow Config - 0% COMPLETE
- **Phase 5:** Frontend Assignment Modal - 0% COMPLETE
- **Phase 6:** Frontend Deployment - 0% COMPLETE
- **Phase 7:** E2E Testing - 0% COMPLETE
- **Phase 8:** Documentation - 0% COMPLETE

**Total Progress: ~20%**

---

## 🐛 ISSUES & BLOCKERS

### Issues Found
_None yet_

### Blockers
_None yet_

---

## 📝 NOTES & DECISIONS

### Design Decisions Made
1. ✅ Carly is super admin (only she can promote/demote admins)
2. ✅ All admins see all assignments (for coverage)
3. ✅ Default signer type: `creating_admin` (simplest, most common)
4. ✅ Specialized docs use `specific_admin` (route to expert)
5. ✅ Backward compatible (single-signer templates still work)

### Changes from Original Plan
_None yet_

### Lessons Learned
_To be filled in during implementation_

---

## 🚀 DEPLOYMENT LOG

### Backend Deployments
- **2025-10-16 16:30 UTC** - Migration 007 (multi-admin system) deployed

### Frontend Deployments
_None yet_

---

## ✅ FINAL VERIFICATION

Before marking complete:
- [ ] All checklist items marked done
- [ ] No errors in production logs
- [ ] All tests passing
- [ ] Documentation updated
- [ ] User acceptance testing done
- [ ] Performance acceptable
- [ ] No critical bugs found

---

**Last Updated:** 2025-10-16 16:40 UTC
**Updated By:** Claude (Automated Implementation Agent)
