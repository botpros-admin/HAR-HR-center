'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  User, Mail, Phone, MapPin, Briefcase, Calendar, Building, Users, Save
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useState, FormEvent } from 'react';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [addressFields, setAddressFields] = useState({
    street: '',
    city: '',
    state: '',
    zip: ''
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', 'v6-redesign'],
    queryFn: async () => {
      const data = await api.getProfile();
      if (data.address?.street && typeof data.address.street === 'string') {
        data.address.street = data.address.street.split('|;|')[0].trim();
      }
      // Initialize address fields
      setAddressFields({
        street: data.address?.street || '',
        city: data.address?.city || '',
        state: data.address?.state || '',
        zip: data.address?.zip || ''
      });
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Google Places Autocomplete for address
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const addressInputRef = useGooglePlaces({
    apiKey: googleMapsApiKey,
    onPlaceSelected: (place) => {
      setAddressFields({
        street: place.street,
        city: place.city,
        state: place.state,
        zip: place.zipCode
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const updates: any = {};
      formData.forEach((value, key) => {
        updates[key] = value;
      });
      return api.updateProfile('bulk', updates);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'v6-redesign'], data);
      setIsSaving(false);
      setSaveNotification('Profile updated successfully');
      setTimeout(() => setSaveNotification(null), 3000);
    },
    onError: () => {
      setIsSaving(false);
      setSaveNotification('Failed to update - please try again');
      setTimeout(() => setSaveNotification(null), 3000);
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate(formData);
  };

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Save Notification Toast */}
      {saveNotification && (
        <div className={`fixed top-4 right-4 z-50 ${saveNotification.includes('success') ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in`}>
          <Save className="w-5 h-5" />
          {saveNotification}
        </div>
      )}

      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <PersonalInfoSection
          profile={profile}
          addressInputRef={addressInputRef}
          addressFields={addressFields}
          setAddressFields={setAddressFields}
        />
      </div>

      {/* Employment Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <EmploymentSection profile={profile} />
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function PersonalInfoSection({
  profile,
  addressInputRef,
  addressFields,
  setAddressFields
}: {
  profile: any;
  addressInputRef: any;
  addressFields: { street: string; city: string; state: string; zip: string };
  setAddressFields: (fields: { street: string; city: string; state: string; zip: string }) => void;
}) {
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddressFields({ ...addressFields, [name]: value });
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
        <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">First Name</label>
          <input
            type="text"
            name="firstName"
            defaultValue={profile.firstName}
            className="input bg-gray-50"
            disabled
          />
        </div>
        <div>
          <label className="form-label">Last Name</label>
          <input
            type="text"
            name="lastName"
            defaultValue={profile.lastName}
            className="input bg-gray-50"
            disabled
          />
        </div>
      </div>

      {/* Date of Birth */}
      <div>
        <label className="form-label">Date of Birth</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={formatDate(profile.dateOfBirth)}
            className="input pl-10 bg-gray-50"
            disabled
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="form-label">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="email"
            name="email"
            defaultValue={profile.email}
            className="input pl-10"
            placeholder="your.email@example.com"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="form-label">Phone Number</label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="tel"
            name="phone"
            defaultValue={profile.phone || ''}
            className="input pl-10"
            placeholder="954-123-4567"
          />
        </div>
      </div>

      {/* Address Line 1 */}
      <div>
        <label className="form-label">Address Line 1</label>
        <input
          ref={addressInputRef}
          type="text"
          name="street"
          value={addressFields.street}
          onChange={handleAddressChange}
          className="input"
          placeholder="Start typing your address..."
          autoComplete="off"
        />
        <p className="text-xs text-gray-500 mt-1">
          💡 Start typing and select from the dropdown to auto-fill city, state, and ZIP
        </p>
      </div>

      {/* Address Line 2 */}
      <div>
        <label className="form-label">Address Line 2</label>
        <input
          type="text"
          name="addressLine2"
          defaultValue={profile.address?.line2 || ''}
          className="input"
          placeholder="Apartment, suite, etc."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="form-label">City</label>
          <input
            type="text"
            name="city"
            value={addressFields.city}
            onChange={handleAddressChange}
            className="input"
            placeholder="Pompano Beach"
          />
        </div>
        <div>
          <label className="form-label">State</label>
          <input
            type="text"
            name="state"
            value={addressFields.state}
            onChange={handleAddressChange}
            className="input"
            placeholder="FL"
            maxLength={2}
          />
        </div>
        <div>
          <label className="form-label">ZIP Code</label>
          <input
            type="text"
            name="zip"
            value={addressFields.zip}
            onChange={handleAddressChange}
            className="input"
            placeholder="33060"
          />
        </div>
      </div>
    </div>
  );
}

function EmploymentSection({ profile }: { profile: any }) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
        <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
          <Briefcase className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Employment Details</h2>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Employment information is managed by HR and cannot be edited from the Employee Portal.
        </p>
      </div>

      {/* Employment Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Position</label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={profile.position || 'Not specified'}
              className="input pl-10 bg-gray-50"
              disabled
            />
          </div>
        </div>
        <div>
          <label className="form-label">Department</label>
          <div className="relative">
            <Building className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={profile.department || 'Not specified'}
              className="input pl-10 bg-gray-50"
              disabled
            />
          </div>
        </div>
        <div>
          <label className="form-label">Manager</label>
          <div className="relative">
            <Users className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={profile.manager || 'Not assigned'}
              className="input pl-10 bg-gray-50"
              disabled
            />
          </div>
        </div>
        <div>
          <label className="form-label">Hire Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={formatDate(profile.hireDate)}
              className="input pl-10 bg-gray-50"
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  );
}
