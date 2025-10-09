'use client';

import { useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { SignatureCanvas } from './SignatureCanvas';

interface NativeSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  assignmentId: number;
  pdfUrl: string;
  onSuccess?: () => void;
}

export function NativeSignatureModal({
  isOpen,
  onClose,
  documentTitle,
  assignmentId,
  pdfUrl,
  onSuccess,
}: NativeSignatureModalProps) {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleSaveSignature = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    setError(null);
  };

  const handleClearSignature = () => {
    setSignatureDataUrl(null);
  };

  const handleSubmit = async () => {
    if (!signatureDataUrl) {
      setError('Please provide your signature before submitting');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // For now, we'll use a simple signature field placement
      // In the future, this could be retrieved from the document template
      const signatureFields = [
        {
          page: 0,
          x: 100,
          y: 100,
          width: 200,
          height: 100,
        },
      ];

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signatures/sign-native`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          assignmentId,
          signatureDataUrl,
          signatureFields,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sign document');
      }

      const result = await response.json();

      console.log('Document signed successfully:', result);

      setIsCompleted(true);

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
        // Reset state
        setSignatureDataUrl(null);
        setIsCompleted(false);
        setError(null);
      }, 2000);

    } catch (err) {
      console.error('Error signing document:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return; // Prevent closing while submitting
    setSignatureDataUrl(null);
    setIsCompleted(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-75 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">
                {isCompleted ? 'Signature Complete!' : 'Sign Document'}
              </h2>
              {isSubmitting && (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              )}
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
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
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isCompleted ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="w-24 h-24 text-green-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Document Signed Successfully!
                </h3>
                <p className="text-gray-600">
                  Your signature has been recorded. Closing...
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">Please sign below to complete this document</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li>Use your mouse or finger to draw your signature</li>
                        <li>Click "Clear" if you want to start over</li>
                        <li>Click "Save Signature" when you're satisfied</li>
                        <li>Then click "Submit Signature" to complete the document</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Signature Canvas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Your Signature <span className="text-red-500">*</span>
                  </label>
                  <SignatureCanvas
                    onSave={handleSaveSignature}
                    onClear={handleClearSignature}
                    width={600}
                    height={200}
                  />
                  {signatureDataUrl && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span>Signature saved! You can now submit the document.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview (optional) */}
                {signatureDataUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Signature Preview
                    </label>
                    <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                      <img
                        src={signatureDataUrl}
                        alt="Signature preview"
                        className="max-w-full h-auto"
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div className="text-sm text-red-700">
                        <p className="font-medium">Error</p>
                        <p className="mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isCompleted && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!signatureDataUrl || isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Signature'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
