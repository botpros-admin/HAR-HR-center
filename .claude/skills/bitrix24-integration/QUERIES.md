# Common Bitrix24 SQL Queries

Quick reference for frequently used database queries.

## Connection

```bash
ssh -i "C:\\Users\\Agent\\Downloads\\bitrix-v2 (1).pem" cloud-user@44.219.4.160 \
  "mysql -u bitrixro -pPx8fuL5fUkv9WjAt sitemanager -e \"QUERY_HERE\""
```

## Field Management

### List All HR Center Fields

```sql
SELECT
  uf.ID,
  uf.FIELD_NAME,
  uf.USER_TYPE_ID,
  uf.MANDATORY,
  lang.EDIT_FORM_LABEL
FROM b_user_field uf
LEFT JOIN b_user_field_lang lang ON uf.ID = lang.USER_FIELD_ID AND lang.LANGUAGE_ID = 'en'
WHERE uf.ENTITY_ID = 'CRM_6'
ORDER BY uf.ID DESC;
```

### Get Field Details by Name

```sql
SELECT
  uf.ID,
  uf.FIELD_NAME,
  uf.USER_TYPE_ID,
  uf.MANDATORY,
  uf.SETTINGS,
  lang.EDIT_FORM_LABEL
FROM b_user_field uf
LEFT JOIN b_user_field_lang lang ON uf.ID = lang.USER_FIELD_ID
WHERE uf.FIELD_NAME = 'UF_CRM_6_EDUCATION_LEVEL';
```

### Check Field Storage Column Exists

```sql
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'b_crm_dynamic_items_1054'
  AND COLUMN_NAME = 'UF_CRM_6_BG_CHECK';
```

### List All Storage Columns

```sql
DESCRIBE b_crm_dynamic_items_1054;
```

## Enumeration Values

### Get Enum Values for a Field

```sql
SELECT
  e.ID as enum_id,
  e.VALUE,
  e.XML_ID,
  e.SORT,
  uf.FIELD_NAME
FROM b_user_field_enum e
JOIN b_user_field uf ON e.USER_FIELD_ID = uf.ID
WHERE uf.FIELD_NAME = 'UF_CRM_6_SHIFT_PREF'
ORDER BY e.SORT;
```

### Get All Enum Fields with Values

```sql
SELECT
  uf.FIELD_NAME,
  e.ID as enum_id,
  e.VALUE,
  lang.EDIT_FORM_LABEL as field_label
FROM b_user_field uf
LEFT JOIN b_user_field_enum e ON e.USER_FIELD_ID = uf.ID
LEFT JOIN b_user_field_lang lang ON uf.ID = lang.USER_FIELD_ID AND lang.LANGUAGE_ID = 'en'
WHERE uf.ENTITY_ID = 'CRM_6'
  AND uf.USER_TYPE_ID = 'enumeration'
ORDER BY uf.FIELD_NAME, e.SORT;
```

### Find Enum ID by Value

```sql
SELECT e.ID, e.VALUE, uf.FIELD_NAME
FROM b_user_field_enum e
JOIN b_user_field uf ON e.USER_FIELD_ID = uf.ID
WHERE e.VALUE LIKE '%Bachelor%';
```

## CRM Item Data

### Get Recent Applications

```sql
SELECT
  ID,
  UF_CRM_6_NAME,
  UF_CRM_6_LAST_NAME,
  UF_CRM_6_POSITION,
  UF_CRM_6_APPLIED_DATE,
  CREATED_TIME
FROM b_crm_dynamic_items_1054
ORDER BY ID DESC
LIMIT 10;
```

### Get Application by ID

```sql
SELECT *
FROM b_crm_dynamic_items_1054
WHERE ID = 104;
```

### Check Field Population for Item

```sql
SELECT
  ID,
  UF_CRM_6_EDUCATION_LEVEL,
  UF_CRM_6_BG_CHECK,
  UF_CRM_6_FELONY,
  UF_CRM_6_EMPLOYMENT_TYPE,
  UF_CRM_6_SHIFT_PREF
FROM b_crm_dynamic_items_1054
WHERE ID = 104;
```

### Count Applications by Status

```sql
SELECT STAGE_ID, COUNT(*) as count
FROM b_crm_dynamic_items_1054
GROUP BY STAGE_ID;
```

## Field Auditing

### Find Empty/Null Fields

```sql
SELECT ID,
  UF_CRM_6_NAME,
  UF_CRM_6_LAST_NAME,
  UF_CRM_6_EDUCATION_LEVEL
FROM b_crm_dynamic_items_1054
WHERE UF_CRM_6_EDUCATION_LEVEL IS NULL
  AND CREATED_TIME > DATE_SUB(NOW(), INTERVAL 7 DAY);
```

### Count Field Population Rate

```sql
SELECT
  'Education Level' as field_name,
  COUNT(*) as total,
  SUM(CASE WHEN UF_CRM_6_EDUCATION_LEVEL IS NOT NULL THEN 1 ELSE 0 END) as populated,
  ROUND(SUM(CASE WHEN UF_CRM_6_EDUCATION_LEVEL IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as percent_populated
FROM b_crm_dynamic_items_1054
WHERE CREATED_TIME > DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### Check Boolean Field Values

```sql
SELECT
  UF_CRM_6_BG_CHECK,
  COUNT(*) as count
