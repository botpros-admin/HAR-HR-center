/**
 * AI AutoMap - Automatically map PDF form fields to employee data using Claude 4.5 Sonnet
 *
 * This module:
 * 1. Extracts fillable fields from PDF with their coordinates
 * 2. Calls Claude API to intelligently map fields to employee data
 * 3. Returns pre-positioned field definitions for the field editor
 */

import { PDFDocument, PDFForm, PDFField, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } from 'pdf-lib';

export interface PDFFieldInfo {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  defaultValue?: string;
  options?: string[]; // For dropdowns/radio groups
}

export interface EmployeeDataField {
  fieldName: string;
  description: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
  example?: string;
}

export interface MappedField {
  id: string;
  type: 'signature' | 'initials' | 'text' | 'date' | 'checkbox';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pdfFieldName: string;
  employeeDataSource: string;
  transform?: 'splitSSN' | 'extractMonth' | 'extractDay' | 'extractYear' | 'formatDate' | 'checkbox' | 'uppercase' | 'lowercase';
  transformIndex?: number; // For array transforms like SSN splitting
  checkIfEquals?: string; // For checkbox matching
  label: string;
  confidence: number; // 0-1, how confident Claude is about this mapping
  needsReview: boolean; // true if confidence < 0.8
}

export interface AutoMapResult {
  fields: MappedField[];
  unmappedPDFFields: string[]; // Fields Claude couldn't map
  missingEmployeeData: string[]; // Employee data that has no corresponding PDF field
  warnings: string[];
}

/**
 * Extract all fillable fields from a PDF with their coordinates
 */
export async function extractPDFFields(pdfBytes: ArrayBuffer): Promise<PDFFieldInfo[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const pages = pdfDoc.getPages();

  const fieldInfos: PDFFieldInfo[] = [];

  for (const field of fields) {
    const fieldName = field.getName();

    // Get field widgets (positions on page)
    const widgets = (field as any).acroField.getWidgets();

    for (const widget of widgets) {
      // Get rectangle coordinates
      const rect = widget.getRectangle();
      if (!rect) continue;

      // Get page reference
      const pageRef = widget.P();
      const pageIndex = pages.findIndex(p => p.ref === pageRef);
      if (pageIndex === -1) continue;

      const page = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // PDF coordinates are bottom-left origin, convert to top-left for React
      const pdfX = rect.x;
      const pdfY = rect.y;
      const pdfWidth = rect.width;
      const pdfHeight = rect.height;

      // Convert to top-left origin (for React rendering)
      const reactY = pageHeight - pdfY - pdfHeight;

      // Determine field type
      let fieldType: 'text' | 'checkbox' | 'radio' | 'dropdown' = 'text';
      let defaultValue: string | undefined;
      let options: string[] | undefined;

      if (field instanceof PDFTextField) {
        fieldType = 'text';
        defaultValue = field.getText() || undefined;
      } else if (field instanceof PDFCheckBox) {
        fieldType = 'checkbox';
        defaultValue = field.isChecked() ? 'true' : 'false';
      } else if (field instanceof PDFRadioGroup) {
        fieldType = 'radio';
        options = field.getOptions();
        defaultValue = field.getSelected() || undefined;
      } else if (field instanceof PDFDropdown) {
        fieldType = 'dropdown';
        options = field.getOptions();
        defaultValue = field.getSelected()[0] || undefined;
      }

      fieldInfos.push({
        name: fieldName,
        type: fieldType,
        page: pageIndex + 1, // 1-indexed for display
        x: pdfX,
        y: reactY,
        width: pdfWidth,
        height: pdfHeight,
        defaultValue,
        options,
      });
    }
  }

  return fieldInfos;
}

/**
 * Get available employee data fields from Bitrix24
 */
