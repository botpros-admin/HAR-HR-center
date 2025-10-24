'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hartzell.work/api';

interface VerificationResult {
  success: boolean;
  alreadyVerified?: boolean;
  applicationId?: string;
  bitrixId?: string;
  message?: string;
  error?: string;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already-verified'>('loading');
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setStatus('error');
        setResult({
          success: false,
          error: 'Invalid verification link',
          message: 'No verification token found in the URL.'
        });
        return;
      }

      try {
        const response = await fetch(`${API_URL}/applications/verify/${token}`);
        const data: VerificationResult = await response.json();

        setResult(data);

        if (data.success) {
          if (data.alreadyVerified) {
            setStatus('already-verified');
          } else {
            setStatus('success');
            // Clear any draft data from sessionStorage since application is now submitted
            sessionStorage.removeItem('draftId');
            sessionStorage.removeItem('sessionId');
          }
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setResult({
          success: false,
          error: 'Network error',
          message: 'Failed to connect to the server. Please try again later.'
        });
      }
    }

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Loading State */}
        {status === 'loading' && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <svg
                className="animate-spin h-16 w-16 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Verifying Your Email
            </h1>
            <p className="text-slate-600">
              Please wait while we confirm your application...
            </p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-green-100 p-4">
                <svg
                  className="h-16 w-16 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center text-slate-800 mb-4">
              Email Verified Successfully!
            </h1>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <p className="text-green-800 text-lg text-center mb-2">
                {result?.message || 'Your application has been submitted to Hartzell Companies.'}
              </p>
              {result?.applicationId && (
                <p className="text-green-700 text-sm text-center">
                  Application ID: <strong>{result.applicationId}</strong>
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 className="font-semibold text-blue-900 mb-2">What happens next?</h2>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Our HR team will review your application</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>You'll receive an email confirmation shortly</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>We'll contact you if your qualifications match our openings</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => router.push('/')}
                  className="btn-primary"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Already Verified State */}
        {status === 'already-verified' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-blue-100 p-4">
                <svg
                  className="h-16 w-16 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center text-slate-800 mb-4">
              Already Verified
            </h1>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <p className="text-blue-800 text-lg text-center">
                {result?.message || 'Your email has already been verified.'}
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => router.push('/')}
                className="btn-primary"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-red-100 p-4">
                <svg
                  className="h-16 w-16 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center text-slate-800 mb-4">
              Verification Failed
            </h1>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <p className="text-red-800 text-lg text-center mb-2">
                {result?.message || 'We were unable to verify your email.'}
              </p>
              {result?.error && (
                <p className="text-red-700 text-sm text-center">
                  Error: {result.error}
                </p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-yellow-900 mb-2">Possible reasons:</h2>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>The verification link may have expired (links are valid for 24 hours)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>The link may be invalid or incomplete</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>The application may have already been processed</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/apply')}
                className="btn-secondary"
              >
                Submit New Application
              </button>
              <button
                onClick={() => router.push('/')}
                className="btn-primary"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <svg
              className="animate-spin h-16 w-16 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Loading...
          </h1>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