FROM b_crm_dynamic_items_1054
GROUP BY UF_CRM_6_BG_CHECK;
```

## Field Creation (Read-Only User Cannot Execute)

These are reference queries - the `bitrixro` user has read-only access.

### Create New Field

```sql
-- Note: Read-only user cannot execute
INSERT INTO b_user_field (
  ENTITY_ID,
  FIELD_NAME,
  USER_TYPE_ID,
  MANDATORY,
  EDIT_FORM_LABEL,
  LIST_COLUMN_LABEL,
  LIST_FILTER_LABEL
) VALUES (
  'CRM_6',
  'UF_CRM_6_NEW_FIELD',
  'string',
  'N',
  'New Field',
  'New Field',
  'New Field'
);
```

### Add Enum Values

```sql
-- Note: Read-only user cannot execute
INSERT INTO b_user_field_enum (USER_FIELD_ID, VALUE, DEF, SORT, XML_ID) VALUES
(1878, 'New Option', 'N', 50, 'NEW_OPTION');
```

### Add Display Label

```sql
-- Note: Read-only user cannot execute
INSERT INTO b_user_field_lang (USER_FIELD_ID, LANGUAGE_ID, EDIT_FORM_LABEL, LIST_COLUMN_LABEL, LIST_FILTER_LABEL) VALUES
(1886, 'en', 'Certifications', 'Certifications', 'Certifications');
```

## Useful Joins

### Fields with Labels and Storage Info

```sql
SELECT
  uf.ID,
  uf.FIELD_NAME,
  uf.USER_TYPE_ID,
  lang.EDIT_FORM_LABEL,
  col.COLUMN_TYPE,
  col.IS_NULLABLE
FROM b_user_field uf
LEFT JOIN b_user_field_lang lang ON uf.ID = lang.USER_FIELD_ID AND lang.LANGUAGE_ID = 'en'
LEFT JOIN INFORMATION_SCHEMA.COLUMNS col ON col.COLUMN_NAME = uf.FIELD_NAME
  AND col.TABLE_NAME = 'b_crm_dynamic_items_1054'
WHERE uf.ENTITY_ID = 'CRM_6'
ORDER BY uf.ID DESC;
```

### Enum Fields with All Values

```sql
SELECT
  uf.FIELD_NAME,
  lang.EDIT_FORM_LABEL as field_label,
  GROUP_CONCAT(CONCAT(e.ID, ':', e.VALUE) ORDER BY e.SORT SEPARATOR ' | ') as enum_values
FROM b_user_field uf
LEFT JOIN b_user_field_lang lang ON uf.ID = lang.USER_FIELD_ID AND lang.LANGUAGE_ID = 'en'
LEFT JOIN b_user_field_enum e ON e.USER_FIELD_ID = uf.ID
WHERE uf.ENTITY_ID = 'CRM_6' AND uf.USER_TYPE_ID = 'enumeration'
GROUP BY uf.ID, uf.FIELD_NAME, lang.EDIT_FORM_LABEL
ORDER BY uf.FIELD_NAME;
```

## Data Validation

### Check for Invalid Enum Values

```sql
SELECT
  ID,
  UF_CRM_6_NAME,
  UF_CRM_6_EDUCATION_LEVEL
FROM b_crm_dynamic_items_1054
WHERE UF_CRM_6_EDUCATION_LEVEL IS NOT NULL
  AND UF_CRM_6_EDUCATION_LEVEL NOT IN (2206, 2207, 2208, 2209, 2210, 2211, 2212);
```

### Check for Invalid Boolean Values

```sql
SELECT
  ID,
  UF_CRM_6_BG_CHECK,
  UF_CRM_6_FELONY
FROM b_crm_dynamic_items_1054
WHERE UF_CRM_6_BG_CHECK NOT IN (0, 1)
   OR UF_CRM_6_FELONY NOT IN (0, 1);
```

## Performance

### Count Total Records

```sql
SELECT COUNT(*) FROM b_crm_dynamic_items_1054;
```

### Index Information

```sql
SHOW INDEX FROM b_crm_dynamic_items_1054;
```

### Table Size

```sql
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE table_schema = 'sitemanager'
  AND table_name = 'b_crm_dynamic_items_1054';
```

## Common Troubleshooting Queries

### Find Missing Field Definitions

```sql
-- Fields in storage but not in b_user_field
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'b_crm_dynamic_items_1054'
  AND COLUMN_NAME LIKE 'UF_CRM_6_%'
  AND COLUMN_NAME NOT IN (
    SELECT FIELD_NAME FROM b_user_field WHERE ENTITY_ID = 'CRM_6'
  );
```

### Find Fields Without Labels

```sql
SELECT uf.ID, uf.FIELD_NAME
FROM b_user_field uf
LEFT JOIN b_user_field_lang lang ON uf.ID = lang.USER_FIELD_ID AND lang.LANGUAGE_ID = 'en'
WHERE uf.ENTITY_ID = 'CRM_6'
  AND lang.USER_FIELD_ID IS NULL;
```

### Find Enum Fields Without Values

```sql
SELECT uf.ID, uf.FIELD_NAME
FROM b_user_field uf
LEFT JOIN b_user_field_enum e ON e.USER_FIELD_ID = uf.ID
WHERE uf.ENTITY_ID = 'CRM_6'
  AND uf.USER_TYPE_ID = 'enumeration'
  AND e.ID IS NULL;
```
