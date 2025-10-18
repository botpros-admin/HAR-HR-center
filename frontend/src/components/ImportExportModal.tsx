'use client';

import { useState, useRef } from 'react';
import { X, Download, Upload, ArrowUpDown, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  onExport: () => void;
  onImportComplete: () => void;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  type: 'error' | 'warning';
}

interface ImportRow {
  // Personal Information
  'First Name': string;
  'Middle Name'?: string;
  'Last Name': string;
  'Preferred Name'?: string;
  'Date of Birth'?: string;
  'Gender'?: string;
  'Marital Status'?: string;
  'Citizenship Status'?: string;
  'Personal Email': string;
  'Personal Phone': string;
  'Work Cell Phone'?: string;
  'Office Phone'?: string;
  'Office Extension'?: string;
  'Address Line 1'?: string;
  'Address Line 2'?: string;
  'City'?: string;
  'State'?: string;
  'ZIP Code'?: string;

  // Emergency Contact
  'Emergency Contact Name'?: string;
  'Emergency Contact Phone'?: string;
  'Emergency Contact Relationship'?: string;

  // Employment Details
  'Badge Number': string;
  'Position': string;
  'Subsidiary'?: string;
  'Status': string;
  'Hire Date'?: string;
  'Employment Type'?: string;
  'Shift'?: string;
  'Pay Rate'?: string;
  'Benefits Eligible'?: string;
  'Sales Territory'?: string;
  'Project Category'?: string;
  'WC Code'?: string;

  // Citizenship & Work Authorization
  'Visa/Work Authorization Expiry'?: string;

  // Compensation & Benefits
  'SSN'?: string;
  'PTO Days'?: string;
  'Health Insurance'?: string;
  '401(k) Enrollment'?: string;
  'Life Insurance Beneficiaries'?: string;

  // Tax & Payroll Information
  'Payment Method'?: string;
  'Tax Filing Status'?: string;
  'W-4 Exemptions'?: string;
  'Additional Federal Withholding'?: string;
  'Additional State Withholding'?: string;

  // Banking & Direct Deposit
  'Bank Name'?: string;
  'Account Holder Name'?: string;
  'Account Type'?: string;
  'Routing Number'?: string;
  'Account Number'?: string;

  // Dependents & Beneficiaries
  'Dependent Names'?: string;
  'Dependent SSNs'?: string;
  'Dependent Relationships'?: string;

  // Education & Skills
  'Education Level'?: string;
  'School'?: string;
  'Graduation Year'?: string;
  'Fields of Study'?: string;
  'Skills'?: string;
  'Certifications'?: string;
  'Skills Level'?: string;

  // Training & Compliance
  'Required Training Status'?: string;
  'Safety Training Status'?: string;
  'Compliance Training Status'?: string;
  'Training Completion Date'?: string;
  'Next Training Due'?: string;
  'Training Notes'?: string;

  // IT & Equipment
  'Software Experience'?: string;
  'Equipment Assigned'?: string;
  'Equipment Status'?: string;
  'Equipment Return Tracking'?: string;
  'Software Access'?: string;
  'Access Permissions'?: string;
  'Access Level'?: string;
  'Security Clearance'?: string;
  'Network Status'?: string;
  'VPN Access'?: string;
  'Remote Access Approved'?: string;

  // Vehicle & Licensing
  "Driver's License Expiry"?: string;
  'Auto Insurance Expiry'?: string;

  // Performance & Reviews
  'Performance Review Dates'?: string;
  'Termination Date'?: string;
  'Rehire Eligible'?: string;

  // Additional Information
  'Notes'?: string;
}

