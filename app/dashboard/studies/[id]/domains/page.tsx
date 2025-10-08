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
import { supabase, Study, StudyDomain } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';

export default function DomainsPage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params?.id as string;

  const [study, setStudy] = useState<Study | null>(null);
  const [domains, setDomains] = useState<StudyDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<StudyDomain | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

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
      setStudy(studyData);

      const { data: domainsData, error: domainsError } = await supabase
        .from('study_domains')
        .select('*')
        .eq('study_id', studyId)
        .order('display_order', { ascending: true });

      if (domainsError) throw domainsError;
      setDomains(domainsData || []);
    } catch (error: any) {
      toast.error('Failed to load domains');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (domain?: StudyDomain) => {
    if (domain) {
      setEditingDomain(domain);
      setFormData({
        name: domain.name,
        description: domain.description,
      });
    } else {
      setEditingDomain(null);
      setFormData({ name: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleSaveDomain = async () => {
    if (!formData.name.trim()) {
      toast.error('Domain name is required');
      return;
    }

    try {
      if (editingDomain) {
        const { error } = await supabase
          .from('study_domains')
          .update({
            name: formData.name,
            description: formData.description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDomain.id);

        if (error) throw error;
        toast.success('Domain updated');
      } else {
        const maxOrder = domains.length > 0
          ? Math.max(...domains.map(d => d.display_order))
          : 0;

        const { error } = await supabase
          .from('study_domains')
          .insert({
            study_id: studyId,
            name: formData.name,
            description: formData.description,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        toast.success('Domain created');
      }

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error('Failed to save domain');
      console.error(error);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('study_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;
      toast.success('Domain deleted');
      loadData();
    } catch (error: any) {
      toast.error('Failed to delete domain');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout studyTitle={study?.title} studyId={studyId} showReviewButton={true}>
          <div className="flex items-center justify-center h-screen">
            <p className="text-slate-600">Loading domains...</p>
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

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Study Domains</h1>
                <p className="text-slate-600">Define research categories for your Delphi study</p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Domain
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingDomain ? 'Edit Domain' : 'Add Domain'}
                    </DialogTitle>
                    <DialogDescription>
                      Domains are thematic categories that organize proposals and items
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Domain Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Clinical Effectiveness"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Optional description of this domain..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveDomain}>
                      {editingDomain ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">About Domains</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800">
              <p>
                Domains are thematic areas that help organize your Delphi study. Common examples include:
                Clinical Effectiveness, Cost-Effectiveness, Equity, Feasibility, and Implementation.
              </p>
              <p className="mt-2">
                Proposals and rating items will be grouped by domain to help participants focus their expertise.
              </p>
            </CardContent>
          </Card>

          {domains.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-600 mb-4">No domains created yet</p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Domain
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {domains.map((domain) => (
                <Card key={domain.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <GripVertical className="h-5 w-5 text-slate-400 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {domain.name}
                            </h3>
                            <span className="text-sm text-slate-500">
                              {domain.item_count} items
                            </span>
                          </div>
                          {domain.description && (
                            <p className="text-sm text-slate-600">{domain.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(domain)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDomain(domain.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">
                <strong>Next:</strong> After defining your domains, proceed to Stage 2 where you'll create proposal questions and invite participants.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
