/**
 * useFieldAutoSave Hook
 *
 * Auto-saves individual form fields on blur
 * Creates draft application in D1 and optionally Bitrix24
 *
 * Usage:
 * ```tsx
 * const { saveField, saved, saving } = useFieldAutoSave(fieldName, value, currentStep);
 *
 * <input
 *   value={value}
 *   onBlur={saveField}
 * />
 * {saved && <span>✓ Saved</span>}
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hartzell.work/api';

// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

interface AutoSaveState {
  saving: boolean;
  saved: boolean;
  error: string | null;
}

export function useFieldAutoSave(
  fieldName: string,
  value: any,
  currentStep: number = 1
) {
  const [state, setState] = useState<AutoSaveState>({
    saving: false,
    saved: false,
    error: null,
  });

  // Don't save if value is empty
  const shouldSave = value !== null && value !== undefined && value !== '' &&
    (Array.isArray(value) ? value.length > 0 : true);

  const saveField = useCallback(async () => {
    if (!shouldSave || state.saving) return;

    setState({ saving: true, saved: false, error: null });

    try {
      // Get draft ID from sessionStorage (if exists)
      const draftId = sessionStorage.getItem('draftId');
      const sessionId = getOrCreateSessionId();

      const response = await fetch(`${API_URL}/applications/save-field`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draftId,
          sessionId,
          fieldName,
          value,
          currentStep,
        }),
      });

      if (!response.ok) {
        throw new Error(`Save failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Store draft ID if this was the first save
      if (result.draftId && !draftId) {
        sessionStorage.setItem('draftId', result.draftId);
      }

      // Show success indicator
      setState({ saving: false, saved: true, error: null });

      // Hide success indicator after 2 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, saved: false }));
      }, 2000);

    } catch (error) {
      console.error(`Auto-save failed for ${fieldName}:`, error);
      setState({
        saving: false,
        saved: false,
        error: error instanceof Error ? error.message : 'Save failed',
      });

      // Clear error after 5 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 5000);
    }
  }, [fieldName, value, currentStep, shouldSave, state.saving]);

  return {
    saveField,
    ...state,
  };
}

/**
 * Get or create a unique session ID for tracking
 * Stored in sessionStorage (persists during browser session)
 */
function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem('sessionId');

  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('sessionId', sessionId);
  }

  return sessionId;
}

/**
 * Hook to check for duplicate applications
 */
export function useCheckDuplicate(email: string | null) {
  const [checking, setChecking] = useState(false);
  const [duplicate, setDuplicate] = useState<any>(null);
  const lastCheckedEmail = useRef<string | null>(null);

  const checkDuplicate = useCallback(async () => {
    // Only check if email is valid AND different from last check
    if (!email || !isValidEmail(email) || email === lastCheckedEmail.current) {
      return;
    }

    lastCheckedEmail.current = email;
    setChecking(true);

    try {
      const response = await fetch(`${API_URL}/applications/check-duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.exists) {
        setDuplicate(result);
      } else {
        setDuplicate(null);
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
    } finally {
      setChecking(false);
    }
  }, [email]);

  return {
    checkDuplicate,
    checking,
    duplicate,
    clearDuplicate: () => setDuplicate(null),
  };
}

/**
 * Hook to resume incomplete application
 */
export function useResumeApplication() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any> | null>(null);

  const resumeApplication = useCallback(async (draftId: string) => {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/applications/resume/${draftId}`);

      if (!response.ok) {
        throw new Error('Failed to load draft');
      }

      const result = await response.json();

      if (result.success) {
        setFormData(result.formData);
        return result.formData;
      }

      return null;
    } catch (error) {
      console.error('Resume failed:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    resumeApplication,
    loading,
    formData,
  };
}

/**
 * Hook to auto-load incomplete application on page load
 */
export function useAutoLoadDraft() {
  const [loaded, setLoaded] = useState(false);
  const [draftData, setDraftData] = useState<Record<string, any> | null>(null);
  const { resumeApplication } = useResumeApplication();

  useEffect(() => {
    async function loadDraft() {
      const draftId = sessionStorage.getItem('draftId');

      if (draftId) {
        const data = await resumeApplication(draftId);
        if (data) {
          setDraftData(data);
        }
      }

      setLoaded(true);
    }

    loadDraft();
  }, [resumeApplication]);

  return {
    loaded,
    draftData,
    hasDraft: draftData !== null,
  };
}
