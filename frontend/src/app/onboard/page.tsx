'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

interface OnboardingFormData {
  // Personal Information
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  ssn: string;
  gender: string;
  maritalStatus: string;
  citizenship: string;

  // Contact Information
  phone: string;
  email: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;

  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;

  // Direct Deposit (array of banks)
  directDeposit: DirectDepositAccount[];

  // W-4 Tax Information
  taxFilingStatus: string;
  w4Allowances: number;
  w4AdditionalWithholding: number;
  w4Exempt: boolean;

  // Benefits
  healthInsurance: string;
  dentalInsurance: string;
  visionInsurance: string;
  retirement401k: string;
  retirement401kPercent: number;

  // Driver Information
  driversLicenseNumber: string;
  driversLicenseState: string;
  driversLicenseExpiration: string;
  autoInsuranceProvider: string;
  autoInsurancePolicyNumber: string;

  // Employee Handbook
  handbookAcknowledged: boolean;
}

interface DirectDepositAccount {
  accountType: 'checking' | 'savings';
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountHolderName: string;
  splitType: 'percentage' | 'amount' | 'remainder';
  splitValue?: number;
}

function OnboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [showSSN, setShowSSN] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState<OnboardingFormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    ssn: '',
    gender: '',
    maritalStatus: '',
    citizenship: 'US Citizen',
    phone: '',
    email: '',
    address: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    directDeposit: [{
      accountType: 'checking',
      bankName: '',
      routingNumber: '',
      accountNumber: '',
      accountHolderName: '',
      splitType: 'remainder',
    }],
    taxFilingStatus: 'single',
    w4Allowances: 0,
    w4AdditionalWithholding: 0,
    w4Exempt: false,
    healthInsurance: 'none',
    dentalInsurance: 'none',
    visionInsurance: 'none',
    retirement401k: 'no',
    retirement401kPercent: 0,
    driversLicenseNumber: '',
    driversLicenseState: '',
    driversLicenseExpiration: '',
    autoInsuranceProvider: '',
    autoInsurancePolicyNumber: '',
    handbookAcknowledged: false,
  });

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid onboarding link. Please check your email for the correct link.');
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`https://hartzell.work/api/onboard/validate-token?token=${token}`);
      const data = await response.json();

      if (data.success) {
        setTokenValid(true);
        setEmployeeData(data.employee);

        // Pre-fill form with existing data
        setFormData(prev => ({
          ...prev,
          firstName: data.employee.firstName || '',
          middleName: data.employee.middleName || '',
          lastName: data.employee.lastName || '',
          phone: data.employee.phone || '',
          email: data.employee.email || '',
          address: data.employee.address || '',
          city: data.employee.city || '',
          state: data.employee.state || '',
          zipCode: data.employee.zipCode || '',
          dateOfBirth: data.employee.dateOfBirth || '',
        }));
      } else {
        setError(data.error || 'Invalid or expired token');
      }
    } catch (err) {
      setError('Failed to validate token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Validate direct deposit splits
      const totalPercentage = formData.directDeposit
        .filter(acc => acc.splitType === 'percentage')
        .reduce((sum, acc) => sum + (acc.splitValue || 0), 0);

      const hasRemainder = formData.directDeposit.some(acc => acc.splitType === 'remainder');

      if (!hasRemainder && totalPercentage !== 100) {
        setError('Direct deposit percentages must add up to 100% or have one account set to "Remainder"');
        setSubmitting(false);
        return;
      }

      if (hasRemainder && totalPercentage >= 100) {
        setError('Cannot use "Remainder" when percentages already add up to 100%');
        setSubmitting(false);
        return;
      }

      const response = await fetch('https://hartzell.work/api/onboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          data: formData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        // Redirect to success page after 2 seconds
        setTimeout(() => {
          router.push('/onboard/success');
        }, 2000);
      } else {
        setError(result.error || 'Failed to submit onboarding data');
      }
    } catch (err) {
      setError('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const addDirectDepositAccount = () => {
    setFormData(prev => ({
      ...prev,
      directDeposit: [
        ...prev.directDeposit,
        {
          accountType: 'checking',
          bankName: '',
          routingNumber: '',
          accountNumber: '',
          accountHolderName: '',
          splitType: 'percentage',
          splitValue: 0,
        },
      ],
    }));
  };

  const removeDirectDepositAccount = (index: number) => {
    setFormData(prev => ({
      ...prev,
      directDeposit: prev.directDeposit.filter((_, i) => i !== index),
    }));
  };

  const updateDirectDepositAccount = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      directDeposit: prev.directDeposit.map((acc, i) =>
        i === index ? { ...acc, [field]: value } : acc
      ),
    }));
  };

  const formatSSN = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
  };

  const maskSSN = (ssn: string) => {
    if (!ssn) return '';
    const digits = ssn.replace(/\D/g, '');
    if (digits.length < 4) return ssn;
    return `***-**-${digits.slice(-4)}`;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hartzell-navy via-hartzell-navy/90 to-hartzell-blue flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Validating your onboarding link...</p>
        </div>
      </div>
    );
  }

  if (error && !tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hartzell-navy via-hartzell-navy/90 to-hartzell-blue flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4 text-red-600">
            <AlertCircle className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Invalid Link</h2>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Need help?</strong> Contact HR at{' '}
              <a href="mailto:hr@hartzell.work" className="underline">
                hr@hartzell.work
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">All Set!</h2>
          <p className="text-gray-700 mb-6">
            Your onboarding information has been submitted successfully. You'll receive an email with your next steps.
          </p>
          <p className="text-sm text-gray-600">
            Redirecting to next steps...
          </p>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 1, name: 'Personal Info' },
    { id: 2, name: 'Contact & Emergency' },
    { id: 3, name: 'Direct Deposit' },
    { id: 4, name: 'Tax & Benefits' },
    { id: 5, name: 'Driver Info & Handbook' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-hartzell-navy via-hartzell-navy/90 to-hartzell-blue py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="https://hartzellpainting.com/wp-content/uploads/2025/05/Heartzell-Logo.png"
            alt="Hartzell Logo"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-white mb-2">
            Complete Your Onboarding
          </h1>
          <p className="text-white/80">
            Welcome {employeeData?.name}! Please fill out the information below.
          </p>
          <p className="text-white/60 text-sm mt-2">
            🔒 All information is securely encrypted and transmitted over HTTPS
          </p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= step.id
                        ? 'bg-hartzell-blue text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStep > step.id ? '✓' : step.id}
                  </div>
                  <span className="text-xs mt-2 text-center hidden sm:block">
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      currentStep > step.id ? 'bg-hartzell-blue' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Social Security Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={11}
                      placeholder="XXX-XX-XXXX"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent pr-10"
                      value={showSSN ? formatSSN(formData.ssn) : maskSSN(formData.ssn)}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setFormData({ ...formData, ssn: digits });
                      }}
                      onFocus={() => setShowSSN(true)}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowSSN(!showSSN)}
                    >
                      {showSSN ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marital Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.maritalStatus}
                    onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Citizenship <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.citizenship}
                    onChange={(e) => setFormData({ ...formData, citizenship: e.target.value })}
                  >
                    <option value="US Citizen">US Citizen</option>
                    <option value="Permanent Resident">Permanent Resident</option>
                    <option value="Work Visa">Work Visa</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-hartzell-blue text-white rounded-lg font-semibold hover:bg-hartzell-blue/90 transition text-sm sm:text-base"
                >
                  Next: Contact Info →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Contact & Emergency */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Contact & Emergency Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent bg-gray-50"
                    value={formData.email}
                    disabled
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apt / Unit / Suite
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    placeholder="CA"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent uppercase"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Emergency Contact
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={12}
                      placeholder="123-456-7890"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                      value={formatPhone(formData.emergencyContactPhone)}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, emergencyContactPhone: digits });
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                      value={formData.emergencyContactRelationship}
                      onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Child">Child</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm sm:text-base"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-hartzell-blue text-white rounded-lg font-semibold hover:bg-hartzell-blue/90 transition text-sm sm:text-base"
                >
                  Next: Direct Deposit →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Direct Deposit */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Direct Deposit Information
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                Add one or more bank accounts for direct deposit. You can split your paycheck by percentage, fixed amount, or remainder.
              </p>

              {formData.directDeposit.map((account, index) => (
                <div key={index} className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900">Account {index + 1}</h3>
                    {formData.directDeposit.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          directDeposit: formData.directDeposit.filter((_, i) => i !== index)
                        })}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                        value={account.accountType}
                        onChange={(e) => updateDirectDepositAccount(index, 'accountType', e.target.value)}
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                        value={account.bankName}
                        onChange={(e) => updateDirectDepositAccount(index, 'bankName', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Routing Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={9}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                        value={account.routingNumber}
                        onChange={(e) => updateDirectDepositAccount(index, 'routingNumber', e.target.value.replace(/\D/g, '').slice(0, 9))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                        value={account.accountNumber}
                        onChange={(e) => updateDirectDepositAccount(index, 'accountNumber', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Holder Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                        value={account.accountHolderName}
                        onChange={(e) => updateDirectDepositAccount(index, 'accountHolderName', e.target.value)}
                      />
                    </div>

                    {formData.directDeposit.length > 1 && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Split Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                            value={account.splitType}
                            onChange={(e) => updateDirectDepositAccount(index, 'splitType', e.target.value)}
                          >
                            <option value="percentage">Percentage</option>
                            <option value="amount">Fixed Amount</option>
                            <option value="remainder">Remainder</option>
                          </select>
                        </div>

                        {account.splitType !== 'remainder' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {account.splitType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'} <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              max={account.splitType === 'percentage' ? '100' : undefined}
                              step={account.splitType === 'percentage' ? '1' : '0.01'}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                              value={account.splitValue || ''}
                              onChange={(e) => updateDirectDepositAccount(index, 'splitValue', parseFloat(e.target.value))}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  directDeposit: [...formData.directDeposit, {
                    accountType: 'checking',
                    bankName: '',
                    routingNumber: '',
                    accountNumber: '',
                    accountHolderName: '',
                    splitType: 'remainder',
                  }]
                })}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-hartzell-blue hover:text-hartzell-blue transition font-medium"
              >
                + Add Another Account
              </button>

              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm sm:text-base"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-hartzell-blue text-white rounded-lg font-semibold hover:bg-hartzell-blue/90 transition text-sm sm:text-base"
                >
                  Next: Benefits →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Employee Benefits */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Employee Benefits
              </h2>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-900 mb-2">Benefits Enrollment</h3>
                <p className="text-sm text-green-800">
                  Select which benefits you would like to enroll in.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Health Insurance
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.healthInsurance}
                    onChange={(e) => setFormData({ ...formData, healthInsurance: e.target.value })}
                  >
                    <option value="">Decline</option>
                    <option value="Individual">Individual</option>
                    <option value="Family">Family</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dental Insurance
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.dentalInsurance}
                    onChange={(e) => setFormData({ ...formData, dentalInsurance: e.target.value })}
                  >
                    <option value="">Decline</option>
                    <option value="Individual">Individual</option>
                    <option value="Family">Family</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vision Insurance
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.visionInsurance}
                    onChange={(e) => setFormData({ ...formData, visionInsurance: e.target.value })}
                  >
                    <option value="">Decline</option>
                    <option value="Individual">Individual</option>
                    <option value="Family">Family</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    401(k) Retirement Plan
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.retirement401k}
                    onChange={(e) => setFormData({ ...formData, retirement401k: e.target.value })}
                  >
                    <option value="">Decline</option>
                    <option value="Yes">Enroll</option>
                  </select>
                </div>

                {formData.retirement401k === 'Yes' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contribution Percentage (%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                      value={formData.retirement401kPercent}
                      onChange={(e) => setFormData({ ...formData, retirement401kPercent: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm sm:text-base"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-hartzell-blue text-white rounded-lg font-semibold hover:bg-hartzell-blue/90 transition text-sm sm:text-base"
                >
                  Next: Driver Info →
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Driver Info */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Driver Information
              </h2>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-900 mb-2">Driver Information (if applicable)</h3>
                <p className="text-sm text-yellow-800">
                  Complete this section if your position requires driving.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver's License Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.driversLicenseNumber}
                    onChange={(e) => setFormData({ ...formData, driversLicenseNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License State
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="FL"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent uppercase"
                    value={formData.driversLicenseState}
                    onChange={(e) => setFormData({ ...formData, driversLicenseState: e.target.value.toUpperCase() })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Expiration
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.driversLicenseExpiration}
                    onChange={(e) => setFormData({ ...formData, driversLicenseExpiration: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto Insurance Provider
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.autoInsuranceProvider}
                    onChange={(e) => setFormData({ ...formData, autoInsuranceProvider: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Policy Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                    value={formData.autoInsurancePolicyNumber}
                    onChange={(e) => setFormData({ ...formData, autoInsurancePolicyNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm sm:text-base"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 sm:px-8 py-2 sm:py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Submit
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-hartzell-navy via-hartzell-navy/90 to-hartzell-blue flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    }>
      <OnboardContent />
    </Suspense>
  );
}
