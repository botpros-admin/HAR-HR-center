'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LogOut, User, FileText, PenTool, Home } from 'lucide-react';
import Link from 'next/link';
import { getInitials } from '@/lib/utils';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: () => api.getSession(),
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !sessionData?.valid) {
      router.push('/login');
    }
  }, [sessionData, isLoading, router]);

  const handleLogout = async () => {
    await api.logout();
    localStorage.removeItem('sessionToken');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-hartzell-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!sessionData?.valid) {
    return null;
  }

  const session = sessionData.session!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-hartzell-navy">
                Hartzell HR Center
              </h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session.name}
                </p>
                <p className="text-xs text-gray-500">{session.badgeNumber}</p>
              </div>
              <div className="w-10 h-10 bg-hartzell-blue rounded-full flex items-center justify-center text-white font-semibold">
                {getInitials(session.name)}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            <NavLink href="/dashboard" icon={Home}>
              Dashboard
            </NavLink>
            <NavLink href="/dashboard/documents" icon={FileText}>
              Documents
            </NavLink>
            <NavLink href="/dashboard/signatures" icon={PenTool}>
              Signatures
            </NavLink>
            <NavLink href="/dashboard/profile" icon={User}>
              Profile
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-4 text-sm font-medium text-gray-600 hover:text-hartzell-blue border-b-2 border-transparent hover:border-hartzell-blue transition-colors"
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}