export function getEmployeeDataSchema(): EmployeeDataField[] {
  return [
    // Personal Information
    { fieldName: 'firstName', description: 'First Name', type: 'string', example: 'John' },
    { fieldName: 'middleName', description: 'Middle Name', type: 'string', example: 'Michael' },
    { fieldName: 'lastName', description: 'Last Name', type: 'string', example: 'Doe' },
    { fieldName: 'fullName', description: 'Full Name', type: 'string', example: 'John Michael Doe' },
    { fieldName: 'preferredName', description: 'Preferred Name', type: 'string', example: 'Johnny' },
    { fieldName: 'dateOfBirth', description: 'Date of Birth', type: 'date', example: '1990-01-15' },
    { fieldName: 'ssn', description: 'Social Security Number', type: 'string', example: '123456789' },
    { fieldName: 'gender', description: 'Gender', type: 'string', example: 'Male' },
    { fieldName: 'maritalStatus', description: 'Marital Status', type: 'string', example: 'Single' },
    { fieldName: 'citizenship', description: 'Citizenship', type: 'string', example: 'US Citizen' },

    // Contact Information
    { fieldName: 'email', description: 'Email Address', type: 'array', example: 'john.doe@example.com' },
    { fieldName: 'personalPhone', description: 'Personal Phone', type: 'array', example: '555-1234' },
    { fieldName: 'workPhone', description: 'Work Phone', type: 'string', example: '555-5678' },
    { fieldName: 'mailingAddress', description: 'Mailing Address', type: 'string', example: '123 Main St' },
    { fieldName: 'mailingCity', description: 'Mailing City', type: 'string', example: 'Springfield' },
    { fieldName: 'mailingState', description: 'Mailing State', type: 'string', example: 'IL' },
    { fieldName: 'mailingZip', description: 'Mailing ZIP', type: 'string', example: '62701' },

    // Employment Information
    { fieldName: 'badgeNumber', description: 'Badge Number', type: 'string', example: 'EMP1001' },
    { fieldName: 'position', description: 'Job Title', type: 'string', example: 'Project Manager' },
    { fieldName: 'department', description: 'Department', type: 'string', example: 'Operations' },
    { fieldName: 'hireDate', description: 'Hire Date', type: 'date', example: '2020-03-15' },
    { fieldName: 'employmentType', description: 'Employment Type', type: 'string', example: 'Full-Time' },

    // Emergency Contact
    { fieldName: 'emergencyContactName', description: 'Emergency Contact Name', type: 'string', example: 'Jane Doe' },
    { fieldName: 'emergencyContactPhone', description: 'Emergency Contact Phone', type: 'string', example: '555-9999' },
    { fieldName: 'emergencyContactRelationship', description: 'Emergency Contact Relationship', type: 'string', example: 'Spouse' },

    // Tax Information
    { fieldName: 'taxFilingStatus', description: 'Tax Filing Status', type: 'string', example: 'Single' },
    { fieldName: 'w4Allowances', description: 'W-4 Allowances', type: 'number', example: '1' },
    { fieldName: 'additionalFedWithhold', description: 'Additional Federal Withholding', type: 'number', example: '50' },

    // Banking
    { fieldName: 'bankName', description: 'Bank Name', type: 'string', example: 'First National Bank' },
    { fieldName: 'bankAccountType', description: 'Bank Account Type', type: 'string', example: 'Checking' },
    { fieldName: 'bankRouting', description: 'Bank Routing Number', type: 'string', example: '123456789' },
    { fieldName: 'bankAccountNumber', description: 'Bank Account Number', type: 'string', example: '987654321' },
  ];
}

/**
 * Call Claude 4.5 Sonnet API to intelligently map PDF fields to employee data
 */
