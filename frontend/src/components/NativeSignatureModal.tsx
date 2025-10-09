'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, FileText, PenTool, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
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
  id?: string;
}

interface FilledField {
  fieldId: string;
  type: string;
  data: string; // data URL for signature/initials, text for others
  label: string;
}

interface NativeSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  assignmentId: number;
  pdfUrl: string;
  fieldPositions?: FieldPosition[] | string;
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
  const [filledFields, setFilledFields] = useState<Map<string, FilledField>>(new Map());
  const [activeField, setActiveField] = useState<FieldPosition | null>(null);
  const [showSignaturePopup, setShowSignaturePopup] = useState(false);
  const [tempSignature, setTempSignature] = useState<string | null>(null);
  const [signatureMethod, setSignatureMethod] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState<string>('');
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // Detect if device supports touch
  useEffect(() => {
    const hasTouchScreen =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;

    setIsTouchDevice(hasTouchScreen);
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfComponents, setPdfComponents] = useState<any>(null);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);
  const [actualRenderWidth, setActualRenderWidth] = useState<number>(0);
  const [actualRenderHeight, setActualRenderHeight] = useState<number>(0);
  const pageContainerRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Parse fieldPositions
  const parsedFieldPositions = React.useMemo(() => {
    if (Array.isArray(fieldPositions)) {
      return fieldPositions.map((f, idx) => ({ ...f, id: f.id || `field-${idx}` }));
    }
    if (typeof fieldPositions === 'string') {
      try {
        const parsed = JSON.parse(fieldPositions);
        return Array.isArray(parsed) ? parsed.map((f: any, idx: number) => ({ ...f, id: f.id || `field-${idx}` })) : [];
      } catch (e) {
        console.error('[NativeSignatureModal] Failed to parse fieldPositions:', e);
        return [];
      }
    }
    return [];
  }, [fieldPositions]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Dynamically import react-pdf
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-pdf').then((mod) => {
        mod.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.js/pdf.worker.min.mjs';
        setPdfComponents({
          Document: mod.Document,
          Page: mod.Page,
        });
      });
    }
  }, []);

  // Fetch PDF
  useEffect(() => {
    if (isOpen && pdfUrl) {
      setIsPdfLoading(true);
      setPdfBlob(null);
      setError(null);

      fetch(pdfUrl, { credentials: 'include' })
        .then(response => {
          if (!response.ok) throw new Error(`Failed to load document: ${response.status}`);
          return response.blob();
        })
        .then(blob => {
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

  // Measure canvas dimensions
  useEffect(() => {
    if (pageContainerRef.current && numPages > 0) {
      const canvas = pageContainerRef.current.querySelector('canvas');
      if (canvas) {
        setTimeout(() => {
          setActualRenderWidth(canvas.clientWidth);
          setActualRenderHeight(canvas.clientHeight);
        }, 100);
      }
    }
  }, [numPages, pageNumber, scale, pageWidth, pageHeight]);

  const onDocumentLoadSuccess = (pdf: any) => {
    setNumPages(pdf.numPages);
    pdf.getPage(1).then((page: any) => {
      const viewport = page.getViewport({ scale: 1.0 });
      setPageWidth(viewport.width);
      setPageHeight(viewport.height);
    });
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('[NativeSignatureModal] PDF load error:', error);
    setError(`PDF rendering error: ${error.message}`);
  };

  // Get fields for current page
  const currentPageFields = parsedFieldPositions.filter((f: FieldPosition) => f.page === pageNumber);

  // Check if all required fields are filled
  const allRequiredFieldsFilled = React.useMemo(() => {
    const requiredFields = parsedFieldPositions.filter((f: FieldPosition) => f.required !== false);
    return requiredFields.every((f: FieldPosition) => filledFields.has(f.id!));
  }, [parsedFieldPositions, filledFields]);

  // Generate signature from typed name
  const generateTypedSignature = (name: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set cursive font
    ctx.font = '64px "Dancing Script", cursive';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw the name
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  };

  // Handle typed name change
  const handleTypedNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setTypedName(name);

    if (name.trim()) {
      const signatureDataUrl = generateTypedSignature(name);
      setTempSignature(signatureDataUrl);
    } else {
      setTempSignature(null);
    }
  };

  // Handle field click
  const handleFieldClick = (field: FieldPosition) => {
    setActiveField(field);
    setTempSignature(null);
    setTypedName('');

    // Set default method based on device type
    // Touch devices -> draw (pen), Non-touch -> type
    setSignatureMethod(isTouchDevice ? 'draw' : 'type');

    if (field.type === 'signature' || field.type === 'initials') {
      setShowSignaturePopup(true);
    } else if (field.type === 'date') {
      // Auto-fill with current date
      const dateStr = new Date().toLocaleDateString();
      setFilledFields(prev => new Map(prev).set(field.id!, {
        fieldId: field.id!,
        type: field.type,
        data: dateStr,
        label: field.label,
      }));
    } else if (field.type === 'checkbox') {
      // Toggle checkbox
      setFilledFields(prev => {
        const newMap = new Map(prev);
        if (newMap.has(field.id!)) {
          newMap.delete(field.id!);
        } else {
          newMap.set(field.id!, {
            fieldId: field.id!,
            type: field.type,
            data: 'checked',
            label: field.label,
          });
        }
        return newMap;
      });
    } else if (field.type === 'text') {
      // Prompt for text input
      const text = prompt(`Enter ${field.label}:`);
      if (text) {
        setFilledFields(prev => new Map(prev).set(field.id!, {
          fieldId: field.id!,
          type: field.type,
          data: text,
          label: field.label,
        }));
      }
    }
  };

  // Handle save signature from popup
  const handleSaveSignature = (dataUrl: string) => {
    setTempSignature(dataUrl);
  };

  // Handle confirm signature
  const handleConfirmSignature = () => {
    if (activeField && tempSignature) {
      setFilledFields(prev => new Map(prev).set(activeField.id!, {
        fieldId: activeField.id!,
        type: activeField.type,
        data: tempSignature,
        label: activeField.label,
      }));
      setShowSignaturePopup(false);
      setActiveField(null);
      setTempSignature(null);
    }
  };

  // Convert coordinates
  const convertCoordinates = (field: FieldPosition) => {
    if (!pageWidth || !pageHeight) return null;

    const ADMIN_RENDER_WIDTH = 800;
    const adminAspectRatio = pageHeight / pageWidth;
    const ADMIN_RENDER_HEIGHT = ADMIN_RENDER_WIDTH * adminAspectRatio;

    const ourRenderWidth = actualRenderWidth > 0 ? actualRenderWidth : pageWidth * scale;
    const ourRenderHeight = actualRenderHeight > 0 ? actualRenderHeight : pageHeight * scale;

    const x = (field.x / ADMIN_RENDER_WIDTH) * ourRenderWidth;
    const width = (field.width / ADMIN_RENDER_WIDTH) * ourRenderWidth;
    const height = (field.height / ADMIN_RENDER_HEIGHT) * ourRenderHeight;
    const y = ourRenderHeight - ((field.y / ADMIN_RENDER_HEIGHT) * ourRenderHeight) - height;

    return { x, y, width, height };
  };

  // Render field overlay
  const renderFieldOverlay = (field: FieldPosition, index: number) => {
    const coords = convertCoordinates(field);
    if (!coords) return null;

    const isFilled = filledFields.has(field.id!);
    const filledData = filledFields.get(field.id!);

    const getFieldColor = () => {
      if (isFilled) return 'border-green-500 bg-green-100';
      switch (field.type) {
        case 'signature': return 'border-blue-500 bg-blue-50 hover:bg-blue-100';
        case 'initials': return 'border-purple-500 bg-purple-50 hover:bg-purple-100';
        case 'date': return 'border-green-500 bg-green-50 hover:bg-green-100';
        case 'checkbox': return 'border-orange-500 bg-orange-50 hover:bg-orange-100';
        case 'text': return 'border-gray-500 bg-gray-50 hover:bg-gray-100';
        default: return 'border-gray-500 bg-gray-50 hover:bg-gray-100';
      }
    };

    return (
      <div
        key={field.id}
        className={`absolute border-2 ${getFieldColor()} cursor-pointer transition-all`}
        style={{
          left: `${coords.x}px`,
          top: `${coords.y}px`,
          width: `${coords.width}px`,
          height: `${coords.height}px`,
        }}
        onClick={() => handleFieldClick(field)}
        title={`Click to ${isFilled ? 'edit' : 'fill'} ${field.label}`}
      >
        {isFilled ? (
          <div className="absolute inset-0 flex items-center justify-center p-1">
            {(field.type === 'signature' || field.type === 'initials') && filledData ? (
              <img src={filledData.data} alt={field.label} className="w-full h-full object-contain" />
            ) : field.type === 'checkbox' ? (
              <CheckCircle className="w-full h-full text-green-600 p-1" />
            ) : (
              <span className="text-xs font-medium text-center truncate px-1">{filledData?.data}</span>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium opacity-60">
            <span className="text-center px-1">{field.label}</span>
          </div>
        )}
      </div>
    );
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!allRequiredFieldsFilled) {
      setError('Please fill all required fields before submitting');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // For now, send the first signature field
      const signatureField = parsedFieldPositions.find((f: FieldPosition) => f.type === 'signature');
      const signatureData = signatureField ? filledFields.get(signatureField.id!) : null;

      if (!signatureData) {
        throw new Error('Signature is required');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signatures/sign-native`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assignmentId,
          signatureDataUrl: signatureData.data,
          signatureFields: [{
            page: 0,
            x: 100,
            y: 100,
            width: 200,
            height: 100,
          }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sign document');
      }

      setIsCompleted(true);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setFilledFields(new Map());
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
    if (isSubmitting) return;
    setFilledFields(new Map());
    setIsCompleted(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ touchAction: 'none' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      />

      {/* Main Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-2 md:p-4" style={{ touchAction: 'auto' }}>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full h-full md:max-w-6xl md:max-h-[95vh] flex flex-col overflow-hidden" style={{ touchAction: 'auto' }}>

          {/* Unified Compact Header */}
          <div className="flex items-center justify-between gap-2 md:gap-4 px-3 md:px-6 py-2 md:py-3 border-b border-gray-200 bg-white shadow-sm">
            {/* Left: Document Info */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm md:text-base font-bold text-gray-900 truncate">{documentTitle}</h2>
                  {numPages > 0 && (
                    <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">
                      • Page {pageNumber}/{numPages}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className={filledFields.size === parsedFieldPositions.length ? 'text-green-600 font-medium' : ''}>
                    {filledFields.size}/{parsedFieldPositions.length} fields completed
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              {/* Zoom Controls */}
              <div className="flex items-center gap-0.5 md:gap-1 border border-gray-200 rounded-lg px-1 md:px-2 py-1 bg-gray-50">
                <button
                  onClick={() => setScale(1.0)}
                  className="p-1 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors"
                  title="Fit to width"
                >
                  <Maximize2 className="w-3 h-3 md:w-4 md:h-4" />
                </button>
                <div className="w-px h-4 bg-gray-300 hidden md:block"></div>
                <button
                  onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                  className="p-1 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3 h-3 md:w-4 md:h-4" />
                </button>
                <span className="text-[10px] md:text-xs text-gray-700 font-medium min-w-[35px] md:min-w-[45px] text-center px-1">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(Math.min(2.0, scale + 0.1))}
                  className="p-1 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>

              {/* Page Navigation (multi-page only) */}
              {numPages > 1 && (
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-1.5 md:px-2 py-1 bg-gray-50">
                  <button
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                    className="p-1 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                    disabled={pageNumber >= numPages}
                    className="p-1 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
                title="Close"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isCompleted ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">Document Signed!</h3>
                <p className="text-gray-600 text-lg">Your signature has been recorded.</p>
              </div>
            ) : (
              <>
                {/* PDF Viewer */}
                <div className="flex-1 overflow-auto p-2 md:p-6 bg-gray-50 flex items-start justify-center touch-pan-x touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div className="bg-white shadow-lg rounded-lg overflow-hidden" style={{ minWidth: 'min-content' }}>
                    {!pdfComponents ? (
                      <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="ml-3 text-gray-600">Loading PDF viewer...</span>
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
                          {currentPageFields.map((field: FieldPosition, index: number) => renderFieldOverlay(field, index))}
                        </div>
                      </pdfComponents.Document>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12">
                        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                        <p className="text-red-700">Failed to load document</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!isCompleted && (
            <div className="px-4 md:px-8 py-4 md:py-6 border-t border-gray-200 bg-gray-50 flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-0 md:justify-between">
              {error && (
                <div className="flex items-center gap-2 text-xs md:text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg md:order-first md:flex-1 md:mr-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex gap-3 md:ml-auto">
                <button onClick={handleClose} disabled={isSubmitting} className="flex-1 md:flex-none px-4 md:px-6 py-2 md:py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all font-medium">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!allRequiredFieldsFilled || isSubmitting}
                  className="flex-1 md:flex-none px-6 md:px-8 py-2 md:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold shadow-lg flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <PenTool className="w-4 h-4 md:w-5 md:h-5" />
                      <span>Submit Document</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Signature Popup Modal */}
      {showSignaturePopup && activeField && (
        <>
          {/* Load Dancing Script font */}
          <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />

          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-4" style={{ background: 'rgba(0,0,0,0.6)', touchAction: 'none' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" style={{ touchAction: 'auto' }}>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 md:px-6 py-3 md:py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <PenTool className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base md:text-lg font-bold">{activeField.label}</h3>
                        <p className="text-xs opacity-90">Secure Electronic Signature</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowSignaturePopup(false);
                      setTempSignature(null);
                      setTypedName('');
                    }}
                    className="text-white/80 hover:text-white p-1 ml-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Method Selector Tabs */}
              <div className="px-4 md:px-6 pt-4 bg-gray-50">
                <div className="flex gap-2 bg-gray-200 p-1 rounded-lg">
                  <button
                    onClick={() => {
                      setSignatureMethod('draw');
                      setTempSignature(null);
                      setTypedName('');
                    }}
                    className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${
                      signatureMethod === 'draw'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <PenTool className="w-4 h-4" />
                      <span>Pen</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSignatureMethod('type');
                      setTempSignature(null);
                      // Clear canvas if it exists
                      const canvas = document.querySelector('.signature-canvas-enterprise canvas') as any;
                      if (canvas?.clearSignature) canvas.clearSignature();
                    }}
                    className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${
                      signatureMethod === 'type'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Type</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Content Area - Fixed Height to Prevent Jumping */}
              <div className="p-4 md:p-6 bg-gray-50" style={{ height: '420px', overflow: 'hidden' }}>
                <div className="h-full flex flex-col">
                  {signatureMethod === 'draw' ? (
                    <>
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 text-center">
                          {isTouchDevice ? 'Draw your signature with your finger or stylus' : 'Draw your signature using mouse or trackpad'}
                        </p>
                      </div>

                      {/* Secure Signature Area with Security Elements */}
                      <div className="flex-shrink-0 relative">
                        {/* Fine-line background pattern */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ zIndex: 0 }}>
                          <defs>
                            <pattern id="securityGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#3b82f6" strokeWidth="0.5"/>
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#securityGrid)" />
                        </svg>

                        {/* Guilloché border */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2 }}>
                          <defs>
                            {/* Horizontal Guilloché pattern */}
                            <pattern id="guillocheH" width="40" height="10" patternUnits="userSpaceOnUse">
                              <path d="M0,5 Q10,0 20,5 T40,5" stroke="#3b82f6" fill="none" strokeWidth="1" opacity="0.8"/>
                              <path d="M0,5 Q10,10 20,5 T40,5" stroke="#6366f1" fill="none" strokeWidth="1" opacity="0.8"/>
                            </pattern>
                            {/* Vertical Guilloché pattern */}
                            <pattern id="guillocheV" width="10" height="40" patternUnits="userSpaceOnUse">
                              <path d="M5,0 Q0,10 5,20 T5,40" stroke="#3b82f6" fill="none" strokeWidth="1" opacity="0.8"/>
                              <path d="M5,0 Q10,10 5,20 T5,40" stroke="#6366f1" fill="none" strokeWidth="1" opacity="0.8"/>
                            </pattern>
                          </defs>
                          {/* Top border */}
                          <rect x="0" y="0" width="100%" height="12" fill="url(#guillocheH)" />
                          {/* Bottom border */}
                          <rect x="0" y="calc(100% - 12px)" width="100%" height="12" fill="url(#guillocheH)" />
                          {/* Left border */}
                          <rect x="0" y="0" width="12" height="100%" fill="url(#guillocheV)" />
                          {/* Right border */}
                          <rect x="calc(100% - 12px)" y="0" width="12" height="100%" fill="url(#guillocheV)" />
                        </svg>

                        {/* Microtext bands */}
                        <div className="absolute top-0 left-0 right-0 h-3 overflow-hidden pointer-events-none flex items-center" style={{ zIndex: 3 }}>
                          <div className="text-[5px] text-blue-600 opacity-70 whitespace-nowrap font-mono" style={{ letterSpacing: '0.5px' }}>
                            SECURE•ELECTRONIC•SIGNATURE•ESIGN•ACT•COMPLIANT•ENCRYPTED•HARTZELL•HR•SECURE•ELECTRONIC•SIGNATURE•ESIGN•ACT•COMPLIANT•ENCRYPTED•HARTZELL•HR•SECURE•ELECTRONIC•SIGNATURE•ESIGN•ACT•COMPLIANT•ENCRYPTED•HARTZELL•HR•
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-3 overflow-hidden pointer-events-none flex items-center" style={{ zIndex: 3 }}>
                          <div className="text-[5px] text-blue-600 opacity-70 whitespace-nowrap font-mono" style={{ letterSpacing: '0.5px' }}>
                            SECURE•ELECTRONIC•SIGNATURE•ESIGN•ACT•COMPLIANT•ENCRYPTED•HARTZELL•HR•SECURE•ELECTRONIC•SIGNATURE•ESIGN•ACT•COMPLIANT•ENCRYPTED•HARTZELL•HR•SECURE•ELECTRONIC•SIGNATURE•ESIGN•ACT•COMPLIANT•ENCRYPTED•HARTZELL•HR•
                          </div>
                        </div>

                        {/* Rosette seal - top left */}
                        <svg className="absolute top-2 left-2 w-10 h-10 pointer-events-none" style={{ zIndex: 4 }}>
                          <defs>
                            <radialGradient id="rosetteGradientTL">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9"/>
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5"/>
                            </radialGradient>
                          </defs>
                          {/* Outer rings */}
                          <circle cx="20" cy="20" r="18" fill="none" stroke="url(#rosetteGradientTL)" strokeWidth="1.5"/>
                          <circle cx="20" cy="20" r="15" fill="none" stroke="url(#rosetteGradientTL)" strokeWidth="1"/>
                          {/* Radiating lines */}
                          {[...Array(16)].map((_, i) => {
                            const angle = (i * 22.5) * Math.PI / 180;
                            const x1 = 20 + Math.cos(angle) * 6;
                            const y1 = 20 + Math.sin(angle) * 6;
                            const x2 = 20 + Math.cos(angle) * 13;
                            const y2 = 20 + Math.sin(angle) * 13;
                            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#rosetteGradientTL)" strokeWidth="1" />;
                          })}
                          <circle cx="20" cy="20" r="5" fill="url(#rosetteGradientTL)"/>
                        </svg>

                        {/* Rosette seal - bottom right */}
                        <svg className="absolute bottom-2 right-2 w-10 h-10 pointer-events-none" style={{ zIndex: 4 }}>
                          <defs>
                            <radialGradient id="rosetteGradientBR">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9"/>
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5"/>
                            </radialGradient>
                          </defs>
                          {/* Outer rings */}
                          <circle cx="20" cy="20" r="18" fill="none" stroke="url(#rosetteGradientBR)" strokeWidth="1.5"/>
                          <circle cx="20" cy="20" r="15" fill="none" stroke="url(#rosetteGradientBR)" strokeWidth="1"/>
                          {/* Radiating lines */}
                          {[...Array(16)].map((_, i) => {
                            const angle = (i * 22.5) * Math.PI / 180;
                            const x1 = 20 + Math.cos(angle) * 6;
                            const y1 = 20 + Math.sin(angle) * 6;
                            const x2 = 20 + Math.cos(angle) * 13;
                            const y2 = 20 + Math.sin(angle) * 13;
                            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#rosetteGradientBR)" strokeWidth="1" />;
                          })}
                          <circle cx="20" cy="20" r="5" fill="url(#rosetteGradientBR)"/>
                        </svg>

                        {/* Micro QR code - top right */}
                        <svg className="absolute top-2 right-2 w-10 h-10 pointer-events-none opacity-70" style={{ zIndex: 4 }}>
                          {/* QR-style pattern */}
                          <rect x="0" y="0" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="2.5" y="0" width="2.5" height="2.5" fill="transparent"/>
                          <rect x="5" y="0" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="7.5" y="0" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="0" y="2.5" width="2.5" height="2.5" fill="transparent"/>
                          <rect x="2.5" y="2.5" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="5" y="2.5" width="2.5" height="2.5" fill="transparent"/>
                          <rect x="7.5" y="2.5" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="0" y="5" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="2.5" y="5" width="2.5" height="2.5" fill="transparent"/>
                          <rect x="5" y="5" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="7.5" y="5" width="2.5" height="2.5" fill="transparent"/>
                          <rect x="0" y="7.5" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="2.5" y="7.5" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="5" y="7.5" width="2.5" height="2.5" fill="transparent"/>
                          <rect x="7.5" y="7.5" width="2.5" height="2.5" fill="#3b82f6"/>
                        </svg>

                        {/* Micro QR code - bottom left */}
                        <svg className="absolute bottom-2 left-2 w-10 h-10 pointer-events-none opacity-70" style={{ zIndex: 4 }}>
                          <rect x="0" y="0" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="2.5" y="0" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="5" y="0" width="2.5" height="2.5" fill="transparent"/>
                          <rect x="7.5" y="0" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="0" y="2.5" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="2.5" y="2.5" width="2.5" height="2.5" fill="transparent"/>
                          <rect x="5" y="2.5" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="7.5" y="2.5" width="2.5" height="2.5" fill="transparent"/>
                          <rect x="0" y="5" width="2.5" height="2.5" fill="transparent"/>
                          <rect x="2.5" y="5" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="5" y="5" width="2.5" height="2.5" fill="transparent"/>
                          <rect x="7.5" y="5" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="0" y="7.5" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="2.5" y="7.5" width="2.5" height="2.5" fill="transparent"/>
                          <rect x="5" y="7.5" width="2.5" height="2.5" fill="#3b82f6"/>
                          <rect x="7.5" y="7.5" width="2.5" height="2.5" fill="#3b82f6"/>
                        </svg>

                        {/* Signature Canvas */}
                        <div className="relative" style={{ zIndex: 1 }}>
                          <SignatureCanvas
                            onSave={handleSaveSignature}
                            onClear={() => setTempSignature(null)}
                            width={500}
                            height={200}
                            showButtons={false}
                            autoSaveOnDraw={true}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-3 flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type your full name
                        </label>
                        <input
                          type="text"
                          value={typedName}
                          onChange={handleTypedNameChange}
                          placeholder="Enter your name"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-base"
                          autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-2">Your name will appear in cursive script</p>
                      </div>

                      <div className="flex-1 flex items-center justify-center min-h-0">
                        {/* Secure Signature Preview Area with Security Elements */}
                        <div className="relative w-full" style={{ height: '200px' }}>
                          {/* Fine-line background pattern */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ zIndex: 0 }}>
                            <defs>
                              <pattern id="securityGridType" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#3b82f6" strokeWidth="0.5"/>
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#securityGridType)" />
                          </svg>

                          {/* Guilloché border */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2 }}>
                            <defs>
                              {/* Horizontal Guilloché pattern */}
                              <pattern id="guillocheTypeH" width="40" height="10" patternUnits="userSpaceOnUse">
                                <path d="M0,5 Q10,0 20,5 T40,5" stroke="#3b82f6" fill="none" strokeWidth="1" opacity="0.8"/>
                                <path d="M0,5 Q10,10 20,5 T40,5" stroke="#6366f1" fill="none" strokeWidth="1" opacity="0.8"/>
                              </pattern>
                              {/* Vertical Guilloché pattern */}
                              <pattern id="guillocheTypeV" width="10" height="40" patternUnits="userSpaceOnUse">
                                <path d="M5,0 Q0,10 5,20 T5,40" stroke="#3b82f6" fill="none" strokeWidth="1" opacity="0.8"/>
                                <path d="M5,0 Q10,10 5,20 T5,40" stroke="#6366f1" fill="none" strokeWidth="1" opacity="0.8"/>
                              </pattern>
                            </defs>
                            {/* Top border */}
                            <rect x="0" y="0" width="100%" height="12" fill="url(#guillocheTypeH)" />
                            {/* Bottom border */}
                            <rect x="0" y="calc(100% - 12px)" width="100%" height="12" fill="url(#guillocheTypeH)" />
                            {/* Left border */}
                            <rect x="0" y="0" width="12" height="100%" fill="url(#guillocheTypeV)" />
                            {/* Right border */}
                            <rect x="calc(100% - 12px)" y="0" width="12" height="100%" fill="url(#guillocheTypeV)" />
                          </svg>

                          {/* Microtext bands */}
                          <div className="absolute top-0 left-0 right-0 h-3 overflow-hidden pointer-events-none flex items-center" style={{ zIndex: 3 }}>
                            <div className="text-[5px] text-blue-600 opacity-70 whitespace-nowrap font-mono" style={{ letterSpacing: '0.5px' }}>
                              SECURE•ELECTRONIC•SIGNATURE•ESIGN•ACT•COMPLIANT•ENCRYPTED•HARTZELL•HR•SECURE•ELECTRONIC•SIGNATURE•ESIGN•ACT•COMPLIANT•ENCRYPTED•HARTZELL•HR•SECURE•ELECTRONIC•SIGNATURE•ESIGN•ACT•COMPLIANT•ENCRYPTED•HARTZELL•HR•
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 h-3 overflow-hidden pointer-events-none flex items-center" style={{ zIndex: 3 }}>
                            <div className="text-[5px] text-blue-600 opacity-70 whitespace-nowrap font-mono" style={{ letterSpacing: '0.5px' }}>
                              SECURE•ELECTRONIC•SIGNATURE•ESIGN•ACT•COMPLIANT•ENCRYPTED•HARTZELL•HR•SECURE•ELECTRONIC•SIGNATURE•ESIGN•ACT•COMPLIANT•ENCRYPTED•HARTZELL•HR•SECURE•ELECTRONIC•SIGNATURE•ESIGN•ACT•COMPLIANT•ENCRYPTED•HARTZELL•HR•
                            </div>
                          </div>

                          {/* Rosette seal - top left */}
                          <svg className="absolute top-2 left-2 w-10 h-10 pointer-events-none" style={{ zIndex: 4 }}>
                            <defs>
                              <radialGradient id="rosetteGradientTypeTL">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9"/>
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5"/>
                              </radialGradient>
                            </defs>
                            {/* Outer rings */}
                            <circle cx="20" cy="20" r="18" fill="none" stroke="url(#rosetteGradientTypeTL)" strokeWidth="1.5"/>
                            <circle cx="20" cy="20" r="15" fill="none" stroke="url(#rosetteGradientTypeTL)" strokeWidth="1"/>
                            {/* Radiating lines */}
                            {[...Array(16)].map((_, i) => {
                              const angle = (i * 22.5) * Math.PI / 180;
                              const x1 = 20 + Math.cos(angle) * 6;
                              const y1 = 20 + Math.sin(angle) * 6;
                              const x2 = 20 + Math.cos(angle) * 13;
                              const y2 = 20 + Math.sin(angle) * 13;
                              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#rosetteGradientTypeTL)" strokeWidth="1" />;
                            })}
                            <circle cx="20" cy="20" r="5" fill="url(#rosetteGradientTypeTL)"/>
                          </svg>

                          {/* Rosette seal - bottom right */}
                          <svg className="absolute bottom-2 right-2 w-10 h-10 pointer-events-none" style={{ zIndex: 4 }}>
                            <defs>
                              <radialGradient id="rosetteGradientTypeBR">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9"/>
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5"/>
                              </radialGradient>
                            </defs>
                            {/* Outer rings */}
                            <circle cx="20" cy="20" r="18" fill="none" stroke="url(#rosetteGradientTypeBR)" strokeWidth="1.5"/>
                            <circle cx="20" cy="20" r="15" fill="none" stroke="url(#rosetteGradientTypeBR)" strokeWidth="1"/>
                            {/* Radiating lines */}
                            {[...Array(16)].map((_, i) => {
                              const angle = (i * 22.5) * Math.PI / 180;
                              const x1 = 20 + Math.cos(angle) * 6;
                              const y1 = 20 + Math.sin(angle) * 6;
                              const x2 = 20 + Math.cos(angle) * 13;
                              const y2 = 20 + Math.sin(angle) * 13;
                              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#rosetteGradientTypeBR)" strokeWidth="1" />;
                            })}
                            <circle cx="20" cy="20" r="5" fill="url(#rosetteGradientTypeBR)"/>
                          </svg>

                          {/* Micro QR code - top right */}
                          <svg className="absolute top-2 right-2 w-10 h-10 pointer-events-none opacity-70" style={{ zIndex: 4 }}>
                            {/* QR-style pattern */}
                            <rect x="0" y="0" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="2.5" y="0" width="2.5" height="2.5" fill="transparent"/>
                            <rect x="5" y="0" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="7.5" y="0" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="0" y="2.5" width="2.5" height="2.5" fill="transparent"/>
                            <rect x="2.5" y="2.5" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="5" y="2.5" width="2.5" height="2.5" fill="transparent"/>
                            <rect x="7.5" y="2.5" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="0" y="5" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="2.5" y="5" width="2.5" height="2.5" fill="transparent"/>
                            <rect x="5" y="5" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="7.5" y="5" width="2.5" height="2.5" fill="transparent"/>
                            <rect x="0" y="7.5" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="2.5" y="7.5" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="5" y="7.5" width="2.5" height="2.5" fill="transparent"/>
                            <rect x="7.5" y="7.5" width="2.5" height="2.5" fill="#3b82f6"/>
                          </svg>

                          {/* Micro QR code - bottom left */}
                          <svg className="absolute bottom-2 left-2 w-10 h-10 pointer-events-none opacity-70" style={{ zIndex: 4 }}>
                            <rect x="0" y="0" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="2.5" y="0" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="5" y="0" width="2.5" height="2.5" fill="transparent"/>
                            <rect x="7.5" y="0" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="0" y="2.5" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="2.5" y="2.5" width="2.5" height="2.5" fill="transparent"/>
                            <rect x="5" y="2.5" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="7.5" y="2.5" width="2.5" height="2.5" fill="transparent"/>
                            <rect x="0" y="5" width="2.5" height="2.5" fill="transparent"/>
                            <rect x="2.5" y="5" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="5" y="5" width="2.5" height="2.5" fill="transparent"/>
                            <rect x="7.5" y="5" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="0" y="7.5" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="2.5" y="7.5" width="2.5" height="2.5" fill="transparent"/>
                            <rect x="5" y="7.5" width="2.5" height="2.5" fill="#3b82f6"/>
                            <rect x="7.5" y="7.5" width="2.5" height="2.5" fill="#3b82f6"/>
                          </svg>

                          {/* Content */}
                          <div className="relative h-full" style={{ zIndex: 1 }}>
                            {typedName ? (
                              <div className="border-2 border-gray-300 rounded-lg bg-white p-4 w-full h-full flex items-center justify-center">
                                <p style={{ fontFamily: '"Dancing Script", cursive', fontSize: '48px', color: '#000', lineHeight: '1' }}>
                                  {typedName}
                                </p>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                Your signature will appear here
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 bg-white">
                {/* Security Notice */}
                <div className="mb-3 flex items-start gap-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p>Your signature is encrypted and legally binding per the ESIGN Act.</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 md:gap-3">
                  <button
                    onClick={() => {
                      if (signatureMethod === 'draw') {
                        const canvas = document.querySelector('.signature-canvas-enterprise canvas') as any;
                        if (canvas?.clearSignature) canvas.clearSignature();
                      } else {
                        setTypedName('');
                      }
                      setTempSignature(null);
                    }}
                    disabled={!tempSignature}
                    className="px-4 py-2 md:py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm md:text-base"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      setShowSignaturePopup(false);
                      setTempSignature(null);
                      setTypedName('');
                    }}
                    className="flex-1 px-4 py-2 md:py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm md:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSignature}
                    disabled={!tempSignature}
                    className="flex-1 px-4 py-2 md:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm md:text-base shadow-lg"
                  >
                    Place Signature
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
