'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, FileText, PenTool } from 'lucide-react';
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
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfComponents, setPdfComponents] = useState<any>(null);

  // Multi-page support - arrays for per-page dimensions
  const [pageWidths, setPageWidths] = useState<number[]>([]);
  const [pageHeights, setPageHeights] = useState<number[]>([]);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [convertedFields, setConvertedFields] = useState<FieldPosition[]>([]);

  const queryClient = useQueryClient();

  const allPagesLoaded = loadedPages.size === numPages && numPages > 0;

  // Parse raw fieldPositions
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

  // Convert fields from PDF points to percentages (EXACT same logic as admin view)
  useEffect(() => {
    if (!parsedFieldPositions.length || !allPagesLoaded) return;

    try {
      // Convert from PDF points to percentage coordinates
      const converted = parsedFieldPositions.map((f: any, i: number) => {
        const pageIndex = (f.page || f.pageNumber || 1) - 1;
        const pageWidth = pageWidths[pageIndex] || 800;
        const pageHeight = pageHeights[pageIndex] || 1132;

        // Convert PDF points to percentages
        // X: straightforward conversion (left edge)
        // Y: flip axis back (PDF origin is bottom-left, React is top-left)
        //    PDF Y is the BOTTOM of the field, React Y is the TOP
        const percentX = (f.x / pageWidth) * 100;
        const percentHeight = (f.height / pageHeight) * 100;
        const percentY = ((pageHeight - f.y - f.height) / pageHeight) * 100;
        const percentWidth = (f.width / pageWidth) * 100;

        return {
          ...f,
          id: f.id || `field-${i}`,
          x: percentX,
          y: percentY,
          width: percentWidth,
          height: percentHeight,
          page: f.page || f.pageNumber || 1,
          type: f.type,
          label: f.label,
          required: f.required,
        };
      });

      setConvertedFields(converted);
    } catch (e) {
      console.error('Failed to convert field positions:', e);
    }
  }, [parsedFieldPositions, allPagesLoaded, pageWidths, pageHeights]);

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

  const onDocumentLoadSuccess = (pdf: any) => {
    setNumPages(pdf.numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('[NativeSignatureModal] PDF load error:', error);
    setError(`PDF rendering error: ${error.message}`);
  };

  // Check if all required fields are filled
  const allRequiredFieldsFilled = React.useMemo(() => {
    const requiredFields = convertedFields.filter((f: FieldPosition) => f.required !== false);
    return requiredFields.every((f: FieldPosition) => filledFields.has(f.id!));
  }, [convertedFields, filledFields]);

  // Generate signature from typed name
  const generateTypedSignature = (name: string, isInitials: boolean = false): string => {
    const canvas = document.createElement('canvas');
    canvas.width = isInitials ? 300 : 500;
    canvas.height = isInitials ? 150 : 200;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set cursive font - smaller for initials
    const fontSize = isInitials ? 48 : 64;
    ctx.font = `${fontSize}px "Dancing Script", cursive`;
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
      const isInitials = activeField?.type === 'initials';
      const signatureDataUrl = generateTypedSignature(name, isInitials);
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

  // Render field overlay for a specific page (EXACT same logic as admin view)
  const renderFieldOverlay = (field: FieldPosition, index: number) => {
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
        className={`absolute border-2 ${getFieldColor()} cursor-pointer transition-all ${field.required ? 'border-red-400' : 'border-white'} rounded opacity-60 hover:opacity-90`}
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`,
        }}
        onClick={() => handleFieldClick(field)}
        title={`Click to ${isFilled ? 'edit' : 'fill'} ${field.label}`}
      >
        {/* Required indicator */}
        {field.required && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-10">
            *
          </div>
        )}

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

  // Fields are already in PDF points from database - pass through with proper structure
  const convertFieldsToPdfCoordinates = (fields: FieldPosition[]): any[] => {
    return fields.map((field) => {
      // Fields are already stored in PDF points - no conversion needed
      return {
        page: field.page,
        x: Math.round(field.x),
        y: Math.round(field.y),
        width: Math.round(field.width),
        height: Math.round(field.height),
      };
    });
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
      // Get signature fields that were filled (use raw PDF points from parsedFieldPositions)
      const signatureFields = parsedFieldPositions.filter((f: any) =>
        f.type === 'signature' && filledFields.has(f.id || `field-${parsedFieldPositions.indexOf(f)}`)
      );

      if (signatureFields.length === 0) {
        throw new Error('At least one signature is required');
      }

      // Use the first signature for the signature image
      const signatureFieldId = signatureFields[0].id || `field-${parsedFieldPositions.indexOf(signatureFields[0])}`;
      const signatureData = filledFields.get(signatureFieldId);

      if (!signatureData) {
        throw new Error('Signature data not found');
      }

      // Convert all signature fields to PDF coordinates
      const pdfSignatureFields = convertFieldsToPdfCoordinates(signatureFields);

      console.log('[NativeSignatureModal] Submitting signature:', {
        assignmentId,
        signatureFieldsCount: pdfSignatureFields.length,
        fields: pdfSignatureFields,
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signatures/sign-native`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assignmentId,
          signatureDataUrl: signatureData.data,
          signatureFields: pdfSignatureFields,
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
                      • {numPages} {numPages === 1 ? 'page' : 'pages'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className={filledFields.size === convertedFields.length ? 'text-green-600 font-medium' : ''}>
                    {filledFields.size}/{convertedFields.length} fields completed
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
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
                {/* PDF Viewer - Multi-page scrollable */}
                <div className="flex-1 overflow-auto p-2 md:p-6 bg-gray-50 flex items-start justify-center">
                  <div className="w-full max-w-4xl">
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
                      <>
                        {!allPagesLoaded && (
                          <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                              <p className="text-gray-600">Loading pages... ({loadedPages.size}/{numPages || '?'})</p>
                            </div>
                          </div>
                        )}
                        <pdfComponents.Document
                          file={pdfBlob}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          loading=""
                          className={allPagesLoaded ? '' : 'hidden'}
                        >
                          {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
                            <div key={pageNum} className="relative mb-4 bg-white shadow-lg rounded-lg">
                              {/* Page number indicator */}
                              <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-75 text-white text-xs px-2 py-1 rounded z-20 pointer-events-none">
                                Page {pageNum} of {numPages}
                              </div>

                              <pdfComponents.Page
                                pageNumber={pageNum}
                                width={800}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                onLoadSuccess={(page: any) => {
                                  const { width, height } = page;
                                  setPageWidths(prev => {
                                    const updated = [...prev];
                                    updated[pageNum - 1] = width;
                                    return updated;
                                  });
                                  setPageHeights(prev => {
                                    const updated = [...prev];
                                    updated[pageNum - 1] = height;
                                    return updated;
                                  });
                                  setLoadedPages(prev => new Set([...prev, pageNum]));
                                }}
                                loading=""
                              />

                              {/* Per-page field overlay - EXACT same structure as admin */}
                              <div
                                className="absolute top-0 left-0 w-full h-full rounded-lg"
                                style={{ height: pageHeights[pageNum - 1] || 'auto' }}
                              >
                                {convertedFields
                                  .filter((field: FieldPosition) => field.page === pageNum)
                                  .map((field: FieldPosition, index: number) =>
                                    renderFieldOverlay(field, index)
                                  )}
                              </div>
                            </div>
                          ))}
                        </pdfComponents.Document>
                      </>
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
                          {activeField.type === 'initials'
                            ? (isTouchDevice ? 'Draw your initials with your finger or stylus' : 'Draw your initials using mouse or trackpad')
                            : (isTouchDevice ? 'Draw your signature with your finger or stylus' : 'Draw your signature using mouse or trackpad')}
                        </p>
                      </div>

                      {/* Signature Canvas */}
                      <div className="relative flex-shrink-0">
                        <SignatureCanvas
                          onSave={handleSaveSignature}
                          onClear={() => setTempSignature(null)}
                          width={activeField.type === 'initials' ? 300 : 500}
                          height={activeField.type === 'initials' ? 150 : 200}
                          showButtons={false}
                          autoSaveOnDraw={true}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-3 flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {activeField.type === 'initials' ? 'Type your initials' : 'Type your full name'}
                        </label>
                        <input
                          type="text"
                          value={typedName}
                          onChange={handleTypedNameChange}
                          placeholder={activeField.type === 'initials' ? 'Enter initials (e.g., JD)' : 'Enter your name'}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-base"
                          autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          {activeField.type === 'initials'
                            ? 'Your initials will appear in cursive script'
                            : 'Your name will appear in cursive script'}
                        </p>
                      </div>

                      <div className="flex-1 flex items-center justify-center min-h-0">
                        {/* Signature Preview Area */}
                        <div className="relative w-full" style={{ height: '200px' }}>
                          <div className="relative h-full">
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
