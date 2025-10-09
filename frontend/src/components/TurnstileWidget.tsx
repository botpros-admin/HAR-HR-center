'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile: {
      render: (
        element: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark';
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
}

export function TurnstileWidget({ onVerify, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const verifyCallbackRef = useRef(onVerify);
  const errorCallbackRef = useRef(onError);

  useEffect(() => {
    verifyCallbackRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    errorCallbackRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    if (!siteKey) {
      console.error('NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured');
      return;
    }

    const renderTurnstile = () => {
      if (!containerRef.current || !window.turnstile) return;

      if (widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => verifyCallbackRef.current(token),
        'error-callback': () => errorCallbackRef.current?.(),
        theme: 'light',
      });
    };

    // Wait for Turnstile script to load
    if (window.turnstile) {
      renderTurnstile();
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderTurnstile();
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, []);

  return <div ref={containerRef} className="flex justify-center" />;
}
