import type {
  SpectrumPoint,
  SpectrumData,
  ProcessingPipeline,
  ProcessingTask,
  PipelineStepState,
  PipelineConfig,
  TaskStatus,
  ProcessingStepType,
} from '@/types';
import { processStep, STEP_ORDER, STEP_NAMES, DEFAULT_PIPELINE_CONFIG } from './pipelineSteps';

const genId = () => Math.random().toString(36).substring(2, 9);

type PipelineListener = (pipeline: ProcessingPipeline) => void;
type TaskQueueListener = (tasks: ProcessingTask[]) => void;

class PipelineEngine {
  private pipelines: Map<string, ProcessingPipeline> = new Map();
  private tasks: ProcessingTask[] = [];
  private activeTaskId: string | null = null;
  private isPaused = false;
  private pipelineListeners: Set<PipelineListener> = new Set();
  private taskListeners: Set<TaskQueueListener> = new Set();
  private cancelledTasks: Set<string> = new Set();

  onPipelineUpdate(listener: PipelineListener): () => void {
    this.pipelineListeners.add(listener);
    return () => this.pipelineListeners.delete(listener);
  }

  onTaskQueueUpdate(listener: TaskQueueListener): () => void {
    this.taskListeners.add(listener);
    return () => this.taskListeners.delete(listener);
  }

  private notifyPipeline(pipeline: ProcessingPipeline): void {
    this.pipelineListeners.forEach((l) => l(pipeline));
  }

  private notifyTasks(): void {
    this.taskListeners.forEach((l) => l([...this.tasks]));
  }

  createPipeline(
    spectrumId: string,
    spectrumName: string,
    originalPoints: SpectrumPoint[],
    config: Partial<PipelineConfig> = {}
  ): ProcessingPipeline {
    const pipelineId = genId();
    const mergedConfig: PipelineConfig = {
      sky_subtraction: { ...DEFAULT_PIPELINE_CONFIG.sky_subtraction, ...config.sky_subtraction },
      cosmic_ray_removal: {
        ...DEFAULT_PIPELINE_CONFIG.cosmic_ray_removal,
        ...config.cosmic_ray_removal,
      },
      wavelength_calibration: {
        ...DEFAULT_PIPELINE_CONFIG.wavelength_calibration,
        ...config.wavelength_calibration,
      },
      normalization: { ...DEFAULT_PIPELINE_CONFIG.normalization, ...config.normalization },
    };

    const steps: PipelineStepState[] = STEP_ORDER.map((stepType) => ({
      stepType,
      status: 'pending',
      progress: 0,
      message: STEP_NAMES[stepType],
    }));

    const pipeline: ProcessingPipeline = {
      id: pipelineId,
      spectrumId,
      spectrumName,
      config: mergedConfig,
      steps,
      overallStatus: 'pending',
      overallProgress: 0,
      createdAt: new Date().toISOString(),
      originalPoints,
    };

    this.pipelines.set(pipelineId, pipeline);
    return pipeline;
  }

  createTask(
    spectrumName: string,
    originalPoints: SpectrumPoint[],
    config: Partial<PipelineConfig> = {},
    spectrumId?: string
  ): ProcessingTask {
    const taskId = genId();
    const pid = spectrumId || genId();
    const pipeline = this.createPipeline(pid, spectrumName, originalPoints, config);

    const task: ProcessingTask = {
      id: taskId,
      pipelineId: pipeline.id,
      spectrumId: pid,
      spectrumName,
      status: 'pending',
      progress: 0,
      currentStep: null,
      message: `已加入队列: ${spectrumName}`,
      createdAt: new Date().toISOString(),
    };

    this.tasks.push(task);
    this.notifyTasks();
    this.processQueue();
    return task;
  }

  getPipeline(id: string): ProcessingPipeline | undefined {
    return this.pipelines.get(id);
  }

  getAllPipelines(): ProcessingPipeline[] {
    return Array.from(this.pipelines.values());
  }

  getTasks(): ProcessingTask[] {
    return [...this.tasks];
  }

  getActiveTask(): ProcessingTask | undefined {
    if (!this.activeTaskId) return undefined;
    return this.tasks.find((t) => t.id === this.activeTaskId);
  }

  pauseQueue(): void {
    this.isPaused = true;
  }

  resumeQueue(): void {
    this.isPaused = false;
    this.processQueue();
  }

