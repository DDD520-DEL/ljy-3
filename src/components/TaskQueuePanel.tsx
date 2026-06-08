import { useState, useEffect, useCallback } from 'react';
import type { ProcessingTask, ProcessingPipeline, PipelineConfig, ProcessingStepType } from '@/types';
import { pipelineEngine } from '@/lib/pipelineEngine';
import {
  DEFAULT_PIPELINE_CONFIG,
  STEP_NAMES,
  STEP_DESCRIPTIONS,
  STEP_ORDER,
} from '@/lib/pipelineSteps';
import ProcessingTaskCard from './ProcessingTaskCard';
import {
  ListTodo,
  Settings,
  Play,
  Pause,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface PipelineConfigPanelProps {
  config: PipelineConfig;
  onChange: (config: PipelineConfig) => void;
  disabled?: boolean;
}

function PipelineConfigPanel({ config, onChange, disabled }: PipelineConfigPanelProps) {
  const [expandedStep, setExpandedStep] = useState<ProcessingStepType | null>(null);

  const toggleStep = (stepType: ProcessingStepType, enabled: boolean) => {
    const newConfig = {
      ...config,
      [stepType]: { ...config[stepType], enabled },
    };
    onChange(newConfig);
  };

  const updateParam = (
    stepType: ProcessingStepType,
    key: string,
    value: number | string | boolean
  ) => {
    const stepConfig = config[stepType];
    const newConfig = {
      ...config,
      [stepType]: {
        ...stepConfig,
        params: { ...stepConfig.params, [key]: value },
      },
    };
    onChange(newConfig);
  };

  const renderStepConfig = (stepType: ProcessingStepType) => {
    const stepCfg = config[stepType];
    const isExpanded = expandedStep === stepType;
    const params = stepCfg.params as Record<string, number>;

    return (
      <div key={stepType} className="space-y-1.5">
        <div className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            checked={stepCfg.enabled}
            onChange={(e) => toggleStep(stepType, e.target.checked)}
            disabled={disabled}
            className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0 disabled:opacity-50"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-200">{STEP_NAMES[stepType]}</div>
            <div className="text-[10px] text-slate-500">{STEP_DESCRIPTIONS[stepType]}</div>
          </div>
          <button
            onClick={() => setExpandedStep(isExpanded ? null : stepType)}
            disabled={!stepCfg.enabled || disabled}
            className="p-0.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
          >
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        {isExpanded && stepCfg.enabled && (
          <div className="ml-5.5 pl-4 border-l border-slate-700/50 space-y-2 py-1">
            {Object.entries(params).map(([key, value]) => {
              if (typeof value !== 'number') return null;
              const isInt = key.includes('Iteration') || key.includes('Order') || key.includes('Size') || key.includes('Window');
              const labelMap: Record<string, string> = {
                skyWindowSize: '窗口大小',
                polynomialOrder: '多项式阶数',
                sigmaThreshold: 'σ 阈值',
                maxIterations: '最大迭代次数',
                windowSize: '邻域窗口',
                shiftTolerance: '偏移容差 (Å)',
                sigma: 'σ 倍数',
              };
              const rangeMap: Record<string, { min: number; max: number; step: number }> = {
                skyWindowSize: { min: 10, max: 200, step: 5 },
                polynomialOrder: { min: 1, max: 6, step: 1 },
                sigmaThreshold: { min: 2, max: 10, step: 0.5 },
                maxIterations: { min: 1, max: 10, step: 1 },
                windowSize: { min: 2, max: 15, step: 1 },
                shiftTolerance: { min: 1, max: 50, step: 1 },
                sigma: { min: 1, max: 6, step: 0.5 },
              };
              const range = rangeMap[key] || { min: 0, max: 100, step: 1 };
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-400">{labelMap[key] || key}</label>
                    <span className="text-[10px] text-slate-300 font-mono">
                      {isInt ? Math.round(value) : value.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    value={value}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateParam(stepType, key, isInt ? Math.round(v) : v);
                    }}
                    disabled={disabled}
                    className="w-full accent-cyan-500"
                  />
                </div>
              );
            })}
            {stepType === 'wavelength_calibration' && (
              <div className="text-[10px] text-amber-400/70 flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>
                  波长定标需要在下方设置参考谱线波长。如果未设置参考谱线，此步骤将跳过。
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-0.5">
      {STEP_ORDER.map((stepType) => renderStepConfig(stepType))}
    </div>
  );
}

export default function TaskQueuePanel({ onSpectrumProcessed }: { onSpectrumProcessed?: (id: string) => void }) {
  const [tasks, setTasks] = useState<ProcessingTask[]>([]);
  const [pipelines, setPipelines] = useState<Map<string, ProcessingPipeline>>(new Map());
  const [isPaused, setIsPaused] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [pipelineConfig, setPipelineConfig] = useState<PipelineConfig>({
    ...DEFAULT_PIPELINE_CONFIG,
  });

  const refreshState = useCallback(() => {
    const allTasks = pipelineEngine.getTasks();
    setTasks(allTasks);
    const allPipelines = pipelineEngine.getAllPipelines();
    const map = new Map<string, ProcessingPipeline>();
    allPipelines.forEach((p) => map.set(p.id, p));
    setPipelines(map);
  }, []);

  useEffect(() => {
    const offTasks = pipelineEngine.onTaskQueueUpdate((newTasks) => {
      setTasks(newTasks);
      const completedNow = newTasks.filter(
        (t) => t.status === 'completed' && t.result
      );
      completedNow.forEach((t) => {
        if (onSpectrumProcessed) {
          onSpectrumProcessed(t.spectrumId);
        }
      });
      refreshState();
    });
    const offPipelines = pipelineEngine.onPipelineUpdate((pipeline) => {
      setPipelines((prev) => {
        const next = new Map(prev);
        next.set(pipeline.id, pipeline);
        return next;
      });
    });
    refreshState();
    return () => {
      offTasks();
      offPipelines();
    };
  }, [refreshState, onSpectrumProcessed]);

  const handleTogglePause = () => {
    if (isPaused) {
      pipelineEngine.resumeQueue();
    } else {
      pipelineEngine.pauseQueue();
    }
    setIsPaused(!isPaused);
  };

  const handleCancel = (taskId: string) => {
    pipelineEngine.cancelTask(taskId);
  };

  const handleRemove = (taskId: string) => {
    pipelineEngine.removeTask(taskId);
    refreshState();
  };

  const handleClearCompleted = () => {
    pipelineEngine.clearCompleted();
    refreshState();
  };

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const failedCount = tasks.filter((t) => t.status === 'failed').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <ListTodo className="w-3.5 h-3.5" />
          处理任务队列
          <span className="text-[10px] text-slate-500 font-normal">
            ({tasks.length} 个任务)
          </span>
        </h2>
        <div className="flex items-center gap-1">
          {(pendingCount > 0 || runningCount > 0) && (
            <button
              onClick={handleTogglePause}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
                isPaused
                  ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900/60'
                  : 'bg-amber-900/40 text-amber-300 border border-amber-700/50 hover:bg-amber-900/60'
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-3 h-3" /> 继续
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3" /> 暂停
                </>
              )}
            </button>
          )}
          {(completedCount > 0 || failedCount > 0) && (
            <button
              onClick={handleClearCompleted}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60 hover:text-slate-200 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> 清除已完成
            </button>
          )}
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="flex items-center gap-3 text-[10px] flex-wrap">
          {pendingCount > 0 && (
            <span className="text-amber-400">等待: {pendingCount}</span>
          )}
          {runningCount > 0 && (
            <span className="text-cyan-400">运行中: {runningCount}</span>
          )}
          {completedCount > 0 && (
            <span className="text-emerald-400">完成: {completedCount}</span>
          )}
          {failedCount > 0 && (
            <span className="text-red-400">失败: {failedCount}</span>
          )}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="py-8 text-center rounded-lg bg-slate-900/40 border border-slate-800/50">
          <ListTodo className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <div className="text-sm text-slate-500">暂无处理任务</div>
          <div className="text-[11px] text-slate-600 mt-1">
            导入光谱文件后将自动加入处理队列
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {tasks.map((task) => {
            const pipeline = pipelines.get(task.pipelineId);
            if (!pipeline) return null;
            return (
              <ProcessingTaskCard
                key={task.id}
                pipeline={pipeline}
                onCancel={() => handleCancel(task.id)}
                onRemove={() => handleRemove(task.id)}
                onPause={handleTogglePause}
                onResume={handleTogglePause}
                isPaused={isPaused}
              />
            );
          })}
        </div>
      )}

      <div className="pt-2 border-t border-slate-800/60">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            流水线参数配置
          </span>
          {showConfig ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>
        {showConfig && (
          <div className="mt-2 p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
            <PipelineConfigPanel
              config={pipelineConfig}
              onChange={setPipelineConfig}
              disabled={runningCount > 0}
            />
            {runningCount > 0 && (
              <div className="mt-2 text-[10px] text-amber-400/70">
                参数将在新任务中生效，当前运行中的任务不受影响。
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export type { PipelineConfig };
export { DEFAULT_PIPELINE_CONFIG };
