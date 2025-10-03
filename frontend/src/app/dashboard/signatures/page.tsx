'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PenTool, ExternalLink, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatRelativeTime, getPriorityColor, getStatusColor } from '@/lib/utils';

export default function SignaturesPage() {
  const { data: signatures, isLoading } = useQuery({
    queryKey: ['signatures'],
    queryFn: () => api.getPendingSignatures(),
  });

  const pending = signatures?.filter((s) => s.status === 'pending') || [];
  const completed = signatures?.filter((s) => s.status === 'signed') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hartzell-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading signatures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <PenTool className="w-8 h-8 text-hartzell-blue" />
            Document Signatures
          </h1>
          <p className="text-gray-600 mt-1">
            Review and sign your pending documents
          </p>
        </div>
      </div>

      {/* Pending Signatures */}
      {pending.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Pending Signatures ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((sig) => (
              <SignatureCard key={sig.id} signature={sig} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Signatures */}
      {completed.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Completed Signatures ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map((sig) => (
              <div
                key={sig.id}
                className="flex items-center justify-between p-4 bg-green-50 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {sig.documentName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Signed {formatDate(sig.signedAt!)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!pending.length && !completed.length && (
        <div className="card text-center py-12">
          <PenTool className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Signature Requests
          </h2>
          <p className="text-gray-600">
            You don't have any documents requiring your signature at this time.
          </p>
        </div>
      )}
    </div>
  );
}

function SignatureCard({ signature }: { signature: any }) {
  const handleSign = async () => {
    try {
      const { url } = await api.getSignatureUrl(signature.id);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to get signature URL:', error);
    }
  };

  return (
    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-1">
        <div className="flex items-start gap-3">
          <PenTool className="w-5 h-5 text-hartzell-blue mt-1" />
          <div>
            <h3 className="font-medium text-gray-900">
              {signature.documentName}
            </h3>
            <div className="flex items-center gap-3 mt-2">
              <span className={`badge ${getPriorityColor(signature.priority)}`}>
                {signature.priority.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">
                Requested {formatRelativeTime(signature.requestedAt)}
              </span>
              {signature.expiresAt && (
                <span className="text-xs text-red-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires {formatRelativeTime(signature.expiresAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <button onClick={handleSign} className="btn-primary flex items-center gap-2">
        Sign Document
        <ExternalLink className="w-4 h-4" />
      </button>
    </div>
  );
}
