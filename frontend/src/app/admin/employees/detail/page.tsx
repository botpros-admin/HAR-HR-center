'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { z } from 'zod';
import {
  ArrowLeft, User, Briefcase, DollarSign, FileText, Shield, GraduationCap,
  Package, Clock, Edit, Save, X, Phone, Mail, MapPin, Calendar, Building,
  Users, CreditCard, Award, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

// Validation schema matching backend
const employeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100),
  preferredName: z.string().max(100).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  email: z.array(z.string().email('Invalid email format')).min(1, 'At least one email required'),
  phone: z.array(z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format')).min(1, 'At least one phone required'),
  address: z.string().max(500).optional(),
  position: z.string().min(1, 'Position is required').max(200),
  subsidiary: z.string().max(200).optional(),
  employmentStatus: z.enum(['Y', 'N']),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  employmentType: z.string().max(100).optional(),
  shift: z.string().max(100).optional(),
  ptoDays: z.string().max(10).optional(),
  healthInsurance: z.number().int().optional(),
  has401k: z.number().int().optional(),
  educationLevel: z.string().max(100).optional(),
  schoolName: z.string().max(200).optional(),
  graduationYear: z.string().regex(/^\d{4}$/, 'Year must be 4 digits').optional(),
  fieldOfStudy: z.string().max(200).optional(),
  skills: z.string().max(1000).optional(),
  certifications: z.string().max(1000).optional(),
  softwareExperience: z.string().max(1000).optional(),
  equipmentAssigned: z.array(z.string()).optional(),
  additionalInfo: z.string().max(5000).optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

export default function EmployeeDetailPage() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get('id');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<EmployeeFormData>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch single employee using new API endpoint
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      if (!employeeId) throw new Error('No employee ID');
      return api.getEmployeeDetails(parseInt(employeeId));
    },
    enabled: !!employeeId,
  });

  const employee = data?.employee;

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<EmployeeFormData>) => {
      if (!employeeId) throw new Error('No employee ID');
      return api.updateEmployee(parseInt(employeeId), updates);
    },

    // Optimistic update
    onMutate: async (updates) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['employee', employeeId] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(['employee', employeeId]);

      // Optimistically update
      queryClient.setQueryData(['employee', employeeId], (old: any) => ({
        employee: { ...old?.employee, ...updates }
      }));

      return { previous };
    },

    // Rollback on error
    onError: (err, updates, context) => {
      queryClient.setQueryData(['employee', employeeId], context?.previous);
      alert(`Failed to update employee: ${(err as Error).message}`);
    },

    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] }); // Refresh list too
      setIsEditing(false);
      setEditedData({});
      setValidationErrors({});
    },
  });

  const handleEdit = () => {
    // Deep copy to prevent mutation
    const initialData = {
      firstName: employee?.ufCrm6Name || '',
      middleName: employee?.ufCrm6SecondName || '',
      lastName: employee?.ufCrm6LastName || '',
      preferredName: employee?.ufCrm6PreferredName || '',
      dateOfBirth: employee?.ufCrm6PersonalBirthday || '',
      email: employee?.ufCrm6Email || [],
      phone: employee?.ufCrm6PersonalMobile || [],
      address: employee?.ufCrm6Address || '',
      position: employee?.ufCrm6WorkPosition || '',
      subsidiary: employee?.ufCrm6Subsidiary || '',
      employmentStatus: employee?.ufCrm6EmploymentStatus || 'Y',
      hireDate: employee?.ufCrm6EmploymentStartDate || '',
      employmentType: employee?.ufCrm6EmploymentType || '',
      shift: employee?.ufCrm6Shift || '',
      ptoDays: employee?.ufCrm6PtoDays || '',
      healthInsurance: employee?.ufCrm6HealthInsurance || 0,
      has401k: employee?.ufCrm_6_401K_ENROLLMENT || 0,
      educationLevel: employee?.ufCrm6EducationLevel || '',
      schoolName: employee?.ufCrm6SchoolName || '',
      graduationYear: employee?.ufCrm6GraduationYear || '',
      fieldOfStudy: employee?.ufCrm6FieldOfStudy || '',
      skills: employee?.ufCrm6Skills || '',
      certifications: employee?.ufCrm6Certifications || '',
      softwareExperience: employee?.ufCrm6SoftwareExperience || '',
      equipmentAssigned: employee?.ufCrm6EquipmentAssigned || [],
      additionalInfo: employee?.ufCrm6AdditionalInfo || '',
    };
    setEditedData(JSON.parse(JSON.stringify(initialData)));
    setIsEditing(true);
  };

  const handleFieldChange = (field: keyof EmployeeFormData, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleSave = () => {
    // Validate all fields
    const validation = employeeSchema.safeParse(editedData);

    if (!validation.success) {
      // Show validation errors
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setValidationErrors(newErrors);
      return;
    }

    // All valid - submit
    updateMutation.mutate(validation.data);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
    setValidationErrors({});
  };

  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'employment', label: 'Employment Details', icon: Briefcase },
    { id: 'compensation', label: 'Compensation & Benefits', icon: DollarSign },
    { id: 'education', label: 'Education & Skills', icon: GraduationCap },
    { id: 'it', label: 'IT & Equipment', icon: Shield },
    { id: 'documents', label: 'Documents & Compliance', icon: FileText },
    { id: 'history', label: 'History & Notes', icon: Clock },
  ];

  if (!employeeId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Employee ID is required.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hartzell-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee details...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load employee. {(error as Error)?.message}</p>
      </div>
    );
  }

  const displayName = `${employee.ufCrm6Name} ${employee.ufCrm6LastName}`.trim();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
            <p className="text-gray-600 mt-1">
              {employee.ufCrm6WorkPosition} • Badge #{employee.ufCrm6BadgeNumber}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-hartzell-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-hartzell-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit Employee
            </button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        {employee.ufCrm6EmploymentStatus === 'Y' ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-2" />
            Active Employee
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-4 h-4 mr-2" />
            Inactive
          </span>
        )}
      </div>

      {/* Validation Errors Banner */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                {Object.entries(validationErrors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-hartzell-blue text-hartzell-blue font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'personal' && (
          <PersonalTab
            employee={employee}
            isEditing={isEditing}
            editedData={editedData}
            errors={validationErrors}
            onChange={handleFieldChange}
          />
        )}
        {activeTab === 'employment' && (
          <EmploymentTab
            employee={employee}
            isEditing={isEditing}
            editedData={editedData}
            errors={validationErrors}
            onChange={handleFieldChange}
          />
        )}
        {activeTab === 'compensation' && (
          <CompensationTab
            employee={employee}
            isEditing={isEditing}
            editedData={editedData}
            errors={validationErrors}
            onChange={handleFieldChange}
          />
        )}
        {activeTab === 'education' && (
          <EducationTab
            employee={employee}
            isEditing={isEditing}
            editedData={editedData}
            errors={validationErrors}
            onChange={handleFieldChange}
          />
        )}
        {activeTab === 'it' && (
          <ITTab
            employee={employee}
            isEditing={isEditing}
            editedData={editedData}
            errors={validationErrors}
            onChange={handleFieldChange}
          />
        )}
        {activeTab === 'documents' && <DocumentsTab employee={employee} />}
        {activeTab === 'history' && <HistoryTab employee={employee} />}
      </div>
    </div>
  );
}

