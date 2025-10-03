'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText, Download, Eye, PenTool } from 'lucide-react';
import { formatDate, getStatusColor } from '@/lib/utils';

export default function DocumentsPage() {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.getDocuments(),
  });

  const categories = [
    { id: 'signature_required', name: 'Requires Signature', color: 'red' },
    { id: 'personal', name: 'Personal Documents', color: 'blue' },
    { id: 'benefits', name: 'Benefits', color: 'green' },
    { id: 'payroll', name: 'Payroll', color: 'purple' },
    { id: 'policy', name: 'Policies', color: 'gray' },
  ];

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="w-8 h-8 text-hartzell-blue" />
          My Documents
        </h1>
        <p className="text-gray-600 mt-1">
          Access and manage your HR documents
        </p>
      </div>

      {/* Document Categories */}
      {categories.map((category) => {
        const categoryDocs = documents?.filter(
          (doc) => doc.category === category.id
        );

        if (!categoryDocs || categoryDocs.length === 0) return null;

        return (
          <div key={category.id} className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {category.name} ({categoryDocs.length})
            </h2>
            <div className="space-y-2">
              {categoryDocs.map((doc) => (
                <DocumentRow key={doc.id} document={doc} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {!documents || documents.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Documents Yet
          </h2>
          <p className="text-gray-600">
            Your HR documents will appear here once they're available.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function DocumentRow({ document }: { document: any }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <FileText className="w-5 h-5 text-hartzell-blue" />
        <div>
          <h3 className="font-medium text-gray-900">{document.title}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500">
              Uploaded {formatDate(document.uploadedAt)}
            </span>
            {document.requiresSignature && (
              <span
                className={`badge ${getStatusColor(document.signatureStatus || 'pending')}`}
              >
                {document.signatureStatus === 'pending'
                  ? 'Signature Required'
                  : document.signatureStatus === 'signed'
                  ? 'Signed'
                  : 'Signature Expired'}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {document.requiresSignature && document.signatureStatus === 'pending' && (
          <button className="btn-primary flex items-center gap-2">
            <PenTool className="w-4 h-4" />
            Sign
          </button>
        )}
        {document.url && (
          <>
            <button className="btn-secondary flex items-center gap-2">
              <Eye className="w-4 h-4" />
              View
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </button>
          </>
        )}
      </div>
    </div>
  );
}
