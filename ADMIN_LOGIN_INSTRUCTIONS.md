# Admin Login Instructions

## 🌐 Production URLs

**Employee Portal:** `https://app.hartzell.work`
**Admin Portal:** `https://app.hartzell.work/admin`
**API Backend:** `https://hartzell.work/api`

✅ Everything is now on the proper `app.hartzell.work` domain!

---

## 🔐 How Admin Login Works

### **There is ONE login page for everyone**

**Login URL:** `https://app.hartzell.work/login`

- **Employees** login → redirected to `/dashboard` (employee portal)
- **Admins** login → redirected to `/admin` (admin portal)

The system **automatically detects** if you're an admin based on your **position** in Bitrix24.

---

## 👤 How to Become an Admin

The admin role is determined by your **position title** in Bitrix24.

### **Automatic Admin Detection**

The system checks if your `ufCrm6WorkPosition` (position field) contains:
- `"HR"` (case-insensitive)
- `"Director"` (case-insensitive)
- `"Human Resources"` (case-insensitive)

**If it does → You get `hr_admin` role**

---

## 🚀 Option 1: Update Position in Bitrix24 (Recommended)

### **Steps:**

1. Log into **Bitrix24**
2. Go to **CRM** → **Smart Process** → **Employees** (Entity Type 1054)
3. Find the employee you want to make admin
4. Edit their **Work Position** field
5. Change it to include "HR", "Director", or "Human Resources"

**Examples of admin positions:**
- `HR Manager`
- `HR Director`
- `Director of Operations`
- `Human Resources Specialist`
- `VP of HR`

6. **Save** the employee record
7. **Log out and log back in** to the employee portal
8. You'll now be redirected to `/admin` instead of `/dashboard`

---

## 🛠️ Option 2: Manually Set Role in Database (Quick Test)

If you want to test admin access immediately without changing Bitrix24:

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# Replace EMP1039 with the badge number you want to make admin
npx wrangler d1 execute hartzell_hr --remote --command "
  UPDATE employee_cache
  SET data = json_set(data, '$.ufCrm6WorkPosition', 'HR Manager')
  WHERE badge_number = 'EMP1039'
"
```

**Then:**
1. Clear the KV cache for that employee:
```bash
# This will force a fresh fetch from database on next login
npx wrangler kv key delete --namespace-id=ae6971a1e8f746d4a39687a325f5dd2b "employee:badge:EMP1039"
npx wrangler kv key delete --namespace-id=ae6971a1e8f746d4a39687a325f5dd2b "employee:id:BITRIX_ID"
```

2. Log out and log back in

---

## 📋 Step-by-Step Admin Login

### **1. Go to Login Page**
```
https://app.hartzell.work/login
```

### **2. Enter Credentials**
- **Employee ID:** Your badge number (e.g., `EMP1039`)
- **Date of Birth:** Your DOB in `YYYY-MM-DD` format
- Complete CAPTCHA if prompted

### **3. SSN Verification (if required)**
- Enter last 4 digits of SSN if prompted

### **4. Automatic Redirect**
- **If you're an admin:** → `https://app.hartzell.work/admin`
- **If you're an employee:** → `https://app.hartzell.work/dashboard`

---

## 🎯 Admin Portal Features

Once logged in as admin at `/admin`, you'll see:

### **Dashboard** (`/admin`)
- Total templates, pending signatures, completed today, overdue
- Quick actions: Upload template, assign documents
- Recent activity feed

### **Templates** (`/admin/templates`)
- Upload new document templates
- Manage existing templates
- Filter by category (onboarding, tax, benefits, policy)

### **Assignments** (`/admin/assignments`)
- Assign documents to employees
- Track signature status
- Send reminders
- Download signed documents
- Filter by status: assigned, sent, signed, declined, expired

### **Employees** (`/admin/employees`)
- Employee list (coming soon)

---

## 🔍 Check Current Admin Users

To see who currently has admin access:

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

npx wrangler d1 execute hartzell_hr --remote --command "
  SELECT
    badge_number,
    full_name,
    position,
    CASE
      WHEN LOWER(position) LIKE '%hr%'
        OR LOWER(position) LIKE '%director%'
        OR LOWER(position) LIKE '%human resources%'
      THEN 'hr_admin'
      ELSE 'employee'
    END as role
  FROM employee_cache
  WHERE position IS NOT NULL
"
```

---

## 🐛 Troubleshooting

### "Access Forbidden - Admin access required"
**Problem:** You're trying to access `/admin` but don't have admin role

**Solution:**
1. Check your position in Bitrix24 includes "HR", "Director", or "Human Resources"
2. OR manually update `employee_cache` as shown in Option 2
3. Log out and log back in

### "Redirected to /dashboard instead of /admin"
**Problem:** System thinks you're an employee, not admin

**Solution:**
1. Verify your position title in Bitrix24
2. Clear cache and re-login
3. Check if you're in the database:
```bash
npx wrangler d1 execute hartzell_hr --remote --command "
  SELECT badge_number, position
  FROM employee_cache
  WHERE badge_number = 'YOUR_BADGE'
"
```

### "Cannot access app.hartzell.work"
**Problem:** DNS not propagated or custom domain not configured

**Solution:**
1. Check DNS settings for `app.hartzell.work` → Points to Cloudflare Pages
2. Verify custom domain in Pages: `wrangler pages project list`
3. Use preview URL temporarily: `https://hartzell-hr-frontend.pages.dev`

---

## 📝 Make Your First Admin Account

**Recommended Quick Setup:**

1. Choose an employee to make admin (e.g., yourself)

2. Update their position in **Bitrix24**:
   - Position: `HR Director` or `HR Manager`

3. Or use database command:
```bash
npx wrangler d1 execute hartzell_hr --remote --command "
  UPDATE employee_cache
  SET data = json_set(data, '$.ufCrm6WorkPosition', 'HR Director')
  WHERE badge_number = 'YOUR_BADGE_NUMBER'
"
```

4. Clear cache:
```bash
npx wrangler kv key delete --namespace-id=ae6971a1e8f746d4a39687a325f5dd2b "employee:badge:YOUR_BADGE_NUMBER"
```

5. Go to `https://app.hartzell.work/login`

6. Login with:
   - Employee ID: `YOUR_BADGE_NUMBER`
   - DOB: `YYYY-MM-DD`
   - SSN Last 4 (if prompted)

7. You'll be redirected to `https://app.hartzell.work/admin` ✅

---

## 🎉 You're Ready!

- **Employee Portal:** `https://app.hartzell.work`
- **Admin Portal:** `https://app.hartzell.work/admin`
- **Same login page for everyone** → Auto-redirects based on role
- **Role determined by:** Position title in Bitrix24 containing "HR", "Director", or "Human Resources"

**Next Steps:**
1. Make yourself admin using steps above
2. Log in at `app.hartzell.work/login`
3. Access admin portal at `app.hartzell.work/admin`
4. Upload your first document template!
