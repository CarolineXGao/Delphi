'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase, Study, Participant } from '@/lib/supabase';
import { toast } from 'sonner';
import { Users, UserPlus, Trash2, ArrowLeft } from 'lucide-react';

export default function ParticipantsPage() {
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

      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('study_id', studyId)
        .order('created_at', { ascending: true });

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);
    } catch (error: any) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
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
    if (!confirm('Are you sure you want to remove this participant?')) {
      return;
    }

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

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout studyTitle={study?.title} studyId={studyId} showReviewButton={true}>
          <div className="flex items-center justify-center h-screen">
            <p className="text-slate-600">Loading...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!study) return null;

  return (
    <ProtectedRoute>
      <DashboardLayout studyTitle={study.title} studyId={studyId} showReviewButton={true}>
        <div className="max-w-5xl mx-auto p-8 space-y-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/dashboard/studies/${studyId}/review`)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Review
            </Button>

            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Participants</h1>
                <p className="text-slate-600 mt-1">Manage study participants</p>
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
                      Add a participant by email. They'll receive an invitation to join the study.
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
                        Experts can submit proposals, participants can rate items
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
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Participants ({participants.length})</CardTitle>
              <CardDescription>
                Expert panel members who will participate in this Delphi study
              </CardDescription>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No participants yet</p>
                  <p className="text-sm text-slate-500 mb-6">Add participants by email to get started</p>
                  <Button onClick={() => setAddParticipantOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add First Participant
                  </Button>
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
                        {participant.joined_at && (
                          <p className="text-xs text-green-600 mt-1">
                            Joined {new Date(participant.joined_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">
                          {participant.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
