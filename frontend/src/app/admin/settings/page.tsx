'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2, Save, Mail, Bell, Settings as SettingsIcon, AlertCircle,
  CheckCircle2, XCircle, Users, Shield, UserPlus, Trash2, X, Search
} from 'lucide-react';

// ============ TYPES ============

interface EmailSettings {
  emailEnabled: boolean;
  notifyAssignments: boolean;
  notifyReminders: boolean;
  notifyOverdue: boolean;
  notifyConfirmations: boolean;
  notifyProfileUpdates: boolean;
  reminderDaysBefore: number;
  testMode: boolean;
  testEmail: string | null;
  updatedAt?: string;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  bounced: number;
  successRate: string;
}

interface Admin {
  id: number;
  bitrixId: number;
  employeeName: string;
  employeeEmail: string;
  badgeNumber?: string;
  position?: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  promotedBy?: number;
  promotedAt: string;
  notes?: string;
}

interface Employee {
  id: number;
  name: string;
  badgeNumber: string;
  position?: string;
  email?: string;
}

// ============ MAIN COMPONENT ============

export default function AdminSettings() {
  // Email settings state (existing)
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testEmailSuccess, setTestEmailSuccess] = useState<string | null>(null);
  const [testEmailError, setTestEmailError] = useState<string | null>(null);

  // Admin management state (new)
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [currentUserBitrixId, setCurrentUserBitrixId] = useState<number | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Modal states
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [removeAdminId, setRemoveAdminId] = useState<number | null>(null);

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ============ DATA FETCHING ============

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch current user session
        const sessionResponse = await api.getSession();
        if (sessionResponse.valid && sessionResponse.session) {
          setCurrentUserBitrixId(sessionResponse.session.bitrixId);
        }

        // Fetch admins
        setAdminsLoading(true);
        const adminsResponse = await api.getAdmins();
        setAdmins(adminsResponse.admins);

        // Check if current user is super admin
        const currentAdmin = adminsResponse.admins.find(
          admin => admin.bitrixId === sessionResponse.session?.bitrixId
        );
        setIsSuperAdmin(currentAdmin?.isSuperAdmin || false);

        setAdminsLoading(false);

        // Fetch email settings (existing)
        setEmailLoading(true);
        const [settingsResponse, logsResponse] = await Promise.all([
          api.getEmailSettings(),
          api.getEmailLogs({ limit: 50 })
        ]);
        setEmailSettings(settingsResponse.settings);
        setEmailStats(logsResponse.stats);
        setEmailLoading(false);
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError((err as Error).message || 'Failed to load settings');
        setAdminsLoading(false);
        setEmailLoading(false);
      }
    }

    fetchData();
  }, []);

  // ============ ADMIN MANAGEMENT HANDLERS ============

  const handleRemoveAdmin = async (bitrixId: number) => {
    try {
      setError(null);
      setSuccessMessage(null);

      const adminToRemove = admins.find(a => a.bitrixId === bitrixId);
      const response = await api.removeAdmin(bitrixId);

      setSuccessMessage(`${adminToRemove?.employeeName} removed as admin`);

      // Refresh admin list
      const adminsResponse = await api.getAdmins();
      setAdmins(adminsResponse.admins);

      setRemoveAdminId(null);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error removing admin:', err);
      setError((err as Error).message || 'Failed to remove admin');
    }
  };

  const handleAdminAdded = () => {
    setShowAddAdminModal(false);

    // Refresh admin list
    api.getAdmins().then(response => {
      setAdmins(response.admins);
    });
  };

  // ============ EMAIL SETTINGS HANDLERS (existing) ============

  const handleSaveEmailSettings = async () => {
    if (!emailSettings) return;

    try {
      setEmailSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await api.updateEmailSettings(emailSettings);
      setSuccessMessage(response.message || 'Settings saved successfully!');
      setEmailSettings(response.settings);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError((err as Error).message || 'Failed to save settings');
    } finally {
      setEmailSaving(false);
    }
  };

  const updateEmailSetting = (field: keyof EmailSettings, value: any) => {
    if (!emailSettings) return;
    setEmailSettings({ ...emailSettings, [field]: value });
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      setTestEmailError('Please enter an email address to send the test email to');
      return;
    }

    try {
      setSendingTestEmail(true);
      setTestEmailError(null);
      setTestEmailSuccess(null);

      const response = await api.sendTestEmail(testEmailAddress);
      setTestEmailSuccess(response.message || `Test email sent successfully to ${testEmailAddress}!`);
      setTestEmailAddress('');

      // Clear success message after 5 seconds
      setTimeout(() => setTestEmailSuccess(null), 5000);
    } catch (err) {
      console.error('Error sending test email:', err);
      setTestEmailError((err as Error).message || 'Failed to send test email');
    } finally {
      setSendingTestEmail(false);
    }
  };

  // ============ RENDER ============

  if (adminsLoading || emailLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-hartzell-blue animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Settings
        </h1>
        <p className="text-gray-600">
          Manage HR administrators and system settings
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-green-900">Success</h3>
            <p className="text-sm text-green-700 mt-1">{successMessage}</p>
          </div>
        </div>
      )}

      {/* ============ ADMIN MANAGEMENT SECTION (NEW) ============ */}
      <div className="mb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Section Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-hartzell-blue mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  HR Administrators
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage who has access to the admin portal
                </p>
              </div>
            </div>

            {isSuperAdmin ? (
              <button
                onClick={() => setShowAddAdminModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-hartzell-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add Admin
              </button>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">Super Admin Only</span>
              </div>
            )}
          </div>

          {/* Admin List */}
          <div className="space-y-3">
            {admins.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No administrators found
              </div>
            ) : (
              admins.map(admin => (
                <AdminCard
                  key={admin.bitrixId}
                  admin={admin}
                  isCurrentUser={admin.bitrixId === currentUserBitrixId}
                  canRemove={isSuperAdmin && !admin.isSuperAdmin && admin.bitrixId !== currentUserBitrixId}
                  onRemove={() => setRemoveAdminId(admin.bitrixId)}
                />
              ))
            )}
          </div>

        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-12" />

      {/* ============ EMAIL SETTINGS SECTION (EXISTING) ============ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Email Settings
        </h2>
        <p className="text-gray-600">
          Configure email notifications for the HR Center
        </p>
      </div>

      {/* Email Stats */}
      {emailStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Emails"
            value={emailStats.total}
            subtitle="Last 7 days"
            icon={Mail}
            color="blue"
          />
          <StatCard
            title="Sent Successfully"
            value={emailStats.sent}
            subtitle={`${emailStats.successRate}% success rate`}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            title="Failed"
            value={emailStats.failed}
            subtitle="Delivery failures"
            icon={XCircle}
            color="red"
          />
          <StatCard
            title="Bounced"
            value={emailStats.bounced}
            subtitle="Invalid addresses"
            icon={AlertCircle}
            color="yellow"
          />
        </div>
      )}

      {/* Email Settings Form */}
      {emailSettings && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Master Toggle */}
          <div className="pb-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-hartzell-blue mt-1" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Email Notifications
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Enable or disable all email notifications system-wide
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailSettings.emailEnabled}
                  onChange={(e) => updateEmailSetting('emailEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-hartzell-blue"></div>
              </label>
            </div>
          </div>

          {/* Notification Types */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-hartzell-blue" />
              <h3 className="text-base font-semibold text-gray-900">
                Notification Types
              </h3>
            </div>
            <div className="space-y-3">
              <NotificationToggle
                label="Document Assignments"
                description="Send email when documents are assigned to employees"
                checked={emailSettings.notifyAssignments}
                onChange={(checked) => updateEmailSetting('notifyAssignments', checked)}
                disabled={!emailSettings.emailEnabled}
              />
              <NotificationToggle
                label="Assignment Reminders"
                description="Send reminder emails before due dates"
                checked={emailSettings.notifyReminders}
                onChange={(checked) => updateEmailSetting('notifyReminders', checked)}
                disabled={!emailSettings.emailEnabled}
              />
              <NotificationToggle
                label="Overdue Notifications"
                description="Notify employees about overdue documents"
                checked={emailSettings.notifyOverdue}
                onChange={(checked) => updateEmailSetting('notifyOverdue', checked)}
                disabled={!emailSettings.emailEnabled}
              />
              <NotificationToggle
                label="Signature Confirmations"
                description="Send confirmation when documents are signed"
                checked={emailSettings.notifyConfirmations}
                onChange={(checked) => updateEmailSetting('notifyConfirmations', checked)}
                disabled={!emailSettings.emailEnabled}
              />
              <NotificationToggle
                label="Profile Updates"
                description="Notify employees when their profile is updated"
                checked={emailSettings.notifyProfileUpdates}
                onChange={(checked) => updateEmailSetting('notifyProfileUpdates', checked)}
                disabled={!emailSettings.emailEnabled}
              />
            </div>
          </div>

          {/* Configuration */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="w-5 h-5 text-hartzell-blue" />
              <h3 className="text-base font-semibold text-gray-900">
                Configuration
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminder Days Before Due Date
                </label>
                <select
                  value={emailSettings.reminderDaysBefore}
                  onChange={(e) => updateEmailSetting('reminderDaysBefore', parseInt(e.target.value))}
                  disabled={!emailSettings.emailEnabled || !emailSettings.notifyReminders}
                  className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-hartzell-blue focus:ring-hartzell-blue disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="1">1 day before</option>
                  <option value="2">2 days before</option>
                  <option value="3">3 days before</option>
                  <option value="5">5 days before</option>
                  <option value="7">7 days before</option>
                  <option value="14">14 days before</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How many days before the due date to send reminder emails
                </p>
              </div>
            </div>
          </div>

          {/* Test Email Section */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-hartzell-blue" />
              <h3 className="text-base font-semibold text-gray-900">
                Test Email Delivery
              </h3>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-800 mb-3">
                  Send a test email to verify your email configuration is working correctly.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="your.email@example.com"
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={handleSendTestEmail}
                    disabled={sendingTestEmail || !testEmailAddress}
                    className="flex items-center gap-2 px-4 py-2 bg-hartzell-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingTestEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Test
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Email Success Message */}
            {testEmailSuccess && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-green-900">Success</h3>
                  <p className="text-sm text-green-700 mt-1">{testEmailSuccess}</p>
                </div>
              </div>
            )}

            {/* Test Email Error Message */}
            {testEmailError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{testEmailError}</p>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleSaveEmailSettings}
              disabled={emailSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-hartzell-blue text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hartzell-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {emailSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>

          {/* Last Updated */}
          {emailSettings.updatedAt && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Last updated: {new Date(emailSettings.updatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============ MODALS ============ */}

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <AddAdminModal
          isOpen={showAddAdminModal}
          onClose={() => setShowAddAdminModal(false)}
          onSuccess={handleAdminAdded}
          existingAdmins={admins}
          onError={setError}
          onSuccessMessage={setSuccessMessage}
        />
      )}

      {/* Remove Admin Confirmation */}
      {removeAdminId !== null && (
        <RemoveAdminDialog
          admin={admins.find(a => a.bitrixId === removeAdminId)!}
          onConfirm={() => handleRemoveAdmin(removeAdminId)}
          onCancel={() => setRemoveAdminId(null)}
        />
      )}
    </div>
  );
}

// ============ ADMIN CARD COMPONENT ============

function AdminCard({
  admin,
  isCurrentUser,
  canRemove,
  onRemove,
}: {
  admin: Admin;
  isCurrentUser: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-semibold text-gray-900">
            {admin.employeeName}
          </h4>

          {admin.isSuperAdmin && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
              <Shield className="w-3 h-3" />
              Super Admin
            </span>
          )}

          {isCurrentUser && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
              You
            </span>
          )}
        </div>

        <div className="space-y-1">
          {admin.position && (
            <p className="text-sm text-gray-600">{admin.position}</p>
          )}
          {admin.employeeEmail && (
            <p className="text-sm text-gray-500">{admin.employeeEmail}</p>
          )}
          {admin.badgeNumber && (
            <p className="text-xs text-gray-500">Badge: {admin.badgeNumber}</p>
          )}
        </div>

        <div className="mt-2 text-xs text-gray-500">
          Promoted {new Date(admin.promotedAt).toLocaleDateString()}
          {admin.notes && (
            <span className="ml-2 text-gray-400">• {admin.notes}</span>
          )}
        </div>
      </div>

      {canRemove && (
        <button
          onClick={onRemove}
          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove admin"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ============ ADD ADMIN MODAL ============

function AddAdminModal({
  isOpen,
  onClose,
  onSuccess,
  existingAdmins,
  onError,
  onSuccessMessage,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingAdmins: Admin[];
  onError: (msg: string) => void;
  onSuccessMessage: (msg: string) => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Fetch employees
      api.getEmployees().then(response => {
        // Filter out existing admins
        const adminIds = new Set(existingAdmins.map(a => a.bitrixId));
        const availableEmployees = response.employees
          .filter(emp => !adminIds.has(emp.id))
          .map(emp => ({
            id: emp.id,
            name: emp.name,
            badgeNumber: emp.badgeNumber,
            position: emp.position,
            email: emp.email,
          }));
        setEmployees(availableEmployees);
        setLoading(false);
      }).catch(err => {
        console.error('Error fetching employees:', err);
        onError('Failed to load employees');
        setLoading(false);
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployeeId) {
      onError('Please select an employee');
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.promoteAdmin(selectedEmployeeId, notes || undefined);

      onSuccessMessage(response.message || 'Admin added successfully');
      onSuccess();
    } catch (err) {
      console.error('Error promoting admin:', err);
      onError((err as Error).message || 'Failed to promote admin');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add HR Administrator</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-hartzell-blue animate-spin" />
            </div>
          ) : (
            <>
              {/* Search/Select Employee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee
                </label>

                {/* Search Input */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or badge..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                  />
                </div>

                {/* Employee List */}
                <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No employees found
                    </div>
                  ) : (
                    filteredEmployees.map(emp => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => setSelectedEmployeeId(emp.id)}
                        className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                          selectedEmployeeId === emp.id ? 'bg-blue-50 border-l-4 border-l-hartzell-blue' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">{emp.name}</div>
                        <div className="text-sm text-gray-600">{emp.position || 'No position'}</div>
                        <div className="text-xs text-gray-500">Badge: {emp.badgeNumber}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Coverage for Sarah's leave"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                />
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  This employee will gain full access to the admin portal and can manage all employees, templates, and assignments.
                </p>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedEmployeeId || loading}
            className="flex items-center gap-2 px-4 py-2 bg-hartzell-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Promoting...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Promote to Admin
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ REMOVE ADMIN DIALOG ============

function RemoveAdminDialog({
  admin,
  onConfirm,
  onCancel,
}: {
  admin: Admin;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Remove Administrator?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to remove <strong>{admin.employeeName}</strong> as an HR administrator?
                They will lose access to the admin portal immediately.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Remove Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ SHARED COMPONENTS (existing) ============

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: any;
  color: 'blue' | 'green' | 'red' | 'yellow';
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
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
