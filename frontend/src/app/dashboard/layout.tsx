'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LogOut, User, FileText, Home, Menu, X, Shield } from 'lucide-react';
import Link from 'next/link';
import { getInitials } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    // Session cookie is cleared by the server
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {/* Hamburger Button - Mobile Only */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>

              <img
                src="https://hartzellpainting.com/wp-content/uploads/2025/05/Heartzell-Logo.png"
                alt="Hartzell Logo"
                className="h-8 w-auto"
              />
              <h1 className="text-xl font-bold text-hartzell-navy hidden sm:block">
                Employee Portal
              </h1>
            </div>

            {/* User Menu - Desktop Only */}
            <div className="hidden lg:flex items-center gap-4">
              {session.role === 'hr_admin' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-hartzell-blue hover:bg-hartzell-blue hover:text-white rounded-lg transition-colors"
                  title="Go to Admin Portal"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Portal</span>
                </Link>
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session.name}
                </p>
                <p className="text-xs text-gray-500">{session.badgeNumber}</p>
              </div>
              <div className="w-10 h-10 bg-hartzell-blue rounded-full flex items-center justify-center text-white font-semibold text-sm">
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

            {/* User Avatar - Mobile Only */}
            <div className="lg:hidden w-8 h-8 bg-hartzell-blue rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {getInitials(session.name)}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-black bg-opacity-50 z-30" onClick={() => setMobileMenuOpen(false)}>
          <div className="bg-white w-64 h-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            {/* User Info */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-hartzell-blue rounded-full flex items-center justify-center text-white font-semibold">
                  {getInitials(session.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{session.name}</p>
                  <p className="text-xs text-gray-500">{session.badgeNumber}</p>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="p-2">
              <MobileNavLink href="/dashboard" icon={Home} onClick={() => setMobileMenuOpen(false)}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink href="/dashboard/documents" icon={FileText} onClick={() => setMobileMenuOpen(false)}>
                Documents
              </MobileNavLink>
              <MobileNavLink href="/dashboard/profile" icon={User} onClick={() => setMobileMenuOpen(false)}>
                Profile
              </MobileNavLink>

              {/* Divider */}
              {session.role === 'hr_admin' && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  <MobileNavLink href="/admin" icon={Shield} onClick={() => setMobileMenuOpen(false)}>
                    Admin Portal
                  </MobileNavLink>
                </>
              )}
            </nav>

            {/* Logout Button */}
            <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      <nav className="hidden lg:block bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            <NavLink href="/dashboard" icon={Home} isActive={pathname === '/dashboard'}>
              Dashboard
            </NavLink>
            <NavLink href="/dashboard/documents" icon={FileText} isActive={pathname === '/dashboard/documents'}>
              Documents
            </NavLink>
            <NavLink href="/dashboard/profile" icon={User} isActive={pathname === '/dashboard/profile'}>
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
  isActive,
  children,
}: {
  href: string;
  icon: any;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        isActive
          ? 'text-hartzell-blue border-hartzell-blue'
          : 'text-gray-600 hover:text-hartzell-blue border-transparent hover:border-hartzell-blue'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{children}</span>
    </Link>
  );
}

function MobileNavLink({
  href,
  icon: Icon,
  onClick,
  children,
}: {
  href: string;
  icon: any;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium">{children}</span>
    </Link>
  );
}
