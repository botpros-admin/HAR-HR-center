'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useCallback, useMemo, memo } from 'react';
import { z } from 'zod';
import TagInput from '@/components/TagInput';

// Comprehensive validation schema for all 136 fields
const employeeSchema = z.object({
  // Personal Information (18 fields)
  firstName: z.string().min(1, 'Required').max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1, 'Required').max(100),
  preferredName: z.string().max(100).optional(),
  dateOfBirth: z.string().regex(/^(\d{4}-\d{2}-\d{2}|)$/, 'Format: YYYY-MM-DD').optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  citizenship: z.string().optional(),
  personalEmail: z.array(z.string().email('Invalid email')).min(1, 'Required'),
  personalPhone: z.array(z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone')),
  workPhone: z.string().optional(),
  officePhone: z.string().optional(),
  officeExtension: z.string().optional(),
  address: z.string().max(500).optional(),
  profilePhoto: z.string().optional(),

  // Emergency Contact (3 fields)
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),

  // Employment Details (11 fields)
  badgeNumber: z.string().min(1),
  position: z.string().min(1, 'Required').max(200),
  subsidiary: z.string().max(200).optional(),
  employmentStatus: z.enum(['Y', 'N']),
  hireDate: z.string().regex(/^(\d{4}-\d{2}-\d{2}|)$/, 'Format: YYYY-MM-DD').optional(),
  employmentType: z.string().max(100).optional(),
  shift: z.string().max(100).optional(),
  payRate: z.string().optional(),
  benefitsEligible: z.boolean().optional(),
  salesTerritory: z.string().optional(),
  projectCategory: z.string().optional(),
  wcCode: z.number().optional(),

  // Compensation & Benefits (8 fields)
  ssn: z.string().optional(),
  ptoDays: z.string().max(10).optional(),
  healthInsurance: z.string().optional(),
  has401k: z.string().optional(),
  lifeBeneficiaries: z.string().optional(),

  // Tax & Payroll (8 fields)
  paymentMethod: z.string().optional(),
  taxFilingStatus: z.string().optional(),
  w4Exemptions: z.string().optional(),
  additionalFedWithhold: z.string().optional(),
  additionalStateWithhold: z.string().optional(),

  // Banking & Direct Deposit (6 fields)
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountType: z.string().optional(),
  bankRouting: z.string().optional(),
  bankAccountNumber: z.string().optional(),

  // Dependents (4 fields)
  dependentNames: z.array(z.string()).optional(),
  dependentSsns: z.array(z.string()).optional(),
  dependentRelationships: z.array(z.string()).optional(),
  dependentsInfo: z.array(z.string()).optional(),

  // Education & Skills (7 fields)
  educationLevel: z.string().max(100).optional(),
  schoolName: z.string().max(200).optional(),
  graduationYear: z.string().regex(/^(\d{4}|)$/, 'Format: YYYY').optional(),
  fieldsOfStudy: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  skillsLevel: z.string().optional(),

  // Training & Compliance (10 fields)
  requiredTrainingStatus: z.string().optional(),
  safetyTrainingStatus: z.string().optional(),
  complianceTrainingStatus: z.string().optional(),
  trainingDate: z.string().optional(),
  nextTrainingDue: z.string().optional(),
  trainingNotes: z.string().optional(),

  // IT & Equipment (11 fields)
  softwareExperience: z.array(z.string()).optional(),
  equipmentAssigned: z.array(z.string()).optional(),
  equipmentStatus: z.string().optional(),
  equipmentReturn: z.string().optional(),
  softwareAccess: z.array(z.string()).optional(),
  accessPermissions: z.array(z.string()).optional(),
  accessLevel: z.string().optional(),
  securityClearance: z.string().optional(),
  networkStatus: z.string().optional(),
  vpnAccess: z.boolean().optional(),
  remoteAccess: z.boolean().optional(),

  // Vehicle & Licensing (2 fields + 2 expiry)
  driversLicenseExpiry: z.string().optional(),
  autoInsuranceExpiry: z.string().optional(),

  // Work Authorization (2 fields)
  visaExpiry: z.string().optional(),

  // Performance & Reviews (3 fields)
  reviewDates: z.array(z.string()).optional(),
  terminationDate: z.string().optional(),
  rehireEligible: z.boolean().optional(),

  // Additional Information (1 field)
  additionalInfo: z.string().max(5000).optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

// CRITICAL FIX: Define all select options OUTSIDE component to prevent re-renders
// These must be stable references to avoid breaking React.memo() on Field component
const GENDER_OPTIONS = [
  { value: '', label: '—' },
  { value: '2002', label: 'Female' },
  { value: '2003', label: 'Male' }
];

const MARITAL_STATUS_OPTIONS = [
  { value: '', label: '—' },
  { value: '2021', label: 'Single' },
  { value: '2022', label: 'Married' },
  { value: '2023', label: 'Divorced' },
  { value: '2024', label: 'Widowed' },
  { value: '2025', label: 'Separated' }
];

const SUBSIDIARY_OPTIONS = [
  { value: '', label: '—' },
  { value: '2012', label: 'Construction' },
  { value: '2013', label: 'Painting' },
  { value: '2014', label: 'Windows & Doors' }
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'Y', label: 'Active' },
  { value: 'N', label: 'Inactive' }
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '', label: '—' },
  { value: '2030', label: 'Full-Time' },
  { value: '2031', label: 'Part-Time' },
  { value: '2032', label: 'Contract' },
  { value: '2033', label: 'Temporary' },
  { value: '2034', label: 'Intern' },
  { value: '2035', label: 'Seasonal' }
];

