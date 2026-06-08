import { useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { classifySpectrum, measureEquivalentWidth, computeLineRatios, WAVELENGTHS, buildEWComparisonTable } from '@/lib/spectralAnalysis';
import { Sparkles, AlertTriangle, CheckCircle2, Star, Thermometer, Ruler, GitCompare, Table2 } from 'lucide-react';

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
    setClassificationResult,
    comparisonMode,
  } = useAppStore();

  const current = spectra.find((s) => s.id === currentSpectrumId);

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

  const runClassification = () => {
    if (!current) return;
    const result = classifySpectrum(current.points);
    setClassificationResult(result);
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          MK光谱分类
        </h3>
        <button
          onClick={runClassification}
          disabled={!current}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          运行分类
        </button>
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

      {classificationResult && current ? (
        <div className="space-y-4">
          <div
            className={`relative p-4 rounded-lg bg-gradient-to-br ${SPECTRAL_TYPE_COLORS[classificationResult.spectralType] || 'from-slate-600 to-slate-700'} shadow-lg overflow-hidden`}
          >
            <div className="absolute inset-0 bg-slate-900/30" />
            <div className="relative">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-4xl font-bold ${
                    classificationResult.spectralType === 'O'
                      ? 'text-blue-100'
                      : classificationResult.spectralType === 'A' || classificationResult.spectralType === 'F'
                      ? 'text-slate-900'
                      : 'text-white'
                  }`}
                >
                  {classificationResult.spectralType}
                  <sub className="text-lg ml-0.5">{classificationResult.luminosityClass}</sub>
                </span>
                <span
                  className={`text-sm font-medium ${
                    classificationResult.spectralType === 'A' || classificationResult.spectralType === 'F'
                      ? 'text-slate-800'
                      : 'text-white/80'
                  }`}
                >
                  {LUMINOSITY_NAMES[classificationResult.luminosityClass] || classificationResult.luminosityClass}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-slate-800/80">
                  <Thermometer className="w-3 h-3" />
                  {TEMPERATURE_RANGES[classificationResult.spectralType]}
                </div>
                <div
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    classificationResult.confidence > 70
                      ? 'bg-emerald-900/40 text-emerald-300'
                      : classificationResult.confidence > 40
                      ? 'bg-amber-900/40 text-amber-300'
                      : 'bg-red-900/40 text-red-300'
                  }`}
                >
                  置信度 {classificationResult.confidence.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-400">识别的光谱特征</div>
            <div className="flex flex-wrap gap-1.5">
              {classificationResult.matchedFeatures.length > 0 ? (
                classificationResult.matchedFeatures.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-900/30 text-emerald-300 border border-emerald-800/50"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {f}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">未检测到显著特征</span>
              )}
            </div>
          </div>

          {classificationResult.deviationRegions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                与模板的偏差区域
              </div>
              <ul className="space-y-1.5">
                {classificationResult.deviationRegions.map((region, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-900/20 border border-amber-800/40 text-xs text-amber-200"
                  >
                    <Ruler className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{region.description}</div>
                      <div className="text-amber-300/70 font-mono text-[10px] mt-0.5">
                        {region.start.toFixed(0)} – {region.end.toFixed(0)} Å
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        !isComparisonActive && (
          <div className="p-6 text-center text-sm text-slate-500 rounded-lg bg-slate-800/30 border border-dashed border-slate-700">
            点击"运行分类"按钮开始光谱型识别
          </div>
        )
      )}

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