export default function ImportExportModal({
  isOpen,
  onClose,
  employees,
  onExport,
  onImportComplete,
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('export');
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Validation functions
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const phoneRegex = /^\d{3}-?\d{3,4}$/;
    return phoneRegex.test(phone);
  };

  const validateDate = (date: string): boolean => {
    if (!date) return true; // Optional field
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  };

  const validateStatus = (status: string): boolean => {
    return ['Active', 'Inactive'].includes(status);
  };

  const validateSSN = (ssn: string): boolean => {
    if (!ssn) return true; // Optional field
    const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
    return ssnRegex.test(ssn);
  };

  // Check for duplicates
  const checkDuplicates = (data: ImportRow[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const existingSSNs = employees.map(e => e.ssn).filter(Boolean);
    const existingDOBs = employees.map(e => e.dateOfBirth).filter(Boolean);

    data.forEach((row, index) => {
      // Check SSN duplicates
      if (row['SSN'] && existingSSNs.includes(row['SSN'])) {
        errors.push({
          row: index + 2, // +2 because row 1 is header
          field: 'SSN',
          message: `SSN already exists in system`,
          type: 'warning',
        });
      }

      // Check DOB duplicates
      if (row['Date of Birth'] && existingDOBs.includes(row['Date of Birth'])) {
        errors.push({
          row: index + 2,
          field: 'Date of Birth',
          message: `Employee with this DOB already exists`,
          type: 'warning',
        });
      }

      // Check badge number duplicates
      const existingBadges = employees.map(e => e.badgeNumber);
      if (row['Badge Number'] && existingBadges.includes(row['Badge Number'])) {
        errors.push({
          row: index + 2,
          field: 'Badge Number',
          message: `Badge number already exists in system`,
          type: 'error',
        });
      }
    });

    return errors;
  };

  // Validate imported data
  const validateImportData = (data: ImportRow[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because row 1 is header

      // Required fields
      if (!row['Badge Number']) {
        errors.push({
          row: rowNum,
          field: 'Badge Number',
          message: 'Required field is missing',
          type: 'error',
        });
      }

      if (!row['First Name']) {
        errors.push({
          row: rowNum,
          field: 'First Name',
          message: 'Required field is missing',
          type: 'error',
        });
      }

      if (!row['Last Name']) {
        errors.push({
          row: rowNum,
          field: 'Last Name',
          message: 'Required field is missing',
          type: 'error',
        });
      }

      if (!row['Status']) {
        errors.push({
          row: rowNum,
          field: 'Status',
          message: 'Required field is missing',
          type: 'error',
        });
      } else if (!validateStatus(row['Status'])) {
        errors.push({
          row: rowNum,
          field: 'Status',
          message: 'Must be "Active" or "Inactive"',
          type: 'error',
        });
      }

      // Email validation
      if (row['Personal Email']) {
        const emails = row['Personal Email'].split(';').map(e => e.trim());
        emails.forEach(email => {
          if (email && !validateEmail(email)) {
            errors.push({
              row: rowNum,
              field: 'Personal Email',
              message: `Invalid email format: ${email}`,
              type: 'error',
            });
          }
        });
      }

      // Phone validation
      if (row['Personal Phone']) {
        const phones = row['Personal Phone'].split(';').map(p => p.trim());
        phones.forEach(phone => {
          if (phone && !validatePhone(phone)) {
            errors.push({
              row: rowNum,
              field: 'Personal Phone',
              message: `Invalid phone format: ${phone} (use: 555-1234)`,
              type: 'error',
            });
          }
        });
      }

      // Date validation
      if (row['Hire Date'] && !validateDate(row['Hire Date'])) {
        errors.push({
          row: rowNum,
          field: 'Hire Date',
          message: 'Invalid date format (use: YYYY-MM-DD)',
          type: 'error',
        });
      }

      if (row['Date of Birth'] && !validateDate(row['Date of Birth'])) {
        errors.push({
          row: rowNum,
          field: 'Date of Birth',
          message: 'Invalid date format (use: YYYY-MM-DD)',
          type: 'error',
        });
      }

      // SSN validation
      if (row['SSN'] && !validateSSN(row['SSN'])) {
        errors.push({
          row: rowNum,
          field: 'SSN',
          message: 'Invalid SSN format (use: 123-45-6789)',
          type: 'error',
        });
      }
    });

    // Check for duplicates
    const duplicateErrors = checkDuplicates(data);
    errors.push(...duplicateErrors);

    return errors;
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidating(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as ImportRow[];

        setImportData(data);

        // Validate data
        const errors = validateImportData(data);
        setValidationErrors(errors);
        setIsValidating(false);
      } catch (error) {
        console.error('Error reading Excel file:', error);
        alert('Error reading Excel file. Please ensure it is a valid .xlsx file.');
        setIsValidating(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Download template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        // Personal Information
        'First Name': 'John',
        'Middle Name': 'Michael',
        'Last Name': 'Doe',
        'Preferred Name': 'Johnny',
        'Date of Birth': '1985-06-15',
        'Gender': 'Male',
        'Marital Status': 'Married',
        'Citizenship Status': 'US Citizen',
        'Personal Email': 'john.doe@email.com; john.d@gmail.com',
        'Personal Phone': '555-1234; 555-5678',
        'Work Cell Phone': '555-9999',
        'Office Phone': '555-0001',
        'Office Extension': '1234',
        'Address Line 1': '123 Main Street',
        'Address Line 2': 'Apt 4B',
        'City': 'Springfield',
        'State': 'IL',
        'ZIP Code': '62701',

        // Emergency Contact
        'Emergency Contact Name': 'Jane Doe',
        'Emergency Contact Phone': '555-8888',
        'Emergency Contact Relationship': 'Spouse',

        // Employment Details
        'Badge Number': 'EMP1001',
        'Position': 'Project Manager',
        'Subsidiary': 'Hartzell Painting',
        'Status': 'Active',
        'Hire Date': '2020-01-15',
        'Employment Type': 'Full-Time',
        'Shift': 'Day',
        'Pay Rate': '75000',
        'Benefits Eligible': 'Y',
        'Sales Territory': 'Midwest',
        'Project Category': 'Commercial',
        'WC Code': 'WC001',

        // Citizenship & Work Authorization
        'Visa/Work Authorization Expiry': '',

        // Compensation & Benefits
        'SSN': '123-45-6789',
        'PTO Days': '15',
        'Health Insurance': 'Blue Cross PPO',
        '401(k) Enrollment': 'Y',
        'Life Insurance Beneficiaries': 'Jane Doe (Spouse)',

        // Tax & Payroll Information
        'Payment Method': 'Direct Deposit',
        'Tax Filing Status': 'Married',
        'W-4 Exemptions': '2',
        'Additional Federal Withholding': '100',
        'Additional State Withholding': '50',

        // Banking & Direct Deposit
        'Bank Name': 'First National Bank',
        'Account Holder Name': 'John Michael Doe',
        'Account Type': 'Checking',
        'Routing Number': '123456789',
        'Account Number': '9876543210',

        // Dependents & Beneficiaries
        'Dependent Names': 'Emily Doe; Tommy Doe',
        'Dependent SSNs': '987-65-4321; 987-65-4322',
        'Dependent Relationships': 'Daughter; Son',

        // Education & Skills
        'Education Level': "Bachelor's Degree",
        'School': 'University of Illinois',
        'Graduation Year': '2007',
        'Fields of Study': 'Business Administration; Project Management',
        'Skills': 'Project Planning; Team Leadership; Budget Management',
        'Certifications': 'PMP; Six Sigma Green Belt',
        'Skills Level': 'Advanced',

        // Training & Compliance
        'Required Training Status': 'Complete',
        'Safety Training Status': 'Complete',
        'Compliance Training Status': 'Complete',
        'Training Completion Date': '2024-01-15',
        'Next Training Due': '2025-01-15',
        'Training Notes': 'Completed all required annual training',

        // IT & Equipment
        'Software Experience': 'Microsoft Office; AutoCAD; SAP',
        'Equipment Assigned': 'Laptop (HP-1234); iPhone 13; Monitor',
        'Equipment Status': 'Active',
        'Equipment Return Tracking': '',
        'Software Access': 'SAP; Bitrix24; Adobe Creative Suite',
        'Access Permissions': 'Admin; Project Lead',
        'Access Level': 'Level 3',
        'Security Clearance': 'Standard',
        'Network Status': 'Active',
        'VPN Access': 'Y',
        'Remote Access Approved': 'Y',

        // Vehicle & Licensing
        "Driver's License Expiry": '2028-06-15',
        'Auto Insurance Expiry': '2025-12-31',

        // Performance & Reviews
        'Performance Review Dates': '2023-06-15; 2024-06-15',
        'Termination Date': '',
        'Rehire Eligible': '',

        // Additional Information
        'Notes': 'Excellent team player. Consistently exceeds expectations.',
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths for better readability
    ws['!cols'] = Array(Object.keys(templateData[0]).length).fill({ wch: 20 });

    XLSX.utils.book_append_sheet(wb, ws, 'Employee Template');
    XLSX.writeFile(wb, 'Hartzell_Employee_Import_Template.xlsx');
  };

  // Handle export
  const handleExport = () => {
    onExport();
    onClose();
  };

  // Handle import submission
  const handleSubmitImport = () => {
    const hasErrors = validationErrors.some(e => e.type === 'error');
    if (hasErrors) {
      alert('Please fix all errors before importing.');
      return;
    }

    // TODO: Send data to backend API
    alert(`Import successful!\n\n${importData.length} employees will be added/updated.\n\n${validationErrors.length > 0 ? 'Note: Some warnings were found but import can proceed.' : 'No issues found.'}`);

    // Reset
    setImportData([]);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImportComplete();
    onClose();
  };

  const errorCount = validationErrors.filter(e => e.type === 'error').length;
  const warningCount = validationErrors.filter(e => e.type === 'warning').length;
  const canSubmit = importData.length > 0 && errorCount === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowUpDown className="w-6 h-6 text-hartzell-blue" />
            Import / Export Employees
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'export'
                ? 'text-hartzell-blue border-b-2 border-hartzell-blue'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            Export
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'import'
                ? 'text-hartzell-blue border-b-2 border-hartzell-blue'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Import
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'export' ? (
            // Export Tab
            <div className="text-center py-12">
              <Download className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Export Employee Data
              </h3>
              <p className="text-gray-600 mb-6">
                Download current employee list as Excel file
              </p>
              <button
                onClick={handleExport}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Download Excel File
              </button>
            </div>
          ) : (
            // Import Tab
            <div className="space-y-6">
              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">
                      First time importing?
                    </h4>
                    <p className="text-sm text-blue-800 mb-3">
                      Download the template to see the required format and field types.
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <Download className="w-4 h-4 inline mr-2" />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-hartzell-blue transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Upload Employee Data
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Select an Excel file (.xlsx, .xls) with employee data
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-hartzell-blue text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Select File
                </button>
              </div>

              {/* Validation Results */}
              {isValidating && (
                <div className="text-center py-4">
                  <div className="w-8 h-8 border-4 border-hartzell-blue border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Validating data...</p>
                </div>
              )}

              {importData.length > 0 && !isValidating && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Import Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Rows:</span>
                        <span className="ml-2 font-semibold text-gray-900">{importData.length}</span>
                      </div>
                      {errorCount > 0 && (
                        <div>
                          <span className="text-red-600">Errors:</span>
                          <span className="ml-2 font-semibold text-red-700">{errorCount}</span>
                        </div>
                      )}
                      {warningCount > 0 && (
                        <div>
                          <span className="text-yellow-600">Warnings:</span>
                          <span className="ml-2 font-semibold text-yellow-700">{warningCount}</span>
                        </div>
                      )}
                      {errorCount === 0 && warningCount === 0 && (
                        <div className="col-span-2">
                          <CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />
                          <span className="text-green-700 font-semibold">No issues found</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900">Validation Results</h4>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {validationErrors.map((error, index) => (
                              <tr key={index} className={error.type === 'error' ? 'bg-red-50' : 'bg-yellow-50'}>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {error.type === 'error' ? (
                                    <span className="inline-flex items-center gap-1 text-red-700">
                                      <AlertCircle className="w-4 h-4" />
                                      Error
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-yellow-700">
                                      <AlertTriangle className="w-4 h-4" />
                                      Warning
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap font-mono text-gray-900">{error.row}</td>
                                <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">{error.field}</td>
                                <td className="px-4 py-2 text-gray-700">{error.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900">Data Preview (First 5 Rows)</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Badge</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Personal Email</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {importData.slice(0, 5).map((row, index) => {
                            const fullName = [row['First Name'], row['Middle Name'], row['Last Name']].filter(Boolean).join(' ');
                            return (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap font-mono text-gray-900">{row['Badge Number']}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-gray-900">{fullName}</td>
                                <td className="px-3 py-2 text-gray-900">{row['Position']}</td>
                                <td className="px-3 py-2 text-gray-900">{row['Personal Email']}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                    row['Status'] === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {row['Status']}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'import' && importData.length > 0 && !isValidating && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                {errorCount > 0 ? (
                  <p className="text-red-700 font-medium">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Fix {errorCount} error{errorCount !== 1 ? 's' : ''} before importing
                  </p>
                ) : warningCount > 0 ? (
                  <p className="text-yellow-700 font-medium">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    {warningCount} warning{warningCount !== 1 ? 's' : ''} found - review before importing
                  </p>
                ) : (
                  <p className="text-green-700 font-medium">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Ready to import
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitImport}
                  disabled={!canSubmit}
                  className="px-6 py-2 bg-hartzell-blue text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import {importData.length} Employee{importData.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
