# Bitrix24 REST API Examples

Practical examples for working with the Bitrix24 REST API.

## Base Configuration

```bash
WEBHOOK="https://hartzell.app/rest/1/jp689g5yfvre9pvd"
ENTITY_TYPE_ID="1054"
```

## Read Operations

### Get Single Item

```bash
curl "${WEBHOOK}/crm.item.get?entityTypeId=${ENTITY_TYPE_ID}&id=104"
```

**Response format**:
```json
{
  "result": {
    "item": {
      "id": 104,
      "title": "Claude Applicant - Maintenance Technician",
      "ufCrm6Name": "Claude",
      "ufCrm6LastName": "Applicant",
      "ufCrm6EducationLevel": 2209,
      "ufCrm6BgCheck": "Y",
      ...
    }
  }
}
```

### List Items with Filters

```bash
# Recent 10 applications
curl "${WEBHOOK}/crm.item.list?entityTypeId=${ENTITY_TYPE_ID}&order[ID]=DESC&limit=10"

# Filter by stage
curl "${WEBHOOK}/crm.item.list?entityTypeId=${ENTITY_TYPE_ID}&filter[stageId]=DT1054_18:PREPARATION"

# Filter by name
curl "${WEBHOOK}/crm.item.list?entityTypeId=${ENTITY_TYPE_ID}&filter[ufCrm6Name]=John"

# Multiple filters
curl "${WEBHOOK}/crm.item.list?entityTypeId=${ENTITY_TYPE_ID}&filter[ufCrm6Position]=Technician&filter[stageId]=DT1054_18:PREPARATION"
```

### Get Field Metadata

```bash
# All field definitions
curl "${WEBHOOK}/crm.item.fields?entityTypeId=${ENTITY_TYPE_ID}"

# Specific field
curl "${WEBHOOK}/crm.item.fields?entityTypeId=${ENTITY_TYPE_ID}" | \
  python3 -m json.tool | grep -A 10 "ufCrm6EducationLevel"
```

## Write Operations

### Create Item

```bash
curl -X POST "${WEBHOOK}/crm.item.add" \
  -d "entityTypeId=${ENTITY_TYPE_ID}" \
  -d "fields[title]=Test Application" \
  -d "fields[categoryId]=18" \
  -d "fields[stageId]=DT1054_18:PREPARATION" \
  -d "fields[ufCrm6Name]=John" \
  -d "fields[ufCrm6LastName]=Doe" \
  -d "fields[ufCrm6Email][0]=john.doe@example.com" \
  -d "fields[ufCrm6PersonalMobile][0]=9545551234" \
  -d "fields[ufCrm6Position]=Technician" \
  -d "fields[ufCrm6EducationLevel]=2209" \
  -d "fields[ufCrm6EmploymentType]=2030" \
  -d "fields[ufCrm6BgCheck]=Y" \
  -d "fields[ufCrm6Felony]=N"
```

**Response**:
```json
{
  "result": {
    "item": {
      "id": 105
    }
  }
}
```

### Update Item

```bash
curl -X POST "${WEBHOOK}/crm.item.update" \
  -d "entityTypeId=${ENTITY_TYPE_ID}" \
  -d "id=105" \
  -d "fields[ufCrm6Position]=Senior Technician" \
  -d "fields[ufCrm6EducationLevel]=2210"
```

### Update Stage (Move in Pipeline)

```bash
curl -X POST "${WEBHOOK}/crm.item.update" \
  -d "entityTypeId=${ENTITY_TYPE_ID}" \
  -d "id=105" \
  -d "fields[stageId]=DT1054_18:UC_INTERVIEW_SCHEDULED"
```

### Delete Item

```bash
curl -X POST "${WEBHOOK}/crm.item.delete" \
  -d "entityTypeId=${ENTITY_TYPE_ID}" \
  -d "id=105"
```

## Array Fields

### Email (multiple values)

```bash
curl -X POST "${WEBHOOK}/crm.item.add" \
  -d "entityTypeId=${ENTITY_TYPE_ID}" \
  -d "fields[ufCrm6Email][0]=primary@example.com" \
  -d "fields[ufCrm6Email][1]=secondary@example.com"
```

