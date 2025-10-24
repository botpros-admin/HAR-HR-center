'use client';

import { useState, useRef } from 'react';
import { X, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, AlertTriangle, Loader2, Database, Shield } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '@/lib/api';

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
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
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

  // Map CSV columns to API field names
  const mapRowToAPIFormat = (row: ImportRow) => {
    const splitArray = (str: string | undefined) => str ? str.split(';').map(s => s.trim()).filter(Boolean) : [];

    return {
      // Personal Information
      firstName: row['First Name'],
      middleName: row['Middle Name'] || '',
      lastName: row['Last Name'],
      preferredName: row['Preferred Name'] || '',
      dateOfBirth: row['Date of Birth'] || '',
      gender: row['Gender'] || '',
      maritalStatus: row['Marital Status'] || '',
      citizenship: row['Citizenship Status'] || '',
      personalEmail: splitArray(row['Personal Email']),
      personalPhone: splitArray(row['Personal Phone']),
      workPhone: row['Work Cell Phone'] || '',
      officePhone: row['Office Phone'] || '',
      officeExtension: row['Office Extension'] || '',
      addressLine1: row['Address Line 1'] || '',
      addressLine2: row['Address Line 2'] || '',
      city: row['City'] || '',
      state: row['State'] || '',
      zipCode: row['ZIP Code'] || '',

      // Emergency Contact
      emergencyContactName: row['Emergency Contact Name'] || '',
      emergencyContactPhone: row['Emergency Contact Phone'] || '',
      emergencyContactRelationship: row['Emergency Contact Relationship'] || '',

      // Employment Details
      badgeNumber: row['Badge Number'],
      position: row['Position'],
      subsidiary: row['Subsidiary'] || '',
      employmentStatus: row['Status'] === 'Active' ? 'Y' : 'N',
      hireDate: row['Hire Date'] || '',
      employmentType: row['Employment Type'] || '',
      shift: row['Shift'] || '',
      payRate: row['Pay Rate'] || '',
      benefitsEligible: row['Benefits Eligible'] === 'Y',
      salesTerritory: row['Sales Territory'] || '',
      projectCategory: row['Project Category'] || '',
      wcCode: row['WC Code'] ? parseInt(row['WC Code']) : undefined,

      // Citizenship & Work Authorization
      visaExpiry: row['Visa/Work Authorization Expiry'] || '',

      // Compensation & Benefits
      ssn: row['SSN'] || '',
      ptoDays: row['PTO Days'] || '',
      healthInsurance: row['Health Insurance'] || '',
      has401k: row['401(k) Enrollment'] || '',
      lifeBeneficiaries: row['Life Insurance Beneficiaries'] || '',

      // Tax & Payroll Information
      paymentMethod: row['Payment Method'] || '',
      taxFilingStatus: row['Tax Filing Status'] || '',
      w4Exemptions: row['W-4 Exemptions'] || '',
      additionalFedWithhold: row['Additional Federal Withholding'] || '',
      additionalStateWithhold: row['Additional State Withholding'] || '',

      // Banking & Direct Deposit
      bankName: row['Bank Name'] || '',
      bankAccountName: row['Account Holder Name'] || '',
      bankAccountType: row['Account Type'] || '',
      bankRouting: row['Routing Number'] || '',
      bankAccountNumber: row['Account Number'] || '',

      // Dependents & Beneficiaries
      dependentNames: splitArray(row['Dependent Names']),
      dependentSsns: splitArray(row['Dependent SSNs']),
      dependentRelationships: splitArray(row['Dependent Relationships']),

      // Education & Skills
      educationLevel: row['Education Level'] || '',
      schoolName: row['School'] || '',
      graduationYear: row['Graduation Year'] || '',
      fieldsOfStudy: splitArray(row['Fields of Study']),
      skills: splitArray(row['Skills']),
      certifications: splitArray(row['Certifications']),
      skillsLevel: row['Skills Level'] || '',

      // Training & Compliance
      requiredTrainingStatus: row['Required Training Status'] || '',
      safetyTrainingStatus: row['Safety Training Status'] || '',
      complianceTrainingStatus: row['Compliance Training Status'] || '',
      trainingDate: row['Training Completion Date'] || '',
      nextTrainingDue: row['Next Training Due'] || '',
      trainingNotes: row['Training Notes'] || '',

      // IT & Equipment
      softwareExperience: splitArray(row['Software Experience']),
      equipmentAssigned: splitArray(row['Equipment Assigned']),
      equipmentStatus: row['Equipment Status'] || '',
      equipmentReturn: row['Equipment Return Tracking'] || '',
      softwareAccess: splitArray(row['Software Access']),
      accessPermissions: splitArray(row['Access Permissions']),
      accessLevel: row['Access Level'] || '',
      securityClearance: row['Security Clearance'] || '',
      networkStatus: row['Network Status'] || '',
      vpnAccess: row['VPN Access'] === 'Y',
      remoteAccess: row['Remote Access Approved'] === 'Y',

      // Vehicle & Licensing
      driversLicenseExpiry: row["Driver's License Expiry"] || '',
      autoInsuranceExpiry: row['Auto Insurance Expiry'] || '',

      // Performance & Reviews
      reviewDates: splitArray(row['Performance Review Dates']),
      terminationDate: row['Termination Date'] || '',
      rehireEligible: row['Rehire Eligible'] === 'Y',

      // Additional Information
      additionalInfo: row['Notes'] || '',
    };
  };

  // Handle import submission
  const handleSubmitImport = async () => {
    const hasErrors = validationErrors.some(e => e.type === 'error');
    if (hasErrors) {
      alert('Please fix all errors before importing.');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: importData.length });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Process imports in batches for better UX
      for (let i = 0; i < importData.length; i++) {
        const row = importData[i];
        setImportProgress({ current: i + 1, total: importData.length });

        try {
          const employeeData = mapRowToAPIFormat(row);

          // Check if employee exists by badge number
          const existingEmployee = employees.find(e => e.badgeNumber === row['Badge Number']);

          if (existingEmployee) {
            // Update existing employee
            await api.updateEmployee(existingEmployee.bitrixId, employeeData);
          } else {
            // Create new employee (requires additional logic - needs Bitrix24 item creation)
            // For now, we only support updates
            throw new Error('Creating new employees via import is not yet supported. Please add new employees manually first.');
          }

          results.success++;
        } catch (error: any) {
          results.failed++;
          const errorMsg = `Row ${i + 2} (${row['First Name']} ${row['Last Name']}): ${error.message || 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(`Import error for row ${i + 2}:`, error);
        }
      }

      setImportResults(results);

      // If all succeeded, close modal after showing success
      if (results.failed === 0) {
        setTimeout(() => {
          setImportData([]);
          setValidationErrors([]);
          setImportResults(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          onImportComplete();
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      alert(`Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const errorCount = validationErrors.filter(e => e.type === 'error').length;
  const warningCount = validationErrors.filter(e => e.type === 'warning').length;
  const canSubmit = importData.length > 0 && errorCount === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-hartzell-blue/10 rounded-lg">
              <FileSpreadsheet className="w-7 h-7 text-hartzell-blue" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Data Management</h2>
              <p className="text-sm text-gray-600 mt-0.5">Import or export employee records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/50">
          <button
            onClick={() => setActiveTab('export')}
            disabled={isImporting}
            className={`flex-1 px-8 py-4 text-sm font-semibold transition-all relative disabled:opacity-50 ${
              activeTab === 'export'
                ? 'text-hartzell-blue bg-white border-b-3 border-hartzell-blue'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              <span>Export Data</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            disabled={isImporting}
            className={`flex-1 px-8 py-4 text-sm font-semibold transition-all relative disabled:opacity-50 ${
              activeTab === 'import'
                ? 'text-hartzell-blue bg-white border-b-3 border-hartzell-blue'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              <span>Import Data</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'export' ? (
            // Export Tab
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 text-center">
                <div className="inline-flex p-4 bg-green-100 rounded-full mb-6">
                  <Database className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Export Employee Database
                </h3>
                <p className="text-gray-700 mb-2 font-medium">
                  Complete data export with {employees.length} employees
                </p>
                <p className="text-sm text-gray-600 mb-8">
                  Includes all 100+ employee fields: personal info, employment details, benefits, training, equipment, and more
                </p>

                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Download className="w-5 h-5" />
                  Download Excel File
                </button>

                <div className="mt-8 pt-6 border-t border-green-200">
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-left">
                      Exported data includes sensitive information (SSN, banking details). Handle with care and follow data security protocols.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Import Tab
            <div className="space-y-6">
              {/* Import Progress */}
              {isImporting && (
                <div className="bg-hartzell-blue/5 border-2 border-hartzell-blue rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Loader2 className="w-6 h-6 text-hartzell-blue animate-spin" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Importing Employee Data...
                      </h4>
                      <p className="text-sm text-gray-600">
                        Processing {importProgress.current} of {importProgress.total} employees
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-hartzell-blue">
                        {Math.round((importProgress.current / importProgress.total) * 100)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-hartzell-blue to-blue-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Import Results */}
              {importResults && (
                <div className={`border-2 rounded-xl p-6 ${
                  importResults.failed === 0
                    ? 'bg-green-50 border-green-300'
                    : 'bg-yellow-50 border-yellow-300'
                }`}>
                  <div className="flex items-start gap-4">
                    {importResults.failed === 0 ? (
                      <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-900 mb-2">
                        {importResults.failed === 0 ? 'Import Completed Successfully!' : 'Import Completed with Errors'}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <p className="text-sm text-gray-600">Successfully Imported</p>
                          <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
                        </div>
                        {importResults.failed > 0 && (
                          <div className="bg-white rounded-lg p-3 border border-red-200">
                            <p className="text-sm text-gray-600">Failed</p>
                            <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
                          </div>
                        )}
                      </div>
                      {importResults.errors.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-yellow-200 max-h-48 overflow-y-auto">
                          <p className="font-semibold text-sm text-gray-900 mb-2">Errors:</p>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {importResults.errors.map((error, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-red-500">•</span>
                                <span>{error}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!isImporting && !importResults && (
                <>
                  {/* Template Download */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-blue-900 mb-2">
                          First time importing?
                        </h4>
                        <p className="text-sm text-blue-800 mb-4">
                          Download our Excel template to see the required format with all 100+ employee fields properly structured.
                        </p>
                        <button
                          onClick={handleDownloadTemplate}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                        >
                          <Download className="w-4 h-4" />
                          Download Template
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="border-3 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-hartzell-blue hover:bg-gray-50/50 transition-all group">
                    <div className="inline-flex p-4 bg-gray-100 group-hover:bg-hartzell-blue/10 rounded-full mb-4 transition-colors">
                      <Upload className="w-10 h-10 text-gray-400 group-hover:text-hartzell-blue transition-colors" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      Upload Employee Data
                    </h4>
                    <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                      Select an Excel file (.xlsx, .xls) with employee data. File will be validated before import.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isImporting}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-hartzell-blue text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-5 h-5" />
                      Select Excel File
                    </button>
                  </div>
                </>
              )}

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
        {activeTab === 'import' && importData.length > 0 && !isValidating && !isImporting && !importResults && (
          <div className="border-t-2 border-gray-200 px-8 py-6 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {errorCount > 0 ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm font-semibold text-red-700">
                      {errorCount} error{errorCount !== 1 ? 's' : ''} must be fixed
                    </p>
                  </div>
                ) : warningCount > 0 ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <p className="text-sm font-semibold text-yellow-700">
                      {warningCount} warning{warningCount !== 1 ? 's' : ''} found
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-semibold text-green-700">
                      Validation passed - ready to import
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitImport}
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-hartzell-blue to-blue-600 text-white rounded-lg hover:from-blue-700 hover:to-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <Database className="w-5 h-5" />
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
