'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Microscope, Users, FileText, ChartBar as BarChart } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6 space-x-3">
            <Microscope className="h-16 w-16 text-blue-600" />
            <h1 className="text-5xl font-bold text-slate-900">Delphi Study Platform</h1>
          </div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A secure, low-cost platform for conducting qualitative and quantitative Delphi research studies
            with AI-assisted analysis and consensus tracking.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Button size="lg" onClick={() => router.push('/login')}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/login')}>
              Sign In
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <Users className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-3 text-slate-900">Multi-Round Studies</h3>
            <p className="text-slate-600 leading-relaxed">
              Conduct structured Delphi rounds with participant anonymity and controlled consensus building.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <FileText className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-3 text-slate-900">Qualitative Analysis</h3>
            <p className="text-slate-600 leading-relaxed">
              AI-assisted clustering and summarization of proposals to identify themes and build consensus items.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <BarChart className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-3 text-slate-900">Consensus Analytics</h3>
            <p className="text-slate-600 leading-relaxed">
              Real-time consensus tracking with IQR and net agreement calculations, exportable reports.
            </p>
          </div>
        </div>

        <div className="mt-20 bg-white p-10 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Key Features</h2>
          <ul className="grid md:grid-cols-2 gap-4 text-slate-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Secure authentication and role-based access control</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Participant anonymization with pseudo-IDs</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Customizable Likert scales and consensus rules</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Document management and evidence linking</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>AI-powered recommendation clustering</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Post-assessment participant surveys</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
