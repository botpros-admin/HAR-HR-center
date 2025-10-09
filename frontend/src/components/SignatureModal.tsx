'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatureUrl: string;
  documentTitle: string;
  assignmentId: number;
  onSuccess?: () => void;
}

export function SignatureModal({
  isOpen,
  onClose,
  signatureUrl,
  documentTitle,
  assignmentId,
  onSuccess,
}: SignatureModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(true);
      setIsCompleted(false);
      setError(null);
      return;
    }

    // Poll for signature completion
    const pollInterval = setInterval(async () => {
      try {
        // Check if document status has changed
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employee/documents`, {
          credentials: 'include',
        });

        if (response.ok) {
          const documents = await response.json();
          const doc = documents.find((d: any) => d.id === assignmentId);

          if (doc && doc.status === 'signed') {
            setIsCompleted(true);
            clearInterval(pollInterval);

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });

            // Call success callback
            if (onSuccess) {
              onSuccess();
            }

            // Auto-close after showing success message
            setTimeout(() => {
              onClose();
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Error polling for signature completion:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [isOpen, assignmentId, queryClient, onSuccess, onClose]);

  // Listen for postMessage from OpenSign iframe (if supported)
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security (update with actual OpenSign domain)
      if (!event.origin.includes('opensignlabs.com')) {
        return;
      }

      // Check for signature completion event
      if (event.data?.type === 'signature_completed' || event.data?.status === 'signed') {
        setIsCompleted(true);

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });

        if (onSuccess) {
          onSuccess();
        }

        setTimeout(() => {
          onClose();
        }, 2000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, queryClient, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Hide Zoho SalesIQ chat widget */}
      <style>{`
        .zsiq_floatmain,
        .zsiq_float,
        [data-id="zsalesiq"],
        #zsalesiq,
        .siqembed {
          display: none !important;
          visibility: hidden !important;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">
                {isCompleted ? 'Signature Complete!' : 'Sign Document'}
              </h2>
              {isLoading && !isCompleted && (
                <Loader2 className="w-5 h-5 text-hartzell-blue animate-spin" />
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Document Title */}
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Document:</span> {documentTitle}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 relative overflow-hidden">
            {isCompleted ? (
              <div className="absolute inset-0 flex items-center justify-center bg-green-50">
                <div className="text-center">
                  <CheckCircle className="w-24 h-24 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Document Signed Successfully!
                  </h3>
                  <p className="text-gray-600">
                    Your signature has been recorded. Closing...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                <div className="text-center max-w-md px-4">
                  <X className="w-24 h-24 text-red-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Error Loading Signature
                  </h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={onClose}
                    className="btn-primary"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 text-hartzell-blue animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Loading signature interface...</p>
                    </div>
                  </div>
                )}

                {/* OpenSign iFrame */}
                <iframe
                  src={signatureUrl}
                  className="w-full h-full border-0"
                  title="Sign Document"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setError('Failed to load signature interface. Please try again or contact support.');
                  }}
                />
              </>
            )}
          </div>

          {/* Footer Instructions */}
          {!isCompleted && !error && (
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-700">Follow the instructions above to sign the document.</p>
                  <p className="mt-1">Once signed, this window will close automatically and your document will be updated.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
