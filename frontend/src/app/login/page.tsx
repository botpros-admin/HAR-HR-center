'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { AlertCircle, LogIn } from 'lucide-react';

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

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.login({
        employeeId: formData.employeeId,
        dateOfBirth: formData.dateOfBirth,
        turnstileToken: showCaptcha ? turnstileToken || undefined : undefined,
      });

      if (response.requiresCaptcha && !showCaptcha) {
        setShowCaptcha(true);
        setFailedAttempts(response.failedAttempts || 0);
        setError('Please complete the CAPTCHA verification');
        setLoading(false);
        return;
      }

      if (response.requiresSSN) {
        setPreAuthSession(response.preAuthSession!);
        setStep('ssn');
      } else if (response.session) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setFailedAttempts((prev) => prev + 1);
      if (failedAttempts >= 2) {
        setShowCaptcha(true);
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
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-hartzell-navy to-hartzell-blue p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Hartzell HR Center
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
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                    className="input-field"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter your date of birth for verification
                  </p>
                </div>

                {/* CAPTCHA */}
                {showCaptcha && (
                  <div>
                    <TurnstileWidget
                      onVerify={(token) => setTurnstileToken(token)}
                    />
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
