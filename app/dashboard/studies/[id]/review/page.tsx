'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StageNavigation, Stage } from '@/components/StageNavigation';
import { StageContent, MetricCard, ChecklistItem } from '@/components/stages/StageContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, Study } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Users,
  FileText,
  MessageSquare,
  GitBranch,
  BarChart,
  RefreshCw,
  CheckCircle2,
  Download,
  Settings as SettingsIcon
} from 'lucide-react';

export default function ReviewWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params?.id as string;

  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStageNumber, setCurrentStageNumber] = useState(1);

  const [stats, setStats] = useState({
    totalParticipants: 0,
    activeParticipants: 0,
    totalDomains: 0,
    totalQuestions: 0,
    totalProposals: 0,
    totalItems: 0,
    consensusItemsCount: 0
  });

  useEffect(() => {
    if (studyId) {
      loadStudyData();
    }
  }, [studyId]);

  const loadStudyData = async () => {
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
      setCurrentStageNumber(studyData.current_stage || 1);

      const { count: participantsCount } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId)
        .neq('role', 'admin');

      const { count: activeParticipantsCount } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId)
        .neq('role', 'admin')
        .not('joined_at', 'is', null);

      const { count: domainsCount } = await supabase
        .from('study_domains')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId);

      const { count: questionsCount } = await supabase
        .from('proposal_questions')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId);

      const { count: proposalsCount } = await supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId)
        .eq('status', 'submitted');

      const { count: itemsCount } = await supabase
        .from('delphi_items')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId);

      const { count: consensusCount } = await supabase
        .from('delphi_items')
        .select('id', { count: 'exact', head: true })
        .eq('study_id', studyId)
        .eq('consensus_reached', true);

      setStats({
        totalParticipants: participantsCount || 0,
        activeParticipants: activeParticipantsCount || 0,
        totalDomains: domainsCount || 0,
        totalQuestions: questionsCount || 0,
        totalProposals: proposalsCount || 0,
        totalItems: itemsCount || 0,
        consensusItemsCount: consensusCount || 0
      });
    } catch (error: any) {
      toast.error('Failed to load study data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkStageComplete = async (stageNumber: number) => {
    if (!study) return;

    const completedStages = study.completed_stages || [];
    if (completedStages.includes(stageNumber)) {
      toast.info('Stage already marked as complete');
      return;
    }

    const newCompletedStages = [...completedStages, stageNumber];
    const nextStage = stageNumber + 1 <= 7 ? stageNumber + 1 : stageNumber;

    try {
      const { error } = await supabase
        .from('studies')
        .update({
          completed_stages: newCompletedStages,
          current_stage: nextStage
        })
        .eq('id', studyId);

      if (error) throw error;

      toast.success(`Stage ${stageNumber} marked as complete!`);
      await loadStudyData();
      if (nextStage !== stageNumber) {
        setCurrentStageNumber(nextStage);
      }
    } catch (error: any) {
      toast.error('Failed to update stage');
      console.error(error);
    }
  };

  const getStages = (): Stage[] => {
    const completedStages = study?.completed_stages || [];

    return [
      {
        number: 1,
        title: 'Setup',
        shortTitle: 'Setup',
        description: 'Define study basics, domains, and participants',
        isCompleted: completedStages.includes(1),
        isLocked: false,
        isCurrent: currentStageNumber === 1
      },
      {
        number: 2,
        title: 'Collecting Proposals',
        shortTitle: 'Proposals',
        description: 'Gather expert recommendations (Round 1)',
        isCompleted: completedStages.includes(2),
        isLocked: !completedStages.includes(1),
        isCurrent: currentStageNumber === 2
      },
      {
        number: 3,
        title: 'Synthesis & Item Generation',
        shortTitle: 'Synthesis',
        description: 'Cluster proposals into rating items',
        isCompleted: completedStages.includes(3),
        isLocked: !completedStages.includes(2),
        isCurrent: currentStageNumber === 3
      },
      {
        number: 4,
        title: 'Rating (Round 2)',
        shortTitle: 'Rating',
        description: 'Experts rate items on importance',
        isCompleted: completedStages.includes(4),
        isLocked: !completedStages.includes(3),
        isCurrent: currentStageNumber === 4
      },
      {
        number: 5,
        title: 'Re-Rating (Round 3)',
        shortTitle: 'Re-Rating',
        description: 'Experts re-rate with feedback',
        isCompleted: completedStages.includes(5),
        isLocked: !completedStages.includes(4),
        isCurrent: currentStageNumber === 5
      },
      {
        number: 6,
        title: 'Validation / Workshop',
        shortTitle: 'Validation',
        description: 'Final consensus discussions',
        isCompleted: completedStages.includes(6),
        isLocked: !completedStages.includes(5),
        isCurrent: currentStageNumber === 6
      },
      {
        number: 7,
        title: 'Results & Exports',
        shortTitle: 'Results',
        description: 'View consensus and export data',
        isCompleted: completedStages.includes(7),
        isLocked: !completedStages.includes(6),
        isCurrent: currentStageNumber === 7
      }
    ];
  };

  const renderStageContent = () => {
    if (!study) return null;

    const stages = getStages();
    const currentStage = stages.find(s => s.number === currentStageNumber);
    if (!currentStage) return null;

    const status = currentStage.isLocked ? 'locked' : currentStage.isCompleted ? 'complete' : 'in_progress';

    switch (currentStageNumber) {
      case 1:
        return renderStage1Setup(status);
      case 2:
        return renderStage2Proposals(status);
      case 3:
        return renderStage3Synthesis(status);
      case 4:
        return renderStage4Rating(status);
      case 5:
        return renderStage5ReRating(status);
      case 6:
        return renderStage6Validation(status);
      case 7:
        return renderStage7Results(status);
      default:
        return null;
    }
  };

  const renderStage1Setup = (status: 'locked' | 'in_progress' | 'complete') => {
    const hasDomains = stats.totalDomains > 0;
    const canMarkComplete = hasDomains;

    return (
      <StageContent
        stageNumber={1}
        title="Setup"
        description="Define the research domains that will organize your Delphi study."
        status={status}
        helpText="This stage ensures your study has a clear structure with research domains (topic areas). Proposal questions will be added in Stage 2."
        onMarkComplete={() => handleMarkStageComplete(1)}
        canMarkComplete={canMarkComplete}
      >
        <div className="grid grid-cols-1 gap-4">
          <MetricCard
            label="Domains"
            value={stats.totalDomains}
            icon={<FileText className="h-8 w-8" />}
            subtext="Research categories"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Setup Checklist</CardTitle>
            <CardDescription>Complete this step to move to Stage 2</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChecklistItem
              label="Define research domains"
              isComplete={hasDomains}
              onClick={() => router.push(`/dashboard/studies/${studyId}/domains`)}
            />
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Manage your domain</CardTitle>
            <CardDescription>Add or remove domains to categorize your research areas</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push(`/dashboard/studies/${studyId}/domains`)}
              size="lg"
              className="w-full"
            >
              <FileText className="h-5 w-5 mr-2" />
              Manage Domains
            </Button>
          </CardContent>
        </Card>
      </StageContent>
    );
  };

  const renderStage2Proposals = (status: 'locked' | 'in_progress' | 'complete') => {
    const responseRate = stats.totalParticipants > 0
      ? Math.round((stats.activeParticipants / stats.totalParticipants) * 100)
      : 0;
    const canMarkComplete = stats.totalProposals > 0;

    return (
      <StageContent
        stageNumber={2}
        title="Collecting Proposals (Round 1)"
        description="Gather expert recommendations through guided questions."
        status={status}
        helpText="Send email invitations to participants. They'll submit proposals answering your research questions. Monitor response rates and follow up as needed."
        onMarkComplete={() => handleMarkStageComplete(2)}
        canMarkComplete={canMarkComplete}
      >
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total Invited"
            value={stats.totalParticipants}
            icon={<Users className="h-8 w-8" />}
          />
          <MetricCard
            label="Responses"
            value={stats.activeParticipants}
            icon={<CheckCircle2 className="h-8 w-8" />}
            subtext={`${responseRate}% response rate`}
          />
          <MetricCard
            label="Proposals Submitted"
            value={stats.totalProposals}
            icon={<MessageSquare className="h-8 w-8" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Proposal Collection</CardTitle>
            <CardDescription>Manage invitations and track submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Response Progress</span>
                <span className="font-semibold">{stats.activeParticipants} / {stats.totalParticipants}</span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${responseRate}%` }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => router.push(`/dashboard/studies/${studyId}/proposals`)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                View Proposals
              </Button>
              <Button variant="outline" onClick={() => router.push(`/dashboard/studies/${studyId}/participants`)}>
                <Users className="h-4 w-4 mr-2" />
                Manage Participants
              </Button>
            </div>
          </CardContent>
        </Card>
      </StageContent>
    );
  };

  const renderStage3Synthesis = (status: 'locked' | 'in_progress' | 'complete') => {
    const canMarkComplete = stats.totalItems > 0;

    return (
      <StageContent
        stageNumber={3}
        title="Synthesis & Item Generation"
        description="Cluster similar proposals and create rating items for Round 2."
        status={status}
        helpText="Use AI clustering to group similar proposals, then review and refine. Each cluster becomes a rating item that experts will evaluate in the next round."
        onMarkComplete={() => handleMarkStageComplete(3)}
        canMarkComplete={canMarkComplete}
      >
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total Proposals"
            value={stats.totalProposals}
            icon={<MessageSquare className="h-8 w-8" />}
          />
          <MetricCard
            label="Items Created"
            value={stats.totalItems}
            icon={<GitBranch className="h-8 w-8" />}
            subtext="For rating"
          />
          <MetricCard
            label="Domains"
            value={stats.totalDomains}
            icon={<FileText className="h-8 w-8" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AI Clustering</CardTitle>
            <CardDescription>Group similar proposals into coherent rating items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              {stats.totalItems > 0
                ? `You have ${stats.totalItems} rating items ready for Round 2.`
                : `${stats.totalProposals} proposals are waiting to be clustered into rating items.`}
            </p>
            <Button onClick={() => router.push(`/dashboard/studies/${studyId}/cluster`)}>
              <GitBranch className="h-4 w-4 mr-2" />
              {stats.totalItems > 0 ? 'Review Items' : 'Start Clustering'}
            </Button>
          </CardContent>
        </Card>
      </StageContent>
    );
  };

  const renderStage4Rating = (status: 'locked' | 'in_progress' | 'complete') => {
    const canMarkComplete = (study?.current_round || 0) >= 2;

    return (
      <StageContent
        stageNumber={4}
        title="Rating (Round 2)"
        description="Experts rate each item on importance using a Likert scale."
        status={status}
        helpText="Start Round 2 to have experts rate all items. Track progress and close the round when enough responses are received."
        onMarkComplete={() => handleMarkStageComplete(4)}
        canMarkComplete={canMarkComplete}
      >
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Items to Rate"
            value={stats.totalItems}
            icon={<FileText className="h-8 w-8" />}
          />
          <MetricCard
            label="Participants"
            value={stats.totalParticipants}
            icon={<Users className="h-8 w-8" />}
          />
          <MetricCard
            label="Current Round"
            value={study?.current_round || 0}
            icon={<BarChart className="h-8 w-8" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Round 2 Management</CardTitle>
            <CardDescription>Start and monitor the rating round</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.push(`/dashboard/studies/${studyId}/rounds`)}>
              <BarChart className="h-4 w-4 mr-2" />
              Manage Rounds
            </Button>
          </CardContent>
        </Card>
      </StageContent>
    );
  };

  const renderStage5ReRating = (status: 'locked' | 'in_progress' | 'complete') => {
    const canMarkComplete = (study?.current_round || 0) >= 3;

    return (
      <StageContent
        stageNumber={5}
        title="Re-Rating (Round 3)"
        description="Experts re-rate items with feedback from Round 2 results."
        status={status}
        helpText="Show experts the group median and their previous ratings. This helps build consensus around items."
        onMarkComplete={() => handleMarkStageComplete(5)}
        canMarkComplete={canMarkComplete}
      >
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Items"
            value={stats.totalItems}
            icon={<FileText className="h-8 w-8" />}
          />
          <MetricCard
            label="At Consensus"
            value={stats.consensusItemsCount}
            icon={<CheckCircle2 className="h-8 w-8" />}
          />
          <MetricCard
            label="Current Round"
            value={study?.current_round || 0}
            icon={<RefreshCw className="h-8 w-8" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Round 3 Management</CardTitle>
            <CardDescription>Monitor re-rating progress and consensus</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/dashboard/studies/${studyId}/rounds`)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Manage Rounds
            </Button>
          </CardContent>
        </Card>
      </StageContent>
    );
  };

  const renderStage6Validation = (status: 'locked' | 'in_progress' | 'complete') => {
    return (
      <StageContent
        stageNumber={6}
        title="Validation / Workshop (Optional)"
        description="Conduct final discussions or validation meetings with your expert panel."
        status={status}
        helpText="This optional stage allows for group discussions, workshops, or validation sessions to finalize consensus."
        onMarkComplete={() => handleMarkStageComplete(6)}
        canMarkComplete={true}
      >
        <Card>
          <CardHeader>
            <CardTitle>Validation Activities</CardTitle>
            <CardDescription>Optional discussions and final consensus building</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Use this stage for workshops, validation meetings, or final group discussions.
              When complete, mark this stage as finished to proceed to results.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push(`/dashboard/studies/${studyId}/results`)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                View Current Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </StageContent>
    );
  };

  const renderStage7Results = (status: 'locked' | 'in_progress' | 'complete') => {
    const consensusRate = stats.totalItems > 0
      ? Math.round((stats.consensusItemsCount / stats.totalItems) * 100)
      : 0;

    return (
      <StageContent
        stageNumber={7}
        title="Results & Exports"
        description="View final consensus outcomes and export your study data."
        status={status}
        helpText="Review consensus statistics, item rankings, and export data for publication or further analysis."
        onMarkComplete={() => handleMarkStageComplete(7)}
        canMarkComplete={true}
      >
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total Items"
            value={stats.totalItems}
            icon={<FileText className="h-8 w-8" />}
          />
          <MetricCard
            label="Consensus Reached"
            value={stats.consensusItemsCount}
            icon={<CheckCircle2 className="h-8 w-8" />}
            subtext={`${consensusRate}% of items`}
          />
          <MetricCard
            label="Participants"
            value={stats.activeParticipants}
            icon={<Users className="h-8 w-8" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Study Complete</CardTitle>
            <CardDescription>View results and export data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Consensus Rate</span>
                <span className="font-semibold">{stats.consensusItemsCount} / {stats.totalItems} items</span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all"
                  style={{ width: `${consensusRate}%` }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => router.push(`/dashboard/studies/${studyId}/results`)}>
                <BarChart className="h-4 w-4 mr-2" />
                View Full Results
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </StageContent>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout studyTitle={study?.title} studyId={studyId} showReviewButton={false}>
          <div className="flex items-center justify-center h-screen">
            <p className="text-slate-600">Loading study...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!study) return null;

  return (
    <ProtectedRoute>
      <DashboardLayout studyTitle={study.title} studyId={studyId} showReviewButton={false}>
        <div className="flex h-[calc(100vh-4rem)] bg-slate-50">
          <StageNavigation
            stages={getStages()}
            onStageClick={setCurrentStageNumber}
          />
          {renderStageContent()}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
