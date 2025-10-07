'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Lock, AlertCircle, Info } from 'lucide-react';

type StageStatus = 'locked' | 'in_progress' | 'complete';

type StageContentProps = {
  stageNumber: number;
  title: string;
  description: string;
  status: StageStatus;
  children: ReactNode;
  helpText?: string;
  onMarkComplete?: () => void;
  canMarkComplete?: boolean;
};

export function StageContent({
  stageNumber,
  title,
  description,
  status,
  children,
  helpText,
  onMarkComplete,
  canMarkComplete = false
}: StageContentProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" /> Complete</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'locked':
        return <Badge className="bg-slate-100 text-slate-600"><Lock className="h-3 w-3 mr-1" /> Locked</Badge>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white text-lg font-bold">
                {stageNumber}
              </div>
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              {getStatusBadge()}
            </div>
            <p className="text-slate-600 mt-2 max-w-3xl">{description}</p>
          </div>
        </div>

        {helpText && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900">{helpText}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'locked' ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 mb-1">Stage Locked</p>
                  <p className="text-sm text-amber-800">
                    Complete the previous stage before accessing this one.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {children}

            {status === 'in_progress' && onMarkComplete && (
              <Card className="border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Ready to move forward?</h3>
                      <p className="text-sm text-slate-600">
                        Mark this stage as complete to unlock the next phase.
                      </p>
                    </div>
                    <Button
                      onClick={onMarkComplete}
                      disabled={!canMarkComplete}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark Stage Complete
                    </Button>
                  </div>
                  {!canMarkComplete && (
                    <p className="text-sm text-amber-700 mt-3">
                      Complete all required actions above before marking this stage complete.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: ReactNode;
  subtext?: string;
};

export function MetricCard({ label, value, icon, subtext }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
          </div>
          <div className="text-blue-600">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

type ChecklistItemProps = {
  label: string;
  isComplete: boolean;
  onClick?: () => void;
};

export function ChecklistItem({ label, isComplete, onClick }: ChecklistItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={isComplete}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
    >
      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
        isComplete ? 'bg-green-600' : 'bg-slate-200'
      }`}>
        {isComplete && <Check className="h-4 w-4 text-white" />}
      </div>
      <span className={`font-medium ${isComplete ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
        {label}
      </span>
    </button>
  );
}
