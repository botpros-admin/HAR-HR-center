/**
 * Email Verification Banner
 * Shows verification input after user enters email
 * Blocks Bitrix24 submission until verified
 */

'use client';

import { useState, useEffect } from 'react';

interface VerificationBannerProps {
  email: string;
  pinSent: boolean;
  verified: boolean;
  sending: boolean;
  verifying: boolean;
  error: string | null;
  attemptsLeft: number;
  expiresInMinutes: number;
  blockedUntil: string | null;
  onSendPIN: () => Promise<boolean>;
  onVerifyPIN: (pin: string) => Promise<boolean>;
  onResendPIN: () => Promise<boolean>;
}

export function VerificationBanner({
  email,
  pinSent,
  verified,
  sending,
  verifying,
  error,
  attemptsLeft,
  expiresInMinutes,
  blockedUntil,
  onSendPIN,
  onVerifyPIN,
  onResendPIN,
}: VerificationBannerProps) {
  const [pin, setPin] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Handle PIN input (auto-verify when 6 digits entered)
  const handlePinInput = async (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setPin(numericValue);

    // Auto-verify when 6 digits entered
    if (numericValue.length === 6) {
      const success = await onVerifyPIN(numericValue);
      if (!success) {
        // Clear PIN on failure
        setTimeout(() => setPin(''), 1000);
      }
    }
  };

  // Handle resend with cooldown
  const handleResend = async () => {
    const success = await onResendPIN();
    if (success) {
      setResendCooldown(60); // 60 second cooldown
    }
  };

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Don't show if verified
  if (verified) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-green-800">Email Verified</p>
            <p className="text-xs text-green-600">{email}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show blocked message
  if (blockedUntil) {
    const blockedDate = new Date(blockedUntil);
    const minutesLeft = Math.ceil((blockedDate.getTime() - Date.now()) / 60000);

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">Too Many Attempts</p>
            <p className="text-xs text-red-600">Please try again in {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show PIN input if sent
  if (pinSent) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Check Your Email</p>
              <p className="text-xs text-blue-600 mb-3">
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below to continue.
              </p>

              {/* PIN Input */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => handlePinInput(e.target.value)}
                  disabled={verifying}
                  placeholder="000000"
                  className={`w-32 px-3 py-2 text-center text-lg font-mono tracking-widest border rounded-lg focus:outline-none focus:ring-2 ${
                    error
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-blue-300 focus:ring-blue-500'
                  } ${verifying ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                  autoFocus
                />

                {verifying && (
                  <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <p className="text-xs text-red-600 mt-2">
                  {error} {attemptsLeft > 0 && `(${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} left)`}
                </p>
              )}

              {/* Resend Button */}
              <div className="mt-3 text-xs text-blue-600">
                {resendCooldown > 0 ? (
                  <span>Resend code in {resendCooldown}s</span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={sending}
                    className="underline hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
                {' • '}
                <span>Code expires in {expiresInMinutes} minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initial state - show sending indicator (auto-send on email blur)
  if (sending) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-blue-700">Sending verification code to {email}...</p>
        </div>
      </div>
    );
  }

  // Don't show anything if neither verified nor PIN sent (auto-send will happen)
  return null;
}
