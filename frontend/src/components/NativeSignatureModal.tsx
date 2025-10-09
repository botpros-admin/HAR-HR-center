'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, FileText, PenTool, Info, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { SignatureCanvas } from './SignatureCanvas';

interface FieldPosition {
  type: 'signature' | 'initials' | 'date' | 'checkbox' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  label: string;
  required?: boolean;
}

interface NativeSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  assignmentId: number;
  pdfUrl: string;
  fieldPositions?: FieldPosition[] | string; // Can be array or JSON string
  onSuccess?: () => void;
}

export function NativeSignatureModal({
  isOpen,
  onClose,
  documentTitle,
  assignmentId,
  pdfUrl,
  fieldPositions = [],
  onSuccess,
}: NativeSignatureModalProps) {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.7); // Start smaller to fit in panel
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfComponents, setPdfComponents] = useState<any>(null);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);
  const [actualRenderWidth, setActualRenderWidth] = useState<number>(0);
  const [actualRenderHeight, setActualRenderHeight] = useState<number>(0);
  const pageContainerRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Parse fieldPositions if it's a string
  const parsedFieldPositions = React.useMemo(() => {
    if (Array.isArray(fieldPositions)) {
      return fieldPositions;
    }
    if (typeof fieldPositions === 'string') {
      try {
        const parsed = JSON.parse(fieldPositions);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('[NativeSignatureModal] Failed to parse fieldPositions:', e);
        return [];
      }
    }
    return [];
  }, [fieldPositions]);

  // Log field positions on mount/change for debugging
  useEffect(() => {
    console.log('[NativeSignatureModal] Field positions (raw):', fieldPositions);
    console.log('[NativeSignatureModal] Field positions (parsed):', parsedFieldPositions);
    console.log('[NativeSignatureModal] Is array?', Array.isArray(parsedFieldPositions));
    console.log('[NativeSignatureModal] Count:', parsedFieldPositions.length);
  }, [fieldPositions, parsedFieldPositions]);

  // Measure actual rendered dimensions from canvas
  useEffect(() => {
    if (pageContainerRef.current && numPages > 0) {
      const canvas = pageContainerRef.current.querySelector('canvas');
      if (canvas) {
        // Give react-pdf time to fully render
        setTimeout(() => {
          const actualWidth = canvas.clientWidth;
          const actualHeight = canvas.clientHeight;
          setActualRenderWidth(actualWidth);
          setActualRenderHeight(actualHeight);

          console.log('=== ACTUAL RENDERED DIMENSIONS ===');
          console.log('Canvas element:', canvas);
          console.log('canvas.width (internal):', canvas.width);
          console.log('canvas.height (internal):', canvas.height);
          console.log('canvas.clientWidth (displayed):', actualWidth);
          console.log('canvas.clientHeight (displayed):', actualHeight);
          console.log('canvas.style.width:', canvas.style.width);
          console.log('canvas.style.height:', canvas.style.height);
          console.log('PDF dimensions (points):', pageWidth, 'x', pageHeight);
          console.log('Current scale prop:', scale);
          console.log('Calculated (pageWidth * scale):', pageWidth * scale);
          console.log('Calculated (pageHeight * scale):', pageHeight * scale);
          console.log('=================================');
        }, 100);
      }
    }
  }, [numPages, pageNumber, scale, pageWidth, pageHeight]);

  // Dynamically import react-pdf on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-pdf').then((mod) => {
        // Configure PDF.js worker using local file (no CORS issues)
        mod.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.js/pdf.worker.min.mjs';
        setPdfComponents({
          Document: mod.Document,
          Page: mod.Page,
        });
      });
    }
  }, []);

  // Fetch PDF with credentials when modal opens
  useEffect(() => {
    if (isOpen && pdfUrl) {
      setIsPdfLoading(true);
      setPdfBlob(null);
      setError(null);

      console.log('[NativeSignatureModal] Fetching PDF from:', pdfUrl);

      fetch(pdfUrl, {
        credentials: 'include',
      })
        .then(response => {
          console.log('[NativeSignatureModal] PDF response status:', response.status);
          console.log('[NativeSignatureModal] PDF response content-type:', response.headers.get('content-type'));

          if (!response.ok) {
            throw new Error(`Failed to load document: ${response.status} ${response.statusText}`);
          }

          return response.blob();
        })
        .then(blob => {
          console.log('[NativeSignatureModal] PDF blob received:', blob.size, 'bytes, type:', blob.type);

          // Ensure blob has correct MIME type
          if (!blob.type || blob.type === '') {
            blob = new Blob([blob], { type: 'application/pdf' });
          }

          setPdfBlob(blob);
          setIsPdfLoading(false);
        })
        .catch(err => {
          console.error('[NativeSignatureModal] Error loading PDF:', err);
          setError(`Failed to load document preview: ${err.message}`);
          setIsPdfLoading(false);
        });
    }
  }, [isOpen, pdfUrl]);

  const onDocumentLoadSuccess = (pdf: any) => {
    console.log('[NativeSignatureModal] PDF loaded successfully, pages:', pdf.numPages);
    setNumPages(pdf.numPages);

    // Get first page dimensions for field positioning
    pdf.getPage(1).then((page: any) => {
      const viewport = page.getViewport({ scale: 1.0 });
      setPageWidth(viewport.width);
      setPageHeight(viewport.height);
      console.log('[NativeSignatureModal] Page dimensions:', viewport.width, 'x', viewport.height);
    });
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('[NativeSignatureModal] react-pdf load error:', error);
    setError(`PDF rendering error: ${error.message}`);
  };

  // Get fields for current page
  const currentPageFields = parsedFieldPositions.filter(field => field.page === pageNumber);

  // Render field overlay
  const renderFieldOverlay = (field: FieldPosition, index: number) => {
    if (!pageWidth || !pageHeight) return null;

    // Admin template editor renders PDF at fixed width=800px
    // Field coordinates are stored in pixels relative to that 800px view
    // We need to convert to our current render scale

    const ADMIN_RENDER_WIDTH = 800;
    const adminAspectRatio = pageHeight / pageWidth; // e.g., 792/612 = 1.294
    const ADMIN_RENDER_HEIGHT = ADMIN_RENDER_WIDTH * adminAspectRatio;

    // Use MEASURED dimensions if available, otherwise fall back to calculated
    const ourRenderWidth = actualRenderWidth > 0 ? actualRenderWidth : pageWidth * scale;
    const ourRenderHeight = actualRenderHeight > 0 ? actualRenderHeight : pageHeight * scale;

    // Convert coordinates from admin's coordinate system to ours
    // Fields are stored in database with PDF coordinates (bottom-left origin, Y pointing up)
    // Admin editor renders at 800px wide, with height based on PDF aspect ratio
    // We need to:
    // 1. Convert from admin's pixel coordinates to our pixel coordinates (scaling)
    // 2. Flip Y-axis from PDF coords (bottom-left) to React/DOM coords (top-left)

    const x = (field.x / ADMIN_RENDER_WIDTH) * ourRenderWidth;
    const width = (field.width / ADMIN_RENDER_WIDTH) * ourRenderWidth;
    const height = (field.height / ADMIN_RENDER_HEIGHT) * ourRenderHeight;

    // Y-axis flip: field.y is in PDF coordinates (from bottom)
    // Convert to React coordinates (from top)
    const y = ourRenderHeight - ((field.y / ADMIN_RENDER_HEIGHT) * ourRenderHeight) - height;

    // Debug logging for first field
    if (index === 0) {
      console.log('[Field Overlay] PDF dimensions:', pageWidth, 'x', pageHeight);
      console.log('[Field Overlay] Admin render:', ADMIN_RENDER_WIDTH, 'x', ADMIN_RENDER_HEIGHT);
      console.log('[Field Overlay] Our render (MEASURED):', ourRenderWidth, 'x', ourRenderHeight);
      console.log('[Field Overlay] Calculated would be:', pageWidth * scale, 'x', pageHeight * scale);
      console.log('[Field Overlay] Field raw:', field);
      console.log('[Field Overlay] Field converted:', { x, y, width, height });
    }

    const getFieldColor = () => {
      switch (field.type) {
        case 'signature': return 'border-blue-500 bg-blue-50';
        case 'initials': return 'border-purple-500 bg-purple-50';
        case 'date': return 'border-green-500 bg-green-50';
        case 'checkbox': return 'border-orange-500 bg-orange-50';
        case 'text': return 'border-gray-500 bg-gray-50';
        default: return 'border-gray-500 bg-gray-50';
      }
    };

    const getFieldIcon = () => {
      switch (field.type) {
        case 'signature': return '✍️';
        case 'initials': return '👤';
        case 'date': return '📅';
        case 'checkbox': return '☑️';
        case 'text': return '📝';
        default: return '📄';
      }
    };

    return (
      <div
        key={`field-${index}`}
        className={`absolute border-2 ${getFieldColor()} pointer-events-none transition-all`}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium opacity-75">
          <span className="mr-1">{getFieldIcon()}</span>
          {field.label}
        </div>
      </div>
    );
  };

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
        className="absolute inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <PenTool className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {isCompleted ? 'Signature Complete!' : 'Electronic Signature Required'}
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Secure document signing powered by Hartzell HR
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-all disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Document Title Banner */}
          <div className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium opacity-90">Document</p>
                <p className="text-lg font-bold truncate">{documentTitle}</p>
              </div>
              {numPages > 0 && (
                <div className="text-sm font-medium opacity-90">
                  Page {pageNumber} of {numPages}
                </div>
              )}
            </div>
          </div>

          {/* Content - Split Panel Layout */}
          <div className="flex-1 overflow-hidden flex">
            {isCompleted ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">
                  Document Signed Successfully!
                </h3>
                <p className="text-gray-600 text-lg mb-2">
                  Your signature has been securely recorded and saved.
                </p>
                <p className="text-gray-500 text-sm">
                  This window will close automatically...
                </p>
              </div>
            ) : (
              <>
                {/* LEFT PANEL - Document Preview */}
                <div className="w-1/2 border-r border-gray-200 bg-gray-50 flex flex-col">
                  {/* PDF Viewer Controls */}
                  <div className="px-6 py-4 bg-white border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-700">
                        Document Preview
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setScale(0.7)}
                          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Fit to Width"
                        >
                          <Maximize2 className="w-3 h-3 inline mr-1" />
                          Fit
                        </button>
                        <div className="h-4 w-px bg-gray-300"></div>
                        <button
                          onClick={() => setScale(Math.max(0.3, scale - 0.1))}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-gray-600 min-w-[60px] text-center">
                          {Math.round(scale * 100)}%
                        </span>
                        <button
                          onClick={() => setScale(Math.min(2.0, scale + 0.1))}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {numPages > 1 && (
                      <div className="flex items-center justify-center gap-3 mt-3">
                        <button
                          onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                          disabled={pageNumber <= 1}
                          className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                          disabled={pageNumber >= numPages}
                          className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>

                  {/* PDF Viewer */}
                  <div className="flex-1 overflow-y-auto p-6 flex items-start justify-center">
                    <div className="bg-white shadow-lg rounded-lg overflow-hidden max-w-full">
                      {!pdfComponents ? (
                        <div className="flex items-center justify-center p-12">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                          <span className="ml-3 text-gray-600">Initializing PDF viewer...</span>
                        </div>
                      ) : isPdfLoading ? (
                        <div className="flex items-center justify-center p-12">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                          <span className="ml-3 text-gray-600">Loading document...</span>
                        </div>
                      ) : pdfBlob ? (
                        <pdfComponents.Document
                          file={pdfBlob}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          loading={
                            <div className="flex items-center justify-center p-12">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                              <span className="ml-3 text-gray-600">Rendering document...</span>
                            </div>
                          }
                          error={
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                              <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                              <p className="text-red-700 font-medium">Failed to render document</p>
                              <p className="text-sm text-gray-600 mt-1">The PDF could not be displayed</p>
                              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                            </div>
                          }
                        >
                          <div ref={pageContainerRef} className="relative inline-block">
                            <pdfComponents.Page
                              pageNumber={pageNumber}
                              scale={scale}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              className="max-w-full"
                            />
                            {/* Field Overlays */}
                            {currentPageFields.map((field, index) => renderFieldOverlay(field, index))}
                          </div>
                        </pdfComponents.Document>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-100 rounded-lg">
                          <FileText className="w-16 h-16 text-gray-400 mb-3" />
                          <p className="text-gray-600 font-medium">No document available</p>
                          <p className="text-sm text-gray-500 mt-1">Unable to load document preview</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT PANEL - Signature Interface */}
                <div className="w-1/2 overflow-y-auto">
                  <div className="p-6 space-y-6">
                    {/* Instructions */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                      <div className="flex gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-3">Signing Instructions</h3>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-bold">1.</span>
                              <span>Review the document on the left</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-bold">2.</span>
                              <span>Sign in the canvas below using your mouse or touchscreen</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-bold">3.</span>
                              <span>Click "Save Signature" when satisfied</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-bold">4.</span>
                              <span>Click "Submit Signature" to complete</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Signature Canvas */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-base font-bold text-gray-900">
                          Your Signature <span className="text-red-500">*</span>
                        </label>
                        {signatureDataUrl && (
                          <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-full">
                            <CheckCircle className="w-4 h-4" />
                            Saved
                          </div>
                        )}
                      </div>

                      <div className="border-2 border-gray-300 rounded-xl overflow-hidden shadow-sm">
                        <SignatureCanvas
                          onSave={handleSaveSignature}
                          onClear={handleClearSignature}
                          width={500}
                          height={200}
                          className="signature-canvas-enterprise"
                        />
                      </div>

                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Sign naturally with your mouse, trackpad, or finger (on touch devices)
                      </p>
                    </div>

                    {/* Signature Preview */}
                    {signatureDataUrl && (
                      <div className="border-2 border-green-200 rounded-xl p-5 bg-gradient-to-br from-green-50 to-emerald-50">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <h3 className="text-base font-bold text-gray-900">Signature Preview</h3>
                        </div>
                        <div className="bg-white border-2 border-green-300 rounded-lg p-4 shadow-inner">
                          <img
                            src={signatureDataUrl}
                            alt="Signature preview"
                            className="max-w-full h-auto mx-auto"
                            style={{ maxHeight: '100px' }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-2 text-center">
                          This is how your signature will appear on the document
                        </p>
                      </div>
                    )}

                    {/* Error Message */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-bold text-red-900 text-sm mb-1">Error</h4>
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Legal Notice */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <div className="text-xs text-gray-600">
                          <p className="font-medium text-gray-900 mb-1">Secure & Encrypted</p>
                          <p>Your signature is encrypted and stored securely. By signing, you agree that your electronic signature is legally binding.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!isCompleted && (
            <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!signatureDataUrl || isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold shadow-lg hover:shadow-xl flex items-center gap-3 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting Signature...</span>
                  </>
                ) : (
                  <>
                    <PenTool className="w-5 h-5" />
                    <span>Submit Signature</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