### Phone (multiple values)

```bash
curl -X POST "${WEBHOOK}/crm.item.add" \
  -d "entityTypeId=${ENTITY_TYPE_ID}" \
  -d "fields[ufCrm6PersonalMobile][0]=9545551234" \
  -d "fields[ufCrm6PersonalMobile][1]=9545555678"
```

## Boolean Fields

**IMPORTANT**: Use 'Y' or 'N' strings, NOT 0/1 integers!

```bash
# ✅ Correct
curl -X POST "${WEBHOOK}/crm.item.add" \
  -d "fields[ufCrm6BgCheck]=Y" \
  -d "fields[ufCrm6Felony]=N"

# ❌ Wrong - will become 'N'
curl -X POST "${WEBHOOK}/crm.item.add" \
  -d "fields[ufCrm6BgCheck]=1" \
  -d "fields[ufCrm6Felony]=0"
```

## Enum Fields

Use integer enum IDs, not text values:

```bash
# ✅ Correct
curl -X POST "${WEBHOOK}/crm.item.add" \
  -d "fields[ufCrm6EducationLevel]=2209" \
  -d "fields[ufCrm6EmploymentType]=2030" \
  -d "fields[ufCrm6ShiftPref]=2221"

# ❌ Wrong - will be null
curl -X POST "${WEBHOOK}/crm.item.add" \
  -d "fields[ufCrm6EducationLevel]=Bachelor's Degree" \
  -d "fields[ufCrm6EmploymentType]=Full-time"
```

## File Upload

Files must be uploaded separately and linked to the item.

### Step 1: Upload File

```bash
curl -X POST "${WEBHOOK}/disk.folder.uploadfile" \
  -F "id=FOLDER_ID" \
  -F "fileContent[0]=@/path/to/resume.pdf" \
  -F "data={\"NAME\":\"resume.pdf\"}"
```

### Step 2: Link to CRM Item

```bash
curl -X POST "${WEBHOOK}/crm.item.update" \
  -d "entityTypeId=${ENTITY_TYPE_ID}" \
  -d "id=105" \
  -d "fields[ufCrm6Resume][0]=FILE_ID"
```

## Advanced Queries

### Pagination

```bash
# Page 1 (first 50 items)
curl "${WEBHOOK}/crm.item.list?entityTypeId=${ENTITY_TYPE_ID}&start=0&limit=50"

# Page 2 (next 50 items)
curl "${WEBHOOK}/crm.item.list?entityTypeId=${ENTITY_TYPE_ID}&start=50&limit=50"
```

### Select Specific Fields

```bash
curl "${WEBHOOK}/crm.item.list?entityTypeId=${ENTITY_TYPE_ID}&select[]=id&select[]=ufCrm6Name&select[]=ufCrm6LastName&select[]=ufCrm6Position"
```

### Complex Filters

```bash
# Applications from last 7 days
curl "${WEBHOOK}/crm.item.list?entityTypeId=${ENTITY_TYPE_ID}&filter[>=createdTime]=$(date -d '7 days ago' '+%Y-%m-%d')"

# Education level Bachelor's or higher (2209, 2210, 2211)
curl "${WEBHOOK}/crm.item.list?entityTypeId=${ENTITY_TYPE_ID}&filter[ufCrm6EducationLevel][]=2209&filter[ufCrm6EducationLevel][]=2210&filter[ufCrm6EducationLevel][]=2211"
```

## Batch Operations

### Create Multiple Items

```bash
curl -X POST "${WEBHOOK}/batch" \
  -d "halt=0" \
  -d "cmd[0]=crm.item.add?entityTypeId=${ENTITY_TYPE_ID}&fields[title]=App1&fields[ufCrm6Name]=John" \
  -d "cmd[1]=crm.item.add?entityTypeId=${ENTITY_TYPE_ID}&fields[title]=App2&fields[ufCrm6Name]=Jane" \
  -d "cmd[2]=crm.item.add?entityTypeId=${ENTITY_TYPE_ID}&fields[title]=App3&fields[ufCrm6Name]=Bob"
```

