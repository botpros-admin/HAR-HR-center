/**
 * Email Verification Hook
 * Handles sending and verifying email PINs for application security
 */

import { useState, useCallback, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://hartzell.work';

interface VerificationState {
  pinSent: boolean;
  verified: boolean;
  sending: boolean;
  verifying: boolean;
  error: string | null;
  attemptsLeft: number;
  expiresInMinutes: number;
  blockedUntil: string | null;
}

interface SendPinResponse {
  success: boolean;
  message?: string;
  expiresInMinutes?: number;
  attemptsLeft?: number;
  error?: string;
  blockedUntil?: string;
}

interface VerifyPinResponse {
  success: boolean;
  message?: string;
  verified?: boolean;
  bitrixItemId?: number;
  error?: string;
  attemptsLeft?: number;
  blockedUntil?: string;
}

export function useEmailVerification(email: string, draftId: string | null) {
  const [state, setState] = useState<VerificationState>({
    pinSent: false,
    verified: false,
    sending: false,
    verifying: false,
    error: null,
    attemptsLeft: 3,
    expiresInMinutes: 10,
    blockedUntil: null,
  });

  // Check if already verified from sessionStorage
  useEffect(() => {
    const verifiedEmail = sessionStorage.getItem('verifiedEmail');
    if (verifiedEmail === email) {
      setState(prev => ({ ...prev, verified: true, pinSent: true }));
    }
  }, [email]);

  /**
   * Send verification PIN to email
   */
  const sendPIN = useCallback(async (): Promise<boolean> => {
    if (!email || !email.includes('@')) {
      setState(prev => ({ ...prev, error: 'Invalid email address' }));
      return false;
    }

    setState(prev => ({
      ...prev,
      sending: true,
      error: null,
    }));

    try {
      const response = await fetch(`${API_BASE}/applications/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, draftId }),
      });

      const data: SendPinResponse = await response.json();

      if (!response.ok) {
        setState(prev => ({
          ...prev,
          sending: false,
          error: data.error || 'Failed to send verification code',
          blockedUntil: data.blockedUntil || null,
        }));
        return false;
      }

      setState(prev => ({
        ...prev,
        sending: false,
        pinSent: true,
        attemptsLeft: data.attemptsLeft || 3,
        expiresInMinutes: data.expiresInMinutes || 10,
        error: null,
      }));

      console.log('[Verification] PIN sent successfully');
      return true;

    } catch (error) {
      console.error('[Verification] Failed to send PIN:', error);
      setState(prev => ({
        ...prev,
        sending: false,
        error: 'Network error. Please try again.',
      }));
      return false;
    }
  }, [email, draftId]);

  /**
   * Verify PIN entered by user
   */
  const verifyPIN = useCallback(async (pin: string): Promise<boolean> => {
    if (!email || !pin || pin.length !== 6) {
      setState(prev => ({ ...prev, error: 'Please enter a 6-digit code' }));
      return false;
    }

    setState(prev => ({
      ...prev,
      verifying: true,
      error: null,
    }));

    try {
      const response = await fetch(`${API_BASE}/applications/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin, draftId }),
      });

      const data: VerifyPinResponse = await response.json();

      if (!response.ok) {
        setState(prev => ({
          ...prev,
          verifying: false,
          error: data.error || 'Invalid verification code',
          attemptsLeft: data.attemptsLeft !== undefined ? data.attemptsLeft : prev.attemptsLeft,
          blockedUntil: data.blockedUntil || null,
        }));
        return false;
      }

      // Success! Mark as verified
      setState(prev => ({
        ...prev,
        verifying: false,
        verified: true,
        error: null,
      }));

      // Store verified email in sessionStorage
      sessionStorage.setItem('verifiedEmail', email);

      console.log('[Verification] Email verified successfully');
      return true;

    } catch (error) {
      console.error('[Verification] Failed to verify PIN:', error);
      setState(prev => ({
        ...prev,
        verifying: false,
        error: 'Network error. Please try again.',
      }));
      return false;
    }
  }, [email, draftId]);

  /**
   * Resend PIN (with cooldown handling)
   */
  const resendPIN = useCallback(async (): Promise<boolean> => {
    return await sendPIN();
  }, [sendPIN]);

  /**
   * Reset verification state (e.g., when email changes)
   */
  const reset = useCallback(() => {
    setState({
      pinSent: false,
      verified: false,
      sending: false,
      verifying: false,
      error: null,
      attemptsLeft: 3,
      expiresInMinutes: 10,
      blockedUntil: null,
    });
  }, []);

  return {
    ...state,
    sendPIN,
    verifyPIN,
    resendPIN,
    reset,
  };
}
