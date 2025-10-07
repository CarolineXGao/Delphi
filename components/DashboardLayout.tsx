'use client';

import { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Microscope, ClipboardCheck, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardLayoutProps = {
  children: ReactNode;
  studyTitle?: string;
  studyId?: string;
  showReviewButton?: boolean;
};

export function DashboardLayout({ children, studyTitle, studyId, showReviewButton = false }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <Microscope className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">Delphi</span>
          </button>

          {studyTitle && (
            <>
              <div className="h-6 w-px bg-slate-300" />
              <span className="text-slate-700 font-medium truncate max-w-md">
                {studyTitle}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {showReviewButton && studyId && (
            <Button
              onClick={() => router.push(`/dashboard/studies/${studyId}/review`)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Review
            </Button>
          )}

          {studyId && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/studies/${studyId}/settings`)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="text-slate-600"
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
