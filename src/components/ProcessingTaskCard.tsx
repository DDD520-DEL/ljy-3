import { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import type { SpectrumPoint, ProcessingPipeline, PipelineStepState } from '@/types';
import { STEP_NAMES, STEP_DESCRIPTIONS } from '@/lib/pipelineSteps';
import {
  Play,
  Pause,
  X,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Trash2,
  TrendingDown,
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface StepPreviewChartProps {
  before: SpectrumPoint[];
  after: SpectrumPoint[];
  stepName: string;
}

function StepPreviewChart({ before, after, stepName }: StepPreviewChartProps) {
  const chartData = useMemo(() => {
    const wlSet = new Set<number>();
    before.forEach((p) => wlSet.add(p.wavelength));
    after.forEach((p) => wlSet.add(p.wavelength));
    const sorted = Array.from(wlSet).sort((a, b) => a - b);

    const toMap = (pts: SpectrumPoint[]) => {
      const m = new Map<number, number>();
      pts.forEach((p) => m.set(p.wavelength, p.intensity));
      return m;
    };
    const beforeMap = toMap(before);
    const afterMap = toMap(after);

    return {
      labels: sorted.map((w) => w.toFixed(0)),
      datasets: [
        {
          label: '处理前',
          data: sorted.map((w) => beforeMap.get(w) ?? null),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 1.2,
          tension: 0.15,
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: false,
          spanGaps: true,
        },
        {
          label: '处理后',
          data: sorted.map((w) => afterMap.get(w) ?? null),
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          borderWidth: 1.2,
          tension: 0.15,
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: false,
          spanGaps: true,
        },
      ],
    };
  }, [before, after]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'nearest' as const, intersect: false, axis: 'x' as const },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10, padding: 8 },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 6,
        callbacks: {
          title: (items: any) => `λ ${items[0]?.label || ''} Å`,
          label: (ctx: any) => {
            const val = ctx.parsed?.y;
            return val !== null && val !== undefined
              ? `${ctx.dataset.label}: ${val.toFixed(3)}`
              : null;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 8, callback: (v: any) => v.toFixed(0) + ' Å' },
        grid: { color: 'rgba(71, 85, 105, 0.25)', drawBorder: false },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 9 } },
        grid: { color: 'rgba(71, 85, 105, 0.25)', drawBorder: false },
      },
    },
  };

  return (
    <div className="mt-2 h-36 bg-slate-900/60 rounded-md border border-slate-700/50 p-1.5">
      <div className="text-[10px] text-slate-500 mb-0.5 px-1">{stepName} 前后对比</div>
      <Line data={chartData} options={options as any} />
    </div>
  );
}

interface StepItemProps {
  step: PipelineStepState;
  enabled: boolean;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
    case 'failed':
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    case 'cancelled':
      return <X className="w-4 h-4 text-slate-500" />;
    case 'pending':
    default:
      return <Circle className="w-4 h-4 text-slate-500" />;
  }
}

