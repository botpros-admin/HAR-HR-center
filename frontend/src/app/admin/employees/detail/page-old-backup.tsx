'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import {
  ArrowLeft, User, Briefcase, DollarSign, FileText, Shield, GraduationCap,
  Package, Clock, Edit, Save, X, Phone, Mail, MapPin, Calendar, Building,
  Users, CreditCard, Award, CheckCircle, XCircle
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function EmployeeDetailPage() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get('id');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({});

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      // For now, get employee from list and fetch additional data
      const employees = await api.getEmployees();
      const emp = employees.employees.find((e: any) => e.id === employeeId);

      // TODO: Add API endpoint to fetch complete employee data
      // const fullData = await api.getEmployeeDetails(employeeId);

      return emp;
    },
    enabled: !!employeeId,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: any) => {
      // TODO: Implement update API
      return Promise.resolve(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      setIsEditing(false);
      setEditedData({});
    },
  });

  const handleEdit = () => {
    setEditedData(employee);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editedData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'employment', label: 'Employment Details', icon: Briefcase },
    { id: 'compensation', label: 'Compensation & Benefits', icon: DollarSign },
    { id: 'documents', label: 'Documents & Compliance', icon: FileText },
    { id: 'it', label: 'IT & Equipment', icon: Shield },
    { id: 'training', label: 'Training & Performance', icon: GraduationCap },
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

  if (!employee) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Employee not found.</p>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-gray-900">{employee.name}</h1>
            <p className="text-gray-600 mt-1">
              {employee.position} • Badge #{employee.badgeNumber}
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
        {employee.employmentStatus === 'Active' ? (
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
        {activeTab === 'personal' && <PersonalTab employee={employee} isEditing={isEditing} />}
        {activeTab === 'employment' && <EmploymentTab employee={employee} isEditing={isEditing} />}
        {activeTab === 'compensation' && <CompensationTab employee={employee} isEditing={isEditing} />}
        {activeTab === 'documents' && <DocumentsTab employee={employee} />}
        {activeTab === 'it' && <ITTab employee={employee} isEditing={isEditing} />}
        {activeTab === 'training' && <TrainingTab employee={employee} />}
        {activeTab === 'history' && <HistoryTab employee={employee} />}
      </div>
    </div>
  );
}

// Info Field Component
function InfoField({ label, value, icon: Icon, isEditing, sensitive = false }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {sensitive && <span className="ml-2 text-xs text-red-600">(Sensitive)</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        {isEditing ? (
          <input
            type="text"
            defaultValue={value}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
          />
        ) : (
          <div className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
            {value || 'N/A'}
          </div>
        )}
      </div>
    </div>
  );
}

// Tab Components
function PersonalTab({ employee, isEditing }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoField label="First Name" value={employee.name?.split(' ')[0]} icon={User} isEditing={isEditing} />
        <InfoField label="Last Name" value={employee.name?.split(' ').slice(1).join(' ')} icon={User} isEditing={isEditing} />
        <InfoField label="Date of Birth" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : 'N/A'} icon={Calendar} isEditing={isEditing} />
        <InfoField label="Social Security Number" value="***-**-****" icon={Shield} isEditing={false} sensitive={true} />
        <InfoField label="Email" value={employee.email} icon={Mail} isEditing={isEditing} />
        <InfoField label="Phone" value={employee.phone} icon={Phone} isEditing={isEditing} />
      </div>
      <div className="pt-6 border-t border-gray-200">
        <h4 className="text-md font-medium text-gray-900 mb-4">Address</h4>
        <div className="grid grid-cols-1 gap-4">
          <InfoField label="Street Address" value={employee.address} icon={MapPin} isEditing={isEditing} />
        </div>
      </div>
      <div className="pt-6 border-t border-gray-200">
        <h4 className="text-md font-medium text-gray-900 mb-4">Emergency Contact</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoField label="Contact Name" value="N/A" icon={User} isEditing={isEditing} />
          <InfoField label="Contact Phone" value="N/A" icon={Phone} isEditing={isEditing} />
          <InfoField label="Relationship" value="N/A" icon={Users} isEditing={isEditing} />
        </div>
      </div>
    </div>
  );
}

function EmploymentTab({ employee, isEditing }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoField label="Employee ID" value={employee.badgeNumber} icon={User} isEditing={false} />
        <InfoField label="Position" value={employee.position} icon={Briefcase} isEditing={isEditing} />
        <InfoField label="Department" value={employee.department || 'N/A'} icon={Building} isEditing={isEditing} />
        <InfoField label="Employment Status" value={employee.employmentStatus} icon={CheckCircle} isEditing={false} />
        <InfoField label="Employment Type" value="Full-time" icon={Briefcase} isEditing={isEditing} />
        <InfoField label="Hire Date" value={employee.hireDate ? formatDate(employee.hireDate) : 'N/A'} icon={Calendar} isEditing={false} />
        <InfoField label="Manager" value="N/A" icon={Users} isEditing={isEditing} />
        <InfoField label="Work Location" value="N/A" icon={MapPin} isEditing={isEditing} />
      </div>
    </div>
  );
}

function CompensationTab({ employee, isEditing }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Compensation & Benefits</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoField label="Salary" value="$XX,XXX" icon={DollarSign} isEditing={isEditing} sensitive={true} />
        <InfoField label="Pay Frequency" value="Bi-weekly" icon={Calendar} isEditing={isEditing} />
        <InfoField label="PTO Days Allocated" value={employee.ptoDays || '0'} icon={Calendar} isEditing={isEditing} />
        <InfoField label="PTO Days Used" value="0" icon={Calendar} isEditing={false} />
        <InfoField label="Health Insurance" value="Enrolled" icon={Award} isEditing={false} />
        <InfoField label="401(k) Enrollment" value="Enrolled" icon={CreditCard} isEditing={false} />
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

function ITTab({ employee, isEditing }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">IT & Equipment</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoField label="System Access Level" value="Standard User" icon={Shield} isEditing={isEditing} />
        <InfoField label="Equipment Assigned" value={employee.equipmentAssigned?.join(', ') || 'None'} icon={Package} isEditing={false} />
      </div>
    </div>
  );
}

function TrainingTab({ employee }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Training & Performance</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          Training and performance tracking coming soon.
        </p>
      </div>
    </div>
  );
}

function HistoryTab({ employee }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">History & Notes</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          Employee history and audit log coming soon.
        </p>
      </div>
    </div>
  );
}
