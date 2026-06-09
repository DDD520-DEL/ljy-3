import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useTeamStore } from '@/store/teamStore';
import { classifySpectrum, measureEquivalentWidth, computeLineRatios, WAVELENGTHS, buildEWComparisonTable, getRankedCandidateTemplates, createManualClassification, computeTemplateMatchScoreWithOffsets } from '@/lib/spectralAnalysis';
import { MK_TEMPLATES } from '@/data/astronomy';
import type { MKTemplate, SharedClassificationResult } from '@/types';
import { Sparkles, AlertTriangle, CheckCircle2, Star, Thermometer, Ruler, GitCompare, Table2, Sliders, Lock, Unlock, RotateCcw, Save, UserCircle, Bot, ChevronDown, ChevronUp, Minus, Plus, Users, Clock, Share2, ShieldAlert } from 'lucide-react';

const SPECTRAL_TYPE_COLORS: Record<string, string> = {
  O: 'from-blue-400 to-blue-600',
  B: 'from-sky-300 to-sky-500',
  A: 'from-white to-slate-200',
  F: 'from-yellow-100 to-yellow-300',
  G: 'from-yellow-300 to-amber-400',
  K: 'from-orange-400 to-orange-500',
  M: 'from-red-500 to-red-700',
};

const LUMINOSITY_NAMES: Record<string, string> = {
  'I': '超巨星',
  'II': '亮巨星',
  'III': '巨星',
  'IV': '亚巨星',
  'V': '主序星',
  'VI': '亚矮星',
  'VII': '白矮星',
};

const TEMPERATURE_RANGES: Record<string, string> = {
  O: '30,000 – 52,000 K',
  B: '10,000 – 30,000 K',
  A: '7,500 – 10,000 K',
  F: '6,000 – 7,500 K',
  G: '5,200 – 6,000 K',
  K: '3,700 – 5,200 K',
  M: '2,400 – 3,700 K',
};

const SPECTRUM_COLORS = [
  '#00d4ff',
  '#ff9f40',
  '#7c5cff',
  '#36d399',
  '#ff6b9d',
];

