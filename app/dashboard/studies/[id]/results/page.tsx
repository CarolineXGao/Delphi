'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase, Study, DelphiItem } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, CircleCheck as CheckCircle2, Circle as XCircle, Download, TrendingUp } from 'lucide-react';
import { calculateConsensus } from '@/lib/consensus-calculator';

type ItemWithStats = DelphiItem & {
  totalResponses: number;
  agreementPercentage: number;
};

export default function StudyResultsPage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params?.id as string;

  const [study, setStudy] = useState<Study | null>(null);
  const [items, setItems] = useState<ItemWithStats[]>([]);
  const [loading, setLoading] = useState(true);

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

      const { data: itemsData, error: itemsError } = await supabase
        .from('delphi_items')
        .select('*')
        .eq('study_id', studyId)
        .order('consensus_reached', { ascending: false })
        .order('final_median', { ascending: false })
        .order('domain', { ascending: true })
        .order('item_number', { ascending: true });

      if (itemsError) throw itemsError;

      const itemsWithStats = await Promise.all(
        (itemsData || []).map(async (item) => {
          const { data: responses } = await supabase
            .from('responses')
            .select('rating')
            .eq('item_id', item.id);

          const ratings = responses?.map((r) => r.rating) || [];
          const consensus = calculateConsensus(
            ratings,
            studyData.consensus_rule,
            studyData.iqr_threshold,
            studyData.net_agreement_threshold,
            studyData.likert_min,
            studyData.likert_max
          );

          return {
            ...item,
            totalResponses: consensus.totalResponses,
            agreementPercentage: consensus.agreementPercentage,
          };
        })
      );

      setItems(itemsWithStats);
    } catch (error: any) {
      toast.error('Failed to load results');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportResults = () => {
    const consensusItems = items.filter((item) => item.consensus_reached);
    const csv = generateCSV(consensusItems);
    downloadCSV(csv, `delphi-results-${studyId}.csv`);
    toast.success('Results exported');
  };

  const generateCSV = (data: ItemWithStats[]): string => {
    const headers = [
      'Domain',
      'Item Number',
      'Recommendation',
      'Median',
      'IQR',
      'Responses',
      'Agreement %',
      'Consensus',
    ];

    const rows = data.map((item) => [
      item.domain,
      item.item_number,
      `"${item.recommendation.replace(/"/g, '""')}"`,
      item.final_median?.toFixed(2) || '',
      item.final_iqr?.toFixed(2) || '',
      item.totalResponses,
      item.agreementPercentage.toFixed(1),
      item.consensus_reached ? 'Yes' : 'No',
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-slate-600">Loading results...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!study) return null;

  const consensusItems = items.filter((item) => item.consensus_reached);
  const noConsensusItems = items.filter((item) => !item.consensus_reached);

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
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Study Results</h1>
                  <p className="text-slate-600">{study.title}</p>
                </div>
              </div>
              <Button onClick={handleExportResults}>
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900">{items.length}</p>
                  <p className="text-sm text-slate-600">Total Items</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {consensusItems.length}
                  </p>
                  <p className="text-sm text-green-800">Consensus Reached</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-600">
                    {noConsensusItems.length}
                  </p>
                  <p className="text-sm text-amber-800">No Consensus</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {items.length > 0
                      ? Math.round((consensusItems.length / items.length) * 100)
                      : 0}
                    %
                  </p>
                  <p className="text-sm text-blue-800">Consensus Rate</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Consensus Criteria</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800">
              <p>
                <strong>Method:</strong> {study.consensus_rule.toUpperCase()}
              </p>
              {study.consensus_rule === 'iqr' ? (
                <p>
                  <strong>Threshold:</strong> IQR ≤ {study.iqr_threshold}
                </p>
              ) : (
                <p>
                  <strong>Threshold:</strong> Net Agreement ≥ {study.net_agreement_threshold}%
                </p>
              )}
            </CardContent>
          </Card>

          {consensusItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  Items with Consensus ({consensusItems.length})
                </CardTitle>
                <CardDescription>
                  These items achieved consensus and are recommended
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {consensusItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-green-200 rounded-lg p-4 bg-green-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-600">{item.domain}</Badge>
                        <span className="text-xs text-slate-600">
                          Item {item.item_number}
                        </span>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="font-semibold text-slate-900 mb-3">
                      {item.recommendation}
                    </p>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Median</p>
                        <p className="font-bold text-green-700">
                          {item.final_median?.toFixed(2) || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">IQR</p>
                        <p className="font-bold text-green-700">
                          {item.final_iqr?.toFixed(2) || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Responses</p>
                        <p className="font-bold text-slate-900">{item.totalResponses}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Agreement</p>
                        <p className="font-bold text-slate-900">
                          {item.agreementPercentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {noConsensusItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-6 w-6 text-amber-600" />
                  Items without Consensus ({noConsensusItems.length})
                </CardTitle>
                <CardDescription>
                  These items did not achieve consensus and may need revision
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {noConsensusItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-amber-200 rounded-lg p-4 bg-amber-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{item.domain}</Badge>
                        <span className="text-xs text-slate-600">
                          Item {item.item_number}
                        </span>
                      </div>
                      <XCircle className="h-5 w-5 text-amber-600" />
                    </div>
                    <p className="font-semibold text-slate-900 mb-3">
                      {item.recommendation}
                    </p>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Median</p>
                        <p className="font-bold text-amber-700">
                          {item.final_median?.toFixed(2) || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">IQR</p>
                        <p className="font-bold text-amber-700">
                          {item.final_iqr?.toFixed(2) || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Responses</p>
                        <p className="font-bold text-slate-900">{item.totalResponses}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Agreement</p>
                        <p className="font-bold text-slate-900">
                          {item.agreementPercentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
