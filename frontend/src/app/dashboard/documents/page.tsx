'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText, Download, Eye, PenTool, Search, CheckCircle, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Toast, ToastContainer } from '@/components/Toast';
import { SignatureModal } from '@/components/SignatureModal';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';

type FilterType = 'all' | 'needs-attention' | 'onboarding' | 'tax' | 'benefits' | 'policy' | 'other';

export default function DocumentsPage() {
  const [filter, setFilter] = useState<FilterType>('needs-attention');
  const [searchTerm, setSearchTerm] = useState('');
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [signatureModal, setSignatureModal] = useState<{
    isOpen: boolean;
    signatureUrl: string;
    documentTitle: string;
    assignmentId: number;
  } | null>(null);
  const [viewerModal, setViewerModal] = useState<{
    isOpen: boolean;
    document: any;
  } | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const docs = await api.getDocuments();
      console.log('Fetched documents from API:', docs);
      if (docs && docs.length > 0) {
        console.log('First document fieldPositions:', docs[0].fieldPositions);
      }
      return docs;
    },
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Filter documents
  const filteredDocs = documents?.filter(doc => {
    // Search filter
    if (searchTerm && !doc.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Status/category filter
    if (filter === 'needs-attention') {
      return doc.needsAttention;
    } else if (filter === 'all') {
      return true;
    } else {
      return doc.category === filter;
    }
  }) || [];

  // Separate into sections
  const urgentDocs = filteredDocs.filter(doc => doc.isUrgent && doc.needsAttention);
  const needsAttentionDocs = filteredDocs.filter(doc => doc.needsAttention && !doc.isUrgent);
  const recentDocs = filteredDocs.filter(doc => !doc.needsAttention && !doc.isComplete);
  const completedDocs = filteredDocs.filter(doc => doc.isComplete);

  const needsAttentionCount = documents?.filter(d => d.needsAttention).length || 0;

  const handleDownload = async (assignmentId: number, title: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employee/documents/download/${assignmentId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('Document downloaded successfully', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download document', 'error');
    }
  };

  const handleSign = (signatureUrl: string | null, documentTitle: string, assignmentId: number) => {
    if (signatureUrl) {
      setSignatureModal({
        isOpen: true,
        signatureUrl,
        documentTitle,
        assignmentId,
      });
    } else {
      showToast('Signature URL not available. Please contact HR.', 'error');
    }
  };

  const closeSignatureModal = () => {
    setSignatureModal(null);
  };

  const handleSignatureSuccess = () => {
    showToast('Document signed successfully!', 'success');
  };

  const handleView = (document: any) => {
    console.log('Opening document viewer with document:', document);
    console.log('Document fieldPositions:', document.fieldPositions);
    console.log('Document requiresSignature:', document.requiresSignature);
    console.log('Document signatureUrl:', document.signatureUrl);
    console.log('Document status:', document.status);
    setViewerModal({
      isOpen: true,
      document,
    });
  };

  const closeViewerModal = () => {
    setViewerModal(null);
  };

  const handleSignFromViewer = () => {
    if (viewerModal?.document) {
      // Close viewer
      closeViewerModal();
      // Open signature modal
      handleSign(
        viewerModal.document.signatureUrl,
        viewerModal.document.title,
        viewerModal.document.id
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hartzell-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>

      {/* Signature Modal */}
      {signatureModal && (
        <SignatureModal
          isOpen={signatureModal.isOpen}
          onClose={closeSignatureModal}
          signatureUrl={signatureModal.signatureUrl}
          documentTitle={signatureModal.documentTitle}
          assignmentId={signatureModal.assignmentId}
          onSuccess={handleSignatureSuccess}
        />
      )}

      {/* Document Viewer Modal */}
      {viewerModal && (
        <DocumentViewerModal
          isOpen={viewerModal.isOpen}
          onClose={closeViewerModal}
          documentTitle={viewerModal.document.title}
          assignmentId={viewerModal.document.id}
          requiresSignature={viewerModal.document.requiresSignature}
          signatureUrl={viewerModal.document.signatureUrl}
          fieldPositions={viewerModal.document.fieldPositions}
          onSignNow={handleSignFromViewer}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="w-8 h-8 text-hartzell-blue" />
          Documents
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your documents and signature requests
        </p>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <FilterPill
          active={filter === 'needs-attention'}
          onClick={() => setFilter('needs-attention')}
          badge={needsAttentionCount}
          urgent={needsAttentionCount > 0}
        >
          Needs Attention
        </FilterPill>
        <FilterPill
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All Documents ({documents?.length || 0})
        </FilterPill>
        <FilterPill
          active={filter === 'onboarding'}
          onClick={() => setFilter('onboarding')}
        >
          Onboarding
        </FilterPill>
        <FilterPill
          active={filter === 'tax'}
          onClick={() => setFilter('tax')}
        >
          Tax Forms
        </FilterPill>
        <FilterPill
          active={filter === 'benefits'}
          onClick={() => setFilter('benefits')}
        >
          Benefits
        </FilterPill>
        <FilterPill
          active={filter === 'policy'}
          onClick={() => setFilter('policy')}
        >
          Policies
        </FilterPill>
      </div>

      {/* Urgent Documents */}
      {urgentDocs.length > 0 && (
        <div className="card border-2 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Urgent - Action Required</h2>
          </div>
          <div className="space-y-2">
            {urgentDocs.map(doc => (
              <DocumentRow
                key={doc.id}
                document={doc}
                onSign={handleSign}
                onView={handleView}
                onDownload={handleDownload}
              />
            ))}
          </div>
        </div>
      )}

      {/* Needs Attention */}
      {needsAttentionDocs.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-yellow-600" />
            <h2 className="text-xl font-bold text-gray-900">Needs Your Attention</h2>
          </div>
          <div className="space-y-2">
            {needsAttentionDocs.map(doc => (
              <DocumentRow
                key={doc.id}
                document={doc}
                onSign={handleSign}
                onView={handleView}
                onDownload={handleDownload}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Documents */}
      {recentDocs.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Documents</h2>
          <div className="space-y-2">
            {recentDocs.map(doc => (
              <DocumentRow
                key={doc.id}
                document={doc}
                onSign={handleSign}
                onView={handleView}
                onDownload={handleDownload}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Documents */}
      {completedDocs.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Completed ({completedDocs.length})
          </h2>
          <div className="space-y-2">
            {completedDocs.map(doc => (
              <DocumentRow
                key={doc.id}
                document={doc}
                onSign={handleSign}
                onView={handleView}
                onDownload={handleDownload}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredDocs.length === 0 && (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {searchTerm ? 'No Documents Found' : 'No Documents Yet'}
          </h2>
          <p className="text-gray-600">
            {searchTerm
              ? `No documents match "${searchTerm}"`
              : 'Your HR documents will appear here once they\'re available.'}
          </p>
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
  badge,
  urgent = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
  urgent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full text-sm font-medium transition-all
        ${active
          ? urgent
            ? 'bg-red-600 text-white'
            : 'bg-hartzell-blue text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
      `}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="ml-2 px-2 py-0.5 bg-white text-gray-900 rounded-full text-xs font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

function DocumentRow({
  document,
  onSign,
  onView,
  onDownload,
}: {
  document: any;
  onSign: (url: string | null, title: string, assignmentId: number) => void;
  onView: (document: any) => void;
  onDownload: (id: number, title: string) => void;
}) {
  const getStatusIcon = () => {
    if (document.isComplete) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (document.status === 'sent') {
      return <PenTool className="w-5 h-5 text-yellow-600" />;
    } else if (document.isExpired) {
      return <XCircle className="w-5 h-5 text-red-600" />;
    } else {
      return <FileText className="w-5 h-5 text-hartzell-blue" />;
    }
  };

  const getStatusBadge = () => {
    if (document.status === 'sent') {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
          Signature Required
        </span>
      );
    } else if (document.isComplete) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
          Signed {document.signedAt && `• ${formatDate(document.signedAt)}`}
        </span>
      );
    } else if (document.isExpired) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
          Expired
        </span>
      );
    } else if (document.status === 'assigned') {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
          Assigned
        </span>
      );
    }
    return null;
  };

  return (
    <div className={`
      flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg transition-all gap-3
      ${document.isUrgent
        ? 'bg-red-50 border-2 border-red-200 hover:bg-red-100'
        : document.needsAttention
        ? 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
        : 'bg-gray-50 hover:bg-gray-100'
      }
    `}>
      <div className="flex items-center gap-3 flex-1">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-gray-900">{document.title}</h3>
            {getStatusBadge()}
            {document.priority === 'high' && !document.isComplete && (
              <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                URGENT
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="capitalize">{document.category}</span>
            <span>•</span>
            <span>Assigned {formatDate(document.assignedAt)}</span>
            {document.dueDate && (
              <>
                <span>•</span>
                <span className={document.isUrgent ? 'text-red-600 font-medium' : ''}>
                  Due {formatDate(document.dueDate)}
                </span>
              </>
            )}
          </div>
          {document.description && (
            <p className="text-sm text-gray-600 mt-1">{document.description}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:flex-shrink-0">
        {document.status === 'sent' && (
          <button
            onClick={() => onSign(document.signatureUrl, document.title, document.id)}
            className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <PenTool className="w-4 h-4" />
            Sign Now
          </button>
        )}
        {document.isComplete && document.signedDocumentUrl && (
          <button
            onClick={() => onView(document)}
            className="btn-secondary flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Eye className="w-4 h-4" />
            View Signed
          </button>
        )}
        {!document.isComplete && document.status === 'assigned' && (
          <button
            onClick={() => onView(document)}
            className="btn-secondary flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
        )}
        <button
          onClick={() => onDownload(document.id, document.title)}
          className="btn-secondary flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>
    </div>
  );
}
