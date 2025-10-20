---
name: Bitrix24 Integration
description: Complete reference for Bitrix24 CRM fields, enum values, database queries, SSH access, and REST API. Use when user asks about Bitrix24 fields, enum values, education levels, employment types, shift preferences, field IDs, database queries, SSH credentials, API endpoints, webhook URLs, or needs to query/access Bitrix24 data. Contains all connection details, field mappings, and ready-to-use SQL queries.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

# Bitrix24 Integration

This skill provides comprehensive access to the Hartzell Bitrix24 CRM system through both SSH database access and REST API integration.

## Connection Details

### SSH Database Access

**Server**: `cloud-user@44.219.4.160`
**Key**: `/mnt/c/Users/Agent/Downloads/bitrix-v2 (1).pem`
**Database**: `sitemanager`
**Username**: `bitrixro` (read-only)
**Password**: `Px8fuL5fUkv9WjAt`

**Connection command**:
```bash
ssh -i "C:\\Users\\Agent\\Downloads\\bitrix-v2 (1).pem" cloud-user@44.219.4.160
```

**Direct MySQL query**:
```bash
ssh -i "C:\\Users\\Agent\\Downloads\\bitrix-v2 (1).pem" cloud-user@44.219.4.160 \
  "mysql -u bitrixro -pPx8fuL5fUkv9WjAt sitemanager -e \"YOUR_QUERY_HERE\""
```

### REST API Access

**Webhook URL**: `https://hartzell.app/rest/1/jp689g5yfvre9pvd`
**Entity Type ID**: `1054` (HR Center SPA)
**Dynamic Type ID**: `6` (used in field names like `UF_CRM_6_*`)

**Example API call**:
```bash
curl "https://hartzell.app/rest/1/jp689g5yfvre9pvd/crm.item.get?entityTypeId=1054&id=123"
```

## Key Database Tables

### User Field Definitions
- `b_user_field` - Field metadata (ENTITY_ID, FIELD_NAME, USER_TYPE_ID)
- `b_user_field_lang` - Display names/labels
- `b_user_field_enum` - Enumeration values for dropdown fields

### Data Storage
- `b_crm_dynamic_items_1054` - HR Center item data (applications, employees)
- Column naming: `UF_CRM_6_FIELD_NAME` (uppercase with underscores)

### Field ID Pattern
- Fields created via API: `ENTITY_ID='CRM_6'` (NOT `CRM_1054`)
- Storage columns: `UF_CRM_6_*` in `b_crm_dynamic_items_1054`

## Common Tasks

### 1. Query Field Definitions

```bash
ssh -i "C:\\Users\\Agent\\Downloads\\bitrix-v2 (1).pem" cloud-user@44.219.4.160 \
  "mysql -u bitrixro -pPx8fuL5fUkv9WjAt sitemanager -e \
  \"SELECT ID, FIELD_NAME, USER_TYPE_ID, MANDATORY
   FROM b_user_field
   WHERE ENTITY_ID='CRM_6'
   ORDER BY ID DESC
   LIMIT 10;\""
```

### 2. Get Field Display Names

```bash
ssh -i "C:\\Users\\Agent\\Downloads\\bitrix-v2 (1).pem" cloud-user@44.219.4.160 \
  "mysql -u bitrixro -pPx8fuL5fUkv9WjAt sitemanager -e \
  \"SELECT uf.FIELD_NAME, lang.EDIT_FORM_LABEL
   FROM b_user_field uf
   LEFT JOIN b_user_field_lang lang ON uf.ID = lang.USER_FIELD_ID
   WHERE uf.ENTITY_ID='CRM_6' AND lang.LANGUAGE_ID='en';\""
```

### 3. List Enumeration Values

```bash
ssh -i "C:\\Users\\Agent\\Downloads\\bitrix-v2 (1).pem" cloud-user@44.219.4.160 \
  "mysql -u bitrixro -pPx8fuL5fUkv9WjAt sitemanager -e \
  \"SELECT e.ID, e.VALUE, uf.FIELD_NAME
   FROM b_user_field_enum e
   JOIN b_user_field uf ON e.USER_FIELD_ID = uf.ID
   WHERE uf.FIELD_NAME='UF_CRM_6_EDUCATION_LEVEL';\""
```

### 4. Retrieve CRM Item via API

```bash
curl "https://hartzell.app/rest/1/jp689g5yfvre9pvd/crm.item.get?entityTypeId=1054&id=104"
```

### 5. List Recent Applications

```bash
curl "https://hartzell.app/rest/1/jp689g5yfvre9pvd/crm.item.list?entityTypeId=1054&order[ID]=DESC&limit=10"
```

### 6. Check Table Structure

```bash
ssh -i "C:\\Users\\Agent\\Downloads\\bitrix-v2 (1).pem" cloud-user@44.219.4.160 \
  "mysql -u bitrixro -pPx8fuL5fUkv9WjAt sitemanager -e \
  \"DESCRIBE b_crm_dynamic_items_1054;\""
```

## Important Field Types

### Boolean Fields
- **Database**: `int` type (0 or 1)
- **API Returns**: 'Y' or 'N' strings
- **API Requires**: 'Y' or 'N' strings (NOT 0/1)

