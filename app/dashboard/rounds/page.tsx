'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { supabase, Study, Round, DelphiItem, Response, Participant } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ChartBar as BarChart, TrendingUp, MessageSquare } from 'lucide-react';

export default function RoundsPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [items, setItems] = useState<DelphiItem[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [ratings, setRatings] = useState<{ [itemId: string]: number }>({});
  const [comments, setComments] = useState<{ [itemId: string]: string }>({});

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: participantsData } = await supabase
        .from('participants')
        .select('*')
        .eq('user_id', user.id);

      setParticipants(participantsData || []);

      const studyIds = participantsData?.map(p => p.study_id) || [];

      const { data: studiesData } = await supabase
        .from('studies')
        .select('*')
        .in('id', studyIds);

      setStudies(studiesData || []);

      const { data: roundsData } = await supabase
        .from('rounds')
        .select('*')
        .in('study_id', studyIds)
        .eq('status', 'open');

      setRounds(roundsData || []);

      if (roundsData && roundsData.length > 0) {
        const firstRound = roundsData[0];
        setSelectedRound(firstRound);

        const { data: itemsData } = await supabase
          .from('delphi_items')
          .select('*')
          .eq('study_id', firstRound.study_id)
          .order('item_number');

        setItems(itemsData || []);

        const participant = participantsData?.find(p => p.study_id === firstRound.study_id);
        if (participant) {
          const { data: responsesData } = await supabase
            .from('responses')
            .select('*')
            .eq('round_id', firstRound.id)
            .eq('participant_id', participant.id);

          setResponses(responsesData || []);

          const initialRatings: { [key: string]: number } = {};
          const initialComments: { [key: string]: string } = {};

          responsesData?.forEach(r => {
            initialRatings[r.item_id] = r.rating;
            initialComments[r.item_id] = r.comment;
          });

          setRatings(initialRatings);
          setComments(initialComments);
        }
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (itemId: string, value: number[]) => {
    setRatings({ ...ratings, [itemId]: value[0] });
  };

  const handleCommentChange = (itemId: string, value: string) => {
    setComments({ ...comments, [itemId]: value });
  };

  const handleSubmitResponse = async (itemId: string) => {
    if (!user || !selectedRound) return;

    const participant = participants.find(p => p.study_id === selectedRound.study_id);
    if (!participant) {
      toast.error('Participant record not found');
      return;
    }

    const rating = ratings[itemId];
    if (!rating) {
      toast.error('Please provide a rating');
      return;
    }

    setSubmitting(true);

    try {
      const existingResponse = responses.find(r => r.item_id === itemId);

      if (existingResponse) {
        const { error } = await supabase
          .from('responses')
          .update({
            rating,
            comment: comments[itemId] || '',
            submitted_at: new Date().toISOString(),
          })
          .eq('id', existingResponse.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('responses').insert({
          round_id: selectedRound.id,
          item_id: itemId,
          participant_id: participant.id,
          rating,
          comment: comments[itemId] || '',
        });

        if (error) throw error;
      }

      toast.success('Response saved successfully');
      loadData();
    } catch (error: any) {
      toast.error('Failed to save response');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStudy = (studyId: string) => studies.find(s => s.id === studyId);

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-slate-600">Loading rounds...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Delphi Rounds</h1>
            <p className="text-slate-600 mt-1">Rate recommendations and provide feedback</p>
          </div>

          {rounds.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BarChart className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No active rounds</h3>
                <p className="text-slate-600">There are no open rounds available at the moment</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {selectedRound && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>
                          {getStudy(selectedRound.study_id)?.title} - Round {selectedRound.round_number}
                        </CardTitle>
                        <CardDescription>
                          Rate each item on a scale from {getStudy(selectedRound.study_id)?.likert_min} to{' '}
                          {getStudy(selectedRound.study_id)?.likert_max}
                        </CardDescription>
                      </div>
                      <Badge>Open</Badge>
                    </div>
                  </CardHeader>
                </Card>
              )}

              {items.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-slate-600">No items available for this round yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => {
                    const study = getStudy(item.study_id);
                    const currentRating = ratings[item.id] || study?.likert_min || 1;
                    const currentComment = comments[item.id] || '';
                    const existingResponse = responses.find(r => r.item_id === item.id);

                    return (
                      <Card key={item.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">Item {item.item_number}</Badge>
                                <Badge variant="secondary">{item.domain}</Badge>
                              </div>
                              <CardTitle className="text-lg">{item.recommendation}</CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div>
                            <h4 className="font-semibold text-sm text-slate-700 mb-2">Rationale</h4>
                            <p className="text-slate-600">{item.rationale}</p>
                          </div>

                          {selectedRound && selectedRound.round_number > 1 && existingResponse?.previous_rating && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                <h4 className="font-semibold text-blue-900">Previous Round Feedback</h4>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-blue-700">Your Rating</p>
                                  <p className="text-xl font-bold text-blue-900">{existingResponse.previous_rating}</p>
                                </div>
                                <div>
                                  <p className="text-blue-700">Group Median</p>
                                  <p className="text-xl font-bold text-blue-900">
                                    {existingResponse.group_median?.toFixed(1) || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-blue-700">Group IQR</p>
                                  <p className="text-xl font-bold text-blue-900">
                                    {existingResponse.group_iqr?.toFixed(1) || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-4">
                            <div className="space-y-3">
                              <Label>
                                Your Rating: <span className="font-bold text-blue-600">{currentRating}</span>
                              </Label>
                              <Slider
                                value={[currentRating]}
                                onValueChange={(value) => handleRatingChange(item.id, value)}
                                min={study?.likert_min || 1}
                                max={study?.likert_max || 9}
                                step={1}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-slate-500">
                                <span>Strongly Disagree ({study?.likert_min})</span>
                                <span>Neutral</span>
                                <span>Strongly Agree ({study?.likert_max})</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`comment-${item.id}`}>
                                <MessageSquare className="inline h-4 w-4 mr-1" />
                                Comments (Optional)
                              </Label>
                              <Textarea
                                id={`comment-${item.id}`}
                                placeholder="Share your thoughts or suggestions..."
                                value={currentComment}
                                onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                rows={3}
                              />
                            </div>

                            <Button
                              onClick={() => handleSubmitResponse(item.id)}
                              disabled={submitting}
                              className="w-full"
                            >
                              {submitting ? 'Saving...' : existingResponse ? 'Update Response' : 'Submit Response'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
