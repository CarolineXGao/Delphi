'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase, Study, Round } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Plus, CirclePlay as PlayCircle, CircleStop as StopCircle, CircleCheck as CheckCircle2, Clock } from 'lucide-react';

const STAGE_INFO = {
  round_1_proposals: {
    title: 'Round 1: Idea Generation',
    description: 'Experts submit open-ended proposals and recommendations',
    type: 'proposals' as const,
  },
  round_2_rating: {
    title: 'Round 2: Rating & Refinement',
    description: 'All participants rate proposals on Likert scale',
    type: 'rating' as const,
  },
  round_3_rerating: {
    title: 'Round 3: Re-rating with Feedback',
    description: 'Participants re-rate items after seeing group consensus',
    type: 'rating' as const,
  },
  validation: {
    title: 'Validation: Final Review',
    description: 'Optional validation workshop or final confirmation',
    type: 'rating' as const,
  },
};

export default function StudyRoundsPage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params?.id as string;

  const [study, setStudy] = useState<Study | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studyId) {
      loadData();
    }
  }, [studyId]);

  const loadData = async () => {
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

      const { data: roundsData, error: roundsError } = await supabase
        .from('rounds')
        .select('*')
        .eq('study_id', studyId)
        .order('round_number', { ascending: true });

      if (roundsError) throw roundsError;
      setRounds(roundsData || []);
    } catch (error: any) {
      toast.error('Failed to load study data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createRound = async (roundNumber: number, stage: keyof typeof STAGE_INFO) => {
    try {
      const stageInfo = STAGE_INFO[stage];
      const { data, error } = await supabase
        .from('rounds')
        .insert({
          study_id: studyId,
          round_number: roundNumber,
          stage,
          round_type: stageInfo.type,
          instructions: stageInfo.description,
          requires_previous_rating: roundNumber > 2,
          status: 'pending',
          settings: {},
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Round ${roundNumber} created`);
      setRounds([...rounds, data]);
    } catch (error: any) {
      toast.error('Failed to create round');
      console.error(error);
    }
  };

  const openRound = async (roundId: string, roundNumber: number) => {
    try {
      const { error } = await supabase
        .from('rounds')
        .update({
          status: 'open',
          open_date: new Date().toISOString(),
        })
        .eq('id', roundId);

      if (error) throw error;

      await supabase
        .from('studies')
        .update({ current_round: roundNumber })
        .eq('id', studyId);

      toast.success('Round opened');
      loadData();
    } catch (error: any) {
      toast.error('Failed to open round');
      console.error(error);
    }
  };

  const closeRound = async (roundId: string) => {
    try {
      const { error } = await supabase
        .from('rounds')
        .update({
          status: 'closed',
          close_date: new Date().toISOString(),
        })
        .eq('id', roundId);

      if (error) throw error;

      toast.success('Round closed');
      loadData();
    } catch (error: any) {
      toast.error('Failed to close round');
      console.error(error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <PlayCircle className="h-5 w-5 text-green-600" />;
      case 'closed':
        return <CheckCircle2 className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-slate-600">Loading rounds...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!study) return null;

  const canCreateNewRound = rounds.length < study.total_rounds && study.status !== 'completed';
  const nextRoundNumber = rounds.length + 1;
  const nextStage: keyof typeof STAGE_INFO =
    nextRoundNumber === 1 ? 'round_1_proposals' :
    nextRoundNumber === 2 ? 'round_2_rating' :
    nextRoundNumber === 3 ? 'round_3_rerating' : 'validation';

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/dashboard/studies/${studyId}`)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Study
            </Button>

            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Delphi Rounds</h1>
                <p className="text-slate-600 mt-1">{study.title}</p>
              </div>
              {canCreateNewRound && (
                <Button onClick={() => createRound(nextRoundNumber, nextStage)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Round {nextRoundNumber}
                </Button>
              )}
            </div>
          </div>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Delphi Study Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-blue-900">Stage 1: Preparation (Complete)</p>
                <p className="text-blue-700">Study setup, participant panel selection, consensus thresholds defined</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900">Stage 2: Round 1 - Idea Generation</p>
                <p className="text-blue-700">Open-ended proposals collection from experts</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900">Stage 3: AI Topic Modeling (Optional)</p>
                <p className="text-blue-700">Cluster similar proposals using topic modeling and LLM summarization</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900">Stage 4: Round 2 - Rating & Refinement</p>
                <p className="text-blue-700">Likert scale rating of synthesized items</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900">Stage 5: Round 3 - Re-rating with Feedback</p>
                <p className="text-blue-700">Re-rate with group statistics visible</p>
              </div>
            </CardContent>
          </Card>

          {rounds.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Clock className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No rounds yet</h3>
                <p className="text-slate-600 mb-6">Create Round 1 to begin the Delphi process</p>
                {canCreateNewRound && (
                  <Button onClick={() => createRound(1, 'round_1_proposals')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Round 1
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rounds.map((round) => {
                const stageInfo = STAGE_INFO[round.stage as keyof typeof STAGE_INFO] || {
                  title: `Round ${round.round_number}`,
                  description: 'Custom round',
                  type: 'rating',
                };

                return (
                  <Card key={round.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(round.status)}
                            <CardTitle className="text-xl">
                              {stageInfo.title}
                            </CardTitle>
                            <Badge className={getStatusColor(round.status)}>
                              {round.status}
                            </Badge>
                          </div>
                          <CardDescription>{stageInfo.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {round.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => openRound(round.id, round.round_number)}
                            >
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Open Round
                            </Button>
                          )}
                          {round.status === 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => closeRound(round.id)}
                            >
                              <StopCircle className="h-4 w-4 mr-2" />
                              Close Round
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">Round Type</p>
                          <p className="font-semibold capitalize">{round.round_type}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Opened</p>
                          <p className="font-semibold">
                            {round.open_date ? new Date(round.open_date).toLocaleDateString() : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-600">Closed</p>
                          <p className="font-semibold">
                            {round.close_date ? new Date(round.close_date).toLocaleDateString() : '-'}
                          </p>
                        </div>
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
