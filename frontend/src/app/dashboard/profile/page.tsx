'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Building, Edit2, Check, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';

export default function ProfilePage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hartzell-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <User className="w-8 h-8 text-hartzell-blue" />
          My Profile
        </h1>
        <p className="text-gray-600 mt-1">
          View and manage your personal information
        </p>
      </div>

      {/* Personal Information */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoField
            icon={User}
            label="Full Name"
            value={profile.fullName}
          />
          <EditableField
            icon={User}
            label="Preferred Name"
            value={profile.preferredName || 'Not specified'}
            fieldName="preferredName"
          />
          <EditableField
            icon={Mail}
            label="Email"
            value={profile.email}
            fieldName="email"
          />
          <EditableField
            icon={Phone}
            label="Phone"
            value={profile.phone || 'Not specified'}
            fieldName="phone"
          />
          <InfoField
            icon={Calendar}
            label="Date of Birth"
            value={formatDate(profile.dateOfBirth)}
          />
          <InfoField
            icon={Briefcase}
            label="Employee ID"
            value={profile.badgeNumber}
          />
        </div>
      </div>

      {/* Employment Information */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Employment Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableField
            icon={Briefcase}
            label="Position"
            value={profile.position || 'Not specified'}
            fieldName="position"
          />
          <EditableField
            icon={Building}
            label="Department"
            value={profile.department || 'Not specified'}
            fieldName="department"
          />
          <InfoField
            icon={User}
            label="Manager"
            value={profile.manager || 'Not specified'}
          />
          <InfoField
            icon={Calendar}
            label="Hire Date"
            value={profile.hireDate ? formatDate(profile.hireDate) : 'Not specified'}
          />
          <InfoField
            icon={Briefcase}
            label="Employment Type"
            value={profile.employmentType || 'Not specified'}
          />
          <InfoField
            icon={MapPin}
            label="Work Location"
            value={profile.workLocation || 'Not specified'}
          />
        </div>
      </div>

      {/* Address */}
      {profile.address && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Address
          </h2>
          <EditableField
            icon={MapPin}
            label="Street Address"
            value={profile.address.street || 'Not specified'}
            fieldName="address"
          />
        </div>
      )}

      {/* Update Notice */}
      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Editing Your Profile:</strong> Hover over any editable field and click the edit icon to update your information. Changes are saved immediately to Bitrix24.
        </p>
      </div>
    </div>
  );
}

function InfoField({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
        <Icon className="w-4 h-4" />
        <label>{label}</label>
      </div>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  );
}

function EditableField({
  icon: Icon,
  label,
  value,
  fieldName,
  editable = true,
}: {
  icon: any;
  label: string;
  value: string;
  fieldName: string;
  editable?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (newValue: string) => {
      return api.updateProfile(fieldName, newValue);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
      setIsEditing(false);
      setIsSaving(false);
    },
    onError: () => {
      setIsSaving(false);
      alert('Failed to update field. Please try again.');
    },
  });

  const handleSave = () => {
    if (editValue !== value) {
      setIsSaving(true);
      updateMutation.mutate(editValue);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
        <Icon className="w-4 h-4" />
        <label>{label}</label>
      </div>
      {!isEditing ? (
        <div className="flex items-center gap-2 group">
          <p className="text-gray-900 font-medium flex-1">{value}</p>
          {editable && (
            <button
              onClick={() => setIsEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
              title="Edit"
            >
              <Edit2 className="w-4 h-4 text-hartzell-blue" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
            autoFocus
            disabled={isSaving}
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            title="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
