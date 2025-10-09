'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { AlertCircle, LogIn, Shield, User as UserIcon } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'ssn'>('credentials');
  const [formData, setFormData] = useState({
    employeeId: '',
    dateOfBirth: '',
    ssnLast4: '',
  });
  const [preAuthSession, setPreAuthSession] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showPortalSelection, setShowPortalSelection] = useState(false);

  const handleCaptchaVerified = useCallback((token: string) => {
    setTurnstileToken(token);
    setError(null);
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (showCaptcha && !turnstileToken) {
      setLoading(false);
      setError('Please complete the CAPTCHA verification');
      return;
    }

    try {
      // Convert MM/DD/YYYY to YYYY-MM-DD for API
      const [month, day, year] = formData.dateOfBirth.split('/');
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      const response = await api.login({
        employeeId: formData.employeeId,
        dateOfBirth: isoDate,
        turnstileToken: showCaptcha ? turnstileToken || undefined : undefined,
      });

      if (response.requiresCaptcha && !showCaptcha) {
        setShowCaptcha(true);
        setFailedAttempts(response.failedAttempts || 0);
        setTurnstileToken(null);
        setError('Please complete the CAPTCHA verification');
        setLoading(false);
        return;
      }

      if (response.requiresSSN) {
        setPreAuthSession(response.preAuthSession!);
        setStep('ssn');
      } else if (response.session) {
        // Session cookie is set by the server via HttpOnly cookie
        // Show portal selection for admin users
        if (response.session.role === 'hr_admin') {
          setShowPortalSelection(true);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      // Check if error contains requiresCaptcha flag
      if (err?.response?.requiresCaptcha) {
        setShowCaptcha(true);
        setTurnstileToken(null);
        setError('Please complete the CAPTCHA verification');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
        setFailedAttempts((prev) => prev + 1);
        if (failedAttempts >= 2) {
          setShowCaptcha(true);
          setTurnstileToken(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSSNSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.verifySSN({
        preAuthSession,
        ssnLast4: formData.ssnLast4,
      });

      if (response.success) {
        // Session cookie is set by the server via HttpOnly cookie
        // Show portal selection for admin users
        if (response.session?.role === 'hr_admin') {
          setShowPortalSelection(true);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-hartzell-navy to-hartzell-blue p-4">
      {/* Portal Selection Modal */}
      {showPortalSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome Back!
              </h2>
              <p className="text-gray-600">
                You have admin access. Which portal would you like to visit?
              </p>
            </div>

            <div className="space-y-3">
              {/* Admin Portal Button */}
              <button
                onClick={() => router.push('/admin')}
                className="w-full flex items-center gap-4 p-4 border-2 border-hartzell-blue bg-hartzell-blue text-white rounded-lg hover:bg-hartzell-navy hover:border-hartzell-navy transition-colors"
              >
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-lg">Admin Portal</div>
                  <div className="text-sm text-blue-100">
                    Manage employees, documents & assignments
                  </div>
                </div>
              </button>

              {/* Employee Portal Button */}
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-300 bg-white text-gray-900 rounded-lg hover:border-hartzell-blue hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-6 h-6 text-hartzell-blue" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-lg">Employee Portal</div>
                  <div className="text-sm text-gray-600">
                    View your documents, tasks & profile
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="https://hartzellpainting.com/wp-content/uploads/2025/05/Heartzell-Logo.png"
              alt="Hartzell Logo"
              className="h-20 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Employee Portal
          </h1>
          <p className="text-blue-100">Employee Self-Service Portal</p>
        </div>

        {/* Login Card */}
        <div className="card">
          {step === 'credentials' ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <LogIn className="w-6 h-6 text-hartzell-blue" />
                <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                {/* Employee ID */}
                <div>
                  <label
                    htmlFor="employeeId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Employee ID
                  </label>
                  <input
                    id="employeeId"
                    type="text"
                    required
                    placeholder="EMP1001"
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label
                    htmlFor="dateOfBirth"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Date of Birth
                  </label>
                  <input
                    id="dateOfBirth"
                    type="text"
                    required
                    placeholder="MM/DD/YYYY"
                    maxLength={10}
                    value={formData.dateOfBirth}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2);
                      }
                      if (value.length >= 5) {
                        value = value.slice(0, 5) + '/' + value.slice(5, 9);
                      }
                      setFormData({ ...formData, dateOfBirth: value });
                    }}
                    className="input-field"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter as MM/DD/YYYY (e.g., 09/20/1984)
                  </p>
                </div>

                {/* CAPTCHA */}
                {showCaptcha && (
                  <div>
                    <TurnstileWidget onVerify={handleCaptchaVerified} />
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || (showCaptcha && !turnstileToken)}
                  className="btn-primary w-full"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  Need help? Contact HR at{' '}
                  <a
                    href="mailto:hr@hartzell.work"
                    className="text-hartzell-blue hover:underline"
                  >
                    hr@hartzell.work
                  </a>
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Additional Verification
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Please enter the last 4 digits of your Social Security Number
                to complete sign-in.
              </p>

              <form onSubmit={handleSSNSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="ssnLast4"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Last 4 of SSN
                  </label>
                  <input
                    id="ssnLast4"
                    type="text"
                    required
                    maxLength={4}
                    pattern="[0-9]{4}"
                    placeholder="••••"
                    value={formData.ssnLast4}
                    onChange={(e) =>
                      setFormData({ ...formData, ssnLast4: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Verifying...' : 'Verify'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="btn-secondary w-full"
                >
                  Go Back
                </button>
              </form>
            </>
          )}
        </div>

        {/* Security Notice */}
        <p className="text-xs text-blue-100 text-center mt-6">
          🔒 Your information is secure and encrypted
        </p>
      </div>
    </div>
  );
}
