'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase, Study, ProposalQuestion, StudyDomain, ParticipantToken } from '@/lib/supabase';
import { toast } from 'sonner';
import { CheckCircle2, Mail, AlertCircle } from 'lucide-react';

type QuestionResponse = {
  questionId: string;
  recommendation: string;
  rationale: string;
};

export default function RespondPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [tokenData, setTokenData] = useState<ParticipantToken | null>(null);
  const [study, setStudy] = useState<Study | null>(null);
  const [questions, setQuestions] = useState<ProposalQuestion[]>([]);
  const [domains, setDomains] = useState<StudyDomain[]>([]);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setError('No token provided');
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    setValidating(true);
    try {
      const { data: tokenRecord, error: tokenError } = await supabase
        .from('participant_tokens')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (tokenError || !tokenRecord) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      if (tokenRecord.used_at) {
        setError('This invitation link has already been used');
        setLoading(false);
        return;
      }

      if (new Date(tokenRecord.expires_at) < new Date()) {
        setError('This invitation link has expired');
        setLoading(false);
        return;
      }

      setTokenData(tokenRecord);

      const { data: studyData, error: studyError } = await supabase
        .from('studies')
        .select('*')
        .eq('id', tokenRecord.study_id)
        .maybeSingle();

      if (studyError || !studyData) {
        setError('Study not found');
        setLoading(false);
        return;
      }
      setStudy(studyData);

      const { data: domainsData } = await supabase
        .from('study_domains')
        .select('*')
        .eq('study_id', tokenRecord.study_id)
        .order('display_order', { ascending: true });
      setDomains(domainsData || []);

      const { data: questionsData, error: questionsError } = await supabase
        .from('proposal_questions')
        .select('*')
        .eq('study_id', tokenRecord.study_id)
        .order('display_order', { ascending: true });

      if (questionsError || !questionsData || questionsData.length === 0) {
        setError('No questions available for this study');
        setLoading(false);
        return;
      }

      setQuestions(questionsData);
      setResponses(
        questionsData.map((q) => ({
          questionId: q.id,
          recommendation: '',
          rationale: '',
        }))
      );

      setLoading(false);
    } catch (err: any) {
      setError('Failed to validate invitation link');
      setLoading(false);
      console.error(err);
    }
  };

  const handleValidate = () => {
    setValidated(true);
  };

  const handleResponseChange = (questionId: string, field: 'recommendation' | 'rationale', value: string) => {
    setResponses(
      responses.map((r) =>
        r.questionId === questionId ? { ...r, [field]: value } : r
      )
    );
  };

  const handleSubmit = async () => {
    const requiredQuestions = questions.filter((q) => q.required);
    const missingResponses = requiredQuestions.filter((q) => {
      const response = responses.find((r) => r.questionId === q.id);
      return !response || !response.recommendation.trim();
    });

    if (missingResponses.length > 0) {
      toast.error(`Please answer all required questions (${missingResponses.length} remaining)`);
      return;
    }

    setSubmitting(true);
    try {
      if (!tokenData) throw new Error('No token data');

      for (const response of responses) {
        if (!response.recommendation.trim()) continue;

        const question = questions.find((q) => q.id === response.questionId);
        if (!question) continue;

        const domain = domains.find((d) => d.id === question.domain_id);

        await supabase.from('proposals').insert({
          study_id: tokenData.study_id,
          participant_id: tokenData.participant_id,
          question_id: question.id,
          domain_id: question.domain_id,
          domain: domain?.name || 'General',
          recommendation: response.recommendation,
          rationale: response.rationale,
          status: 'submitted',
        });
      }

      await supabase
        .from('participant_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id);

      await supabase
        .from('participants')
        .update({
          last_activity_at: new Date().toISOString(),
          joined_at: new Date().toISOString()
        })
        .eq('id', tokenData.participant_id);

      setSubmitted(true);
      toast.success('Your responses have been submitted successfully!');
    } catch (err: any) {
      toast.error('Failed to submit responses');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h2>
              <p className="text-slate-600">{error}</p>
              <p className="text-sm text-slate-500 mt-4">
                Please contact the study administrator for a new invitation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Thank You!</h2>
              <p className="text-slate-700 mb-4">
                Your feedback has been submitted successfully.
              </p>
              <p className="text-sm text-slate-600">
                You may now close this window. You will be notified when the next round begins.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Mail className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-center">Email Validation</CardTitle>
            <CardDescription className="text-center">
              You have been invited to participate in:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="font-semibold text-lg text-slate-900 mb-2">{study?.title}</p>
              <p className="text-sm text-slate-600 mb-4">
                Confirming: <strong>{tokenData?.email}</strong>
              </p>
            </div>
            <Button onClick={handleValidate} className="w-full" size="lg">
              Continue to Feedback Form
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">{study?.title}</CardTitle>
            <CardDescription className="text-blue-700">Round 1 Feedback</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            {study?.description && <p>{study.description}</p>}
            <p className="mt-2">
              Please provide your expert recommendations for each question below.
            </p>
          </CardContent>
        </Card>

        {questions.map((question, index) => {
          const domain = domains.find((d) => d.id === question.domain_id);
          const response = responses.find((r) => r.questionId === question.id);

          return (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {domain && (
                      <Badge variant="outline">{domain.name}</Badge>
                    )}
                    <span className="text-sm text-slate-500">Question {index + 1}</span>
                    {question.required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">{question.question_text}</CardTitle>
                {question.question_rationale && (
                  <CardDescription>{question.question_rationale}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`rec-${question.id}`}>
                    Your Recommendation {question.required && '*'}
                  </Label>
                  <Textarea
                    id={`rec-${question.id}`}
                    value={response?.recommendation || ''}
                    onChange={(e) =>
                      handleResponseChange(question.id, 'recommendation', e.target.value)
                    }
                    placeholder="Enter your recommendation..."
                    rows={4}
                    required={question.required}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`rat-${question.id}`}>
                    Rationale or Evidence (Optional)
                  </Label>
                  <Textarea
                    id={`rat-${question.id}`}
                    value={response?.rationale || ''}
                    onChange={(e) =>
                      handleResponseChange(question.id, 'rationale', e.target.value)
                    }
                    placeholder="Provide reasoning or supporting evidence..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card className="sticky bottom-4 shadow-lg border-2 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">Ready to submit?</p>
                <p className="text-sm text-slate-600">
                  {questions.length} questions • Review your answers before submitting
                </p>
              </div>
              <Button onClick={handleSubmit} disabled={submitting} size="lg">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {submitting ? 'Submitting...' : 'Submit All Responses'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
