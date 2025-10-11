'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { z } from 'zod';

// Validation schema matching backend
const employeeSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1, 'Required').max(100),
  preferredName: z.string().max(100).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  email: z.array(z.string().email('Invalid email')).min(1, 'Required'),
  phone: z.array(z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone')),
  address: z.string().max(500).optional(),
  badgeNumber: z.string().min(1),
  position: z.string().min(1, 'Required').max(200),
  subsidiary: z.string().max(200).optional(),
  employmentStatus: z.enum(['Y', 'N']),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
  employmentType: z.string().max(100).optional(),
  shift: z.string().max(100).optional(),
  ssn: z.string().optional(),
  ptoDays: z.string().max(10).optional(),
  healthInsurance: z.number().int().optional(),
  has401k: z.number().int().optional(),
  educationLevel: z.string().max(100).optional(),
  schoolName: z.string().max(200).optional(),
  graduationYear: z.string().regex(/^\d{4}$/, 'Format: YYYY').optional(),
  fieldOfStudy: z.string().max(200).optional(),
  skills: z.string().max(1000).optional(),
  certifications: z.string().max(1000).optional(),
  softwareExperience: z.string().max(1000).optional(),
  equipmentAssigned: z.array(z.string()).optional(),
  additionalInfo: z.string().max(5000).optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

// Chevron icons (inline SVG for simplicity)
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

export default function EmployeeDetailPage() {
  const searchParams = useSearchParams();
  const bitrixId = searchParams?.get('id');
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<EmployeeFormData>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // All sections open by default for maximum information density
  const [openSections, setOpenSections] = useState({
    personal: true,
    employment: true,
    compensation: true,
    education: true,
    it: true,
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

  const handleEdit = () => {
    if (!employee) return;
    setFormData({
      firstName: employee.ufCrm6Name || '',
      middleName: employee.ufCrm6SecondName || '',
      lastName: employee.ufCrm6LastName || '',
      preferredName: employee.ufCrm6PreferredName || '',
      dateOfBirth: employee.ufCrm6PersonalBirthday || '',
      email: employee.ufCrm6Email || [],
      phone: employee.ufCrm6PersonalMobile || [],
      address: employee.ufCrm6Address || '',
      badgeNumber: employee.ufCrm6BadgeNumber || '',
      position: employee.ufCrm6WorkPosition || '',
      subsidiary: employee.ufCrm6Subsidiary || '',
      employmentStatus: employee.ufCrm6EmploymentStatus || 'Y',
      hireDate: employee.ufCrm6EmploymentStartDate || '',
      employmentType: employee.ufCrm6EmploymentType || '',
      shift: employee.ufCrm6Shift || '',
      ssn: employee.ufCrm6Ssn || '',
      ptoDays: employee.ufCrm6PtoDays || '',
      healthInsurance: employee.ufCrm6HealthInsurance || 0,
      has401k: employee.ufCrm_6_401K_ENROLLMENT || 0,
      educationLevel: employee.ufCrm6EducationLevel || '',
      schoolName: employee.ufCrm6SchoolName || '',
      graduationYear: employee.ufCrm6GraduationYear || '',
      fieldOfStudy: employee.ufCrm6FieldOfStudy || '',
      skills: employee.ufCrm6Skills || '',
      certifications: employee.ufCrm6Certifications || '',
      softwareExperience: employee.ufCrm6SoftwareExperience || '',
      equipmentAssigned: employee.ufCrm6EquipmentAssigned || [],
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
  };

  const updateField = (field: keyof EmployeeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

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

  const currentData = isEditing ? formData : {
    firstName: employee.ufCrm6Name,
    middleName: employee.ufCrm6SecondName,
    lastName: employee.ufCrm6LastName,
    preferredName: employee.ufCrm6PreferredName,
    dateOfBirth: employee.ufCrm6PersonalBirthday,
    email: employee.ufCrm6Email,
    phone: employee.ufCrm6PersonalMobile,
    address: employee.ufCrm6Address,
    badgeNumber: employee.ufCrm6BadgeNumber,
    position: employee.ufCrm6WorkPosition,
    subsidiary: employee.ufCrm6Subsidiary,
    employmentStatus: employee.ufCrm6EmploymentStatus,
    hireDate: employee.ufCrm6EmploymentStartDate,
    employmentType: employee.ufCrm6EmploymentType,
    shift: employee.ufCrm6Shift,
    ssn: employee.ufCrm6Ssn,
    ptoDays: employee.ufCrm6PtoDays,
    healthInsurance: employee.ufCrm6HealthInsurance,
    has401k: employee.ufCrm_6_401K_ENROLLMENT,
    educationLevel: employee.ufCrm6EducationLevel,
    schoolName: employee.ufCrm6SchoolName,
    graduationYear: employee.ufCrm6GraduationYear,
    fieldOfStudy: employee.ufCrm6FieldOfStudy,
    skills: employee.ufCrm6Skills,
    certifications: employee.ufCrm6Certifications,
    softwareExperience: employee.ufCrm6SoftwareExperience,
    equipmentAssigned: employee.ufCrm6EquipmentAssigned,
    additionalInfo: employee.ufCrm6AdditionalInfo,
  };

  // Compact field component
  const Field = ({ label, value, name, type = 'text', required = false, options, colSpan = 1 }: any) => {
    const hasError = validationErrors[name];
    const spanClass = colSpan === 2 ? 'col-span-2' : '';

    if (!isEditing) {
      return (
        <div className={`mb-2 ${spanClass}`}>
          <label className="block text-xs font-medium text-slate-500 mb-0.5">{label}</label>
          <div className="text-sm text-slate-900">{value || <span className="text-slate-400 text-xs">—</span>}</div>
        </div>
      );
    }

    if (type === 'select') {
      return (
        <div className={`mb-2 ${spanClass}`}>
          <label className="block text-xs font-medium text-slate-600 mb-0.5">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={value || ''}
            onChange={(e) => updateField(name, e.target.value)}
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

    if (type === 'textarea') {
      return (
        <div className={`mb-2 ${spanClass}`}>
          <label className="block text-xs font-medium text-slate-600 mb-0.5">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={value || ''}
            onChange={(e) => updateField(name, e.target.value)}
            rows={2}
            className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-500' : 'border-slate-300'}`}
          />
          {hasError && <p className="text-xs text-red-500 mt-0.5">{hasError}</p>}
        </div>
      );
    }

    if (type === 'number') {
      return (
        <div className={`mb-2 ${spanClass}`}>
          <label className="block text-xs font-medium text-slate-600 mb-0.5">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="number"
            value={value || ''}
            onChange={(e) => updateField(name, parseInt(e.target.value) || 0)}
            className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-500' : 'border-slate-300'}`}
          />
          {hasError && <p className="text-xs text-red-500 mt-0.5">{hasError}</p>}
        </div>
      );
    }

    return (
      <div className={`mb-2 ${spanClass}`}>
        <label className="block text-xs font-medium text-slate-600 mb-0.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={type}
          value={type === 'password' && !isEditing ? '***-**-****' : (Array.isArray(value) ? value[0] || '' : value || '')}
          onChange={(e) => {
            if (name === 'email' || name === 'phone') {
              updateField(name, [e.target.value]);
            } else {
              updateField(name, e.target.value);
            }
          }}
          className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-500' : 'border-slate-300'}`}
        />
        {hasError && <p className="text-xs text-red-500 mt-0.5">{hasError}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Compact enterprise header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 border-b border-slate-900 shadow">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-white">
                {currentData.firstName} {currentData.lastName}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                #{currentData.badgeNumber} · {currentData.position} · {currentData.employmentStatus === 'Y' ? 'Active' : 'Inactive'}
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
            <Field label="First Name" value={currentData.firstName} name="firstName" required />
            <Field label="Middle Name" value={currentData.middleName} name="middleName" />
            <Field label="Last Name" value={currentData.lastName} name="lastName" required />
            <Field label="Preferred Name" value={currentData.preferredName} name="preferredName" />
            <Field label="Date of Birth" value={currentData.dateOfBirth} name="dateOfBirth" type="date" required />
            <Field label="Email" value={currentData.email?.[0]} name="email" type="email" required />
            <Field label="Phone" value={currentData.phone?.[0]} name="phone" type="tel" />
            <Field label="Address" value={currentData.address} name="address" colSpan={2} />
          </div>
        </Section>

        {/* Employment Details */}
        <Section title="Employment Details" isOpen={openSections.employment} onToggle={() => toggleSection('employment')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <Field label="Badge Number" value={currentData.badgeNumber} name="badgeNumber" />
            <Field label="Position" value={currentData.position} name="position" required />
            <Field label="Department" value={currentData.subsidiary} name="subsidiary" />
            <Field
              label="Status"
              value={currentData.employmentStatus}
              name="employmentStatus"
              type="select"
              options={[
                { value: 'Y', label: 'Active' },
                { value: 'N', label: 'Inactive' }
              ]}
            />
            <Field label="Hire Date" value={currentData.hireDate} name="hireDate" type="date" />
            <Field
              label="Type"
              value={currentData.employmentType}
              name="employmentType"
              type="select"
              options={[
                { value: '', label: '—' },
                { value: 'Full-time', label: 'Full-time' },
                { value: 'Part-time', label: 'Part-time' },
                { value: 'Contract', label: 'Contract' },
                { value: 'Temporary', label: 'Temporary' }
              ]}
            />
            <Field
              label="Shift"
              value={currentData.shift}
              name="shift"
              type="select"
              options={[
                { value: '', label: '—' },
                { value: 'Day', label: 'Day' },
                { value: 'Night', label: 'Night' },
                { value: 'Swing', label: 'Swing' },
                { value: 'Flexible', label: 'Flexible' }
              ]}
            />
          </div>
        </Section>

        {/* Compensation & Benefits */}
        <Section title="Compensation & Benefits" isOpen={openSections.compensation} onToggle={() => toggleSection('compensation')}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <Field label="SSN" value={currentData.ssn} name="ssn" type="password" />
            <Field label="PTO Days" value={currentData.ptoDays} name="ptoDays" />
            <Field
              label="Health Insurance"
              value={currentData.healthInsurance}
              name="healthInsurance"
              type="select"
              options={[
                { value: 0, label: 'Not Enrolled' },
                { value: 1, label: 'Enrolled' }
              ]}
            />
            <Field
              label="401(k)"
              value={currentData.has401k}
              name="has401k"
              type="select"
              options={[
                { value: 0, label: 'Not Enrolled' },
                { value: 1, label: 'Enrolled' }
              ]}
            />
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
              options={[
                { value: '', label: '—' },
                { value: 'High School', label: 'High School' },
                { value: 'Associate', label: 'Associate' },
                { value: 'Bachelor', label: "Bachelor's" },
                { value: 'Master', label: "Master's" },
                { value: 'Doctorate', label: 'Doctorate' }
              ]}
            />
            <Field label="School" value={currentData.schoolName} name="schoolName" />
            <Field label="Graduation Year" value={currentData.graduationYear} name="graduationYear" />
            <Field label="Field of Study" value={currentData.fieldOfStudy} name="fieldOfStudy" colSpan={2} />
            <Field label="Skills" value={currentData.skills} name="skills" type="textarea" colSpan={3} />
            <Field label="Certifications" value={currentData.certifications} name="certifications" type="textarea" colSpan={3} />
          </div>
        </Section>

        {/* IT & Equipment */}
        <Section title="IT & Equipment" isOpen={openSections.it} onToggle={() => toggleSection('it')}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <Field label="Software Experience" value={currentData.softwareExperience} name="softwareExperience" type="textarea" colSpan={2} />
            <Field label="Equipment Assigned" value={currentData.equipmentAssigned?.join(', ')} name="equipmentAssigned" type="textarea" colSpan={2} />
          </div>
        </Section>

        {/* Additional Information */}
        <Section title="Additional Information" isOpen={openSections.additional} onToggle={() => toggleSection('additional')}>
          <Field label="Notes" value={currentData.additionalInfo} name="additionalInfo" type="textarea" colSpan={1} />
        </Section>
      </div>
    </div>
  );
}
