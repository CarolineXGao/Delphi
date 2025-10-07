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
import { supabase, Study } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function StudySettingsPage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params?.id as string;

  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (studyId) {
      loadStudy();
    }
  }, [studyId]);

  const loadStudy = async () => {
    try {
      const { data, error } = await supabase
        .from('studies')
        .select('*')
        .eq('id', studyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Study not found');
        router.push('/dashboard');
        return;
      }

      setStudy(data);
      setTitle(data.title);
      setDescription(data.description || '');
    } catch (error: any) {
      toast.error('Failed to load study');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('studies')
        .update({
          title: title.trim(),
          description: description.trim(),
        })
        .eq('id', studyId);

      if (error) throw error;

      toast.success('Study updated successfully');
      router.push(`/dashboard/studies/${studyId}`);
    } catch (error: any) {
      toast.error('Failed to update study');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('studies')
        .delete()
        .eq('id', studyId);

      if (error) throw error;

      toast.success('Study deleted successfully');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error('Failed to delete study');
      console.error(error);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-slate-600">Loading settings...</p>
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
        <div className="max-w-3xl space-y-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/dashboard/studies/${studyId}`)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Study
            </Button>

            <h1 className="text-3xl font-bold text-slate-900">Study Settings</h1>
            <p className="text-slate-600 mt-1">Manage your study configuration</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update the study title and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Study Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter study title"
                  disabled={study.status !== 'draft'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter study description"
                  rows={4}
                  disabled={study.status !== 'draft'}
                />
              </div>

              {study.status !== 'draft' && (
                <p className="text-sm text-amber-600">
                  Settings can only be modified while the study is in draft status
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Study Configuration</CardTitle>
              <CardDescription>
                View study parameters (read-only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Total Rounds</Label>
                  <Input value={study.total_rounds} disabled />
                </div>
                <div>
                  <Label>Current Round</Label>
                  <Input value={study.current_round} disabled />
                </div>
                <div>
                  <Label>Likert Scale Min</Label>
                  <Input value={study.likert_min} disabled />
                </div>
                <div>
                  <Label>Likert Scale Max</Label>
                  <Input value={study.likert_max} disabled />
                </div>
                <div>
                  <Label>Consensus Method</Label>
                  <Input value={study.consensus_rule.toUpperCase()} disabled />
                </div>
                <div>
                  <Label>
                    {study.consensus_rule === 'iqr' ? 'IQR Threshold' : 'Net Agreement Threshold'}
                  </Label>
                  <Input
                    value={
                      study.consensus_rule === 'iqr'
                        ? study.iqr_threshold
                        : `${study.net_agreement_threshold}%`
                    }
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center pt-6 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Study
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the study
                    and all associated data including participants, proposals, and ratings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    Delete Study
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={handleSave} disabled={saving || study.status !== 'draft'}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
