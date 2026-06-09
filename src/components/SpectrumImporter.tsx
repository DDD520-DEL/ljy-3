import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Sparkles, ListTodo } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { pipelineEngine, fitsMetadataToSpectrumMeta } from '@/lib/pipelineEngine';
import { DEFAULT_PIPELINE_CONFIG } from '@/lib/pipelineSteps';
import { parseFitsSpectrum } from '@/lib/fits';
import type { SpectrumPoint } from '@/types';
import type { SpectrumMetadata } from '@/lib/pipelineEngine';

const genId = () => Math.random().toString(36).substring(2, 9);

interface SpectrumImporterProps {
  showQueueButton?: boolean;
  onToggleQueue?: () => void;
  queueVisible?: boolean;
}

const SUPPORTED_EXT = ['.csv', '.fits', '.fit', '.fts'];

function isSupportedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return SUPPORTED_EXT.some((ext) => lower.endsWith(ext));
}

function isFitsFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.fits') || lower.endsWith('.fit') || lower.endsWith('.fts');
}

export default function SpectrumImporter({
  showQueueButton = true,
  onToggleQueue,
  queueVisible = false,
}: SpectrumImporterProps) {
  const { addSpectrum, loadSampleData, spectra } = useAppStore();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);

  const enqueueSpectrum = useCallback(
    (
      spectrumName: string,
      points: SpectrumPoint[],
      metadata?: SpectrumMetadata
    ) => {
      setError(null);
      setSuccess(null);

      if (points.length < 10) {
        setError('无法解析有效光谱数据点（至少需要 10 个）');
        return;
      }

      points.sort((a, b) => a.wavelength - b.wavelength);

      const spectrumId = genId();

      const task = pipelineEngine.createTask(
        spectrumName,
        points,
        DEFAULT_PIPELINE_CONFIG,
        spectrumId,
        metadata
      );

      const offTasks = pipelineEngine.onTaskQueueUpdate((tasks) => {
        const thisTask = tasks.find((t) => t.id === task.id);
        if (thisTask && thisTask.status === 'completed' && thisTask.result) {
          addSpectrum(thisTask.result);
          offTasks();
          setQueuedCount((c) => Math.max(0, c - 1));
        } else if (thisTask && (thisTask.status === 'failed' || thisTask.status === 'cancelled')) {
          offTasks();
          setQueuedCount((c) => Math.max(0, c - 1));
          if (thisTask.status === 'failed') {
            setError(`处理失败: ${thisTask.error || '未知错误'}`);
          }
        }
      });

      setQueuedCount((c) => c + 1);
      const metaInfo = metadata?.targetName && metadata.targetName !== 'Unknown'
        ? ` [${metadata.targetName}]`
        : '';
      setSuccess(`已加入处理队列: ${spectrumName}${metaInfo} (${points.length} 个数据点)`);
      setTimeout(() => setSuccess(null), 4000);
    },
    [addSpectrum]
  );

  const processCSV = useCallback(
    (file: File) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          try {
            const data = results.data as Array<Record<string, number>>;
            const points: SpectrumPoint[] = [];

            for (const row of data) {
              const keys = Object.keys(row);
              const wlKey = keys.find(
                (k) => /wav|lambda|angstrom|波长|wl/i.test(k)
              ) || keys[0];
              const intKey = keys.find(
                (k) => /intensity|flux|count|强度|flux|rel/i.test(k)
              ) || keys[1];

              if (wlKey && intKey && row[wlKey] !== undefined && row[intKey] !== undefined) {
                const wl = Number(row[wlKey]);
                const inten = Number(row[intKey]);
                if (!isNaN(wl) && !isNaN(inten) && wl > 0) {
                  points.push({ wavelength: wl, intensity: inten });
                }
              }
            }

            const spectrumName = file.name.replace(/\.[^/.]+$/, '');
            enqueueSpectrum(spectrumName, points);
          } catch (e) {
            setError('解析CSV文件时出错: ' + (e as Error).message);
          }
        },
        error: (err) => {
          setError('CSV解析错误: ' + err.message);
        },
      });
    },
    [enqueueSpectrum]
  );

  const processFITS = useCallback(
    async (file: File) => {
      try {
        const result = await parseFitsSpectrum(file);
        const spectrumName = file.name.replace(/\.[^/.]+$/, '');
        const metadata = fitsMetadataToSpectrumMeta(result.metadata);
        enqueueSpectrum(spectrumName, result.points, metadata);
      } catch (e) {
        setError('解析FITS文件时出错: ' + (e as Error).message);
      }
    },
    [enqueueSpectrum]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (!isSupportedFile(file.name)) {
        setError('不支持的文件格式，请上传 .csv、.fits、.fit 或 .fts 文件');
        return;
      }
      if (isFitsFile(file.name)) {
        void processFITS(file);
      } else {
        processCSV(file);
      }
    },
    [processCSV, processFITS]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          handleFile(files[i]);
        }
      }
      e.target.value = '';
    },
    [handleFile]
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer ${
          dragOver
            ? 'border-cyan-400 bg-cyan-900/30'
            : 'border-slate-600 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60'
        }`}
      >
        <label className="flex flex-col items-center justify-center py-6 px-4 cursor-pointer">
          <Upload className="w-8 h-8 mb-2 text-slate-400" />
          <p className="text-sm font-medium text-slate-300">拖拽光谱文件到此处</p>
          <p className="text-xs text-slate-500 mt-1">
            支持 CSV（波长,强度）、FITS、FIT、FTS 格式
          </p>
          <p className="text-[10px] text-cyan-400/70 mt-1.5">
            FITS 将自动提取目标名称、观测时间等元数据
          </p>
          <input
            type="file"
            multiple
            accept=".csv,.fits,.fit,.fts"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-900/30 border border-emerald-800 text-emerald-300 text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={loadSampleData}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium transition-all"
        >
          <Sparkles className="w-4 h-4" />
          加载示例数据
        </button>
        {showQueueButton && onToggleQueue && (
          <button
            onClick={onToggleQueue}
            className={`relative flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              queueVisible
                ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/60'
                : 'bg-slate-800/60 text-slate-300 border border-slate-700/60 hover:bg-slate-700/60'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            队列
            {queuedCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold flex items-center justify-center">
                {queuedCount}
              </span>
            )}
          </button>
        )}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-xs text-slate-400">
          <FileSpreadsheet className="w-4 h-4" />
          {spectra.length} 个光谱
        </div>
      </div>
    </div>
  );
}
