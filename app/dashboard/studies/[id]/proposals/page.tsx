'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase, Study, StudyDomain, ProposalQuestion, Participant } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit2, Trash2, Mail, Users, MessageSquare } from 'lucide-react';

export default function CollectingProposalsPage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params?.id as string;

  const [study, setStudy] = useState<Study | null>(null);
  const [domains, setDomains] = useState<StudyDomain[]>([]);
  const [questions, setQuestions] = useState<ProposalQuestion[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ProposalQuestion | null>(null);
  const [formData, setFormData] = useState({
    domain_id: '',
    question_text: '',
    question_rationale: '',
    required: true,
  });
  const [instructions, setInstructions] = useState('');
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (studyId) {
      loadData();
    }
  }, [studyId]);

  const loadData = async () => {
    try {
      const { data: studyData, error: studyError} = await supabase
        .from('studies')
        .select('*')
        .eq('id', studyId)
        .maybeSingle();

      if (studyError) throw studyError;
      setStudy(studyData);
      setInstructions(studyData?.description || '');

      const { data: domainsData, error: domainsError } = await supabase
        .from('study_domains')
        .select('*')
        .eq('study_id', studyId)
        .order('display_order', { ascending: true });

      if (domainsError) throw domainsError;
      setDomains(domainsData || []);

      const { data: questionsData, error: questionsError } = await supabase
        .from('proposal_questions')
        .select('*')
        .eq('study_id', studyId)
        .order('display_order', { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('study_id', studyId);

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      if (questionsData && questionsData.length > 0) {
        const counts: Record<string, number> = {};
        for (const question of questionsData) {
          const { count, error } = await supabase
            .from('proposals')
            .select('id', { count: 'exact', head: true })
            .eq('question_id', question.id)
            .eq('status', 'submitted');

          if (!error) {
            counts[question.id] = count || 0;
          }
        }
        setResponseCounts(counts);
      }
    } catch (error: any) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (question?: ProposalQuestion) => {
    if (question) {
      setEditingQuestion(question);
      setFormData({
        domain_id: question.domain_id || '',
        question_text: question.question_text,
        question_rationale: question.question_rationale,
        required: question.required,
      });
    } else {
      setEditingQuestion(null);
      setFormData({
        domain_id: domains.length > 0 ? domains[0].id : '',
        question_text: '',
        question_rationale: '',
        required: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!formData.question_text.trim()) {
      toast.error('Question text is required');
      return;
    }

    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from('proposal_questions')
          .update({
            domain_id: formData.domain_id || null,
            question_text: formData.question_text,
            question_rationale: formData.question_rationale,
            required: formData.required,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingQuestion.id);

        if (error) throw error;
        toast.success('Question updated');
      } else {
        const maxOrder = questions.length > 0
          ? Math.max(...questions.map(q => q.display_order))
          : 0;

        const { error } = await supabase
          .from('proposal_questions')
          .insert({
            study_id: studyId,
            domain_id: formData.domain_id || null,
            question_text: formData.question_text,
            question_rationale: formData.question_rationale,
            required: formData.required,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        toast.success('Question created');
      }

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error('Failed to save question');
      console.error(error);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('proposal_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      toast.success('Question deleted');
      loadData();
    } catch (error: any) {
      toast.error('Failed to delete question');
      console.error(error);
    }
  };

  const handleSendInvitations = async () => {
    if (participants.length === 0) {
      toast.error('No participants to invite');
      return;
    }

    if (questions.length === 0) {
      toast.error('Create questions before sending invitations');
      return;
    }

    toast.info('Sending invitations...');

    try {
      for (const participant of participants) {
        const token = await generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabase.from('participant_tokens').insert({
          participant_id: participant.id,
          study_id: studyId,
          token: token,
          email: participant.email,
          expires_at: expiresAt.toISOString(),
        });

        await supabase
          .from('participants')
          .update({
            invitation_sent_at: new Date().toISOString(),
          })
          .eq('id', participant.id);
      }

      toast.success(`Invitations sent to ${participants.length} participants`);
      loadData();
    } catch (error: any) {
      toast.error('Failed to send invitations');
      console.error(error);
    }
  };

  const generateToken = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_invitation_token');
    if (error || !data) {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    return data;
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

  if (!study) return null;

  const totalResponses = Object.values(responseCounts).reduce((sum, count) => sum + count, 0);
  const expectedResponses = questions.length * participants.length;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/dashboard/studies/${studyId}`)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Study
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Collecting Proposals
                </h1>
                <p className="text-slate-600">{study.title}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Responses</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {totalResponses}/{expectedResponses}
                    </p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Participants</p>
                    <p className="text-2xl font-bold text-slate-900">{participants.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Questions</p>
                    <p className="text-2xl font-bold text-slate-900">{questions.length}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-amber-900">Instructions for Participants</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingInstructions(!editingInstructions)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {editingInstructions ? (
                <div className="space-y-3">
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={4}
                    placeholder="Enter instructions for participants..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        await supabase
                          .from('studies')
                          .update({ description: instructions })
                          .eq('id', studyId);
                        setEditingInstructions(false);
                        toast.success('Instructions updated');
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingInstructions(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-amber-800">
                  {instructions || 'No instructions provided. Click edit to add instructions.'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>
                    Define questions to guide expert proposals
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => handleOpenDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingQuestion ? 'Edit Question' : 'Add Question'}
                        </DialogTitle>
                        <DialogDescription>
                          Create focused questions to collect expert recommendations
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="domain">Domain</Label>
                          <Select
                            value={formData.domain_id}
                            onValueChange={(value) => setFormData({ ...formData, domain_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a domain" />
                            </SelectTrigger>
                            <SelectContent>
                              {domains.map((domain) => (
                                <SelectItem key={domain.id} value={domain.id}>
                                  {domain.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="question">Question Text *</Label>
                          <Textarea
                            id="question"
                            value={formData.question_text}
                            onChange={(e) =>
                              setFormData({ ...formData, question_text: e.target.value })
                            }
                            placeholder="e.g., What are the most important clinical outcomes to consider?"
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rationale">Rationale (Optional)</Label>
                          <Textarea
                            id="rationale"
                            value={formData.question_rationale}
                            onChange={(e) =>
                              setFormData({ ...formData, question_rationale: e.target.value })
                            }
                            placeholder="Context or reasoning for this question..."
                            rows={2}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveQuestion}>
                          {editingQuestion ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={handleSendInvitations} disabled={questions.length === 0}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitations
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 mb-4">No questions created yet</p>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Question
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question) => {
                    const domain = domains.find(d => d.id === question.domain_id);
                    const responseCount = responseCounts[question.id] || 0;

                    return (
                      <Card key={question.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {domain && (
                                <Badge variant="outline" className="mb-2">
                                  {domain.name}
                                </Badge>
                              )}
                              <p className="font-semibold text-slate-900 mb-2">
                                {question.question_text}
                              </p>
                              {question.question_rationale && (
                                <p className="text-sm text-slate-600 mb-2">
                                  {question.question_rationale}
                                </p>
                              )}
                              <p className="text-sm text-slate-500">
                                Responses: {responseCount}/{participants.length}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenDialog(question)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteQuestion(question.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
