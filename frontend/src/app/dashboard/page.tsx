'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AlertCircle, CheckCircle2, Clock, FileText, PenTool } from 'lucide-react';
import Link from 'next/link';
import { formatRelativeTime, getPriorityColor, getStatusColor } from '@/lib/utils';

export default function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  });

  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.getDocuments(),
  });

  const pendingTasks = tasks?.filter((t) => !t.completedAt) || [];
  const urgentTasks = pendingTasks.filter((t) => t.priority === 'high');
  const needsAttentionDocs = documents?.filter((d) => d.needsAttention) || [];
  const urgentDocs = documents?.filter((d) => d.isUrgent) || [];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
        <p className="text-gray-600 mt-1">
          Here's what needs your attention today
        </p>
      </div>

      {/* Action Cards - Prioritized */}
      {urgentTasks.length > 0 && (
        <div className="card border-l-4 border-l-red-500 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">
                Urgent: {urgentTasks.length} {urgentTasks.length === 1 ? 'Item' : 'Items'} Require Immediate Attention
              </h3>
              <div className="space-y-2">
                {urgentTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 bg-white rounded"
                  >
                    <span className="text-sm text-gray-900">{task.title}</span>
                    <Link
                      href={getTaskLink(task)}
                      className="text-sm text-hartzell-blue hover:underline font-medium"
                    >
                      Take Action →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Needs Attention"
          value={needsAttentionDocs.length}
          icon={FileText}
          color="blue"
          href="/dashboard/documents"
        />
        <StatCard
          title="Action Items"
          value={summary?.pendingTasks || 0}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Profile Complete"
          value={`${summary?.profileComplete || 0}%`}
          icon={CheckCircle2}
          color="purple"
          href="/dashboard/profile"
        />
      </div>

      {/* Documents Needing Attention */}
      {needsAttentionDocs.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-hartzell-blue" />
              Documents Needing Attention
            </h2>
            <Link
              href="/dashboard/documents"
              className="text-sm text-hartzell-blue hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {needsAttentionDocs.slice(0, 5).map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    {doc.status === 'sent' && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        Signature Required
                      </span>
                    )}
                    {doc.priority === 'high' && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                        URGENT
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      Assigned {formatRelativeTime(doc.assignedAt)}
                    </span>
                  </div>
                </div>
                <Link
                  href="/dashboard/documents"
                  className="btn-primary"
                >
                  {doc.status === 'sent' ? 'Sign Now' : 'View'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-hartzell-blue" />
              Your Action Items
            </h2>
          </div>
          <div className="space-y-3">
            {pendingTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{task.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`badge ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-gray-500">
                        Due {formatRelativeTime(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={getTaskLink(task)}
                  className="btn-primary whitespace-nowrap"
                >
                  Complete
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Clear Message */}
      {!urgentTasks.length &&
        !needsAttentionDocs.length &&
        !pendingTasks.length && (
          <div className="card text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              All Caught Up!
            </h2>
            <p className="text-gray-600">
              You have no pending tasks or documents at this time.
            </p>
          </div>
        )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: number | string;
  icon: any;
  color: 'blue' | 'yellow' | 'green' | 'purple';
  href?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const content = (
    <>
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card hover:shadow-md transition-shadow">
        {content}
      </Link>
    );
  }

  return <div className="card">{content}</div>;
}

function getTaskLink(task: any): string {
  if (task.type === 'signature_required') {
    return `/dashboard/signatures/${task.metadata?.signatureRequestId}`;
  }
  if (task.type === 'document_upload') {
    return `/dashboard/documents`;
  }
  return `/dashboard/profile`;
}
