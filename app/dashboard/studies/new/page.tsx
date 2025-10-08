'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function NewStudyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalRounds, setTotalRounds] = useState(3);
  const [likertMin, setLikertMin] = useState(1);
  const [likertMax, setLikertMax] = useState(9);
  const [consensusRule, setConsensusRule] = useState<'iqr' | 'net_agreement'>('iqr');
  const [iqrThreshold, setIqrThreshold] = useState(1);
  const [netAgreementThreshold, setNetAgreementThreshold] = useState(75);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('studies')
        .insert({
          title,
          description,
          total_rounds: totalRounds,
          likert_min: likertMin,
          likert_max: likertMax,
          consensus_rule: consensusRule,
          iqr_threshold: iqrThreshold,
          net_agreement_threshold: netAgreementThreshold,
          created_by: user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('participants').insert({
        study_id: data.id,
        user_id: user.id,
        pseudo_id: 'ADMIN-001',
        email: user.email || '',
        role: 'admin',
        joined_at: new Date().toISOString(),
      });

      toast.success('Study created successfully! Now add domains.');
      router.push(`/dashboard/studies/${data.id}/domains`);
    } catch (error: any) {
      toast.error('Failed to create study');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-3xl">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Study</h1>
          <p className="text-slate-600 mb-8">Configure your Delphi research study</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Provide the study title and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Study Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Healthcare Quality Improvement Delphi"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief overview of the study objectives and methodology"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">Next Steps</CardTitle>
                <CardDescription>After creating your study, you'll add domains</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-800">
                  Domains will be added in Stage 1 (Setup). Proposal questions and participants will be added in Stage 2.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Study Configuration</CardTitle>
                <CardDescription>Set up rounds and rating scales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total-rounds">Total Rounds</Label>
                    <Input
                      id="total-rounds"
                      type="number"
                      min="1"
                      max="10"
                      value={totalRounds}
                      onChange={(e) => setTotalRounds(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="likert-min">Likert Min</Label>
                    <Input
                      id="likert-min"
                      type="number"
                      value={likertMin}
                      onChange={(e) => setLikertMin(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="likert-max">Likert Max</Label>
                    <Input
                      id="likert-max"
                      type="number"
                      value={likertMax}
                      onChange={(e) => setLikertMax(parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consensus Rules</CardTitle>
                <CardDescription>Define how consensus is measured</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="consensus-rule">Consensus Method</Label>
                  <Select
                    value={consensusRule}
                    onValueChange={(value: 'iqr' | 'net_agreement') => setConsensusRule(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iqr">IQR (Interquartile Range)</SelectItem>
                      <SelectItem value="net_agreement">Net Agreement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {consensusRule === 'iqr' ? (
                  <div className="space-y-2">
                    <Label htmlFor="iqr-threshold">IQR Threshold</Label>
                    <Input
                      id="iqr-threshold"
                      type="number"
                      step="0.1"
                      value={iqrThreshold}
                      onChange={(e) => setIqrThreshold(parseFloat(e.target.value))}
                    />
                    <p className="text-sm text-slate-500">
                      Consensus reached when IQR ≤ threshold
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="net-agreement-threshold">Net Agreement Threshold (%)</Label>
                    <Input
                      id="net-agreement-threshold"
                      type="number"
                      value={netAgreementThreshold}
                      onChange={(e) => setNetAgreementThreshold(parseInt(e.target.value))}
                    />
                    <p className="text-sm text-slate-500">
                      Net Agreement = %agree - 2×%disagree
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} size="lg">
                {loading ? 'Creating...' : 'Create Study'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