function StepItem({ step, enabled }: StepItemProps) {
  const [showPreview, setShowPreview] = useState(false);
  const hasPreview = step.preview && step.preview.before.length > 0;

  const statusColor =
    step.status === 'completed'
      ? 'text-emerald-400'
      : step.status === 'running'
      ? 'text-cyan-400'
      : step.status === 'failed'
      ? 'text-red-400'
      : step.status === 'cancelled'
      ? 'text-slate-500'
      : 'text-slate-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 py-1">
        <StatusIcon status={step.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-medium ${enabled ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
              {STEP_NAMES[step.stepType]}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] ${statusColor}`}>
                {step.status === 'running' && step.progress > 0
                  ? `${Math.round(step.progress * 100)}%`
                  : step.status === 'completed'
                  ? '完成'
                  : step.status === 'failed'
                  ? '失败'
                  : step.status === 'cancelled'
                  ? '已取消'
                  : enabled
                  ? '等待'
                  : '跳过'}
              </span>
              {hasPreview && step.status === 'completed' && (
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="p-0.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
                  title="查看前后对比"
                >
                  {showPreview ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
          {step.status === 'running' && (
            <div className="mt-1 h-1 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-200"
                style={{ width: `${Math.round(step.progress * 100)}%` }}
              />
            </div>
          )}
          {step.status === 'failed' && step.error && (
            <div className="mt-1 text-[10px] text-red-400">{step.error}</div>
          )}
        </div>
      </div>
      {showPreview && hasPreview && step.preview && (
        <StepPreviewChart
          before={step.preview.before}
          after={step.preview.after}
          stepName={STEP_NAMES[step.stepType]}
        />
      )}
    </div>
  );
}

interface ProcessingTaskCardProps {
  pipeline: ProcessingPipeline;
  onCancel?: () => void;
  onRemove?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: boolean;
}

export default function ProcessingTaskCard({
  pipeline,
  onCancel,
  onRemove,
  onPause,
  onResume,
  isPaused,
}: ProcessingTaskCardProps) {
  const statusText =
    pipeline.overallStatus === 'running'
      ? '处理中'
      : pipeline.overallStatus === 'completed'
      ? '已完成'
      : pipeline.overallStatus === 'failed'
      ? '失败'
      : pipeline.overallStatus === 'cancelled'
      ? '已取消'
      : '等待中';

  const statusColor =
    pipeline.overallStatus === 'running'
      ? 'text-cyan-400 border-cyan-700/50 bg-cyan-900/20'
      : pipeline.overallStatus === 'completed'
      ? 'text-emerald-400 border-emerald-700/50 bg-emerald-900/20'
      : pipeline.overallStatus === 'failed'
      ? 'text-red-400 border-red-700/50 bg-red-900/20'
      : pipeline.overallStatus === 'cancelled'
      ? 'text-slate-400 border-slate-700/50 bg-slate-800/40'
      : 'text-amber-400 border-amber-700/50 bg-amber-900/20';

  const isTerminal =
    pipeline.overallStatus === 'completed' ||
    pipeline.overallStatus === 'failed' ||
    pipeline.overallStatus === 'cancelled';

  return (
    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-lg">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-slate-100 truncate">{pipeline.spectrumName}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusColor}`}>
              {statusText}
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            创建于 {new Date(pipeline.createdAt).toLocaleTimeString()}
            {pipeline.completedAt &&
              ` · 完成于 ${new Date(pipeline.completedAt).toLocaleTimeString()}`}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {pipeline.overallStatus === 'running' && (
            <button
              onClick={isPaused ? onResume : onPause}
              className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
              title={isPaused ? '继续' : '暂停'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          )}
          {!isTerminal && (
            <button
              onClick={onCancel}
              className="p-1 rounded hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-colors"
              title="取消任务"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isTerminal && (
            <button
              onClick={onRemove}
              className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
              title="移除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {pipeline.overallStatus === 'failed' && pipeline.error && (
        <div className="mb-2 p-2 rounded bg-red-900/30 border border-red-800/50 text-[11px] text-red-300">
          {pipeline.error}
        </div>
      )}

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-400">总体进度</span>
          <span className="text-[11px] text-slate-300 font-mono">
            {Math.round(pipeline.overallProgress * 100)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              pipeline.overallStatus === 'failed'
                ? 'bg-red-500'
                : pipeline.overallStatus === 'completed'
                ? 'bg-emerald-500'
                : pipeline.overallStatus === 'cancelled'
                ? 'bg-slate-500'
                : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
            }`}
            style={{ width: `${Math.round(pipeline.overallProgress * 100)}%` }}
          />
        </div>
      </div>

      <div className="space-y-0.5">
        {pipeline.steps.map((step) => (
          <StepItem
            key={step.stepType}
            step={step}
            enabled={pipeline.config[step.stepType].enabled}
          />
        ))}
      </div>
    </div>
  );
}
