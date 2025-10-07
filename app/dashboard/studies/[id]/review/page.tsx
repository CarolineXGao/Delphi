'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase, Study } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Users, FileText, MessageSquare, CheckCircle2, Clock, TrendingUp, AlertCircle } from 'lucide-react';

const SimpleProgressBar = ({ value }: { value: number }) => (
  <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
    <div
      className="h-full bg-blue-600 transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

type ProgressStats = {
  totalParticipants: number;
  activeParticipants: number;
  totalDomains: number;
  totalQuestions: number;
  totalProposals: number;
  totalItems: number;
  totalRounds: number;
  completedRounds: number;
  currentRoundResponses: number;
  expectedCurrentRoundResponses: number;
  consensusItemsCount: number;
};

export default function ProgressReviewPage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params?.id as string;

  const [study, setStudy] = useState<Study | null>(null);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studyId) {
      loadProgressData();
    }
  }, [studyId]);

  const loadProgressData = async () => {
    try {
      const { data: studyData, error: studyError } = await supabase
        .from('studies')
        .select('*')
        .eq('id', studyId)
        .maybeSingle();

      if (studyError) throw studyError;
      if (!studyData) {
        toast.error('Study not found');
        router.push('/dashboard');
        return;
      }
      setStudy(studyData);

      const { count: participantsCount } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId);

      const { count: activeParticipantsCount } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId)
        .not('joined_at', 'is', null);

      const { count: domainsCount } = await supabase
        .from('study_domains')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId);

      const { count: questionsCount } = await supabase
        .from('proposal_questions')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId);

      const { count: proposalsCount } = await supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId)
        .eq('status', 'submitted');

      const { count: itemsCount } = await supabase
        .from('delphi_items')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId);

      const { count: roundsCount } = await supabase
        .from('rounds')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId);

      const { count: completedRoundsCount } = await supabase
        .from('rounds')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId)
        .eq('status', 'completed');

      let currentRoundResponses = 0;
      let expectedCurrentRoundResponses = 0;
      if (studyData.current_round > 0) {
        const { data: currentRound } = await supabase
          .from('rounds')
          .select('id')
          .eq('study_id', studyId)
          .eq('round_number', studyData.current_round)
          .maybeSingle();

        if (currentRound) {
          const { count: responsesCount } = await supabase
            .from('responses')
            .select('id', { count: 'exact', head: true })
            .eq('round_id', currentRound.id);

          currentRoundResponses = responsesCount || 0;
          expectedCurrentRoundResponses = (itemsCount || 0) * (participantsCount || 0);
        }
      }

      const { count: consensusCount } = await supabase
        .from('delphi_items')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId)
        .eq('consensus_reached', true);

      setStats({
        totalParticipants: participantsCount || 0,
        activeParticipants: activeParticipantsCount || 0,
        totalDomains: domainsCount || 0,
        totalQuestions: questionsCount || 0,
        totalProposals: proposalsCount || 0,
        totalItems: itemsCount || 0,
        totalRounds: roundsCount || 0,
        completedRounds: completedRoundsCount || 0,
        currentRoundResponses,
        expectedCurrentRoundResponses,
        consensusItemsCount: consensusCount || 0,
      });
    } catch (error: any) {
      toast.error('Failed to load progress data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getPhaseDescription = () => {
    if (!study || !stats) return '';

    if (study.status === 'draft') {
      return 'Study is in draft mode. Configure domains, questions, and invite participants to begin.';
    }

    if (stats.totalProposals === 0) {
      return 'Collecting expert proposals for Round 1.';
    }

    if (stats.totalItems === 0) {
      return 'Ready to cluster proposals into rating items.';
    }

    if (study.current_round === 0) {
      return 'Items created. Ready to start rating rounds.';
    }

    if (study.current_round <= study.total_rounds) {
      return `Round ${study.current_round} of ${study.total_rounds} in progress.`;
    }

    return 'All rounds completed. Review consensus results.';
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-slate-600">Loading progress data...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!study || !stats) return null;

  const participationRate = stats.totalParticipants > 0
    ? Math.round((stats.activeParticipants / stats.totalParticipants) * 100)
    : 0;

  const currentRoundProgress = stats.expectedCurrentRoundResponses > 0
    ? Math.round((stats.currentRoundResponses / stats.expectedCurrentRoundResponses) * 100)
    : 0;

  const consensusRate = stats.totalItems > 0
    ? Math.round((stats.consensusItemsCount / stats.totalItems) * 100)
    : 0;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/dashboard/studies/${studyId}`)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Study
            </Button>

            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-slate-900">Progress Review</h1>
              <Badge className={getStatusColor(study.status)}>
                {study.status}
              </Badge>
            </div>
            <p className="text-slate-600">{study.title}</p>
          </div>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 mb-1">Current Phase</p>
                  <p className="text-sm text-blue-800">{getPhaseDescription()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Participants</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalParticipants}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Active Participants</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.activeParticipants}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Domains</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalDomains}</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Questions</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalQuestions}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Participation Rate</CardTitle>
                <CardDescription>
                  Participants who have joined and responded
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Active / Total</span>
                    <span className="font-semibold text-slate-900">
                      {stats.activeParticipants} / {stats.totalParticipants}
                    </span>
                  </div>
                  <SimpleProgressBar value={participationRate} />
                  <p className="text-2xl font-bold text-slate-900">{participationRate}%</p>
                </div>
                {participationRate < 50 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Low participation rate. Consider sending reminder emails.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Round Progress</CardTitle>
                <CardDescription>
                  Current round: {study.current_round} of {study.total_rounds}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Completed / Total Rounds</span>
                    <span className="font-semibold text-slate-900">
                      {stats.completedRounds} / {study.total_rounds}
                    </span>
                  </div>
                  <SimpleProgressBar
                    value={(stats.completedRounds / study.total_rounds) * 100}
                  />
                </div>
                {study.current_round > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600">Current Round Responses</span>
                      <span className="font-semibold text-slate-900">
                        {stats.currentRoundResponses} / {stats.expectedCurrentRoundResponses}
                      </span>
                    </div>
                    <SimpleProgressBar value={currentRoundProgress} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Proposals</CardTitle>
                <CardDescription>Expert recommendations collected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{stats.totalProposals}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      From {stats.totalQuestions} questions
                    </p>
                  </div>
                  <MessageSquare className="h-10 w-10 text-amber-600" />
                </div>
                {stats.totalQuestions > 0 && stats.totalProposals === 0 && (
                  <div className="mt-3 p-2 bg-amber-50 rounded text-sm text-amber-800">
                    No proposals yet. Send invitations to participants.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rating Items</CardTitle>
                <CardDescription>Items created from proposals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{stats.totalItems}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Across {stats.totalDomains} domains
                    </p>
                  </div>
                  <FileText className="h-10 w-10 text-purple-600" />
                </div>
                {stats.totalProposals > 0 && stats.totalItems === 0 && (
                  <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-800">
                    Ready to cluster proposals into items.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consensus</CardTitle>
                <CardDescription>Items reaching consensus</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{stats.consensusItemsCount}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {consensusRate}% of items
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-green-600" />
                </div>
                {stats.totalItems > 0 && (
                  <div className="mt-3">
                    <SimpleProgressBar value={consensusRate} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>Recommended actions to progress your study</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {study.status === 'draft' && (
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Configure Study</p>
                      <p className="text-sm text-slate-600">
                        Add domains, create questions, and invite participants
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/studies/${studyId}/domains`)}
                    >
                      Setup
                    </Button>
                  </div>
                )}

                {study.status === 'active' && stats.totalProposals === 0 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                    <div className="h-6 w-6 rounded-full bg-amber-200 flex items-center justify-center text-sm font-semibold">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Collect Proposals</p>
                      <p className="text-sm text-slate-600">
                        Send invitations to participants to collect expert recommendations
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/studies/${studyId}/proposals`)}
                    >
                      Send
                    </Button>
                  </div>
                )}

                {stats.totalProposals > 0 && stats.totalItems === 0 && (
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="h-6 w-6 rounded-full bg-purple-200 flex items-center justify-center text-sm font-semibold">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Cluster Proposals</p>
                      <p className="text-sm text-slate-600">
                        Use AI clustering to group similar proposals into rating items
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/studies/${studyId}/cluster`)}
                    >
                      Cluster
                    </Button>
                  </div>
                )}

                {stats.totalItems > 0 && study.current_round === 0 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="h-6 w-6 rounded-full bg-blue-200 flex items-center justify-center text-sm font-semibold">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Start Rating Rounds</p>
                      <p className="text-sm text-slate-600">
                        Begin the Delphi rating process with your panel of experts
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/studies/${studyId}/rounds`)}
                    >
                      Start
                    </Button>
                  </div>
                )}

                {study.current_round > 0 && study.current_round <= study.total_rounds && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="h-6 w-6 rounded-full bg-green-200 flex items-center justify-center text-sm font-semibold">
                      {study.current_round}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">
                        Round {study.current_round} In Progress
                      </p>
                      <p className="text-sm text-slate-600">
                        {currentRoundProgress}% complete ({stats.currentRoundResponses}/{stats.expectedCurrentRoundResponses} responses)
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/studies/${studyId}/rounds`)}
                    >
                      Monitor
                    </Button>
                  </div>
                )}

                {study.current_round > study.total_rounds && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Review Results</p>
                      <p className="text-sm text-slate-600">
                        All rounds completed. Review consensus outcomes and export results.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/studies/${studyId}/results`)}
                    >
                      View
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
