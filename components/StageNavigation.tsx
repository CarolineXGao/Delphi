'use client';

import { cn } from '@/lib/utils';
import { Check, Lock } from 'lucide-react';

export type Stage = {
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  isCompleted: boolean;
  isLocked: boolean;
  isCurrent: boolean;
};

type StageNavigationProps = {
  stages: Stage[];
  onStageClick: (stageNumber: number) => void;
};

export function StageNavigation({ stages, onStageClick }: StageNavigationProps) {
  return (
    <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0">
      <div className="p-6 border-b border-slate-200">
        <h2 className="font-semibold text-slate-900">Delphi Stages</h2>
        <p className="text-xs text-slate-600 mt-1">
          {stages.filter(s => s.isCompleted).length} of {stages.length} complete
        </p>
      </div>

      <nav className="p-4 space-y-2">
        {stages.map((stage) => (
          <button
            key={stage.number}
            onClick={() => !stage.isLocked && onStageClick(stage.number)}
            disabled={stage.isLocked}
            className={cn(
              'w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left',
              stage.isCurrent && 'bg-blue-50 border-2 border-blue-500',
              !stage.isCurrent && !stage.isLocked && 'hover:bg-slate-50 border border-transparent',
              stage.isLocked && 'opacity-50 cursor-not-allowed',
              stage.isCompleted && !stage.isCurrent && 'bg-green-50 border border-green-200'
            )}
          >
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 text-sm font-semibold',
              stage.isCurrent && 'bg-blue-600 text-white',
              stage.isCompleted && !stage.isCurrent && 'bg-green-600 text-white',
              !stage.isCurrent && !stage.isCompleted && !stage.isLocked && 'bg-slate-200 text-slate-700',
              stage.isLocked && 'bg-slate-100 text-slate-400'
            )}>
              {stage.isCompleted ? (
                <Check className="h-5 w-5" />
              ) : stage.isLocked ? (
                <Lock className="h-4 w-4" />
              ) : (
                stage.number
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className={cn(
                'font-semibold text-sm',
                stage.isCurrent && 'text-blue-900',
                stage.isCompleted && !stage.isCurrent && 'text-green-900',
                !stage.isCurrent && !stage.isCompleted && 'text-slate-900'
              )}>
                {stage.shortTitle}
              </h3>
              {stage.isCurrent && (
                <p className="text-xs text-blue-700 mt-0.5">In Progress</p>
              )}
              {stage.isCompleted && !stage.isCurrent && (
                <p className="text-xs text-green-700 mt-0.5">Complete</p>
              )}
              {stage.isLocked && (
                <p className="text-xs text-slate-500 mt-0.5">Locked</p>
              )}
            </div>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 mt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Overall Progress</span>
            <span className="font-semibold text-slate-900">
              {Math.round((stages.filter(s => s.isCompleted).length / stages.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${(stages.filter(s => s.isCompleted).length / stages.length) * 100}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
