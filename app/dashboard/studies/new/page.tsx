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
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function NewStudyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [totalRounds, setTotalRounds] = useState(3);
  const [likertMin, setLikertMin] = useState(1);
  const [likertMax, setLikertMax] = useState(9);
  const [consensusRule, setConsensusRule] = useState<'iqr' | 'net_agreement'>('iqr');
  const [iqrThreshold, setIqrThreshold] = useState(1);
  const [netAgreementThreshold, setNetAgreementThreshold] = useState(75);

  const addDomain = () => {
    if (newDomain.trim() && !domains.includes(newDomain.trim())) {
      setDomains([...domains, newDomain.trim()]);
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    setDomains(domains.filter(d => d !== domain));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (domains.length === 0) {
      toast.error('Please add at least one domain');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('studies')
        .insert({
          title,
          description,
          domains: JSON.stringify(domains),
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

      toast.success('Study created successfully');
      router.push(`/dashboard/studies/${data.id}`);
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

            <Card>
              <CardHeader>
                <CardTitle>Study Domains</CardTitle>
                <CardDescription>Define the topic areas for participant recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Patient Safety, Clinical Protocols"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDomain())}
                  />
                  <Button type="button" onClick={addDomain}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {domains.map((domain) => (
                    <Badge key={domain} variant="secondary" className="px-3 py-1">
                      {domain}
                      <button
                        type="button"
                        onClick={() => removeDomain(domain)}
                        className="ml-2 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
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
