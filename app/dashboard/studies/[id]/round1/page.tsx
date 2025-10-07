'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase, Study, Round, Proposal, Participant } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Send, Trash2, Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Round1Page() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const studyId = params?.id as string;

  const [study, setStudy] = useState<Study | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [newProposal, setNewProposal] = useState({
    domain: '',
    recommendation: '',
    rationale: '',
  });

  useEffect(() => {
    if (studyId && user) {
      loadData();
    }
  }, [studyId, user]);

  const loadData = async () => {
    if (!user) return;

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

      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .select('*')
        .eq('study_id', studyId)
        .eq('round_number', 1)
        .maybeSingle();

      if (roundError) throw roundError;
      setRound(roundData);

      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('study_id', studyId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (participantError) throw participantError;
      setParticipant(participantData);

      if (participantData) {
        const { data: proposalsData, error: proposalsError } = await supabase
          .from('proposals')
          .select('*')
          .eq('study_id', studyId)
          .eq('participant_id', participantData.id)
          .order('created_at', { ascending: true });

        if (proposalsError) throw proposalsError;
        setProposals(proposalsData || []);
      }
    } catch (error: any) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProposal = async () => {
    if (!newProposal.domain || !newProposal.recommendation) {
      toast.error('Please fill in domain and recommendation');
      return;
    }

    if (!participant) {
      toast.error('Participant not found');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .insert({
          study_id: studyId,
          participant_id: participant.id,
          domain: newProposal.domain,
          recommendation: newProposal.recommendation,
          rationale: newProposal.rationale,
          status: 'submitted',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Proposal added');
      setProposals([...proposals, data]);
      setNewProposal({ domain: '', recommendation: '', rationale: '' });
    } catch (error: any) {
      toast.error('Failed to add proposal');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProposal = async (proposalId: string) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', proposalId);

      if (error) throw error;

      toast.success('Proposal deleted');
      setProposals(proposals.filter(p => p.id !== proposalId));
    } catch (error: any) {
      toast.error('Failed to delete proposal');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-slate-600">Loading...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!study || !round || !participant) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Card className="max-w-2xl mx-auto mt-8">
            <CardContent className="pt-6">
              <p className="text-center text-slate-600">
                {!participant ? 'You are not a participant in this study' : 'Round 1 is not available'}
              </p>
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const canSubmit = round.status === 'open' && (participant.role === 'expert' || participant.role === 'admin');

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/dashboard/studies/${studyId}`)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Study
            </Button>

            <div className="flex items-center gap-3 mb-2">
              <Lightbulb className="h-8 w-8 text-amber-600" />
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Round 1: Idea Generation</h1>
                <p className="text-slate-600">{study.title}</p>
              </div>
            </div>
          </div>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Instructions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800 space-y-2">
              <p>
                In this round, we are collecting your expert opinions and recommendations across different domains.
                Your input will be synthesized and used to create items for rating in the next round.
              </p>
              <p className="font-semibold">
                Please submit detailed recommendations with supporting rationale. Be specific and actionable.
              </p>
              <p>
                <strong>Round Status:</strong>{' '}
                <span className={round.status === 'open' ? 'text-green-700' : 'text-slate-700'}>
                  {round.status === 'open' ? 'Open for submissions' : round.status}
                </span>
              </p>
            </CardContent>
          </Card>

          {canSubmit ? (
            <Card>
              <CardHeader>
                <CardTitle>Submit New Proposal</CardTitle>
                <CardDescription>
                  Add your recommendations for this Delphi study
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Select
                    value={newProposal.domain}
                    onValueChange={(value) => setNewProposal({ ...newProposal, domain: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(study.domains) && study.domains.map((domain) => (
                        <SelectItem key={domain} value={domain}>
                          {domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recommendation">Recommendation</Label>
                  <Textarea
                    id="recommendation"
                    value={newProposal.recommendation}
                    onChange={(e) => setNewProposal({ ...newProposal, recommendation: e.target.value })}
                    placeholder="State your recommendation clearly and concisely..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rationale">Rationale (Optional)</Label>
                  <Textarea
                    id="rationale"
                    value={newProposal.rationale}
                    onChange={(e) => setNewProposal({ ...newProposal, rationale: e.target.value })}
                    placeholder="Explain the reasoning, evidence, or context for your recommendation..."
                    rows={4}
                  />
                </div>

                <Button onClick={handleAddProposal} disabled={submitting}>
                  <Plus className="h-4 w-4 mr-2" />
                  {submitting ? 'Adding...' : 'Add Proposal'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-amber-800">
                  {round.status !== 'open'
                    ? 'This round is currently closed'
                    : 'Only experts can submit proposals in Round 1'}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Your Proposals ({proposals.length})</CardTitle>
              <CardDescription>
                Proposals you have submitted for this round
              </CardDescription>
            </CardHeader>
            <CardContent>
              {proposals.length === 0 ? (
                <p className="text-center text-slate-600 py-8">No proposals yet</p>
              ) : (
                <div className="space-y-4">
                  {proposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            {proposal.domain}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(proposal.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {round.status === 'open' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProposal(proposal.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900 mb-2">{proposal.recommendation}</p>
                      {proposal.rationale && (
                        <p className="text-sm text-slate-600">{proposal.rationale}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