  cancelTask(taskId: string): void {
    this.cancelledTasks.add(taskId);
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'cancelled';
      task.message = '任务已取消';
      const pipeline = this.pipelines.get(task.pipelineId);
      if (pipeline) {
        pipeline.overallStatus = 'cancelled';
        pipeline.steps.forEach((s) => {
          if (s.status === 'pending' || s.status === 'running') {
            s.status = 'cancelled';
          }
        });
        this.notifyPipeline(pipeline);
      }
      this.notifyTasks();
    }
  }

  removeTask(taskId: string): void {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      const task = this.tasks[idx];
      this.pipelines.delete(task.pipelineId);
      this.tasks.splice(idx, 1);
      this.notifyTasks();
    }
  }

  clearCompleted(): void {
    const toRemove = this.tasks.filter((t) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled');
    toRemove.forEach((t) => {
      this.pipelines.delete(t.pipelineId);
    });
    this.tasks = this.tasks.filter((t) => t.status === 'pending' || t.status === 'running');
    this.notifyTasks();
  }

  private async processQueue(): Promise<void> {
    if (this.isPaused || this.activeTaskId) return;

    const nextTask = this.tasks.find((t) => t.status === 'pending');
    if (!nextTask) return;

    this.activeTaskId = nextTask.id;
    nextTask.status = 'running';
    nextTask.startedAt = new Date().toISOString();
    nextTask.message = `正在处理: ${nextTask.spectrumName}`;
    this.notifyTasks();

    try {
      const result = await this.runPipeline(nextTask);
      nextTask.status = 'completed';
      nextTask.progress = 1;
      nextTask.currentStep = null;
      nextTask.completedAt = new Date().toISOString();
      nextTask.message = `处理完成: ${nextTask.spectrumName}`;
      nextTask.result = result;
    } catch (error) {
      nextTask.status = 'failed';
      nextTask.error = error instanceof Error ? error.message : String(error);
      nextTask.message = `处理失败: ${nextTask.error}`;
      nextTask.completedAt = new Date().toISOString();
    } finally {
      this.activeTaskId = null;
      this.notifyTasks();
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private async runPipeline(task: ProcessingTask): Promise<SpectrumData> {
    const pipeline = this.pipelines.get(task.pipelineId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    pipeline.overallStatus = 'running';
    pipeline.startedAt = new Date().toISOString();
    this.notifyPipeline(pipeline);

    let currentPoints = [...pipeline.originalPoints];
    const enabledSteps = pipeline.steps.filter((s) => pipeline.config[s.stepType].enabled);
    const totalSteps = enabledSteps.length;

    if (totalSteps === 0) {
      pipeline.overallProgress = 1;
      pipeline.overallStatus = 'completed';
      pipeline.completedAt = new Date().toISOString();
      pipeline.finalPoints = currentPoints;
      this.notifyPipeline(pipeline);
    }

    for (let i = 0; i < enabledSteps.length; i++) {
      if (this.cancelledTasks.has(task.id)) {
        throw new Error('Task cancelled');
      }

      const step = enabledSteps[i];
      step.status = 'running';
      step.progress = 0;
      step.startedAt = new Date().toISOString();
      step.message = `正在执行: ${STEP_NAMES[step.stepType]}`;
      task.currentStep = step.stepType;
      this.notifyPipeline(pipeline);
      this.notifyTasks();

      const stepConfig = pipeline.config[step.stepType];
      const stepResult = await processStep(
        step.stepType,
        currentPoints,
        stepConfig.params,
        (progress) => {
          step.progress = progress;
          pipeline.overallProgress = (i + progress) / totalSteps;
          task.progress = pipeline.overallProgress;
          this.notifyPipeline(pipeline);
          this.notifyTasks();
        }
      );

      currentPoints = stepResult.points;
      step.status = 'completed';
      step.progress = 1;
      step.completedAt = new Date().toISOString();
      step.message = `${STEP_NAMES[step.stepType]} 完成`;
      step.preview = {
        before: stepResult.previewBefore,
        after: stepResult.previewAfter,
      };
      pipeline.overallProgress = (i + 1) / totalSteps;
      task.progress = pipeline.overallProgress;
      this.notifyPipeline(pipeline);
      this.notifyTasks();
    }

    pipeline.overallStatus = 'completed';
    pipeline.overallProgress = 1;
    pipeline.completedAt = new Date().toISOString();
    pipeline.finalPoints = currentPoints;
    this.notifyPipeline(pipeline);

    const sorted = currentPoints.sort((a, b) => a.wavelength - b.wavelength);
    return {
      id: task.spectrumId,
      name: task.spectrumName,
      targetName: 'Unknown',
      observationDate: new Date().toISOString().split('T')[0],
      wavelengthMin: sorted[0]?.wavelength ?? 0,
      wavelengthMax: sorted[sorted.length - 1]?.wavelength ?? 0,
      points: sorted,
      isNormalized: pipeline.config.normalization.enabled,
    };
  }

  updatePipelineConfig(
    pipelineId: string,
    stepType: ProcessingStepType,
    updates: { enabled?: boolean; params?: Record<string, number | string | boolean> }
  ): ProcessingPipeline | undefined {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return undefined;

    const config = pipeline.config[stepType];
    if (updates.enabled !== undefined) {
      config.enabled = updates.enabled;
    }
    if (updates.params) {
      config.params = { ...config.params, ...updates.params };
    }

    this.notifyPipeline(pipeline);
    return pipeline;
  }
}

export const pipelineEngine = new PipelineEngine();
