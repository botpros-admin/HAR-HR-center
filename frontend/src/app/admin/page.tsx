'use client';

import { FileText, Users, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface DashboardStats {
  totalTemplates: number;
  activeTemplates: number;
  pendingSignatures: number;
  completedToday: number;
  overdueAssignments: number;
  totalEmployees: number;
}

interface Activity {
  id: number;
  employeeName: string | null;
  action: string;
  status: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: string;
}

// Helper function to format ISO timestamp into relative time
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch stats and recent activity in parallel
        const [statsResponse, activitiesResponse] = await Promise.all([
          api.getDashboardStats(),
          api.getRecentActivity(10)
        ]);

        setStats(statsResponse.stats);
        setActivities(activitiesResponse.activities);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError((err as Error).message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-hartzell-blue animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Manage documents, templates, and employee assignments
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Document Templates"
          value={stats.totalTemplates}
          subtitle={`${stats.activeTemplates} active`}
          icon={FileText}
          color="blue"
          href="/admin/templates"
        />
        <StatCard
          title="Pending Signatures"
          value={stats.pendingSignatures}
          subtitle="Awaiting employee action"
          icon={Clock}
          color="yellow"
          href="/admin/assignments"
        />
        <StatCard
          title="Completed Today"
          value={stats.completedToday}
          subtitle="Documents signed"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          subtitle="In system"
          icon={Users}
          color="purple"
          href="/admin/employees"
        />
        <StatCard
          title="Overdue Assignments"
          value={stats.overdueAssignments}
          subtitle="Need attention"
          icon={AlertCircle}
          color="red"
          href="/admin/assignments?filter=overdue"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            href="/admin/templates?action=new"
            icon={FileText}
            title="Upload Template"
            description="Add new document"
          />
          <QuickAction
            href="/admin/assignments?action=new"
            icon={Users}
            title="Assign Documents"
            description="Send to employees"
          />
          <QuickAction
            href="/admin/assignments?filter=pending"
            icon={Clock}
            title="View Pending"
            description="Track progress"
          />
          <QuickAction
            href="/admin/assignments?filter=overdue"
            icon={AlertCircle}
            title="Overdue Items"
            description="Send reminders"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                action={activity.action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                description={activity.message}
                time={formatTimestamp(activity.timestamp)}
                type={activity.type}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: any;
  color: 'blue' | 'yellow' | 'green' | 'purple' | 'red';
  href?: string;
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };

  const card = (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-hartzell-blue hover:bg-blue-50 transition-all"
    >
      <div className="p-2 bg-hartzell-blue/10 rounded-lg">
        <Icon className="w-5 h-5 text-hartzell-blue" />
      </div>
      <div>
        <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </Link>
  );
}

function ActivityItem({
  action,
  description,
  time,
  type,
}: {
  action: string;
  description: string;
  time: string;
  type: 'success' | 'info' | 'error';
}) {
  const colors = {
    success: 'bg-green-100 text-green-600',
    info: 'bg-blue-100 text-blue-600',
    error: 'bg-red-100 text-red-600',
  };

  return (
    <div className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
      <div className={`p-1.5 rounded-full ${colors[type]} mt-0.5`}>
        <div className="w-2 h-2 rounded-full bg-current"></div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{action}</p>
        <p className="text-sm text-gray-600 mt-0.5">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  );
}
