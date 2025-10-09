'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clipboard, FileSignature, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Toast, ToastContainer } from '@/components/Toast';

export default function DrugTestPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signed, setSigned] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleSign = async () => {
    if (!agreed) return;

    setLoading(true);
    try {
      // TODO: Integrate with OpenSign API
      // Create signature request
      const response = await api.createSignatureRequest({
        documentType: 'drug_test_consent',
        documentTitle: 'Drug Testing Consent and Policy Acknowledgment'
      });

      // Redirect to OpenSign
      if (response.signatureUrl) {
        window.location.href = response.signatureUrl;
      }
    } catch (error) {
      console.error('Failed to create signature request:', error);
      showToast('Failed to initiate signature process. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueLater = () => {
    router.push('/onboarding');
  };

  if (signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hartzell-navy via-hartzell-navy/90 to-hartzell-blue flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Signature Complete
          </h2>
          <p className="text-gray-600 mb-6">
            Your drug test consent form has been signed successfully.
          </p>
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full bg-hartzell-blue text-white py-3 rounded-lg font-medium hover:bg-hartzell-blue/90 transition-colors"
          >
            Return to Onboarding
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hartzell-navy via-hartzell-navy/90 to-hartzell-blue py-8 px-4 sm:px-6 lg:px-8">
      {/* Toast Container */}
      <ToastContainer>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleContinueLater}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Onboarding
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
              <Clipboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Drug Testing Consent & Policy
              </h1>
              <p className="text-white/70 text-sm">
                Please review and acknowledge the drug testing policy
              </p>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Alert Banner */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong className="font-medium">Important:</strong> This document requires your electronic signature.
                  Please read carefully before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="p-6 sm:p-8">
            <div className="prose max-w-none">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Hartzell Companies Drug Testing Policy
              </h2>

              <section className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">1. Purpose</h3>
                <p className="text-gray-600 leading-relaxed">
                  Hartzell Companies is committed to providing a safe, healthy, and productive work environment
                  for all employees. This Drug Testing Policy is designed to ensure workplace safety and comply
                  with federal and state regulations.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">2. Scope</h3>
                <p className="text-gray-600 leading-relaxed">
                  This policy applies to all employees, applicants, contractors, and temporary workers.
                  Drug testing may be conducted:
                </p>
                <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                  <li>Pre-employment (for all new hires)</li>
                  <li>Post-accident or incident</li>
                  <li>Reasonable suspicion</li>
                  <li>Random selection</li>
                  <li>Return-to-duty testing</li>
                </ul>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">3. Substances Tested</h3>
                <p className="text-gray-600 leading-relaxed mb-2">
                  Testing will screen for the following substances:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Marijuana (THC)</li>
                  <li>Cocaine</li>
                  <li>Amphetamines</li>
                  <li>Opiates</li>
                  <li>Phencyclidine (PCP)</li>
                  <li>Other controlled substances as determined by applicable law</li>
                </ul>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">4. Testing Procedures</h3>
                <p className="text-gray-600 leading-relaxed">
                  All drug tests will be conducted by certified laboratories following DOT and/or industry
                  standard procedures. Specimens will be collected by trained professionals in a manner that
                  protects employee dignity and privacy. Results are confidential and shared only with
                  authorized personnel on a need-to-know basis.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">5. Consequences of Positive Results</h3>
                <p className="text-gray-600 leading-relaxed">
                  A confirmed positive test result may result in:
                </p>
                <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                  <li>For applicants: Withdrawal of employment offer</li>
                  <li>For employees: Disciplinary action up to and including termination</li>
                  <li>Referral to Employee Assistance Program (EAP) when applicable</li>
                </ul>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">6. Prescription Medications</h3>
                <p className="text-gray-600 leading-relaxed">
                  Employees using legally prescribed medications that may affect job performance or safety
                  must notify HR or their supervisor. Documentation from a healthcare provider may be required.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">7. Refusal to Test</h3>
                <p className="text-gray-600 leading-relaxed">
                  Refusal to submit to required drug testing will be treated as a positive test result and
                  may result in immediate termination or withdrawal of employment offer.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">8. Employee Rights</h3>
                <p className="text-gray-600 leading-relaxed">
                  Employees have the right to:
                </p>
                <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                  <li>Receive a copy of this policy</li>
                  <li>Request a re-test of the original specimen at their own expense</li>
                  <li>Confidential treatment of all test results</li>
                  <li>Explanation of testing procedures and their rights</li>
                </ul>
              </section>

              <div className="bg-gray-50 rounded-lg p-6 mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Employee Acknowledgment</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  By signing this document, I acknowledge that:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>I have received, read, and understand the Hartzell Companies Drug Testing Policy</li>
                  <li>I consent to drug testing as outlined in this policy</li>
                  <li>I understand that violation of this policy may result in disciplinary action up to and including termination</li>
                  <li>I understand my rights under this policy</li>
                  <li>I will comply with all testing procedures and requirements</li>
                </ul>
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-5 h-5 text-hartzell-blue border-gray-300 rounded focus:ring-hartzell-blue"
                />
                <span className="text-sm text-gray-700 flex-1">
                  I have read and understand the Drug Testing Policy and consent to drug testing
                  as outlined above. I understand that my electronic signature below constitutes
                  a legal signature confirming my acknowledgment and agreement.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSign}
                disabled={!agreed || loading}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-medium transition-colors ${
                  agreed && !loading
                    ? 'bg-hartzell-blue text-white hover:bg-hartzell-blue/90'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <FileSignature className="w-5 h-5" />
                {loading ? 'Processing...' : 'Sign Document'}
              </button>
              <button
                onClick={handleContinueLater}
                className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Continue Later
              </button>
            </div>

            {/* Help Text */}
            <p className="mt-4 text-sm text-gray-500 text-center">
              Need help? Contact HR at{' '}
              <a href="mailto:hr@hartzell.work" className="text-hartzell-blue hover:underline">
                hr@hartzell.work
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
