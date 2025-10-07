'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase, Study, Proposal, Participant } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Sparkles, Layers } from 'lucide-react';

export default function ProposalsPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const [selectedStudy, setSelectedStudy] = useState('');
  const [domain, setDomain] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [rationale, setRationale] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: participantsData } = await supabase
        .from('participants')
        .select('*')
        .eq('user_id', user.id);

      setParticipants(participantsData || []);

      const studyIds = participantsData?.map(p => p.study_id) || [];

      const { data: studiesData } = await supabase
        .from('studies')
        .select('*')
        .in('id', studyIds)
        .eq('status', 'active');

      setStudies(studiesData || []);

      const { data: proposalsData } = await supabase
        .from('proposals')
        .select('*')
        .in('participant_id', participantsData?.map(p => p.id) || []);

      setProposals(proposalsData || []);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAISuggestions = async () => {
    if (!recommendation.trim()) {
      toast.error('Please enter a recommendation first');
      return;
    }

    setLoadingAI(true);
    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: recommendation }),
      });

      if (!response.ok) throw new Error('Failed to get AI suggestions');

      const data = await response.json();
      setAiSuggestions(data.suggestions || []);
      toast.success('AI suggestions generated');
    } catch (error) {
      setAiSuggestions(['Expand on the evidence supporting this recommendation', 'Consider potential implementation challenges', 'Add specific metrics for success measurement']);
      toast.info('Using fallback suggestions');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const participant = participants.find(p => p.study_id === selectedStudy);
    if (!participant) {
      toast.error('Participant record not found');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('proposals').insert({
        study_id: selectedStudy,
        participant_id: participant.id,
        domain,
        recommendation,
        rationale,
        status: 'submitted',
      });

      if (error) throw error;

      toast.success('Proposal submitted successfully');
      setShowDialog(false);
      setDomain('');
      setRecommendation('');
      setRationale('');
      setAiSuggestions([]);
      loadData();
    } catch (error: any) {
      toast.error('Failed to submit proposal');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedStudyData = studies.find(s => s.id === selectedStudy);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Proposals</h1>
              <p className="text-slate-600 mt-1">Submit and manage your recommendations</p>
            </div>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  New Proposal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Submit New Proposal</DialogTitle>
                  <DialogDescription>
                    Provide your recommendation and rationale for a study domain
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="study">Study</Label>
                    <Select value={selectedStudy} onValueChange={setSelectedStudy} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a study" />
                      </SelectTrigger>
                      <SelectContent>
                        {studies.map(study => (
                          <SelectItem key={study.id} value={study.id}>
                            {study.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedStudyData && (
                    <div className="space-y-2">
                      <Label htmlFor="domain">Domain</Label>
                      <Select value={domain} onValueChange={setDomain} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a domain" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(selectedStudyData.domains) && selectedStudyData.domains.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="recommendation">Recommendation</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAISuggestions}
                        disabled={loadingAI}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {loadingAI ? 'Analyzing...' : 'AI Assist'}
                      </Button>
                    </div>
                    <Textarea
                      id="recommendation"
                      placeholder="Enter your recommendation..."
                      value={recommendation}
                      onChange={(e) => setRecommendation(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>

                  {aiSuggestions.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold text-blue-900">AI Suggestions</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-blue-800">
                        {aiSuggestions.map((suggestion, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="rationale">Rationale</Label>
                    <Textarea
                      id="rationale"
                      placeholder="Explain the reasoning behind your recommendation..."
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      rows={5}
                      required
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Proposal'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Loading proposals...</p>
            </div>
          ) : proposals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Layers className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No proposals yet</h3>
                <p className="text-slate-600 mb-6">Submit your first recommendation to get started</p>
                <Button onClick={() => setShowDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Proposal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {proposals.map((proposal) => {
                const study = studies.find(s => s.id === proposal.study_id);
                return (
                  <Card key={proposal.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{proposal.recommendation}</CardTitle>
                          <CardDescription className="mt-2">
                            {study?.title} • {proposal.domain}
                          </CardDescription>
                        </div>
                        <Badge variant={proposal.status === 'submitted' ? 'default' : 'secondary'}>
                          {proposal.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-slate-700">Rationale</h4>
                        <p className="text-slate-600">{proposal.rationale}</p>
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