### Update Multiple Items

```bash
curl -X POST "${WEBHOOK}/batch" \
  -d "halt=0" \
  -d "cmd[0]=crm.item.update?entityTypeId=${ENTITY_TYPE_ID}&id=101&fields[stageId]=DT1054_18:WON" \
  -d "cmd[1]=crm.item.update?entityTypeId=${ENTITY_TYPE_ID}&id=102&fields[stageId]=DT1054_18:WON" \
  -d "cmd[2]=crm.item.update?entityTypeId=${ENTITY_TYPE_ID}&id=103&fields[stageId]=DT1054_18:WON"
```

## JSON Formatting

For complex data structures, use JSON:

```bash
curl -X POST "${WEBHOOK}/crm.item.add" \
  -H "Content-Type: application/json" \
  -d '{
    "entityTypeId": 1054,
    "fields": {
      "title": "Complex Application",
      "ufCrm6Name": "John",
      "ufCrm6LastName": "Doe",
      "ufCrm6Email": ["john@example.com"],
      "ufCrm6PersonalMobile": ["9545551234"],
      "ufCrm6EducationLevel": 2209,
      "ufCrm6BgCheck": "Y",
      "ufCrm6References": "[{\"name\":\"Manager\",\"phone\":\"9545555678\",\"relationship\":\"Supervisor\"}]"
    }
  }'
```

## Error Handling

### Check for Errors

```bash
response=$(curl -s "${WEBHOOK}/crm.item.get?entityTypeId=${ENTITY_TYPE_ID}&id=999")
echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'error' in data:
    print(f\"Error: {data['error_description']}\")
    sys.exit(1)
else:
    print('Success')
"
```

### Common Error Codes

- `ACCESS_DENIED` - Invalid webhook or permissions
- `NOT_FOUND` - Item doesn't exist
- `INVALID_ARG_VALUE` - Invalid field value
- `REQUIRED_FIELD_MISSING` - Required field not provided

## Testing

### Verify Field Exists in Response

```bash
curl -s "${WEBHOOK}/crm.item.get?entityTypeId=${ENTITY_TYPE_ID}&id=104" | \
  python3 -m json.tool | \
  grep -E "\"(ufCrm6EducationLevel|ufCrm6BgCheck)\":"
```

**Expected**:
```json
"ufCrm6EducationLevel": 2209,
"ufCrm6BgCheck": "Y",
```

### Count Applications by Stage

```bash
curl -s "${WEBHOOK}/crm.item.list?entityTypeId=${ENTITY_TYPE_ID}" | \
  python3 -c "
import sys, json
from collections import Counter
data = json.load(sys.stdin)
items = data['result']['items']
stages = [item.get('stageId', 'Unknown') for item in items]
for stage, count in Counter(stages).most_common():
    print(f'{stage}: {count}')
"
```

## Integration with Project

### Submit Test Application

```bash
node /mnt/c/Users/Agent/Desktop/HR\ Center/test-application-submission.js
```

### View Application via API

```bash
# Get the last submitted application ID from the test output
ITEM_ID=104

# View full details
curl -s "${WEBHOOK}/crm.item.get?entityTypeId=${ENTITY_TYPE_ID}&id=${ITEM_ID}" | \
  python3 -m json.tool
```

### Verify All Fields Populated

```bash
curl -s "${WEBHOOK}/crm.item.get?entityTypeId=${ENTITY_TYPE_ID}&id=104" | \
  python3 -m json.tool | \
  grep -E "\"ufCrm6(Name|LastName|EducationLevel|BgCheck|Position|EmploymentType|ShiftPref)\":"
```

## Best Practices

1. **Always use HTTPS** - The webhook URL uses HTTPS
2. **Validate enum values** - Check enum IDs exist before sending
3. **Use correct data types** - Booleans as 'Y'/'N', enums as integers
4. **Handle arrays properly** - Email and phone are arrays
5. **Decode HTML entities** - Before mapping text to enums
6. **Check responses** - Always verify the API response for errors
7. **Use batch for bulk** - More efficient than individual requests
8. **Keep webhook secret** - Don't expose in logs or public repos
