'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Building } from 'lucide-react';
import { formatDate } from '@/lib/utils';

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
          <InfoField
            icon={User}
            label="Preferred Name"
            value={profile.preferredName || 'Not specified'}
          />
          <InfoField
            icon={Mail}
            label="Email"
            value={profile.email}
          />
          <InfoField
            icon={Phone}
            label="Phone"
            value={profile.phone || 'Not specified'}
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
          <InfoField
            icon={Briefcase}
            label="Position"
            value={profile.position || 'Not specified'}
          />
          <InfoField
            icon={Building}
            label="Department"
            value={profile.department || 'Not specified'}
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
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-hartzell-blue mt-1" />
            <div className="text-gray-900">
              {profile.address.street && <p>{profile.address.street}</p>}
              {(profile.address.city || profile.address.state || profile.address.zip) && (
                <p>
                  {profile.address.city}, {profile.address.state} {profile.address.zip}
                </p>
              )}
              {!profile.address.street && !profile.address.city && (
                <p className="text-gray-500">Not specified</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Notice */}
      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Need to update your information?</strong> Please contact HR at{' '}
          <a
            href="mailto:hr@hartzell.work"
            className="text-hartzell-blue hover:underline"
          >
            hr@hartzell.work
          </a>{' '}
          or reach out to your manager.
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
