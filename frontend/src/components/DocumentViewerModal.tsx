'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, PenTool, Download, ZoomIn, ZoomOut } from 'lucide-react';
import dynamic from 'next/dynamic';

// Load react-pdf components only on client side
const Document = dynamic(
  () => import('react-pdf').then(mod => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then(mod => mod.Page),
  { ssr: false }
);

// Configure PDF.js worker (client-side only)
if (typeof window !== 'undefined') {
  import('react-pdf').then(({ pdfjs }) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  });
}

interface Field {
  id: string;
  type: 'signature' | 'initials' | 'date' | 'text' | 'checkbox';
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  pageNumber: number;
  label?: string;
  required?: boolean;
}

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  assignmentId: number;
  requiresSignature: boolean;
  signatureUrl?: string | null;
  fieldPositions?: any;
  onSignNow?: () => void;
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  documentTitle,
  assignmentId,
  requiresSignature,
  signatureUrl,
  fieldPositions,
  onSignNow,
}: DocumentViewerModalProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [pageHeights, setPageHeights] = useState<number[]>([]);
  const [pageWidths, setPageWidths] = useState<number[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [scale, setScale] = useState(1.0);

  const allPagesLoaded = loadedPages.size === numPages && numPages > 0;

  // Load PDF as blob
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    let blobUrl: string | null = null;

    const loadPdf = async () => {
      try {
        setPdfLoading(true);
        setPdfError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/employee/documents/download/${assignmentId}`,
          {
            credentials: 'include',
            headers: {
              Accept: 'application/pdf',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load PDF: ${response.status}`);
        }

        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);

        if (mounted) {
          setPdfBlobUrl(blobUrl);
          setPdfLoading(false);
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
        if (mounted) {
          setPdfError((error as Error).message);
          setPdfLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      mounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, assignmentId]);

  // Load and convert field positions
  useEffect(() => {
    console.log('DocumentViewerModal - Field positions debug:', {
      fieldPositions,
      fieldPositionsType: typeof fieldPositions,
      allPagesLoaded,
      numPages,
      loadedPagesCount: loadedPages.size
    });

    if (!fieldPositions || !allPagesLoaded) {
      console.log('Skipping field loading:', {
        hasFieldPositions: !!fieldPositions,
        allPagesLoaded
      });
      return;
    }

    try {
      const parsed =
        typeof fieldPositions === 'string'
          ? JSON.parse(fieldPositions)
          : fieldPositions;

      console.log('Parsed field positions:', parsed);

      // Convert from PDF points to percentage coordinates
      const convertedFields = parsed.map((f: any, i: number) => {
        const pageIndex = (f.page || f.pageNumber || 1) - 1;
        const pageWidth = pageWidths[pageIndex] || 800;
        const pageHeight = pageHeights[pageIndex] || 1132;

        const percentX = (f.x / pageWidth) * 100;
        const percentHeight = (f.height / pageHeight) * 100;
        const percentY = ((pageHeight - f.y - f.height) / pageHeight) * 100;
        const percentWidth = (f.width / pageWidth) * 100;

        return {
          ...f,
          id: f.id || `field_${i}`,
          x: percentX,
          y: percentY,
          width: percentWidth,
          height: percentHeight,
          pageNumber: f.page || f.pageNumber || 1,
        };
      });

      console.log('Converted fields:', convertedFields);
      setFields(convertedFields);
    } catch (e) {
      console.error('Failed to parse field positions:', e);
    }
  }, [fieldPositions, allPagesLoaded, pageWidths, pageHeights]);

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoadedPages(new Set());
  };

  const handlePageLoadSuccess = (page: any, pageNumber: number) => {
    setLoadedPages((prev) => new Set([...prev, pageNumber]));
    setPageHeights((prev) => {
      const heights = [...prev];
      heights[pageNumber - 1] = page.height;
      return heights;
    });
    setPageWidths((prev) => {
      const widths = [...prev];
      widths[pageNumber - 1] = page.width;
      return widths;
    });
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/employee/documents/download/${assignmentId}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const getFieldColor = (type: Field['type']) => {
    switch (type) {
      case 'signature':
        return 'bg-blue-600';
      case 'initials':
        return 'bg-indigo-600';
      case 'date':
        return 'bg-cyan-700';
      case 'checkbox':
        return 'bg-slate-600';
      case 'text':
        return 'bg-gray-600';
      default:
        return 'bg-blue-600';
    }
  };

  const getFieldExample = (type: Field['type']) => {
    switch (type) {
      case 'signature':
        return 'John Doe';
      case 'initials':
        return 'JD';
      case 'checkbox':
        return '☑';
      case 'date':
        return new Date().toLocaleDateString();
      case 'text':
        return 'Enter text...';
      default:
        return '';
    }
  };

  const getFieldExampleStyle = (type: Field['type']) => {
    switch (type) {
      case 'signature':
        return 'font-serif italic text-base';
      case 'initials':
        return 'font-serif italic font-bold text-sm';
      case 'checkbox':
        return 'text-2xl';
      case 'date':
        return 'text-xs';
      case 'text':
        return 'text-xs italic opacity-80';
      default:
        return 'text-xs';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
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
            <div className="flex items-center gap-3 flex-1">
              <h2 className="text-xl font-bold text-gray-900">{documentTitle}</h2>
              {pdfLoading && (
                <Loader2 className="w-5 h-5 text-hartzell-blue animate-spin" />
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 mr-4">
              <button
                onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(Math.min(2, scale + 0.1))}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {requiresSignature && onSignNow && signatureUrl && (
                <button
                  onClick={onSignNow}
                  className="px-6 py-3 bg-hartzell-blue text-white rounded-lg font-bold text-base hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 transform hover:scale-105"
                >
                  <PenTool className="w-5 h-5" />
                  Sign Now
                </button>
              )}
              <button
                onClick={handleDownload}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Signature Status Info Bar - Single source of truth */}
          {requiresSignature && (
            <div className={`px-6 py-3 border-b ${
              signatureUrl
                ? 'bg-green-50 border-green-100'
                : 'bg-yellow-50 border-yellow-100'
            }`}>
              {signatureUrl ? (
                <p className="text-sm text-gray-700 flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-900">
                    Ready for signature.
                  </span>
                  <span>
                    Review the document and signature fields below, then click "Sign Now" to proceed.
                  </span>
                </p>
              ) : (
                <p className="text-sm text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium text-yellow-900">
                    Setting up signature request...
                  </span>
                  <span>
                    We're preparing your signing interface. This usually takes a few moments. Refresh the page in a minute if this persists.
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            {pdfError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md px-4">
                  <X className="w-16 h-16 text-red-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Error Loading Document
                  </h3>
                  <p className="text-gray-600">{pdfError}</p>
                </div>
              </div>
            ) : pdfBlobUrl ? (
              <div className="flex justify-center">
                <div className="relative">
                  <Document
                    file={pdfBlobUrl}
                    onLoadSuccess={handleDocumentLoadSuccess}
                    onLoadError={(error) => setPdfError(error.message)}
                    loading={
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-hartzell-blue animate-spin" />
                      </div>
                    }
                  >
                    {Array.from(new Array(numPages), (el, index) => {
                      const pageNumber = index + 1;
                      const pageFields = fields.filter(
                        (f) => f.pageNumber === pageNumber
                      );

                      return (
                        <div key={pageNumber} className="mb-4 relative shadow-lg" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                          {/* Page number indicator */}
                          <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-75 text-white text-xs px-2 py-1 rounded z-20 pointer-events-none">
                            Page {pageNumber} of {numPages}
                          </div>

                          <Page
                            pageNumber={pageNumber}
                            width={800}
                            onLoadSuccess={(page) =>
                              handlePageLoadSuccess(page, pageNumber)
                            }
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />

                          {/* Field Overlays */}
                          {allPagesLoaded && pageFields.length > 0 && (
                            <div className="absolute inset-0 pointer-events-none">
                              {pageFields.map((field) => (
                                <div
                                  key={field.id}
                                  className={`absolute ${getFieldColor(
                                    field.type
                                  )} opacity-40 border-2 ${field.required ? 'border-red-400' : 'border-white'} rounded group transition-all hover:opacity-60`}
                                  style={{
                                    left: `${field.x}%`,
                                    top: `${field.y}%`,
                                    width: `${field.width}%`,
                                    height: `${field.height}%`,
                                  }}
                                >
                                  {/* Required indicator - always visible */}
                                  {field.required && (
                                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-10">
                                      *
                                    </div>
                                  )}

                                  {/* Field example - always visible */}
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className={`text-white drop-shadow-md ${getFieldExampleStyle(field.type)}`}>
                                      {getFieldExample(field.type)}
                                    </span>
                                  </div>

                                  {/* Field label - only visible on hover */}
                                  <div className="absolute inset-0 bg-black bg-opacity-80 rounded flex flex-col items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-semibold">
                                      {field.label || field.type.charAt(0).toUpperCase() + field.type.slice(1)}
                                    </span>
                                    <span className={`text-xs mt-1 ${field.required ? 'text-red-300' : 'text-gray-300'}`}>
                                      {field.required ? 'Required' : 'Optional'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </Document>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-12 h-12 text-hartzell-blue animate-spin" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Review the document carefully. Signature fields are highlighted in color.
                </span>
              </div>
              {numPages > 0 && (
                <span className="font-medium">
                  {numPages} {numPages === 1 ? 'page' : 'pages'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
