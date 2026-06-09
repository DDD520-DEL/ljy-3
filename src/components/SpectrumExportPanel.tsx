import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { useTeamStore } from '@/store/teamStore';
import {
  Download,
  CheckSquare,
  Square,
  FileJson,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  Filter,
  X,
  Check,
  Sparkles,
  Ruler,
  BarChart3,
  Scale,
} from 'lucide-react';
import { executeExport } from '@/lib/exportUtils';
import type { ExportFormat, ExportOptions, ClassificationPair } from '@/lib/exportUtils';

type PointsExportMode = 'summary' | 'flat';

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: typeof FileJson; description: string }[] = [
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet, description: '逗号分隔，Excel 兼容' },
  { value: 'tsv', label: 'TSV', icon: FileText, description: '制表符分隔' },
  { value: 'json', label: 'JSON', icon: FileJson, description: '完整结构化数据' },
];

export default function SpectrumExportPanel() {
  const {
    spectra,
    classificationResult,
    manualClassificationResult,
    currentSpectrumId,
  } = useAppStore();

  const { canViewSpectrum, currentUser } = useTeamStore();

  const [expanded, setExpanded] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [options, setOptions] = useState<ExportOptions>({
    includeNormalized: true,
    includeClassification: true,
    includeLineMeasurements: true,
  });
  const [pointsMode, setPointsMode] = useState<PointsExportMode>('summary');
  const [isExporting, setIsExporting] = useState(false);

  const visibleSpectra = useMemo(
    () => spectra.filter((s) => canViewSpectrum(s, currentUser.id)),
    [spectra, canViewSpectrum, currentUser.id]
  );

  const allSelected = visibleSpectra.length > 0 && selectedIds.size === visibleSpectra.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleSpectra.map((s) => s.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedSpectra = useMemo(
    () => visibleSpectra.filter((s) => selectedIds.has(s.id)),
    [visibleSpectra, selectedIds]
  );

  const classificationMap = useMemo(() => {
    const map: Record<string, ClassificationPair> = {};
    if ((classificationResult || manualClassificationResult) && currentSpectrumId) {
      map[currentSpectrumId] = {
        auto: classificationResult,
        manual: manualClassificationResult,
      };
    }
    return map;
  }, [classificationResult, manualClassificationResult, currentSpectrumId]);

  const handleExport = () => {
    if (selectedSpectra.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      executeExport({
        spectra: selectedSpectra,
        format,
        options,
        classificationMap,
        includePoints: pointsMode,
      });
    } catch (err) {
      console.error('导出失败:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 300);
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const currentFormat = FORMAT_OPTIONS.find((f) => f.value === format)!;

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Download className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              批量导出
              {selectedIds.size > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 text-[10px] border border-emerald-700/50">
                  已选 {selectedIds.size}
                </span>
              )}
            </h2>
            <p className="text-[10px] text-slate-500">
              支持 CSV / JSON / TSV 格式导出
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-800/60 pt-4">
          {visibleSpectra.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500 rounded-lg bg-slate-800/30 border border-dashed border-slate-700">
              暂无可导出的光谱数据
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                    <Filter className="w-3.5 h-3.5" />
                    选择光谱
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleAll}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition-colors"
                    >
                      {allSelected ? (
                        <CheckSquare className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Square className="w-3 h-3 text-slate-400" />
                      )}
                      {allSelected ? '取消全选' : '全选'}
                    </button>
                    {selectedIds.size > 0 && (
                      <button
                        onClick={clearSelection}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-slate-800/60 hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        清空
                      </button>
                    )}
                    <div className="ml-auto text-[10px] text-slate-500">
                      {selectedIds.size} / {visibleSpectra.length} 已选
                    </div>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-md border border-slate-700/60 bg-slate-900/40 scrollbar-thin">
                  {visibleSpectra.map((s) => {
                    const isSelected = selectedIds.has(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleOne(s.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors border-b border-slate-800/50 last:border-b-0 ${
                          isSelected
                            ? 'bg-emerald-900/20 hover:bg-emerald-900/30'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div
                            className={`truncate ${
                              isSelected ? 'text-emerald-200' : 'text-slate-200'
                            }`}
                          >
                            {s.name}
                          </div>
                          <div className="text-[9px] text-slate-500 font-mono">
                            {s.targetName} · {s.observationDate} · {s.points.length} pts
                            {s.isNormalized && ' · 已归一化'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-slate-300">
                  导出格式
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {FORMAT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = format === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setFormat(opt.value)}
                        className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-md text-[10px] font-medium transition-all border ${
                          isActive
                            ? 'bg-emerald-900/40 text-emerald-200 border-emerald-700/50'
                            : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-700/60'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[9px] text-slate-500 flex items-center gap-1">
                  <Info className="w-2.5 h-2.5" />
                  {currentFormat.description}
                </div>
              </div>

              {format !== 'json' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-300">
                    数据模式
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setPointsMode('summary')}
                      className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all border ${
                        pointsMode === 'summary'
                          ? 'bg-cyan-900/40 text-cyan-200 border-cyan-700/50'
                          : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-700/60'
                      }`}
                    >
                      <BarChart3 className="w-3 h-3" />
                      摘要模式
                    </button>
                    <button
                      onClick={() => setPointsMode('flat')}
                      className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all border ${
                        pointsMode === 'flat'
                          ? 'bg-cyan-900/40 text-cyan-200 border-cyan-700/50'
                          : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-700/60'
                      }`}
                    >
                      <Scale className="w-3 h-3" />
                      逐点模式
                    </button>
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {pointsMode === 'summary'
                      ? '每条光谱一行（含元数据和测量值）'
                      : '每个波长采样点一行（含原始/归一化强度）'}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-300">
                  导出选项
                </div>
                <label className="flex items-center gap-2 p-2 rounded-md bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/60 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={options.includeNormalized}
                    onChange={() => toggleOption('includeNormalized')}
                    className="w-3.5 h-3.5 rounded accent-emerald-500"
                  />
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span className="text-slate-300">包含归一化数据</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-md bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/60 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={options.includeClassification}
                    onChange={() => toggleOption('includeClassification')}
                    className="w-3.5 h-3.5 rounded accent-emerald-500"
                  />
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Check className="w-3 h-3 text-violet-400" />
                    <span className="text-slate-300">附带分类结果</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-md bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/60 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={options.includeLineMeasurements}
                    onChange={() => toggleOption('includeLineMeasurements')}
                    className="w-3.5 h-3.5 rounded accent-emerald-500"
                  />
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Ruler className="w-3 h-3 text-amber-400" />
                    <span className="text-slate-300">包含谱线测量值</span>
                  </div>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-800/60">
                <button
                  onClick={handleExport}
                  disabled={selectedSpectra.length === 0 || isExporting}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    isExporting
                      ? 'bg-slate-700 text-slate-400'
                      : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-500/20'
                  }`}
                >
                  {isExporting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      导出中...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      导出 {selectedIds.size} 条光谱
                    </>
                  )}
                </button>
                {selectedIds.size === 0 && (
                  <div className="mt-2 text-center text-[10px] text-slate-500">
                    请先选择要导出的光谱
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