**Example**:
```typescript
// ✅ Correct
ufCrm6BgCheck: 'Y'

// ❌ Wrong (will become 'N')
ufCrm6BgCheck: 1
```

### Enumeration Fields
- **Database**: `int` type (stores enum ID)
- **API Returns**: Integer enum ID
- **API Requires**: Integer enum ID (NOT text value)

**Example**:
```typescript
// ✅ Correct
ufCrm6EducationLevel: 2209  // Bachelor's Degree enum ID

// ❌ Wrong (will be null)
ufCrm6EducationLevel: "Bachelor's Degree"
```

### HTML Entity Encoding
- Bitrix24/CloudFlare encodes apostrophes as `&#x27;` or `&#39;`
- Always decode before mapping: `Bachelor&#x27;s Degree` → `Bachelor's Degree`

**Decode function**:
```typescript
const decodeHtmlEntities = (str: string): string => {
  if (!str) return str;
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};
```

## HR Center Application Fields

See [FIELDS.md](FIELDS.md) for complete field mapping reference.

### Key Application Fields
- `ufCrm6Name` - First Name
- `ufCrm6LastName` - Last Name
- `ufCrm6Email` - Email (array)
- `ufCrm6PersonalMobile` - Phone (array)
- `ufCrm6Position` - Position Applied For
- `ufCrm6EducationLevel` - Education Level (enum: 2206-2212)
- `ufCrm6EmploymentType` - Employment Type (enum: 2030-2033)
- `ufCrm6ShiftPref` - Shift Preference (enum: 2221-2224)
- `ufCrm6WorkAuth` - Work Authorization (enum: 2213, 2216)
- `ufCrm6BgCheck` - Background Check Consent ('Y'/'N')
- `ufCrm6Felony` - Felony Conviction ('Y'/'N')

## Common Pitfalls

### ❌ Wrong Entity ID
```sql
-- DON'T USE CRM_1054 for field creation
INSERT INTO b_user_field (ENTITY_ID, ...) VALUES ('CRM_1054', ...);
```

### ✅ Correct Entity ID
```sql
-- USE CRM_6 for field creation
INSERT INTO b_user_field (ENTITY_ID, ...) VALUES ('CRM_6', ...);
```

### ❌ Boolean as Integer
```typescript
// API won't accept this
ufCrm6BgCheck: 1
```

### ✅ Boolean as String
```typescript
// API requires this
ufCrm6BgCheck: 'Y'
```

### ❌ Enum as Text
```typescript
// Won't map to enum
ufCrm6EducationLevel: "Bachelor's Degree"
```

### ✅ Enum as ID
```typescript
// Correct enum mapping
ufCrm6EducationLevel: 2209
```

## Testing

### Test Application Submission
```bash
node /mnt/c/Users/Agent/Desktop/HR\ Center/test-application-submission.js
```

This automated test:
- Submits a mock application with all fields
- Retrieves the Bitrix24 item
- Verifies all 29 fields populated correctly
- Uses CAPTCHA bypass token: `AUTOMATED_TEST_BYPASS_TOKEN_DO_NOT_USE_IN_PRODUCTION`

### Check Logs
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/cloudflare-app
npx wrangler tail --format pretty
```

## API Methods Reference

### Get Item
```bash
curl "https://hartzell.app/rest/1/jp689g5yfvre9pvd/crm.item.get?entityTypeId=1054&id=ID"
```

### List Items
```bash
curl "https://hartzell.app/rest/1/jp689g5yfvre9pvd/crm.item.list?entityTypeId=1054&order[ID]=DESC&limit=10"
```

### Add Item
```bash
curl -X POST "https://hartzell.app/rest/1/jp689g5yfvre9pvd/crm.item.add" \
  -d "entityTypeId=1054" \
  -d "fields[title]=Test Application" \
  -d "fields[ufCrm6Name]=John"
```

### Update Item
```bash
curl -X POST "https://hartzell.app/rest/1/jp689g5yfvre9pvd/crm.item.update" \
  -d "entityTypeId=1054" \
  -d "id=ID" \
  -d "fields[ufCrm6Name]=Updated Name"
```

### Get Field Definitions
```bash
curl "https://hartzell.app/rest/1/jp689g5yfvre9pvd/crm.item.fields?entityTypeId=1054"
```

## Security Notes

- **SSH key**: Store securely, never commit to git
- **Database password**: Read-only access, but still sensitive
- **Webhook URL**: Contains access token, keep confidential
- **Test bypass token**: Only use in development, never in production

## Related Files

- [FIELDS.md](FIELDS.md) - Complete field mapping and enum values
- [QUERIES.md](QUERIES.md) - Common SQL queries
- [API_EXAMPLES.md](API_EXAMPLES.md) - REST API examples

## Support Documents in Project

- `/mnt/c/Users/Agent/Desktop/HR Center/BITRIX24_FIELDS_IMPLEMENTATION_COMPLETE.md`
- `/mnt/c/Users/Agent/Desktop/HR Center/API_FIELD_CREATION_LIMITATION.md`
- `/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app/workers/routes/applications.ts`