// Helper component for form fields
function FormField({ label, value, icon: Icon, isEditing, type = 'text', error, onChange, readonly = false, sensitive = false, placeholder = '' }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {sensitive && <span className="ml-2 text-xs text-red-600">(Sensitive)</span>}
        {readonly && <span className="ml-2 text-xs text-gray-500">(Read-only)</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        {isEditing && !readonly ? (
          <>
            <input
              type={type}
              value={value || ''}
              onChange={(e) => onChange(type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
              placeholder={placeholder}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </>
        ) : (
          <div className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
            {sensitive && value ? '***-**-****' : (value || 'N/A')}
          </div>
        )}
      </div>
    </div>
  );
}

// Tab Components
function PersonalTab({ employee, isEditing, editedData, errors, onChange }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="First Name"
          value={isEditing ? editedData.firstName : employee.ufCrm6Name}
          icon={User}
          isEditing={isEditing}
          error={errors.firstName}
          onChange={(v: string) => onChange('firstName', v)}
        />
        <FormField
          label="Middle Name"
          value={isEditing ? editedData.middleName : employee.ufCrm6SecondName}
          icon={User}
          isEditing={isEditing}
          error={errors.middleName}
          onChange={(v: string) => onChange('middleName', v)}
        />
        <FormField
          label="Last Name"
          value={isEditing ? editedData.lastName : employee.ufCrm6LastName}
          icon={User}
          isEditing={isEditing}
          error={errors.lastName}
          onChange={(v: string) => onChange('lastName', v)}
        />
        <FormField
          label="Preferred Name"
          value={isEditing ? editedData.preferredName : employee.ufCrm6PreferredName}
          icon={User}
          isEditing={isEditing}
          error={errors.preferredName}
          onChange={(v: string) => onChange('preferredName', v)}
        />
        <FormField
          label="Date of Birth"
          value={isEditing ? editedData.dateOfBirth : employee.ufCrm6PersonalBirthday}
          icon={Calendar}
          isEditing={isEditing}
          type="date"
          error={errors.dateOfBirth}
          onChange={(v: string) => onChange('dateOfBirth', v)}
        />
        <FormField
          label="Social Security Number"
          value={employee.ufCrm6Ssn}
          icon={Shield}
          isEditing={false}
          readonly={true}
          sensitive={true}
        />
        <FormField
          label="Email"
          value={isEditing ? (editedData.email?.[0] || '') : (employee.ufCrm6Email?.[0] || '')}
          icon={Mail}
          isEditing={isEditing}
          type="email"
          error={errors.email}
          onChange={(v: string) => onChange('email', [v])}
          placeholder="employee@hartzell.com"
        />
        <FormField
          label="Phone"
          value={isEditing ? (editedData.phone?.[0] || '') : (employee.ufCrm6PersonalMobile?.[0] || '')}
          icon={Phone}
          isEditing={isEditing}
          type="tel"
          error={errors.phone}
          onChange={(v: string) => onChange('phone', [v])}
          placeholder="(555) 123-4567"
        />
      </div>
      <div className="pt-6 border-t border-gray-200">
        <h4 className="text-md font-medium text-gray-900 mb-4">Address</h4>
        <FormField
          label="Street Address"
          value={isEditing ? editedData.address : employee.ufCrm6Address}
          icon={MapPin}
          isEditing={isEditing}
          error={errors.address}
          onChange={(v: string) => onChange('address', v)}
          placeholder="123 Main St, City, State ZIP"
        />
      </div>
    </div>
  );
}

function EmploymentTab({ employee, isEditing, editedData, errors, onChange }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Badge Number"
          value={employee.ufCrm6BadgeNumber}
          icon={User}
          isEditing={false}
          readonly={true}
        />
        <FormField
          label="Position"
          value={isEditing ? editedData.position : employee.ufCrm6WorkPosition}
          icon={Briefcase}
          isEditing={isEditing}
          error={errors.position}
          onChange={(v: string) => onChange('position', v)}
        />
        <FormField
          label="Subsidiary/Department"
          value={isEditing ? editedData.subsidiary : employee.ufCrm6Subsidiary}
          icon={Building}
          isEditing={isEditing}
          error={errors.subsidiary}
          onChange={(v: string) => onChange('subsidiary', v)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status</label>
          <div className="relative">
            <CheckCircle className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            {isEditing ? (
              <select
                value={editedData.employmentStatus || 'Y'}
                onChange={(e) => onChange('employmentStatus', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
              >
                <option value="Y">Active</option>
                <option value="N">Inactive</option>
              </select>
            ) : (
              <div className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                {employee.ufCrm6EmploymentStatus === 'Y' ? 'Active' : 'Inactive'}
              </div>
            )}
          </div>
        </div>
        <FormField
          label="Employment Type"
          value={isEditing ? editedData.employmentType : employee.ufCrm6EmploymentType}
          icon={Briefcase}
          isEditing={isEditing}
          error={errors.employmentType}
          onChange={(v: string) => onChange('employmentType', v)}
          placeholder="Full-time, Part-time, etc."
        />
        <FormField
          label="Shift"
          value={isEditing ? editedData.shift : employee.ufCrm6Shift}
          icon={Clock}
          isEditing={isEditing}
          error={errors.shift}
          onChange={(v: string) => onChange('shift', v)}
          placeholder="Day, Night, etc."
        />
        <FormField
          label="Hire Date"
          value={isEditing ? editedData.hireDate : employee.ufCrm6EmploymentStartDate}
          icon={Calendar}
          isEditing={isEditing}
          type="date"
          error={errors.hireDate}
          onChange={(v: string) => onChange('hireDate', v)}
        />
      </div>
    </div>
  );
}

function CompensationTab({ employee, isEditing, editedData, errors, onChange }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Compensation & Benefits</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="PTO Days Allocated"
          value={isEditing ? editedData.ptoDays : employee.ufCrm6PtoDays}
          icon={Calendar}
          isEditing={isEditing}
          error={errors.ptoDays}
          onChange={(v: string) => onChange('ptoDays', v)}
          placeholder="15"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Health Insurance</label>
          <div className="relative">
            <Award className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            {isEditing ? (
              <select
                value={editedData.healthInsurance || 0}
                onChange={(e) => onChange('healthInsurance', parseInt(e.target.value))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
              >
                <option value={0}>Not Enrolled</option>
                <option value={1}>Enrolled</option>
              </select>
            ) : (
              <div className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                {employee.ufCrm6HealthInsurance === 1 ? 'Enrolled' : 'Not Enrolled'}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">401(k) Enrollment</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            {isEditing ? (
              <select
                value={editedData.has401k || 0}
                onChange={(e) => onChange('has401k', parseInt(e.target.value))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
              >
                <option value={0}>Not Enrolled</option>
                <option value={1}>Enrolled</option>
              </select>
            ) : (
              <div className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                {employee.ufCrm_6_401K_ENROLLMENT === 1 ? 'Enrolled' : 'Not Enrolled'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EducationTab({ employee, isEditing, editedData, errors, onChange }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Education & Skills</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Education Level"
          value={isEditing ? editedData.educationLevel : employee.ufCrm6EducationLevel}
          icon={GraduationCap}
          isEditing={isEditing}
          error={errors.educationLevel}
          onChange={(v: string) => onChange('educationLevel', v)}
          placeholder="High School, Bachelor's, etc."
        />
        <FormField
          label="School Name"
          value={isEditing ? editedData.schoolName : employee.ufCrm6SchoolName}
          icon={Building}
          isEditing={isEditing}
          error={errors.schoolName}
          onChange={(v: string) => onChange('schoolName', v)}
        />
        <FormField
          label="Graduation Year"
          value={isEditing ? editedData.graduationYear : employee.ufCrm6GraduationYear}
          icon={Calendar}
          isEditing={isEditing}
          error={errors.graduationYear}
          onChange={(v: string) => onChange('graduationYear', v)}
          placeholder="2020"
        />
        <FormField
          label="Field of Study"
          value={isEditing ? editedData.fieldOfStudy : employee.ufCrm6FieldOfStudy}
          icon={GraduationCap}
          isEditing={isEditing}
          error={errors.fieldOfStudy}
          onChange={(v: string) => onChange('fieldOfStudy', v)}
        />
      </div>
      <div className="pt-6 border-t border-gray-200 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
          {isEditing ? (
            <textarea
              value={editedData.skills || ''}
              onChange={(e) => onChange('skills', e.target.value)}
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent ${
                errors.skills ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="List skills separated by commas"
            />
          ) : (
            <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 whitespace-pre-wrap">
              {employee.ufCrm6Skills || 'N/A'}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Certifications</label>
          {isEditing ? (
            <textarea
              value={editedData.certifications || ''}
              onChange={(e) => onChange('certifications', e.target.value)}
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent ${
                errors.certifications ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="List certifications"
            />
          ) : (
            <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 whitespace-pre-wrap">
              {employee.ufCrm6Certifications || 'N/A'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ITTab({ employee, isEditing, editedData, errors, onChange }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">IT & Equipment</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Software Experience</label>
          {isEditing ? (
            <textarea
              value={editedData.softwareExperience || ''}
              onChange={(e) => onChange('softwareExperience', e.target.value)}
              rows={4}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent ${
                errors.softwareExperience ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="List software and tools"
            />
          ) : (
            <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 whitespace-pre-wrap">
              {employee.ufCrm6SoftwareExperience || 'N/A'}
            </div>
          )}
        </div>
        <FormField
          label="Equipment Assigned"
          value={(isEditing ? editedData.equipmentAssigned : employee.ufCrm6EquipmentAssigned)?.join(', ') || 'None'}
          icon={Package}
          isEditing={false}
          readonly={true}
        />
      </div>
    </div>
  );
}

function DocumentsTab({ employee }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents & Compliance</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          Document management integration coming soon. This will show all signed documents, pending assignments, and compliance status.
        </p>
      </div>
    </div>
  );
}

function HistoryTab({ employee }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">History & Audit Log</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          Employee history and audit log coming soon. This will show all changes made to this employee record, including who made the changes and when.
        </p>
      </div>
    </div>
  );
}
