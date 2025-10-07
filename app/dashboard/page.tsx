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

type StudyWithCounts = Study & {
  participantCount: number;
  domainCount: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [studies, setStudies] = useState<StudyWithCounts[]>([]);
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

      const studiesWithCounts = await Promise.all(
        (data || []).map(async (study) => {
          const { count: participantCount } = await supabase
            .from('participants')
            .select('id', { count: 'exact', head: true })
            .eq('study_id', study.id);

          const { count: domainCount } = await supabase
            .from('study_domains')
            .select('id', { count: 'exact', head: true })
            .eq('study_id', study.id);

          return {
            ...study,
            participantCount: participantCount || 0,
            domainCount: domainCount || 0,
          };
        })
      );

      setStudies(studiesWithCounts);
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

  const getStageProgress = (study: StudyWithCounts) => {
    const completedCount = study.completed_stages?.length || 0;
    return Math.round((completedCount / 7) * 100);
  };

  const getStageName = (stageNumber: number) => {
    const stages = ['Setup', 'Collecting Proposals', 'Synthesis & Items', 'Rating', 'Re-Rating', 'Validation', 'Results'];
    return stages[stageNumber - 1] || 'Unknown';
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Studies</h1>
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
            <div className="space-y-3">
              {studies.map((study) => {
                const progress = getStageProgress(study);
                return (
                  <Card
                    key={study.id}
                    className="hover:shadow-md transition-all hover:border-blue-300 cursor-pointer"
                    onClick={() => router.push(`/dashboard/studies/${study.id}/review`)}
                  >
                    <CardContent className="py-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900 truncate">
                              {study.title}
                            </h3>
                            <Badge className={getStatusColor(study.status)}>
                              {study.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-1 mb-3">
                            {study.description || 'No description provided'}
                          </p>

                          <div className="flex items-center gap-6 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{study.participantCount} participants</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              <span>{study.domainCount} domains</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Stage {study.current_stage || 1}:</span>
                              <span>{getStageName(study.current_stage || 1)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{progress}% Complete</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/studies/${study.id}/review`);
                          }}
                          className="shrink-0"
                        >
                          Open Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