export default function ClassificationPanel() {
  const {
    currentSpectrumId,
    spectra,
    classificationResult,
    manualClassificationResult,
    setClassificationResult,
    setManualClassificationResult,
    clearManualClassificationResult,
    comparisonMode,
    manualTuning,
    toggleManualTuning,
    setSelectedTemplateLabel,
    setSubtypeOffset,
    setLuminosityOffset,
    setTemplateIntensityScale,
    resetManualTuning,
    addSharedClassification,
  } = useAppStore();

  const { buildSharedClassification, currentUser, canViewSpectrum } = useTeamStore();

  const [showCandidateList, setShowCandidateList] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [showSharedClassifications, setShowSharedClassifications] = useState(true);
  const [shareOnConfirm, setShareOnConfirm] = useState(true);

  const current = spectra.find((s) => s.id === currentSpectrumId);

  const canClassify = current ? canViewSpectrum(current, currentUser.id) : false;
  const isSpectrumInaccessible = current && !canClassify;

  const sharedClassifications = useMemo(() => {
    if (!current?.sharedClassifications) return [] as SharedClassificationResult[];
    return current.sharedClassifications.sort(
      (a, b) => new Date(b.classifiedAt).getTime() - new Date(a.classifiedAt).getTime()
    );
  }, [current]);

  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const comparisonSpectra = useMemo(() => {
    if (comparisonMode.enabled && comparisonMode.selectedSpectrumIds.length >= 2) {
      return comparisonMode.selectedSpectrumIds
        .map((id) => spectra.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => s !== undefined);
    }
    return [];
  }, [comparisonMode, spectra]);

  const isComparisonActive = comparisonSpectra.length >= 2;

  const ewComparisonTable = useMemo(() => {
    if (!isComparisonActive) return null;
    return buildEWComparisonTable(comparisonSpectra);
  }, [comparisonSpectra, isComparisonActive]);

  const candidateTemplates = useMemo(() => {
    if (!current) return [] as { template: MKTemplate; score: number }[];
    return getRankedCandidateTemplates(current.points, 8);
  }, [current]);

  const selectedTemplate = useMemo(() => {
    if (!manualTuning.selectedTemplateLabel) return null;
    return MK_TEMPLATES.find((t) => t.label === manualTuning.selectedTemplateLabel) || null;
  }, [manualTuning.selectedTemplateLabel]);

  const currentMatchScore = useMemo(() => {
    if (!current || !selectedTemplate) return null;
    return computeTemplateMatchScoreWithOffsets(
      current.points,
      selectedTemplate,
      manualTuning.subtypeOffset,
      manualTuning.luminosityOffset
    );
  }, [current, selectedTemplate, manualTuning.subtypeOffset, manualTuning.luminosityOffset]);

  const runClassification = () => {
    if (!current) return;
    const result = classifySpectrum(current.points);
    setClassificationResult(result);
  };

  const handleSelectTemplate = (templateLabel: string) => {
    setSelectedTemplateLabel(templateLabel);
    setShowCandidateList(false);
  };

  const handleConfirmManualClassification = () => {
    if (!current || !selectedTemplate) return;
    const result = createManualClassification(
      selectedTemplate,
      manualTuning.subtypeOffset,
      manualTuning.luminosityOffset,
      current.points,
      reviewerNotes || undefined
    );
    setManualClassificationResult(result);

    if (shareOnConfirm) {
      const shared = buildSharedClassification(current.id, result);
      addSharedClassification(current.id, shared);
    }
  };

  const handleClearManualResult = () => {
    clearManualClassificationResult();
    setReviewerNotes('');
  };

  const diagnostics = useMemo(() => {
    if (!current) return null;
    const ratios = computeLineRatios(current.points);
    const haEW = measureEquivalentWidth(current.points, WAVELENGTHS.H_ALPHA);
    const hbEW = measureEquivalentWidth(current.points, WAVELENGTHS.H_BETA);
    return { ratios, haEW, hbEW };
  }, [current]);

  const isBeStarCandidate = diagnostics && diagnostics.haEW < -3;

  const formatEW = (val: number) => {
    if (!isFinite(val)) return '—';
    const sign = val < 0 ? '−' : '';
    return `${sign}${Math.abs(val).toFixed(2)} Å`;
  };

  return (
    <div className="space-y-4">
      {isSpectrumInaccessible && (
        <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/50">
          <div className="flex items-start gap-2 text-[11px] text-red-300">
            <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold mb-0.5">无权限访问此光谱</div>
              <div className="text-red-400/80">该光谱的可见权限未向您开放，无法执行分类操作。请联系光谱所有者或团队管理员。</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          MK光谱分类
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleManualTuning}
            disabled={!current || !canClassify}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
              manualTuning.enabled
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white'
                : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600/60'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Sliders className="w-3.5 h-3.5" />
            {manualTuning.enabled ? '调优中' : '手动调优'}
          </button>
          <button
            onClick={runClassification}
            disabled={!current || !canClassify}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            运行分类
          </button>
        </div>
      </div>

      {isComparisonActive && ewComparisonTable && (
        <div className="space-y-2 p-3 rounded-lg bg-slate-800/40 border border-cyan-800/40">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
            <Table2 className="w-3.5 h-3.5" />
            等值宽度对比表
            <span className="ml-1 text-[10px] text-slate-500">
              ({comparisonSpectra.length} 条光谱)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-slate-700/60">
                  <th className="text-left py-1.5 px-2 text-slate-400 font-medium">
                    谱线
                  </th>
                  <th className="text-right py-1.5 px-2 text-slate-400 font-medium">
                    λ (Å)
                  </th>
                  {comparisonSpectra.map((s, idx) => (
                    <th
                      key={s.id}
                      className="text-right py-1.5 px-2 font-medium"
                      style={{ color: SPECTRUM_COLORS[idx % SPECTRUM_COLORS.length] }}
                    >
                      <span className="inline-block max-w-[80px] truncate" title={s.name}>
                        #{idx + 1} {s.name.replace(/^样本光谱 \d+ - /, '')}
                      </span>
                    </th>
                  ))}
                  <th className="text-right py-1.5 px-2 text-slate-400 font-medium">
                    Δmax
                  </th>
                </tr>
              </thead>
              <tbody>
                {ewComparisonTable.map((row) => {
                  const significantDiff = Math.abs(row.maxDiff) > 0.5;
                  return (
                    <tr
                      key={row.lineLabel}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-1 px-2 text-slate-300 font-mono">
                        {row.lineLabel}
                      </td>
                      <td className="py-1 px-2 text-right text-slate-500 font-mono">
                        {row.wavelength.toFixed(1)}
                      </td>
                      {comparisonSpectra.map((s, idx) => {
                        const val = row.values[s.id];
                        const isEmission = val !== undefined && val < -3;
                        return (
                          <td
                            key={s.id}
                            className={`py-1 px-2 text-right font-mono ${
                              isEmission ? 'text-cyan-300' : 'text-slate-300'
                            }`}
                            style={{
                              borderLeft: `2px solid ${SPECTRUM_COLORS[idx % SPECTRUM_COLORS.length]}40`,
                            }}
                          >
                            {formatEW(val)}
                            {isEmission && (
                              <span className="ml-1 text-[9px] text-cyan-400">发射</span>
                            )}
                          </td>
                        );
                      })}
                      <td
                        className={`py-1 px-2 text-right font-mono ${
                          significantDiff ? 'text-amber-400 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {row.maxDiff.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500/60" />
              发射线 (EW &lt; −3 Å)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500/60" />
              显著差异 (|Δ| &gt; 0.5 Å)
            </span>
          </div>
        </div>
      )}

      {manualTuning.enabled && current && (
        <div className="space-y-3 p-3 rounded-lg bg-violet-900/20 border border-violet-800/40">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              手动调优模式
            </div>
            <button
              onClick={() => {
                resetManualTuning();
                toggleManualTuning();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              退出调优
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setShowCandidateList(!showCandidateList)}
              disabled={candidateTemplates.length === 0}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs text-left transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Star className="w-3 h-3 text-yellow-400" />
                {selectedTemplate ? (
                  <span>
                    已选模板: <span className="text-violet-300 font-semibold">{selectedTemplate.label}</span>
                    <span className="text-slate-500 ml-1">({selectedTemplate.colorTemp} K)</span>
                  </span>
                ) : (
                  <span className="text-slate-400">选择候选模板光谱型</span>
                )}
              </span>
              {showCandidateList ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
            </button>

            {showCandidateList && candidateTemplates.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border border-slate-700/60 bg-slate-900/60">
                {candidateTemplates.map(({ template, score }, idx) => {
                  const isSelected = manualTuning.selectedTemplateLabel === template.label;
                  return (
                    <button
                      key={template.label}
                      onClick={() => handleSelectTemplate(template.label)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors border-b border-slate-800/50 last:border-b-0 ${
                        isSelected
                          ? 'bg-violet-900/40 text-violet-200'
                          : 'hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${
                          idx === 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700/60 text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-mono font-semibold">{template.label}</span>
                        <span className="text-slate-500 text-[10px]">{template.colorTemp} K</span>
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        score < 0.3 ? 'text-emerald-400 bg-emerald-900/30' : score < 0.6 ? 'text-amber-400 bg-amber-900/30' : 'text-red-400 bg-red-900/30'
                      }`}>
                        匹配度 {score.toFixed(3)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedTemplate && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5 p-2 rounded-md bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">子型微调</span>
                    <span className="text-[10px] font-mono text-violet-300">
                      {manualTuning.subtypeOffset > 0 ? '+' : ''}{manualTuning.subtypeOffset.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSubtypeOffset(manualTuning.subtypeOffset - 0.5)}
                      disabled={manualTuning.subtypeOffset <= -2}
                      className="w-6 h-6 flex items-center justify-center rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.5"
                      value={manualTuning.subtypeOffset}
                      onChange={(e) => setSubtypeOffset(Number(e.target.value))}
                      className="flex-1 accent-violet-500"
                    />
                    <button
                      onClick={() => setSubtypeOffset(manualTuning.subtypeOffset + 0.5)}
                      disabled={manualTuning.subtypeOffset >= 2}
                      className="w-6 h-6 flex items-center justify-center rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 p-2 rounded-md bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">光度级微调</span>
                    <span className="text-[10px] font-mono text-violet-300">
                      {manualTuning.luminosityOffset > 0 ? '+' : ''}{manualTuning.luminosityOffset.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setLuminosityOffset(manualTuning.luminosityOffset - 0.5)}
                      disabled={manualTuning.luminosityOffset <= -2}
                      className="w-6 h-6 flex items-center justify-center rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.5"
                      value={manualTuning.luminosityOffset}
                      onChange={(e) => setLuminosityOffset(Number(e.target.value))}
                      className="flex-1 accent-violet-500"
                    />
                    <button
                      onClick={() => setLuminosityOffset(manualTuning.luminosityOffset + 0.5)}
                      disabled={manualTuning.luminosityOffset >= 2}
                      className="w-6 h-6 flex items-center justify-center rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 p-2 rounded-md bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">模板强度缩放</span>
                  <span className="text-[10px] font-mono text-violet-300">
                    {manualTuning.templateIntensityScale.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={manualTuning.templateIntensityScale}
                  onChange={(e) => setTemplateIntensityScale(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>

              {currentMatchScore !== null && (
                <div className="flex items-center justify-between p-2 rounded-md bg-slate-800/40">
                  <span className="text-[11px] text-slate-400">当前匹配得分</span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    currentMatchScore < 0.3 ? 'bg-emerald-900/40 text-emerald-300' : currentMatchScore < 0.6 ? 'bg-amber-900/40 text-amber-300' : 'bg-red-900/40 text-red-300'
                  }`}>
                    {currentMatchScore.toFixed(4)}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400 block">复核备注（可选）</label>
                <textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="输入人工复核备注..."
                  className="w-full px-2.5 py-2 text-xs rounded-md bg-slate-900/60 border border-slate-700/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-600 resize-none"
                  rows={2}
                />
              </div>

              <label className="flex items-center gap-2 p-2 rounded-md bg-slate-800/40 cursor-pointer hover:bg-slate-800/60 transition-colors">
                <input
                  type="checkbox"
                  checked={shareOnConfirm}
                  onChange={(e) => setShareOnConfirm(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-violet-500"
                />
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Share2 className="w-3 h-3 text-violet-400" />
                  <span className="text-slate-300">保存为共享分类结果，团队成员可见</span>
                </div>
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmManualClassification}
                  disabled={!selectedTemplate || !canClassify}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all"
                >
                  <Lock className="w-3.5 h-3.5" />
                  确认并锁定分类结果
                </button>
                <button
                  onClick={() => {
                    resetManualTuning();
                    setReviewerNotes('');
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-xs rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  重置
                </button>
              </div>
            </>
          )}

          {!selectedTemplate && (
            <div className="p-4 text-center text-xs text-slate-500 rounded-md bg-slate-800/30 border border-dashed border-slate-700">
              从上方候选列表中选择一个模板光谱型开始调优
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {(classificationResult || manualClassificationResult) && current ? (
          <div className="grid grid-cols-1 gap-3">
            {classificationResult && (
              <div className="space-y-2 p-3 rounded-lg bg-slate-800/30 border border-indigo-800/40">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 mb-1">
                  <Bot className="w-3.5 h-3.5" />
                  自动分类结果
                </div>
                <div
                  className={`relative p-3 rounded-lg bg-gradient-to-br ${SPECTRAL_TYPE_COLORS[classificationResult.spectralType] || 'from-slate-600 to-slate-700'} shadow overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-slate-900/30" />
                  <div className="relative">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-3xl font-bold ${
                          classificationResult.spectralType === 'O'
                            ? 'text-blue-100'
                            : classificationResult.spectralType === 'A' || classificationResult.spectralType === 'F'
                            ? 'text-slate-900'
                            : 'text-white'
                        }`}
                      >
                        {classificationResult.spectralType}
                        <sub className="text-base ml-0.5">{classificationResult.luminosityClass}</sub>
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          classificationResult.spectralType === 'A' || classificationResult.spectralType === 'F'
                            ? 'text-slate-800'
                            : 'text-white/80'
                        }`}
                      >
                        {LUMINOSITY_NAMES[classificationResult.luminosityClass] || classificationResult.luminosityClass}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-slate-800/80">
                        <Thermometer className="w-2.5 h-2.5" />
                        {TEMPERATURE_RANGES[classificationResult.spectralType]}
                      </div>
                      <div
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          classificationResult.confidence > 70
                            ? 'bg-emerald-900/40 text-emerald-300'
                            : classificationResult.confidence > 40
                            ? 'bg-amber-900/40 text-amber-300'
                            : 'bg-red-900/40 text-red-300'
                        }`}
                      >
                        {classificationResult.confidence.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
                {classificationResult.matchedFeatures.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {classificationResult.matchedFeatures.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-900/30 text-emerald-300 border border-emerald-800/50"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {manualClassificationResult && (
              <div className="space-y-2 p-3 rounded-lg bg-violet-900/20 border border-violet-700/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-300">
                    <UserCircle className="w-3.5 h-3.5" />
                    人工复核结果
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-700/40 text-violet-200 text-[9px]">
                      <Lock className="w-2.5 h-2.5" />
                      已锁定
                    </span>
                  </div>
                  <button
                    onClick={handleClearManualResult}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Unlock className="w-2.5 h-2.5" />
                    清除
                  </button>
                </div>
                <div
                  className={`relative p-3 rounded-lg bg-gradient-to-br ${SPECTRAL_TYPE_COLORS[manualClassificationResult.spectralType] || 'from-slate-600 to-slate-700'} shadow overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-violet-900/20" />
                  <div className="relative">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-3xl font-bold ${
                          manualClassificationResult.spectralType === 'O'
                            ? 'text-blue-100'
                            : manualClassificationResult.spectralType === 'A' || manualClassificationResult.spectralType === 'F'
                            ? 'text-slate-900'
                            : 'text-white'
                        }`}
                      >
                        {manualClassificationResult.spectralType}
                        <sub className="text-base ml-0.5">{manualClassificationResult.luminosityClass}</sub>
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          manualClassificationResult.spectralType === 'A' || manualClassificationResult.spectralType === 'F'
                            ? 'text-slate-800'
                            : 'text-white/80'
                        }`}
                      >
                        {LUMINOSITY_NAMES[manualClassificationResult.luminosityClass] || manualClassificationResult.luminosityClass}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-slate-800/80">
                        <Thermometer className="w-2.5 h-2.5" />
                        {TEMPERATURE_RANGES[manualClassificationResult.spectralType]}
                      </div>
                      <div
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          manualClassificationResult.confidence > 70
                            ? 'bg-emerald-900/40 text-emerald-300'
                            : manualClassificationResult.confidence > 40
                            ? 'bg-amber-900/40 text-amber-300'
                            : 'bg-red-900/40 text-red-300'
                        }`}
                      >
                        {manualClassificationResult.confidence.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ backgroundColor: currentUser.avatarColor }}
                    >
                      {getAvatarInitials(currentUser.name)}
                    </div>
                    <span>分类者: {currentUser.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(manualClassificationResult.confirmedAt).toLocaleString('zh-CN')}</span>
                  </div>
                </div>
                {manualClassificationResult.reviewerNotes && (
                  <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50">
                    <div className="text-[10px] text-slate-500 mb-0.5">复核备注</div>
                    <div className="text-[11px] text-slate-300">{manualClassificationResult.reviewerNotes}</div>
                  </div>
                )}
                {manualClassificationResult.deviationRegions.length > 0 && (
                  <ul className="space-y-1">
                    {manualClassificationResult.deviationRegions.slice(0, 3).map((region, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-1.5 px-2 py-1 rounded-md bg-violet-900/20 border border-violet-800/30 text-[10px] text-violet-200"
                      >
                        <Ruler className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{region.description}</div>
                          <div className="text-violet-300/70 font-mono text-[9px]">
                            {region.start.toFixed(0)}–{region.end.toFixed(0)} Å
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {classificationResult && manualClassificationResult && (
              <div className="flex items-center justify-center gap-2 p-2 rounded-md bg-slate-800/30 border border-slate-700/40">
                <span className="text-[10px] text-slate-500">
                  自动 vs 人工结果:{' '}
                </span>
                {classificationResult.spectralType === manualClassificationResult.spectralType &&
                 classificationResult.luminosityClass === manualClassificationResult.luminosityClass ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    一致
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    存在差异
                  </span>
                )}
              </div>
            )}

            {sharedClassifications.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowSharedClassifications(!showSharedClassifications)}
                  className="w-full flex items-center justify-between p-2 rounded-md bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/60 transition-colors"
                >
                  <span className="text-[11px] font-semibold text-violet-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    团队成员共享分类
                    <span className="text-[10px] text-slate-500">
                      ({sharedClassifications.length} 条)
                    </span>
                  </span>
                  {showSharedClassifications ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>

                {showSharedClassifications && (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {sharedClassifications.length >= 2 && (
                      <div className="p-2.5 rounded-md bg-slate-800/30 border border-violet-800/40">
                        <div className="text-[10px] font-semibold text-violet-300 mb-2 flex items-center gap-1">
                          <GitCompare className="w-3 h-3" />
                          分类结果一致性对比
                        </div>
                        <div className="grid gap-1.5">
                          {(() => {
                            const results = sharedClassifications;
                            const types = results.map((r) => `${r.spectralType}${r.luminosityClass}`);
                            const uniqueTypes = [...new Set(types)];
                            const majorityType = uniqueTypes.length === 1;
                            return (
                              <>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="text-slate-400">一致性:</span>
                                  {majorityType ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                                      <CheckCircle2 className="w-3 h-3" />
                                      完全一致
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                                      <AlertTriangle className="w-3 h-3" />
                                      存在 {uniqueTypes.length} 种不同结果
                                    </span>
                                  )}
                                </div>
                                {!majorityType && (
                                  <div className="flex flex-wrap gap-1">
                                    {uniqueTypes.map((type) => {
                                      const count = types.filter((t) => t === type).length;
                                      return (
                                        <span
                                          key={type}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-700/60 text-slate-300 font-mono"
                                        >
                                          {type}
                                          <span className="text-slate-500">×{count}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {sharedClassifications.map((shared) => {
                      const isCurrentUser = shared.author.userId === currentUser.id;
                      return (
                        <div
                          key={`${shared.author.userId}-${shared.classifiedAt}`}
                          className={`space-y-1.5 p-2.5 rounded-lg border ${
                            isCurrentUser
                              ? 'bg-violet-900/15 border-violet-800/40'
                              : 'bg-slate-800/30 border-slate-700/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                                style={{ backgroundColor: shared.author.avatarColor }}
                              >
                                {getAvatarInitials(shared.author.userName)}
                              </div>
                              <span className={`text-[11px] font-semibold ${isCurrentUser ? 'text-violet-200' : 'text-slate-200'}`}>
                                {shared.author.userName}
                                {isCurrentUser && <span className="text-violet-400"> (我)</span>}
                              </span>
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] bg-slate-700/60 text-slate-400">
                                <UserCircle className="w-2 h-2" />
                                {shared.source === 'manual' ? '人工' : '自动'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(shared.classifiedAt).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>

                          <div
                            className={`relative p-2 rounded-md bg-gradient-to-br ${SPECTRAL_TYPE_COLORS[shared.spectralType] || 'from-slate-600 to-slate-700'} shadow overflow-hidden`}
                          >
                            <div className="absolute inset-0 bg-slate-900/40" />
                            <div className="relative flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span
                                  className={`text-xl font-bold ${
                                    shared.spectralType === 'O'
                                      ? 'text-blue-100'
                                      : shared.spectralType === 'A' || shared.spectralType === 'F'
                                      ? 'text-slate-900'
                                      : 'text-white'
                                  }`}
                                >
                                  {shared.spectralType}
                                  <sub className="text-xs ml-0.5">{shared.luminosityClass}</sub>
                                </span>
                                <span
                                  className={`text-[10px] font-medium ${
                                    shared.spectralType === 'A' || shared.spectralType === 'F'
                                      ? 'text-slate-700'
                                      : 'text-white/70'
                                  }`}
                                >
                                  {LUMINOSITY_NAMES[shared.luminosityClass] || shared.luminosityClass}
                                </span>
                              </div>
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                  shared.confidence > 70
                                    ? 'bg-emerald-900/50 text-emerald-200'
                                    : shared.confidence > 40
                                    ? 'bg-amber-900/50 text-amber-200'
                                    : 'bg-red-900/50 text-red-200'
                                }`}
                              >
                                {shared.confidence.toFixed(0)}%
                              </span>
                            </div>
                          </div>

                          {shared.reviewerNotes && (
                            <div className="p-1.5 rounded bg-slate-800/50 border border-slate-700/40">
                              <div className="text-[9px] text-slate-500">备注</div>
                              <div className="text-[10px] text-slate-300">{shared.reviewerNotes}</div>
                            </div>
                          )}

                          {shared.matchedFeatures && shared.matchedFeatures.length > 0 && (
                            <div className="flex flex-wrap gap-0.5">
                              {shared.matchedFeatures.slice(0, 4).map((f) => (
                                <span
                                  key={f}
                                  className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[8px] bg-emerald-900/30 text-emerald-400 border border-emerald-800/40"
                                >
                                  <CheckCircle2 className="w-1.5 h-1.5" />
                                  {f}
                                </span>
                              ))}
                              {shared.matchedFeatures.length > 4 && (
                                <span className="text-[8px] text-slate-500">
                                  +{shared.matchedFeatures.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          !isComparisonActive && !manualTuning.enabled && (
            <div className="p-6 text-center text-sm text-slate-500 rounded-lg bg-slate-800/30 border border-dashed border-slate-700">
              点击"运行分类"按钮开始光谱型识别，或开启"手动调优"进行人工分类
            </div>
          )
        )}
      </div>

      {diagnostics && (
        <div className="pt-3 border-t border-slate-700/60 space-y-2">
          <div className="text-xs font-medium text-slate-400">谱线测量诊断</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-slate-800/50">
              <div className="text-slate-500">Hα 等值宽度</div>
              <div className={`font-mono mt-0.5 ${diagnostics.haEW < -3 ? 'text-cyan-300' : 'text-slate-300'}`}>
                {diagnostics.haEW.toFixed(2)} Å
                {diagnostics.haEW < -3 && <span className="ml-1 text-[10px] text-cyan-400">发射</span>}
              </div>
            </div>
            <div className="p-2 rounded bg-slate-800/50">
              <div className="text-slate-500">Hβ 等值宽度</div>
              <div className="font-mono text-slate-300 mt-0.5">{diagnostics.hbEW.toFixed(2)} Å</div>
            </div>
            <div className="p-2 rounded bg-slate-800/50">
              <div className="text-slate-500">Hα/Hβ 深度比</div>
              <div className="font-mono text-slate-300 mt-0.5">{diagnostics.ratios['Hα/Hβ'].toFixed(2)}</div>
            </div>
            <div className="p-2 rounded bg-slate-800/50">
              <div className="text-slate-500">He I 4471 深度</div>
              <div className="font-mono text-slate-300 mt-0.5">
                {(diagnostics.ratios['HeI4471_depth'] * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          {isBeStarCandidate && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-cyan-900/30 border border-cyan-700/50 text-xs text-cyan-200">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span>检测到强烈 Hα 发射，可能是 Be 星候选体</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