const SHIFT_OPTIONS = [
  { value: '', label: '—' },
  { value: 'Day', label: 'Day' },
  { value: 'Night', label: 'Night' },
  { value: 'Swing', label: 'Swing' },
  { value: 'Flexible', label: 'Flexible' }
];

const SALES_TERRITORY_OPTIONS = [
  { value: '', label: '—' },
  { value: '2019', label: 'Northern' },
  { value: '2020', label: 'Southern' }
];

const PROJECT_CATEGORY_OPTIONS = [
  { value: '', label: '—' },
  { value: '2015', label: 'Commercial' },
  { value: '2016', label: 'Community' },
  { value: '2017', label: 'Residential' },
  { value: '2018', label: 'Public Sector' }
];

const CITIZENSHIP_OPTIONS = [
  { value: '', label: '—' },
  { value: '2026', label: 'US Citizen' },
  { value: '2027', label: 'Permanent Resident' },
  { value: '2028', label: 'Work Visa' },
  { value: '2029', label: 'Other' }
];

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: '—' },
  { value: '2010', label: 'Direct Deposit' },
  { value: '2011', label: 'Check' }
];

const TAX_FILING_STATUS_OPTIONS = [
  { value: '', label: '—' },
  { value: '2039', label: 'Single' },
  { value: '2040', label: 'Married Filing Jointly' },
  { value: '2041', label: 'Married Filing Separately' },
  { value: '2042', label: 'Head of Household' }
];

const BANK_ACCOUNT_TYPE_OPTIONS = [
  { value: '', label: '—' },
  { value: '2036', label: 'Checking' },
  { value: '2037', label: 'Savings' },
  { value: '2038', label: 'Money Market' }
];

const EDUCATION_LEVEL_OPTIONS = [
  { value: '', label: '—' },
  { value: 'High School', label: 'High School' },
  { value: 'Associate', label: 'Associate' },
  { value: 'Bachelor', label: "Bachelor's" },
  { value: 'Master', label: "Master's" },
  { value: 'Doctorate', label: 'Doctorate' }
];

const SKILLS_LEVEL_OPTIONS = [
  { value: '', label: '—' },
  { value: '2085', label: 'Beginner' },
  { value: '2086', label: 'Intermediate' },
  { value: '2087', label: 'Advanced' },
  { value: '2088', label: 'Expert' }
];

const TRAINING_STATUS_OPTIONS = [
  { value: '', label: '—' },
  { value: '2073', label: 'Not Started' },
  { value: '2074', label: 'In Progress' },
  { value: '2075', label: 'Completed' },
  { value: '2076', label: 'Expired' }
];

const SAFETY_TRAINING_OPTIONS = [
  { value: '', label: '—' },
  { value: '2077', label: 'Not Started' },
  { value: '2078', label: 'In Progress' },
  { value: '2079', label: 'Completed' },
  { value: '2080', label: 'Expired' }
];

const COMPLIANCE_TRAINING_OPTIONS = [
  { value: '', label: '—' },
  { value: '2081', label: 'Not Started' },
  { value: '2082', label: 'In Progress' },
  { value: '2083', label: 'Completed' },
  { value: '2084', label: 'Expired' }
];

const EQUIPMENT_STATUS_OPTIONS = [
  { value: '', label: '—' },
  { value: '2065', label: 'Issued' },
  { value: '2066', label: 'Returned' },
  { value: '2067', label: 'Lost' },
  { value: '2068', label: 'Damaged' }
];

const ACCESS_LEVEL_OPTIONS = [
  { value: '', label: '—' },
  { value: '2057', label: 'Basic User' },
  { value: '2058', label: 'Power User' },
  { value: '2059', label: 'Administrator' },
  { value: '2060', label: 'Super Admin' }
];

const SECURITY_CLEARANCE_OPTIONS = [
  { value: '', label: '—' },
  { value: '2061', label: 'None' },
  { value: '2062', label: 'Confidential' },
  { value: '2063', label: 'Secret' },
  { value: '2064', label: 'Top Secret' }
];

const NETWORK_STATUS_OPTIONS = [
  { value: '', label: '—' },
  { value: '2069', label: 'Active' },
  { value: '2070', label: 'Inactive' },
  { value: '2071', label: 'Suspended' },
  { value: '2072', label: 'Disabled' }
];

// Chevron icons
const ChevronDown = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUp = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

// Eye icons for password toggle
const EyeIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeSlashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

