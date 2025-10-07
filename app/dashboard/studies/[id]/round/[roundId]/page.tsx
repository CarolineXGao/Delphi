'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase, Study, Round, DelphiItem, Response, Participant } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, ChartBar as BarChart3, CircleCheck as CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type ItemWithResponse = DelphiItem & {
  myRating?: number;
  myComment?: string;
  myPreviousRating?: number;
  groupMedian?: number;
  groupIqr?: number;
  responseId?: string;
};

export default function RoundRatingPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const studyId = params?.id as string;
  const roundId = params?.roundId as string;

  const [study, setStudy] = useState<Study | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [items, setItems] = useState<ItemWithResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (studyId && roundId && user) {
      loadData();
    }
  }, [studyId, roundId, user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: studyData, error: studyError } = await supabase
        .from('studies')
        .select('*')
        .eq('id', studyId)
        .maybeSingle();

      if (studyError) throw studyError;
      setStudy(studyData);

      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .select('*')
        .eq('id', roundId)
        .maybeSingle();

      if (roundError) throw roundError;
      setRound(roundData);

      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('study_id', studyId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (participantError) throw participantError;
      setParticipant(participantData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('delphi_items')
        .select('*')
        .eq('study_id', studyId)
        .eq('status', 'active')
        .order('domain', { ascending: true })
        .order('item_number', { ascending: true });

      if (itemsError) throw itemsError;

      if (participantData) {
        const { data: responsesData, error: responsesError } = await supabase
          .from('responses')
          .select('*')
          .eq('round_id', roundId)
          .eq('participant_id', participantData.id);

        if (responsesError) throw responsesError;

        const itemsWithResponses = (itemsData || []).map((item) => {
          const response = responsesData?.find((r) => r.item_id === item.id);
          return {
            ...item,
            myRating: response?.rating,
            myComment: response?.comment,
            myPreviousRating: response?.previous_rating,
            groupMedian: response?.group_median,
            groupIqr: response?.group_iqr,
            responseId: response?.id,
          };
        });

        setItems(itemsWithResponses);
      } else {
        setItems(itemsData || []);
      }
    } catch (error: any) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (itemId: string, rating: number) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, myRating: rating } : item
      )
    );
  };

  const handleCommentChange = (itemId: string, comment: string) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, myComment: comment } : item
      )
    );
  };

  const handleSaveResponse = async (item: ItemWithResponse) => {
    if (!participant || item.myRating === undefined) {
      toast.error('Please provide a rating');
      return;
    }

    setSaving(true);
    try {
      if (item.responseId) {
        const { error } = await supabase
          .from('responses')
          .update({
            rating: item.myRating,
            comment: item.myComment || '',
          })
          .eq('id', item.responseId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('responses')
          .insert({
            round_id: roundId,
            item_id: item.id,
            participant_id: participant.id,
            rating: item.myRating,
            comment: item.myComment || '',
            previous_rating: item.myPreviousRating,
            group_median: item.groupMedian,
            group_iqr: item.groupIqr,
          })
          .select()
          .single();

        if (error) throw error;

        setItems(
          items.map((i) =>
            i.id === item.id ? { ...i, responseId: data.id } : i
          )
        );
      }

      toast.success('Rating saved');
    } catch (error: any) {
      toast.error('Failed to save rating');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAll = async () => {
    const unratedItems = items.filter((item) => item.myRating === undefined);

    if (unratedItems.length > 0) {
      toast.error(`Please rate all ${items.length} items before submitting`);
      return;
    }

    setSaving(true);
    try {
      for (const item of items) {
        if (!item.responseId) {
          await handleSaveResponse(item);
        }
      }

      toast.success('All ratings submitted successfully');
    } catch (error: any) {
      toast.error('Failed to submit all ratings');
      console.error(error);
    } finally {
      setSaving(false);
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

  if (!study || !round || !participant) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Card className="max-w-2xl mx-auto mt-8">
            <CardContent className="pt-6">
              <p className="text-center text-slate-600">Round not available</p>
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const isOpen = round.status === 'open';
  const isRound3 = round.round_number >= 3;
  const ratedCount = items.filter((item) => item.myRating !== undefined).length;

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
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">
                    Round {round.round_number}: {isRound3 ? 'Re-rating with Feedback' : 'Rating & Refinement'}
                  </h1>
                  <p className="text-slate-600">{study.title}</p>
                </div>
              </div>
              <Badge className={isOpen ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                {round.status}
              </Badge>
            </div>
          </div>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Instructions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800 space-y-2">
              <p>
                {isRound3
                  ? 'In this round, you can see your previous rating and the group consensus statistics. Please review and re-rate each item, taking into account the panel feedback.'
                  : 'Rate each item on a scale from ' + study.likert_min + ' to ' + study.likert_max + '. Consider the importance, feasibility, and relevance of each recommendation.'}
              </p>
              <p className="font-semibold">
                Progress: {ratedCount} of {items.length} items rated
              </p>
              {isRound3 && (
                <div className="flex items-start gap-2 bg-blue-100 p-3 rounded">
                  <Info className="h-5 w-5 text-blue-700 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-900">
                    <strong>Group feedback shown:</strong> Median = middle value, IQR = measure of agreement
                    (lower IQR means higher agreement)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-600">No items available for rating</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {item.domain}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            Item {item.item_number}
                          </span>
                          {item.myRating !== undefined && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <CardTitle className="text-lg font-semibold text-slate-900">
                          {item.recommendation}
                        </CardTitle>
                        {item.rationale && (
                          <CardDescription className="mt-2">
                            {item.rationale}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isRound3 && item.myPreviousRating !== undefined && (
                      <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-xs text-slate-600">Your Previous Rating</p>
                          <p className="text-lg font-bold text-slate-900">
                            {item.myPreviousRating}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Group Median</p>
                          <p className="text-lg font-bold text-blue-600">
                            {item.groupMedian?.toFixed(1) || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Group IQR</p>
                          <p className="text-lg font-bold text-slate-600">
                            {item.groupIqr?.toFixed(2) || '-'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>
                          Your Rating: {item.myRating !== undefined ? item.myRating : '-'}
                        </Label>
                        <div className="flex gap-1 text-xs text-slate-600">
                          <span>{study.likert_min}</span>
                          <span className="mx-2">to</span>
                          <span>{study.likert_max}</span>
                        </div>
                      </div>
                      <Slider
                        value={[item.myRating || study.likert_min]}
                        onValueChange={(value) => handleRatingChange(item.id, value[0])}
                        min={study.likert_min}
                        max={study.likert_max}
                        step={1}
                        disabled={!isOpen}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`comment-${item.id}`}>
                        Comments (Optional)
                      </Label>
                      <Textarea
                        id={`comment-${item.id}`}
                        value={item.myComment || ''}
                        onChange={(e) => handleCommentChange(item.id, e.target.value)}
                        placeholder="Add any comments or suggestions..."
                        rows={2}
                        disabled={!isOpen}
                      />
                    </div>

                    {isOpen && (
                      <Button
                        onClick={() => handleSaveResponse(item)}
                        disabled={saving || item.myRating === undefined}
                        size="sm"
                      >
                        {item.responseId ? 'Update Rating' : 'Save Rating'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {isOpen && items.length > 0 && (
            <Card className="sticky bottom-4 shadow-lg border-2 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {ratedCount} of {items.length} items rated
                    </p>
                    <p className="text-sm text-slate-600">
                      {ratedCount === items.length
                        ? 'All items rated - ready to submit'
                        : `${items.length - ratedCount} items remaining`}
                    </p>
                  </div>
                  <Button
                    onClick={handleSubmitAll}
                    disabled={saving || ratedCount !== items.length}
                    size="lg"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Submit All Ratings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