export async function autoMapFieldsWithClaude(
  pdfFields: PDFFieldInfo[],
  employeeDataSchema: EmployeeDataField[],
  anthropicApiKey: string
): Promise<AutoMapResult> {

  const prompt = `You are an expert at analyzing government and HR forms (I-9, W-4, tax forms, etc.) and mapping their fillable fields to employee database fields.

I have a PDF form with ${pdfFields.length} fillable fields. I need you to intelligently map each PDF field to the appropriate employee data field.

**PDF Fields:**
${JSON.stringify(pdfFields.slice(0, 20), null, 2)}
${pdfFields.length > 20 ? `\n... and ${pdfFields.length - 20} more fields` : ''}

**Available Employee Data Fields:**
${JSON.stringify(employeeDataSchema, null, 2)}

**Your Task:**
For each PDF field, determine:
1. Which employee data field it maps to
2. If any data transformation is needed (e.g., split SSN into 9 boxes, extract month from date)
3. Your confidence level (0-1) in this mapping

**Special Cases to Handle:**
- SSN fields: PDFs often have 9 separate boxes (ssn_1, ssn_2, ..., ssn_9) that need the SSN split
- Date fields: May need month/day/year extracted separately
- Checkboxes: May need to check based on equality (e.g., check "single" if maritalStatus === "Single")
- Address: May be split into line 1, line 2, city, state, zip

**Return Format:**
Return a JSON object with this structure:
{
  "mappings": [
    {
      "pdfFieldName": "employee_first_name",
      "employeeDataSource": "firstName",
      "transform": null,
      "label": "First Name",
      "confidence": 0.95
    },
    {
      "pdfFieldName": "ssn_1",
      "employeeDataSource": "ssn",
      "transform": "splitSSN",
      "transformIndex": 0,
      "label": "SSN Digit 1",
      "confidence": 0.9
    },
    {
      "pdfFieldName": "marital_status_single",
      "employeeDataSource": "maritalStatus",
      "transform": "checkbox",
      "checkIfEquals": "Single",
      "label": "Marital Status: Single",
      "confidence": 0.85
    }
  ],
  "unmappedPDFFields": ["field_name_1", "field_name_2"],
  "warnings": ["Warning message if any"]
}

**Important:**
- Only map fields you're confident about
- If confidence < 0.8, the user will review it manually
- If you can't determine a mapping, add to unmappedPDFFields
- Be smart about semantic matching (e.g., "fname" = firstName, "emp_id" = badgeNumber)

Return ONLY valid JSON, no other text.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json() as any;
  const content = data.content[0].text;

  // Parse Claude's JSON response
  const claudeResponse = JSON.parse(content);

  // Convert Claude's mappings to our MappedField format
  const mappedFields: MappedField[] = claudeResponse.mappings.map((mapping: any, index: number) => {
    const pdfField = pdfFields.find(f => f.name === mapping.pdfFieldName);
    if (!pdfField) {
      throw new Error(`PDF field not found: ${mapping.pdfFieldName}`);
    }

    // Determine field type for frontend
    let fieldType: MappedField['type'] = 'text';
    if (pdfField.type === 'checkbox' || mapping.transform === 'checkbox') {
      fieldType = 'checkbox';
    } else if (mapping.employeeDataSource === 'dateOfBirth' || mapping.label.toLowerCase().includes('date')) {
      fieldType = 'date';
    }

    return {
      id: `field_${index + 1}`,
      type: fieldType,
      page: pdfField.page,
      x: pdfField.x,
      y: pdfField.y,
      width: pdfField.width,
      height: pdfField.height,
      pdfFieldName: mapping.pdfFieldName,
      employeeDataSource: mapping.employeeDataSource,
      transform: mapping.transform || undefined,
      transformIndex: mapping.transformIndex,
      checkIfEquals: mapping.checkIfEquals,
      label: mapping.label,
      confidence: mapping.confidence,
      needsReview: mapping.confidence < 0.8,
    };
  });

  return {
    fields: mappedFields,
    unmappedPDFFields: claudeResponse.unmappedPDFFields || [],
    missingEmployeeData: [],
    warnings: claudeResponse.warnings || [],
  };
}

/**
 * Main entry point: Extract PDF fields and auto-map them using Claude
 */
export async function autoMapPDF(
  pdfBytes: ArrayBuffer,
  anthropicApiKey: string
): Promise<AutoMapResult> {
  // Step 1: Extract PDF fields with coordinates
  const pdfFields = await extractPDFFields(pdfBytes);

  if (pdfFields.length === 0) {
    throw new Error('No fillable fields found in PDF');
  }

  // Step 2: Get employee data schema
  const employeeDataSchema = getEmployeeDataSchema();

  // Step 3: Call Claude to map fields
  const result = await autoMapFieldsWithClaude(pdfFields, employeeDataSchema, anthropicApiKey);

  return result;
}
