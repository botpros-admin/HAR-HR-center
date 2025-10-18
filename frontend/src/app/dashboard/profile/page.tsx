'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  User, Mail, Phone, MapPin, Briefcase, Calendar, Building, Users, Save, PenTool, Trash2, Edit3, Bell
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useState, FormEvent, useRef, useEffect } from 'react';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';
import { AdoptSignatureModal } from '@/components/AdoptSignatureModal';

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

      {/* Email Preferences */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <EmailPreferencesSection />
      </div>

      {/* My Signature */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <SignatureSection profile={profile} />
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

function EmailPreferencesSection() {
  const [preferences, setPreferences] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load email preferences
  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ['email-preferences'],
    queryFn: async () => {
      const data = await api.getEmailPreferences();
      setPreferences(data.preferences);
      return data.preferences;
    },
  });

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      setMessage(null);

      const response = await api.updateEmailPreferences(preferences);

      setMessage({ text: response.message || 'Preferences saved successfully!', type: 'success' });
      setPreferences(response.preferences);

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setMessage({ text: (err as Error).message || 'Failed to save preferences', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (field: string, value: any) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-hartzell-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
        <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Email Notifications</h2>
          <p className="text-sm text-gray-600">Manage how you receive email notifications</p>
        </div>
      </div>

      {/* Save Message */}
      {message && (
        <div className={`text-center p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Master Toggle */}
      <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex-1">
          <h4 className={`text-sm font-medium ${!preferences.emailEnabled ? 'text-gray-400' : 'text-gray-900'}`}>
            Email Notifications
          </h4>
          <p className={`text-sm mt-1 ${!preferences.emailEnabled ? 'text-gray-400' : 'text-gray-600'}`}>
            Enable or disable all email notifications
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-4">
          <input
            type="checkbox"
            checked={preferences.emailEnabled}
            onChange={(e) => updatePreference('emailEnabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-hartzell-blue"></div>
        </label>
      </div>

      {/* Notification Types */}
      <div className="space-y-3">
        <NotificationToggle
          label="Document Assignments"
          description="Receive email when new documents are assigned to you"
          checked={preferences.notifyAssignments}
          onChange={(checked) => updatePreference('notifyAssignments', checked)}
          disabled={!preferences.emailEnabled}
        />
        <NotificationToggle
          label="Assignment Reminders"
          description="Receive reminders before documents are due"
          checked={preferences.notifyReminders}
          onChange={(checked) => updatePreference('notifyReminders', checked)}
          disabled={!preferences.emailEnabled}
        />
        <NotificationToggle
          label="Overdue Notifications"
          description="Receive notifications about overdue documents"
          checked={preferences.notifyOverdue}
          onChange={(checked) => updatePreference('notifyOverdue', checked)}
          disabled={!preferences.emailEnabled}
        />
        <NotificationToggle
          label="Signature Confirmations"
          description="Receive confirmation when you sign documents"
          checked={preferences.notifyConfirmations}
          onChange={(checked) => updatePreference('notifyConfirmations', checked)}
          disabled={!preferences.emailEnabled}
        />
      </div>

      {/* Alternative Email */}
      {preferences.emailEnabled && (
        <div>
          <label className="form-label">Alternative Email Address (Optional)</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={preferences.alternativeEmail || ''}
              onChange={(e) => updatePreference('alternativeEmail', e.target.value || null)}
              placeholder="Use a different email for notifications"
              className="input pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            If set, notifications will be sent to this email instead of your primary email
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <h4 className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
          {label}
        </h4>
        <p className={`text-sm mt-1 ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
          {description}
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer ml-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-hartzell-blue peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
      </label>
    </div>
  );
}

function SignatureSection({ profile }: { profile: any }) {
  const queryClient = useQueryClient();
  const [currentSignature, setCurrentSignature] = useState<string | null>(null);
  const [currentInitials, setCurrentInitials] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showInitialsModal, setShowInitialsModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load current signature
  const { data: signatureData, refetch: refetchSignature } = useQuery({
    queryKey: ['employee-signature'],
    queryFn: async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employee/profile/signature`, {
          credentials: 'include',
        });
        // 404 is expected when signature not set yet - don't log errors
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setCurrentSignature(url);
          return url;
        }
        return null;
      } catch (error) {
        // Silently handle errors - signature not set is normal
        return null;
      }
    },
    retry: false, // Don't retry 404s
  });

  // Load current initials
  const { data: initialsData, refetch: refetchInitials } = useQuery({
    queryKey: ['employee-initials'],
    queryFn: async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employee/profile/initials`, {
          credentials: 'include',
        });
        // 404 is expected when initials not set yet - don't log errors
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setCurrentInitials(url);
          return url;
        }
        return null;
      } catch (error) {
        // Silently handle errors - initials not set is normal
        return null;
      }
    },
    retry: false, // Don't retry 404s
  });

  const handleSaveSignature = async (dataUrl: string) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();

      await api.uploadSignature(blob);

      setSaveMessage({ text: 'Signature saved successfully!', type: 'success' });
      setTimeout(() => setSaveMessage(null), 3000);
      refetchSignature();
    } catch (error) {
      setSaveMessage({ text: 'Failed to save signature', type: 'error' });
      setTimeout(() => setSaveMessage(null), 3000);
      throw error;
    }
  };

  const handleSaveInitials = async (dataUrl: string) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();

      await api.uploadInitials(blob);

      setSaveMessage({ text: 'Initials saved successfully!', type: 'success' });
      setTimeout(() => setSaveMessage(null), 3000);
      refetchInitials();
    } catch (error) {
      setSaveMessage({ text: 'Failed to save initials', type: 'error' });
      setTimeout(() => setSaveMessage(null), 3000);
      throw error;
    }
  };

  const handleDeleteSignature = async () => {
    if (!confirm('Are you sure you want to delete your signature?')) return;

    try {
      await api.deleteSignature();

      setSaveMessage({ text: 'Signature deleted successfully', type: 'success' });
      setTimeout(() => setSaveMessage(null), 3000);
      setCurrentSignature(null);
      refetchSignature();
    } catch (error) {
      setSaveMessage({ text: 'Failed to delete signature', type: 'error' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleDeleteInitials = async () => {
    if (!confirm('Are you sure you want to delete your initials?')) return;

    try {
      await api.deleteInitials();

      setSaveMessage({ text: 'Initials deleted successfully', type: 'success' });
      setTimeout(() => setSaveMessage(null), 3000);
      setCurrentInitials(null);
      refetchInitials();
    } catch (error) {
      setSaveMessage({ text: 'Failed to delete initials', type: 'error' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
          <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
            <PenTool className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Electronic Signature</h2>
            <p className="text-sm text-gray-600">Used when signing documents in the portal</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Set your signature and initials once, and they'll be automatically used when signing documents. You can draw with a pen/mouse or type your name in cursive script.
          </p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`text-center p-3 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {saveMessage.text}
          </div>
        )}

        {/* Signature and Initials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Signature */}
          <div className="space-y-3">
            <label className="form-label flex items-center gap-2">
              <PenTool className="w-4 h-4" />
              Full Signature
            </label>
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50 min-h-[160px] flex items-center justify-center">
              {currentSignature ? (
                <img src={currentSignature} alt="Current signature" className="max-h-32 max-w-full object-contain" />
              ) : (
                <div className="text-center text-gray-400">
                  <PenTool className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No signature set</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSignatureModal(true)}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                {currentSignature ? 'Edit' : 'Set Signature'}
              </button>
              {currentSignature && (
                <button
                  type="button"
                  onClick={handleDeleteSignature}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Initials */}
          <div className="space-y-3">
            <label className="form-label flex items-center gap-2">
              <PenTool className="w-4 h-4" />
              Initials
            </label>
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50 min-h-[160px] flex items-center justify-center">
              {currentInitials ? (
                <img src={currentInitials} alt="Current initials" className="max-h-32 max-w-full object-contain" />
              ) : (
                <div className="text-center text-gray-400">
                  <PenTool className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No initials set</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowInitialsModal(true)}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                {currentInitials ? 'Edit' : 'Set Initials'}
              </button>
              {currentInitials && (
                <button
                  type="button"
                  onClick={handleDeleteInitials}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Adopt Signature Modal */}
      <AdoptSignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        type="signature"
        onSave={handleSaveSignature}
        defaultName={`${profile.firstName || ''} ${profile.lastName || ''}`.trim()}
      />

      {/* Adopt Initials Modal */}
      <AdoptSignatureModal
        isOpen={showInitialsModal}
        onClose={() => setShowInitialsModal(false)}
        type="initials"
        onSave={handleSaveInitials}
        defaultName={`${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()}
      />
    </>
  );
}
