'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase, Study, Proposal, DelphiItem, ProposalCluster } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, CircleCheck as CheckCircle2, CreditCard as Edit2, Save } from 'lucide-react';

type ProposalWithCluster = Proposal & {
  clusterLabel?: string;
  clusterSummary?: string;
};

export default function ClusterProposalsPage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params?.id as string;

  const [study, setStudy] = useState<Study | null>(null);
  const [proposals, setProposals] = useState<ProposalWithCluster[]>([]);
  const [clusters, setClusters] = useState<ProposalCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [clustering, setClustering] = useState(false);
  const [generatingItems, setGeneratingItems] = useState(false);

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

      const { data: proposalsData, error: proposalsError } = await supabase
        .from('proposals')
        .select('*')
        .eq('study_id', studyId)
        .eq('status', 'submitted')
        .order('domain', { ascending: true })
        .order('created_at', { ascending: true });

      if (proposalsError) throw proposalsError;
      setProposals(proposalsData || []);

      const { data: clustersData, error: clustersError } = await supabase
        .from('proposal_clusters')
        .select('*')
        .eq('study_id', studyId)
        .order('domain', { ascending: true });

      if (clustersError) throw clustersError;
      setClusters(clustersData || []);
    } catch (error: any) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunClustering = async () => {
    if (proposals.length === 0) {
      toast.error('No proposals to cluster');
      return;
    }

    setClustering(true);
    try {
      const response = await fetch('/api/ai/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendations: proposals.map((p) => ({
            id: p.id,
            text: p.recommendation,
            domain: p.domain,
          })),
        }),
      });

      if (!response.ok) throw new Error('Clustering failed');

      const data = await response.json();

      const updatedProposals = [...proposals];
      for (const cluster of data.clusters) {
        for (const proposalId of cluster.items) {
          const index = updatedProposals.findIndex((p) => p.id === proposalId);
          if (index !== -1) {
            updatedProposals[index] = {
              ...updatedProposals[index],
              clusterLabel: cluster.summary,
            };
          }
        }

        await supabase.from('proposal_clusters').insert({
          study_id: studyId,
          domain: 'General',
          cluster_label: cluster.summary,
          proposal_count: cluster.items.length,
          created_by_ai: true,
        });
      }

      setProposals(updatedProposals);
      toast.success('Clustering completed');
      loadData();
    } catch (error: any) {
      toast.error('Failed to cluster proposals');
      console.error(error);
    } finally {
      setClustering(false);
    }
  };

  const handleGenerateDelphiItems = async () => {
    if (clusters.length === 0) {
      toast.error('No clusters available. Run clustering first.');
      return;
    }

    if (!study) {
      toast.error('Study not found');
      return;
    }

    setGeneratingItems(true);
    try {
      const domains = Array.isArray(study.domains) ? study.domains : [];

      for (const domain of domains) {
        const domainProposals = proposals.filter((p) => p.domain === domain);
        const domainClusters = clusters.filter((c) => c.domain === domain);

        if (domainProposals.length === 0) continue;

        const existingItems = await supabase
          .from('delphi_items')
          .select('item_number')
          .eq('study_id', studyId)
          .eq('domain', domain)
          .order('item_number', { ascending: false })
          .limit(1);

        let nextItemNumber = 1;
        if (existingItems.data && existingItems.data.length > 0) {
          nextItemNumber = existingItems.data[0].item_number + 1;
        }

        for (let i = 0; i < domainClusters.length; i++) {
          const cluster = domainClusters[i];
          const clusterProposals = domainProposals.filter(
            (p) => p.clusterLabel === cluster.cluster_label
          );

          const synthesizedRecommendation =
            cluster.cluster_summary ||
            `Synthesized from ${clusterProposals.length} expert proposals`;

          await supabase.from('delphi_items').insert({
            study_id: studyId,
            domain: domain,
            item_number: nextItemNumber + i,
            recommendation: synthesizedRecommendation,
            rationale: `Based on ${clusterProposals.length} related proposals`,
            source_proposals: clusterProposals.map((p) => p.id),
            status: 'active',
            consensus_reached: false,
          });
        }
      }

      toast.success('Delphi items generated successfully');
      router.push(`/dashboard/studies/${studyId}/rounds`);
    } catch (error: any) {
      toast.error('Failed to generate items');
      console.error(error);
    } finally {
      setGeneratingItems(false);
    }
  };

  const handleUpdateClusterSummary = async (clusterId: string, summary: string) => {
    try {
      const { error } = await supabase
        .from('proposal_clusters')
        .update({ cluster_summary: summary })
        .eq('id', clusterId);

      if (error) throw error;

      toast.success('Cluster summary updated');
      loadData();
    } catch (error: any) {
      toast.error('Failed to update summary');
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

  const groupedProposals = proposals.reduce((acc, proposal) => {
    const key = proposal.domain;
    if (!acc[key]) acc[key] = [];
    acc[key].push(proposal);
    return acc;
  }, {} as Record<string, ProposalWithCluster[]>);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-6">
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
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-purple-600" />
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">AI Topic Clustering</h1>
                  <p className="text-slate-600">{study?.title}</p>
                </div>
              </div>
            </div>
          </div>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="text-purple-900">About Topic Clustering</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-purple-800 space-y-2">
              <p>
                This AI-powered tool analyzes proposals from Round 1 and groups similar recommendations together.
                This helps synthesize expert input into consolidated items for rating in Round 2.
              </p>
              <p className="font-semibold">
                Process: Cluster proposals → Review clusters → Generate Delphi items for Round 2
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Proposals Overview</CardTitle>
                  <CardDescription>
                    {proposals.length} proposals submitted across {Object.keys(groupedProposals).length} domains
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRunClustering}
                    disabled={clustering || proposals.length === 0}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {clustering ? 'Clustering...' : 'Run AI Clustering'}
                  </Button>
                  {clusters.length > 0 && (
                    <Button
                      onClick={handleGenerateDelphiItems}
                      disabled={generatingItems}
                      variant="default"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {generatingItems ? 'Generating...' : 'Generate Delphi Items'}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900">{proposals.length}</p>
                  <p className="text-sm text-slate-600">Total Proposals</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{clusters.length}</p>
                  <p className="text-sm text-blue-800">Clusters Found</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{Object.keys(groupedProposals).length}</p>
                  <p className="text-sm text-green-800">Domains</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {Object.entries(groupedProposals).map(([domain, domainProposals]) => (
            <Card key={domain}>
              <CardHeader>
                <CardTitle>Domain: {domain}</CardTitle>
                <CardDescription>
                  {domainProposals.length} proposals in this domain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {domainProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {proposal.clusterLabel && (
                      <Badge variant="outline" className="mb-2">
                        {proposal.clusterLabel}
                      </Badge>
                    )}
                    <p className="font-semibold text-slate-900 mb-1">
                      {proposal.recommendation}
                    </p>
                    {proposal.rationale && (
                      <p className="text-sm text-slate-600">{proposal.rationale}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {clusters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>AI-Generated Clusters</CardTitle>
                <CardDescription>
                  Review and edit cluster summaries before generating Delphi items
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {clusters.map((cluster) => (
                  <ClusterCard
                    key={cluster.id}
                    cluster={cluster}
                    onUpdateSummary={handleUpdateClusterSummary}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function ClusterCard({
  cluster,
  onUpdateSummary,
}: {
  cluster: ProposalCluster;
  onUpdateSummary: (id: string, summary: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(cluster.cluster_summary || '');

  const handleSave = () => {
    onUpdateSummary(cluster.id, summary);
    setEditing(false);
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <Badge className="mb-2">{cluster.domain}</Badge>
          <p className="font-semibold text-slate-900">{cluster.cluster_label}</p>
          <p className="text-sm text-slate-600">
            {cluster.proposal_count} proposals in this cluster
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(!editing)}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>

      {editing ? (
        <div className="space-y-2">
          <Label>Cluster Summary (will become Delphi item)</Label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Write a clear, actionable recommendation synthesizing these proposals..."
            rows={3}
          />
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Summary
          </Button>
        </div>
      ) : (
        cluster.cluster_summary && (
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm text-blue-900">{cluster.cluster_summary}</p>
          </div>
        )
      )}
    </div>
  );
}
