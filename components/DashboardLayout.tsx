'use client';

import { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Microscope, LayoutDashboard, FileText, ChartBar as BarChart, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed left-0 top-0 h-full w-20 bg-white border-r border-slate-200 py-6 flex flex-col items-center">
        <div className="mb-8">
          <Microscope className="h-8 w-8 text-blue-600" />
        </div>

        <nav className="space-y-4 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-700 hover:bg-slate-100'
                )}
                title={item.label}
              >
                <Icon className="h-6 w-6" />
              </button>
            );
          })}
        </nav>

        <button
          onClick={handleSignOut}
          className="flex items-center justify-center w-12 h-12 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          title="Sign Out"
        >
          <LogOut className="h-6 w-6" />
        </button>
      </aside>

      <main className="ml-20 p-8">
        {children}
      </main>
    </div>
  );
}
