'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase, Study, Participant } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Users, FileText, ChartBar as BarChart, Settings, CirclePlay as PlayCircle, UserPlus, Trash2, TrendingUp } from 'lucide-react';

export default function StudyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params?.id as string;

  const [study, setStudy] = useState<Study | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [newParticipantRole, setNewParticipantRole] = useState<'expert' | 'participant'>('participant');
  const [addingParticipant, setAddingParticipant] = useState(false);

  useEffect(() => {
    if (studyId) {
      loadStudyDetails();
    }
  }, [studyId]);

  const loadStudyDetails = async () => {
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

      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('study_id', studyId);

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);
    } catch (error: any) {
      toast.error('Failed to load study details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartStudy = async () => {
    if (!study) return;

    try {
      const { error } = await supabase
        .from('studies')
        .update({ status: 'active', current_round: 1 })
        .eq('id', studyId);

      if (error) throw error;

      toast.success('Study started successfully');
      loadStudyDetails();
    } catch (error: any) {
      toast.error('Failed to start study');
      console.error(error);
    }
  };

  const handleSettings = () => {
    router.push(`/dashboard/studies/${studyId}/settings`);
  };

  const handleAddParticipant = async () => {
    if (!newParticipantEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newParticipantEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setAddingParticipant(true);
    try {
      const { data, error } = await supabase
        .from('participants')
        .insert({
          study_id: studyId,
          email: newParticipantEmail.trim().toLowerCase(),
          role: newParticipantRole,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('This email is already added to the study');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Participant added successfully');
      setParticipants([...participants, data]);
      setNewParticipantEmail('');
      setNewParticipantRole('participant');
      setAddParticipantOpen(false);
    } catch (error: any) {
      toast.error('Failed to add participant');
      console.error(error);
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      toast.success('Participant removed');
      setParticipants(participants.filter(p => p.id !== participantId));
    } catch (error: any) {
      toast.error('Failed to remove participant');
      console.error(error);
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

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-slate-600">Loading study...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!study) {
    return null;
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>

            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900">{study.title}</h1>
                  <Badge className={getStatusColor(study.status)}>
                    {study.status}
                  </Badge>
                </div>
                <p className="text-slate-600">{study.description}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                {study.status === 'draft' && (
                  <Button onClick={handleStartStudy}>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Start Study
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
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
                    <p className="text-sm text-slate-600">Current Round</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {study.current_round}/{study.total_rounds}
                    </p>
                  </div>
                  <BarChart className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Domains</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {Array.isArray(study.domains) ? study.domains.length : 0}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Consensus Rule</p>
                    <p className="text-lg font-bold text-slate-900 uppercase">
                      {study.consensus_rule}
                    </p>
                  </div>
                  <BarChart className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Navigate to different stages of your Delphi study</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-indigo-50 border-2"
                  onClick={() => router.push(`/dashboard/studies/${studyId}/review`)}
                >
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                  <span className="font-semibold text-sm">Progress</span>
                  <span className="text-xs text-slate-500">Review</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-teal-50"
                  onClick={() => router.push(`/dashboard/studies/${studyId}/domains`)}
                >
                  <FileText className="h-6 w-6 text-teal-600" />
                  <span className="font-semibold text-sm">Domains</span>
                  <span className="text-xs text-slate-500">Categories</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-amber-50"
                  onClick={() => router.push(`/dashboard/studies/${studyId}/proposals`)}
                >
                  <FileText className="h-6 w-6 text-amber-600" />
                  <span className="font-semibold text-sm">Proposals</span>
                  <span className="text-xs text-slate-500">Round 1</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50"
                  onClick={() => router.push(`/dashboard/studies/${studyId}/cluster`)}
                >
                  <Settings className="h-6 w-6 text-purple-600" />
                  <span className="font-semibold text-sm">AI Clustering</span>
                  <span className="text-xs text-slate-500">Topic Model</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-blue-50"
                  onClick={() => router.push(`/dashboard/studies/${studyId}/rounds`)}
                >
                  <BarChart className="h-6 w-6 text-blue-600" />
                  <span className="font-semibold text-sm">Rounds</span>
                  <span className="text-xs text-slate-500">Rating</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-green-50"
                  onClick={() => router.push(`/dashboard/studies/${studyId}/results`)}
                >
                  <BarChart className="h-6 w-6 text-green-600" />
                  <span className="font-semibold text-sm">Results</span>
                  <span className="text-xs text-slate-500">Consensus</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Study Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Domains</h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(study.domains) && study.domains.map((domain) => (
                        <Badge key={domain} variant="secondary">
                          {domain}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-slate-600">Likert Scale</p>
                      <p className="font-semibold">{study.likert_min} to {study.likert_max}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Total Rounds</p>
                      <p className="font-semibold">{study.total_rounds}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Consensus Method</p>
                      <p className="font-semibold uppercase">{study.consensus_rule}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">
                        {study.consensus_rule === 'iqr' ? 'IQR Threshold' : 'Net Agreement Threshold'}
                      </p>
                      <p className="font-semibold">
                        {study.consensus_rule === 'iqr'
                          ? `≤ ${study.iqr_threshold}`
                          : `≥ ${study.net_agreement_threshold}%`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="participants">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Participants</CardTitle>
                      <CardDescription>
                        Manage study participants by email
                      </CardDescription>
                    </div>
                    <Dialog open={addParticipantOpen} onOpenChange={setAddParticipantOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Participant
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Participant</DialogTitle>
                          <DialogDescription>
                            Add a participant by email. They'll be contacted when the study begins.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="participant@example.com"
                              value={newParticipantEmail}
                              onChange={(e) => setNewParticipantEmail(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !addingParticipant) {
                                  handleAddParticipant();
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={newParticipantRole} onValueChange={(value: 'expert' | 'participant') => setNewParticipantRole(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="participant">Participant</SelectItem>
                                <SelectItem value="expert">Expert</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-slate-500">
                              Experts can submit proposals, participants can only rate them
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAddParticipantOpen(false)} disabled={addingParticipant}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddParticipant} disabled={addingParticipant}>
                            {addingParticipant ? 'Adding...' : 'Add Participant'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {participants.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600 mb-2">No participants yet</p>
                      <p className="text-sm text-slate-500">Add participants by email to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{participant.email}</p>
                            <p className="text-sm text-slate-500">Pseudo ID: {participant.pseudo_id}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="capitalize">
                              {participant.role}
                            </Badge>
                            {study?.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveParticipant(participant.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {study?.status !== 'draft' && participants.length > 0 && (
                    <p className="text-sm text-amber-600 mt-4">
                      Participants can only be modified while the study is in draft status
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
