'use client';

import { useState } from 'react';
import { TurnstileWidget } from './TurnstileWidget';
import { X } from 'lucide-react';

interface CaptchaGateProps {
  onVerified: () => void;
  onClose: () => void;
}

export function CaptchaGate({ onVerified, onClose }: CaptchaGateProps) {
  const [token, setToken] = useState<string | null>(null);

  const handleVerify = () => {
    if (token) {
      // Store token in sessionStorage for later use
      sessionStorage.setItem('captchaToken', token);
      onVerified();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Verify You're Human
        </h2>
        <p className="text-gray-600 mb-6">
          Please complete the verification below to continue to the application form.
        </p>

        <div className="mb-6">
          <TurnstileWidget onVerify={setToken} />
        </div>

        <button
          onClick={handleVerify}
          disabled={!token}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Application
        </button>
      </div>
    </div>
  );
}