// Collapsible section component
function Section({ title, isOpen, onToggle, children }: { title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded mb-2 bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{title}</h3>
        <span className="text-slate-500">{isOpen ? <ChevronUp /> : <ChevronDown />}</span>
      </button>
      {isOpen && (
        <div className="px-4 py-3 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}

// Field component - EXTRACTED OUTSIDE to prevent recreation on every render
const Field = memo(({ label, value, name, type = 'text', required = false, options, colSpan = 1, validationErrors, isEditing, showSSN, showBankAccount, showBankRouting, setShowSSN, setShowBankAccount, setShowBankRouting, handleFieldChange }: any) => {
  const hasError = validationErrors[name];
  const spanClass = colSpan === 2 ? 'col-span-2' : colSpan === 3 ? 'col-span-3' : '';

  // Display mode
  if (!isEditing) {
    return (
      <div className={`mb-2 ${spanClass}`}>
        <label className="block text-xs font-medium text-slate-500 mb-0.5">{label}</label>
        <div className="text-sm text-slate-900">
          {type === 'password' ? '***-**-****' : (Array.isArray(value) ? value[0] || '—' : value || <span className="text-slate-400 text-xs">—</span>)}
        </div>
      </div>
    );
  }

  // Edit mode - select
  if (type === 'select') {
    return (
      <div className={`mb-2 ${spanClass}`}>
        <label className="block text-xs font-medium text-slate-600 mb-0.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={value || ''}
          onChange={(e) => handleFieldChange(name, e.target.value)}
          className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-500' : 'border-slate-300'}`}
        >
          {options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {hasError && <p className="text-xs text-red-500 mt-0.5">{hasError}</p>}
      </div>
    );
  }

  // Edit mode - textarea
  if (type === 'textarea') {
    return (
      <div className={`mb-2 ${spanClass}`}>
        <label className="block text-xs font-medium text-slate-600 mb-0.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <textarea
          value={value || ''}
          onChange={(e) => handleFieldChange(name, e.target.value)}
          rows={2}
          className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-500' : 'border-slate-300'}`}
        />
        {hasError && <p className="text-xs text-red-500 mt-0.5">{hasError}</p>}
      </div>
    );
  }

  // Edit mode - checkbox
  if (type === 'checkbox') {
    return (
      <div className={`mb-2 ${spanClass}`}>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleFieldChange(name, e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          {label}
        </label>
        {hasError && <p className="text-xs text-red-500 mt-0.5">{hasError}</p>}
      </div>
    );
  }

  // Edit mode - number
  if (type === 'number') {
    return (
      <div className={`mb-2 ${spanClass}`}>
        <label className="block text-xs font-medium text-slate-600 mb-0.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="number"
          value={value || ''}
          onChange={(e) => handleFieldChange(name, e.target.value, 'number')}
          className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-500' : 'border-slate-300'}`}
        />
        {hasError && <p className="text-xs text-red-500 mt-0.5">{hasError}</p>}
      </div>
    );
  }

  // Edit mode - password
  if (type === 'password') {
    const isSSNField = name === 'ssn';
    const isBankAccountField = name === 'bankAccountNumber';
    const isBankRoutingField = name === 'bankRouting';
    const showField = isSSNField ? showSSN : isBankAccountField ? showBankAccount : isBankRoutingField ? showBankRouting : false;
    const toggleShow = isSSNField ? setShowSSN : isBankAccountField ? setShowBankAccount : isBankRoutingField ? setShowBankRouting : () => {};

    return (
      <div className={`mb-2 ${spanClass}`}>
        <label className="block text-xs font-medium text-slate-600 mb-0.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type={showField ? 'text' : 'password'}
            value={value || ''}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            className={`w-full px-2 py-1 pr-8 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-500' : 'border-slate-300'}`}
          />
          <button
            type="button"
            onClick={() => toggleShow(!showField)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showField ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        </div>
        {hasError && <p className="text-xs text-red-500 mt-0.5">{hasError}</p>}
      </div>
    );
  }

  // Edit mode - default text/email/tel/date
  return (
    <div className={`mb-2 ${spanClass}`}>
      <label className="block text-xs font-medium text-slate-600 mb-0.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={Array.isArray(value) ? value[0] || '' : value || ''}
        onChange={(e) => handleFieldChange(name, e.target.value, type)}
        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-500' : 'border-slate-300'}`}
      />
      {hasError && <p className="text-xs text-red-500 mt-0.5">{hasError}</p>}
    </div>
  );
});

// TagField component - EXTRACTED OUTSIDE to prevent recreation on every render
const TagField = memo(({ label, value, name, colSpan = 1, validationErrors, isEditing, updateField }: any) => {
  const hasError = validationErrors[name];
  const spanClass = colSpan === 2 ? 'col-span-2' : colSpan === 3 ? 'col-span-3' : '';

  if (!isEditing) {
    return (
      <div className={`mb-2 ${spanClass}`}>
        <label className="block text-xs font-medium text-slate-500 mb-0.5">{label}</label>
        <div className="text-sm text-slate-900">
          {Array.isArray(value) && value.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {value.map((tag, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-2 ${spanClass}`}>
      <label className="block text-xs font-medium text-slate-600 mb-0.5">{label}</label>
      <TagInput
        value={Array.isArray(value) ? value : []}
        onChange={(tags) => updateField(name, tags)}
        placeholder="Type and press Enter"
        className={hasError ? 'border-red-500' : ''}
      />
      {hasError && <p className="text-xs text-red-500 mt-0.5">{hasError}</p>}
    </div>
  );
});

export default function EmployeeDetailPage() {
  const searchParams = useSearchParams();
  const bitrixId = searchParams?.get('id');
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<EmployeeFormData>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showSSN, setShowSSN] = useState(false);
  const [showBankAccount, setShowBankAccount] = useState(false);
  const [showBankRouting, setShowBankRouting] = useState(false);

  // All sections open by default for maximum information density
  const [openSections, setOpenSections] = useState({
    personal: true,
    emergency: true,
    employment: true,
    citizenship: true,
    compensation: true,
    tax: true,
    banking: true,
    dependents: true,
    education: true,
    training: true,
    it: true,
    vehicle: true,
    performance: true,
    additional: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch employee details
  const { data: employeeData, isLoading, error } = useQuery({
    queryKey: ['employee', bitrixId],
    queryFn: async () => {
      if (!bitrixId) throw new Error('No employee ID provided');
      return api.getEmployeeDetails(parseInt(bitrixId));
    },
    enabled: !!bitrixId,
  });

  const employee = employeeData?.employee;

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<EmployeeFormData>) => {
      if (!bitrixId) throw new Error('No employee ID');
      const { badgeNumber, ...updatePayload } = updates;
      return api.updateEmployee(parseInt(bitrixId), updatePayload);
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['employee', bitrixId] });
      const previousData = queryClient.getQueryData(['employee', bitrixId]);
      queryClient.setQueryData(['employee', bitrixId], (old: any) => ({
        ...old,
        employee: { ...old.employee, ...updates }
      }));
      return { previousData };
    },
    onError: (err, updates, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['employee', bitrixId], context.previousData);
      }
      alert(`Failed to update: ${(err as Error).message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', bitrixId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsEditing(false);
      setValidationErrors({});
    },
  });

  // Helper function to convert ISO datetime to YYYY-MM-DD format
  const formatDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '';
    // Handle ISO format: "1973-12-15T00:00:00+00:00" -> "1973-12-15"
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    return dateStr;
  };

  // Helper to extract year from date string
  const extractYear = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '';
    const formatted = formatDate(dateStr);
    return formatted.split('-')[0] || '';
  };

  // Helper to convert number/string to string
  const toStr = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val);
  };

  // Helper to convert string/number to boolean
  const toBool = (val: any): boolean => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      return val === 'Y' || val === 'true' || val === '1';
    }
    return Boolean(val);
  };

  const handleEdit = () => {
    if (!employee) return;
    setFormData({
      // Personal Information
      firstName: employee.ufCrm6Name || '',
      middleName: employee.ufCrm6SecondName || '',
      lastName: employee.ufCrm6LastName || '',
      preferredName: employee.ufCrm6PreferredName || '',
      dateOfBirth: formatDate(employee.ufCrm6PersonalBirthday),
      gender: toStr(employee.ufCrm6PersonalGender),
      maritalStatus: employee.ufCrm6MaritalStatus || '',
      citizenship: toStr(employee.ufCrm6Citizenship),
      personalEmail: employee.ufCrm6Email || [],
      personalPhone: employee.ufCrm6PersonalMobile || [],
      workPhone: employee.ufCrm6WorkPhone || '',
      officePhone: employee.ufCrm6PersonalPhone || '',
      officeExtension: employee.ufCrm6_1748054470 || '',
      address: employee.ufCrm6UfLegalAddress || employee.ufCrm6Address || '',

      // Emergency Contact
      emergencyContactName: employee.ufCrm6EmergencyContactName || '',
      emergencyContactPhone: employee.ufCrm6EmergencyContactPhone || '',
      emergencyContactRelationship: employee.ufCrm6Relationship || '',

      // Employment Details
      badgeNumber: employee.ufCrm6BadgeNumber || '',
      position: employee.ufCrm6WorkPosition || '',
      subsidiary: toStr(employee.ufCrm6Subsidiary),
      employmentStatus: employee.ufCrm6EmploymentStatus || 'Y',
      hireDate: formatDate(employee.ufCrm6EmploymentStartDate),
      employmentType: toStr(employee.ufCrm6EmploymentType),
      shift: employee.ufCrm6Shift || '',
      payRate: employee.ufCrm6PayRate || '',
      benefitsEligible: toBool(employee.ufCrm6BenefitsEligible),
      salesTerritory: employee.ufCrm6Sales || '',
      projectCategory: employee.ufCrm_6_SALES_UF_USER_LEGAL_1740423289664 || '',
      wcCode: employee.ufCrm6WcCode || 0,

      // Compensation & Benefits
      ssn: employee.ufCrm6Ssn || '',
      ptoDays: employee.ufCrm6PtoDays || '',
      healthInsurance: employee.ufCrm6HealthInsurance || '',
      has401k: employee.ufCrm_6_401K_ENROLLMENT || '',
      lifeBeneficiaries: employee.ufCrm6LifeBeneficiaries || '',

      // Tax & Payroll
      paymentMethod: toStr(employee.ufCrm_6_UF_USR_1737120507262),
      taxFilingStatus: toStr(employee.ufCrm6TaxFilingStatus),
      w4Exemptions: employee.ufCrm_6_W4_EXEMPTIONS || '',
      additionalFedWithhold: employee.ufCrm6AdditionalFedWithhold || '',
      additionalStateWithhold: employee.ufCrm6AdditionalStateWithhold || '',

      // Banking
      bankName: employee.ufCrm6BankName || '',
      bankAccountName: employee.ufCrm6BankAccountName || '',
      bankAccountType: employee.ufCrm6BankAccountType || '',
      bankRouting: employee.ufCrm6BankRouting || '',
      bankAccountNumber: employee.ufCrm6BankAccountNumber || '',

      // Dependents
      dependentNames: employee.ufCrm6DependentNames || [],
      dependentSsns: employee.ufCrm6DependentSsns || [],
      dependentRelationships: employee.ufCrm6DependentRelationships || [],
      dependentsInfo: employee.ufCrm6DependentsInfo || [],

      // Education & Skills
      educationLevel: employee.ufCrm6EducationLevel || '',
      schoolName: employee.ufCrm6SchoolName || '',
      graduationYear: extractYear(employee.ufCrm6GraduationYear),
      fieldsOfStudy: Array.isArray(employee.ufCrm6FieldOfStudy) ? employee.ufCrm6FieldOfStudy : (employee.ufCrm6FieldOfStudy ? [employee.ufCrm6FieldOfStudy] : []),
      skills: Array.isArray(employee.ufCrm6Skills) ? employee.ufCrm6Skills : (employee.ufCrm6Skills ? employee.ufCrm6Skills.split(',').map((s: string) => s.trim()) : []),
      certifications: Array.isArray(employee.ufCrm6Certifications) ? employee.ufCrm6Certifications : (employee.ufCrm6Certifications ? employee.ufCrm6Certifications.split(',').map((s: string) => s.trim()) : []),
      skillsLevel: employee.ufCrm6SkillsLevel || '',

      // Training & Compliance
      requiredTrainingStatus: toStr(employee.ufCrm6RequiredTraining),
      safetyTrainingStatus: toStr(employee.ufCrm6SafetyTraining),
      complianceTrainingStatus: toStr(employee.ufCrm6ComplianceTraining),
      trainingDate: employee.ufCrm6TrainingDate || '',
      nextTrainingDue: employee.ufCrm6NextTrainingDue || '',
      trainingNotes: employee.ufCrm6TrainingNotes || '',

      // IT & Equipment
      softwareExperience: Array.isArray(employee.ufCrm6SoftwareExperience) ? employee.ufCrm6SoftwareExperience : (employee.ufCrm6SoftwareExperience ? employee.ufCrm6SoftwareExperience.split(',').map((s: string) => s.trim()) : []),
      equipmentAssigned: employee.ufCrm6EquipmentAssigned || [],
      equipmentStatus: employee.ufCrm6EquipmentStatus || '',
      equipmentReturn: employee.ufCrm6EquipmentReturn || '',
      softwareAccess: employee.ufCrm6SoftwareAccess || [],
      accessPermissions: employee.ufCrm6AccessPermissions || [],
      accessLevel: employee.ufCrm6AccessLevel || '',
      securityClearance: employee.ufCrm6SecurityClearance || '',
      networkStatus: employee.ufCrm6NetworkStatus || '',
      vpnAccess: toBool(employee.ufCrm6VpnAccess),
      remoteAccess: toBool(employee.ufCrm6RemoteAccess),

      // Vehicle & Licensing
      driversLicenseExpiry: employee.ufCrm_6_UF_USR_1747966315398_EXPIRY || '',
      autoInsuranceExpiry: employee.ufCrm_6_UF_USR_1737120327618_EXPIRY || '',

      // Work Authorization
      visaExpiry: employee.ufCrm6VisaExpiry || '',

      // Performance & Reviews
      reviewDates: employee.ufCrm6ReviewDate || [],
      terminationDate: employee.ufCrm6TerminationDate || '',
      rehireEligible: toBool(employee.ufCrm6RehireEligible),

      // Additional Information
      additionalInfo: employee.ufCrm6AdditionalInfo || '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    const result = employeeSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValidationErrors({});
    setFormData({});
    setShowSSN(false);
    setShowBankAccount(false);
    setShowBankRouting(false);
  };

  // FIX 1: Memoize updateField with useCallback for stable reference
  // IMPORTANT: Must be BEFORE early returns to satisfy Rules of Hooks
  const updateField = useCallback((field: keyof EmployeeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []); // No dependencies - setters are stable

  // FIX 2: Memoize currentData with useMemo for stable object reference
  // IMPORTANT: Must be BEFORE early returns to satisfy Rules of Hooks
  const currentData = useMemo(() => {
    if (!employee) return {}; // Return empty object if no employee data
    if (isEditing) return formData;

    return {
      // Personal Information
      firstName: employee.ufCrm6Name,
      middleName: employee.ufCrm6SecondName,
      lastName: employee.ufCrm6LastName,
      preferredName: employee.ufCrm6PreferredName,
      dateOfBirth: employee.ufCrm6PersonalBirthday,
      gender: employee.ufCrm6PersonalGender,
      maritalStatus: employee.ufCrm6MaritalStatus,
      citizenship: employee.ufCrm6Citizenship,
      personalEmail: employee.ufCrm6Email,
      personalPhone: employee.ufCrm6PersonalMobile,
      workPhone: employee.ufCrm6WorkPhone,
      officePhone: employee.ufCrm6PersonalPhone,
      officeExtension: employee.ufCrm6_1748054470,
      address: employee.ufCrm6UfLegalAddress || employee.ufCrm6Address,

      // Emergency Contact
      emergencyContactName: employee.ufCrm6EmergencyContactName,
      emergencyContactPhone: employee.ufCrm6EmergencyContactPhone,
      emergencyContactRelationship: employee.ufCrm6Relationship,

      // Employment Details
      badgeNumber: employee.ufCrm6BadgeNumber,
      position: employee.ufCrm6WorkPosition,
      subsidiary: employee.ufCrm6Subsidiary,
      employmentStatus: employee.ufCrm6EmploymentStatus,
      hireDate: employee.ufCrm6EmploymentStartDate,
      employmentType: employee.ufCrm6EmploymentType,
      shift: employee.ufCrm6Shift,
      payRate: employee.ufCrm6PayRate,
      benefitsEligible: employee.ufCrm6BenefitsEligible,
      salesTerritory: employee.ufCrm6Sales,
      projectCategory: employee.ufCrm_6_SALES_UF_USER_LEGAL_1740423289664,
      wcCode: employee.ufCrm6WcCode,

      // Compensation & Benefits
      ssn: employee.ufCrm6Ssn,
      ptoDays: employee.ufCrm6PtoDays,
      healthInsurance: employee.ufCrm6HealthInsurance,
      has401k: employee.ufCrm_6_401K_ENROLLMENT,
      lifeBeneficiaries: employee.ufCrm6LifeBeneficiaries,

      // Tax & Payroll
      paymentMethod: employee.ufCrm_6_UF_USR_1737120507262,
      taxFilingStatus: employee.ufCrm6TaxFilingStatus,
      w4Exemptions: employee.ufCrm_6_W4_EXEMPTIONS,
      additionalFedWithhold: employee.ufCrm6AdditionalFedWithhold,
      additionalStateWithhold: employee.ufCrm6AdditionalStateWithhold,

      // Banking
      bankName: employee.ufCrm6BankName,
      bankAccountName: employee.ufCrm6BankAccountName,
      bankAccountType: employee.ufCrm6BankAccountType,
      bankRouting: employee.ufCrm6BankRouting,
      bankAccountNumber: employee.ufCrm6BankAccountNumber,

      // Dependents
      dependentNames: employee.ufCrm6DependentNames,
      dependentSsns: employee.ufCrm6DependentSsns,
      dependentRelationships: employee.ufCrm6DependentRelationships,
      dependentsInfo: employee.ufCrm6DependentsInfo,

      // Education & Skills
      educationLevel: employee.ufCrm6EducationLevel,
      schoolName: employee.ufCrm6SchoolName,
      graduationYear: employee.ufCrm6GraduationYear,
      fieldsOfStudy: Array.isArray(employee.ufCrm6FieldOfStudy) ? employee.ufCrm6FieldOfStudy : (employee.ufCrm6FieldOfStudy ? [employee.ufCrm6FieldOfStudy] : []),
      skills: Array.isArray(employee.ufCrm6Skills) ? employee.ufCrm6Skills : (employee.ufCrm6Skills ? employee.ufCrm6Skills.split(',').map((s: string) => s.trim()) : []),
      certifications: Array.isArray(employee.ufCrm6Certifications) ? employee.ufCrm6Certifications : (employee.ufCrm6Certifications ? employee.ufCrm6Certifications.split(',').map((s: string) => s.trim()) : []),
      skillsLevel: employee.ufCrm6SkillsLevel,

      // Training & Compliance
      requiredTrainingStatus: employee.ufCrm6RequiredTraining,
      safetyTrainingStatus: employee.ufCrm6SafetyTraining,
      complianceTrainingStatus: employee.ufCrm6ComplianceTraining,
      trainingDate: employee.ufCrm6TrainingDate,
      nextTrainingDue: employee.ufCrm6NextTrainingDue,
      trainingNotes: employee.ufCrm6TrainingNotes,

      // IT & Equipment
      softwareExperience: Array.isArray(employee.ufCrm6SoftwareExperience) ? employee.ufCrm6SoftwareExperience : (employee.ufCrm6SoftwareExperience ? employee.ufCrm6SoftwareExperience.split(',').map((s: string) => s.trim()) : []),
      equipmentAssigned: employee.ufCrm6EquipmentAssigned,
      equipmentStatus: employee.ufCrm6EquipmentStatus,
      equipmentReturn: employee.ufCrm6EquipmentReturn,
      softwareAccess: employee.ufCrm6SoftwareAccess,
      accessPermissions: employee.ufCrm6AccessPermissions,
      accessLevel: employee.ufCrm6AccessLevel,
      securityClearance: employee.ufCrm6SecurityClearance,
      networkStatus: employee.ufCrm6NetworkStatus,
      vpnAccess: employee.ufCrm6VpnAccess,
      remoteAccess: employee.ufCrm6RemoteAccess,

      // Vehicle & Licensing
      driversLicenseExpiry: employee.ufCrm_6_UF_USR_1747966315398_EXPIRY,
      autoInsuranceExpiry: employee.ufCrm_6_UF_USR_1737120327618_EXPIRY,

      // Work Authorization
      visaExpiry: employee.ufCrm6VisaExpiry,

      // Performance & Reviews
      reviewDates: employee.ufCrm6ReviewDate,
      terminationDate: employee.ufCrm6TerminationDate,
      rehireEligible: employee.ufCrm6RehireEligible,

      // Additional Information
      additionalInfo: employee.ufCrm6AdditionalInfo,
    };
  }, [isEditing, formData, employee]); // Only recalculate when these change

  // FIX 3: Memoize change handler for stable reference
  const handleFieldChange = useCallback((name: keyof EmployeeFormData, value: any, type?: string) => {
    if (name === 'personalEmail' || name === 'personalPhone') {
      updateField(name, [value]);
    } else if (type === 'number') {
      updateField(name, parseInt(value) || 0);
    } else {
      updateField(name, value);
    }
  }, [updateField]);

  // Early returns AFTER all hooks (satisfies Rules of Hooks)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">Loading...</div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-red-600">Error: {(error as Error)?.message || 'Not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Compact enterprise header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 border-b border-slate-900 shadow">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-white">
                {currentData.firstName || '—'} {currentData.lastName || '—'}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                #{currentData.badgeNumber || '—'} · {currentData.position || '—'} · {currentData.employmentStatus === 'Y' ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded shadow hover:bg-blue-700 transition-colors"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 bg-slate-500 text-white text-xs font-medium rounded hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Validation errors */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pt-3">
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <p className="text-xs font-medium text-red-800">Fix errors:</p>
            <ul className="mt-1 text-xs text-red-700 list-disc list-inside">
              {Object.entries(validationErrors).map(([field, error]) => (
                <li key={field}>{field}: {error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Compact content */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Personal Information */}
        <Section title="Personal Information" isOpen={openSections.personal} onToggle={() => toggleSection('personal')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <Field label="First Name" value={currentData.firstName} name="firstName" required validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Middle Name" value={currentData.middleName} name="middleName" validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Last Name" value={currentData.lastName} name="lastName" required validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Preferred Name" value={currentData.preferredName} name="preferredName" validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Date of Birth" value={currentData.dateOfBirth} name="dateOfBirth" type="date" required validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field
              label="Gender"
              value={currentData.gender}
              name="gender"
              type="select"
              options={
                GENDER_OPTIONS}
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field
              label="Marital Status"
              value={currentData.maritalStatus}
              name="maritalStatus"
              type="select"
              options={
                MARITAL_STATUS_OPTIONS}
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field label="Personal Email" value={currentData.personalEmail?.[0]} name="personalEmail" type="email" required validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Personal Phone" value={currentData.personalPhone?.[0]} name="personalPhone" type="tel" validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Work Phone" value={currentData.workPhone} name="workPhone" type="tel" validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Office Phone" value={currentData.officePhone} name="officePhone" type="tel" validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Office Extension" value={currentData.officeExtension} name="officeExtension" validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Address" value={currentData.address} name="address" colSpan={3} validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
          </div>
        </Section>

        {/* Emergency Contact */}
        <Section title="Emergency Contact" isOpen={openSections.emergency} onToggle={() => toggleSection('emergency')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <Field label="Contact Name" value={currentData.emergencyContactName} name="emergencyContactName"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Contact Phone" value={currentData.emergencyContactPhone} name="emergencyContactPhone" type="tel"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Relationship" value={currentData.emergencyContactRelationship} name="emergencyContactRelationship"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
          </div>
        </Section>

        {/* Employment Details */}
        <Section title="Employment Details" isOpen={openSections.employment} onToggle={() => toggleSection('employment')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <Field label="Badge Number" value={currentData.badgeNumber} name="badgeNumber"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Position" value={currentData.position} name="position" required  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field
              label="Subsidiary"
              value={currentData.subsidiary}
              name="subsidiary"
              type="select"
              options={
                SUBSIDIARY_OPTIONS}
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field
              label="Status"
              value={currentData.employmentStatus}
              name="employmentStatus"
              type="select"
              options={
                EMPLOYMENT_STATUS_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field label="Hire Date" value={currentData.hireDate} name="hireDate" type="date"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field
              label="Type"
              value={currentData.employmentType}
              name="employmentType"
              type="select"
              options={
                EMPLOYMENT_TYPE_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field
              label="Shift"
              value={currentData.shift}
              name="shift"
              type="select"
              options={
                SHIFT_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field label="Pay Rate" value={currentData.payRate} name="payRate"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Benefits Eligible" value={currentData.benefitsEligible} name="benefitsEligible" type="checkbox"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field
              label="Sales Territory"
              value={currentData.salesTerritory}
              name="salesTerritory"
              type="select"
              options={
                SALES_TERRITORY_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field
              label="Project Category"
              value={currentData.projectCategory}
              name="projectCategory"
              type="select"
              options={
                PROJECT_CATEGORY_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field label="WC Code" value={currentData.wcCode} name="wcCode" type="number"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
          </div>
        </Section>

        {/* Citizenship & Work Authorization */}
        <Section title="Citizenship & Work Authorization" isOpen={openSections.citizenship} onToggle={() => toggleSection('citizenship')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <Field
              label="Citizenship Status"
              value={currentData.citizenship}
              name="citizenship"
              type="select"
              options={
                CITIZENSHIP_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field label="Visa/Work Authorization Expiry" value={currentData.visaExpiry} name="visaExpiry" type="date"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
          </div>
        </Section>

        {/* Compensation & Benefits */}
        <Section title="Compensation & Benefits" isOpen={openSections.compensation} onToggle={() => toggleSection('compensation')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <Field label="SSN" value={currentData.ssn} name="ssn" type="password"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="PTO Days" value={currentData.ptoDays} name="ptoDays"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Health Insurance" value={currentData.healthInsurance} name="healthInsurance"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="401(k) Enrollment" value={currentData.has401k} name="has401k"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Life Insurance Beneficiaries" value={currentData.lifeBeneficiaries} name="lifeBeneficiaries" colSpan={2}  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
          </div>
        </Section>

        {/* Tax & Payroll */}
        <Section title="Tax & Payroll Information" isOpen={openSections.tax} onToggle={() => toggleSection('tax')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <Field
              label="Payment Method"
              value={currentData.paymentMethod}
              name="paymentMethod"
              type="select"
              options={
                PAYMENT_METHOD_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field
              label="Tax Filing Status"
              value={currentData.taxFilingStatus}
              name="taxFilingStatus"
              type="select"
              options={
                TAX_FILING_STATUS_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field label="W-4 Exemptions" value={currentData.w4Exemptions} name="w4Exemptions"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Additional Federal Withholding" value={currentData.additionalFedWithhold} name="additionalFedWithhold"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Additional State Withholding" value={currentData.additionalStateWithhold} name="additionalStateWithhold"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
          </div>
        </Section>

        {/* Banking & Direct Deposit */}
        <Section title="Banking & Direct Deposit" isOpen={openSections.banking} onToggle={() => toggleSection('banking')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <Field label="Bank Name" value={currentData.bankName} name="bankName"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Account Holder Name" value={currentData.bankAccountName} name="bankAccountName"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field
              label="Account Type"
              value={currentData.bankAccountType}
              name="bankAccountType"
              type="select"
              options={
                BANK_ACCOUNT_TYPE_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field label="Routing Number" value={currentData.bankRouting} name="bankRouting" type="password"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Account Number" value={currentData.bankAccountNumber} name="bankAccountNumber" type="password"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
          </div>
        </Section>

        {/* Dependents & Beneficiaries */}
        <Section title="Dependents & Beneficiaries" isOpen={openSections.dependents} onToggle={() => toggleSection('dependents')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <TagField label="Dependent Names" value={currentData.dependentNames} name="dependentNames" colSpan={3}  validationErrors={validationErrors} isEditing={isEditing} updateField={updateField} />
            <TagField label="Dependent SSNs" value={currentData.dependentSsns} name="dependentSsns" colSpan={3}  validationErrors={validationErrors} isEditing={isEditing} updateField={updateField} />
            <TagField label="Dependent Relationships" value={currentData.dependentRelationships} name="dependentRelationships" colSpan={3}  validationErrors={validationErrors} isEditing={isEditing} updateField={updateField} />
          </div>
        </Section>

        {/* Education & Skills */}
        <Section title="Education & Skills" isOpen={openSections.education} onToggle={() => toggleSection('education')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <Field
              label="Education Level"
              value={currentData.educationLevel}
              name="educationLevel"
              type="select"
              options={
                EDUCATION_LEVEL_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field label="School" value={currentData.schoolName} name="schoolName"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Graduation Year" value={currentData.graduationYear} name="graduationYear"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <TagField label="Fields of Study" value={currentData.fieldsOfStudy} name="fieldsOfStudy" colSpan={3}  validationErrors={validationErrors} isEditing={isEditing} updateField={updateField} />
            <TagField label="Skills" value={currentData.skills} name="skills" colSpan={3}  validationErrors={validationErrors} isEditing={isEditing} updateField={updateField} />
            <TagField label="Certifications" value={currentData.certifications} name="certifications" colSpan={3}  validationErrors={validationErrors} isEditing={isEditing} updateField={updateField} />
            <Field
              label="Skills Level"
              value={currentData.skillsLevel}
              name="skillsLevel"
              type="select"
              options={
                SKILLS_LEVEL_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
          </div>
        </Section>

        {/* Training & Compliance */}
        <Section title="Training & Compliance" isOpen={openSections.training} onToggle={() => toggleSection('training')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <Field
              label="Required Training Status"
              value={currentData.requiredTrainingStatus}
              name="requiredTrainingStatus"
              type="select"
              options={
                TRAINING_STATUS_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field
              label="Safety Training Status"
              value={currentData.safetyTrainingStatus}
              name="safetyTrainingStatus"
              type="select"
              options={
                SAFETY_TRAINING_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field
              label="Compliance Training Status"
              value={currentData.complianceTrainingStatus}
              name="complianceTrainingStatus"
              type="select"
              options={
                COMPLIANCE_TRAINING_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field label="Training Completion Date" value={currentData.trainingDate} name="trainingDate" type="date"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Next Training Due" value={currentData.nextTrainingDue} name="nextTrainingDue" type="date"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Training Notes" value={currentData.trainingNotes} name="trainingNotes" type="textarea" colSpan={3}  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
          </div>
        </Section>

        {/* IT & Equipment */}
        <Section title="IT & Equipment" isOpen={openSections.it} onToggle={() => toggleSection('it')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <TagField label="Software Experience" value={currentData.softwareExperience} name="softwareExperience" colSpan={3}  validationErrors={validationErrors} isEditing={isEditing} updateField={updateField} />
            <TagField label="Equipment Assigned" value={currentData.equipmentAssigned} name="equipmentAssigned" colSpan={3}  validationErrors={validationErrors} isEditing={isEditing} updateField={updateField} />
            <Field
              label="Equipment Status"
              value={currentData.equipmentStatus}
              name="equipmentStatus"
              type="select"
              options={
                EQUIPMENT_STATUS_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field label="Equipment Return Tracking" value={currentData.equipmentReturn} name="equipmentReturn"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <TagField label="Software Access" value={currentData.softwareAccess} name="softwareAccess" colSpan={3}  validationErrors={validationErrors} isEditing={isEditing} updateField={updateField} />
            <TagField label="Access Permissions" value={currentData.accessPermissions} name="accessPermissions" colSpan={3}  validationErrors={validationErrors} isEditing={isEditing} updateField={updateField} />
            <Field
              label="Access Level"
              value={currentData.accessLevel}
              name="accessLevel"
              type="select"
              options={
                ACCESS_LEVEL_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field
              label="Security Clearance"
              value={currentData.securityClearance}
              name="securityClearance"
              type="select"
              options={
                SECURITY_CLEARANCE_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field
              label="Network Status"
              value={currentData.networkStatus}
              name="networkStatus"
              type="select"
              options={
                NETWORK_STATUS_OPTIONS}
            
              validationErrors={validationErrors}
              isEditing={isEditing}
              showSSN={showSSN}
              showBankAccount={showBankAccount}
              showBankRouting={showBankRouting}
              setShowSSN={setShowSSN}
              setShowBankAccount={setShowBankAccount}
              setShowBankRouting={setShowBankRouting}
              handleFieldChange={handleFieldChange}
            />
            <Field label="VPN Access" value={currentData.vpnAccess} name="vpnAccess" type="checkbox"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Remote Access Approved" value={currentData.remoteAccess} name="remoteAccess" type="checkbox"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
          </div>
        </Section>

        {/* Vehicle & Licensing */}
        <Section title="Vehicle & Licensing" isOpen={openSections.vehicle} onToggle={() => toggleSection('vehicle')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <Field label="Driver's License Expiry" value={currentData.driversLicenseExpiry} name="driversLicenseExpiry" type="date"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Auto Insurance Expiry" value={currentData.autoInsuranceExpiry} name="autoInsuranceExpiry" type="date"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
          </div>
        </Section>

        {/* Performance & Reviews */}
        <Section title="Performance & Reviews" isOpen={openSections.performance} onToggle={() => toggleSection('performance')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <TagField label="Performance Review Dates" value={currentData.reviewDates} name="reviewDates" colSpan={2}  validationErrors={validationErrors} isEditing={isEditing} updateField={updateField} />
            <Field label="Termination Date" value={currentData.terminationDate} name="terminationDate" type="date"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
            <Field label="Rehire Eligible" value={currentData.rehireEligible} name="rehireEligible" type="checkbox"  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
          </div>
        </Section>

        {/* Additional Information */}
        <Section title="Additional Information" isOpen={openSections.additional} onToggle={() => toggleSection('additional')}>
          <Field label="Notes" value={currentData.additionalInfo} name="additionalInfo" type="textarea" colSpan={1}  validationErrors={validationErrors} isEditing={isEditing} showSSN={showSSN} showBankAccount={showBankAccount} showBankRouting={showBankRouting} setShowSSN={setShowSSN} setShowBankAccount={setShowBankAccount} setShowBankRouting={setShowBankRouting} handleFieldChange={handleFieldChange} />
        </Section>
      </div>
    </div>
  );
}
