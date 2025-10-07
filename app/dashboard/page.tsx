'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase, Study } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Users, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudies();
  }, [user]);

  const loadStudies = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('studies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStudies(data || []);
    } catch (error: any) {
      toast.error('Failed to load studies');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-600 mt-1">Manage your Delphi research studies</p>
            </div>
            <Button onClick={() => router.push('/dashboard/studies/new')} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              New Study
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Loading studies...</p>
            </div>
          ) : studies.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No studies yet</h3>
                <p className="text-slate-600 mb-6">Create your first Delphi study to get started</p>
                <Button onClick={() => router.push('/dashboard/studies/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Study
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studies.map((study) => (
                <Card
                  key={study.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/studies/${study.id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge className={getStatusColor(study.status)}>
                        {study.status}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        Round {study.current_round}/{study.total_rounds}
                      </span>
                    </div>
                    <CardTitle className="text-xl">{study.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {study.description || 'No description provided'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        <span>0 participants</span>
                      </div>
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span>{study.domains?.length || 0} domains</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
