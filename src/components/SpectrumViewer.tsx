import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
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
import { SPECTRAL_LINES, MK_TEMPLATES } from '@/data/astronomy';
import { useAppStore } from '@/store/appStore';
import type { SpectrumData, ClassificationResult, ResidualPoint, DifferenceRegion, MKTemplate } from '@/types';
import {
  computeResidualsInterpolated,
  findDifferenceRegions,
  generateTemplateSpectrumPoints,
  computeTemplateDeviationRegions,
} from '@/lib/spectralAnalysis';
import { Crosshair, Eye, EyeOff, ZoomIn, RotateCcw, GitCompare, AlertTriangle, TrendingUp, Sliders } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const SPECTRUM_COLORS = [
  '#00d4ff',
  '#ff9f40',
  '#7c5cff',
  '#36d399',
  '#ff6b9d',
  '#fbbf24',
  '#f472b6',
];

const RESIDUAL_COLOR = '#f87171';
const DIFF_REGION_COLOR = 'rgba(248, 113, 113, 0.15)';

interface SpectrumViewerProps {
  overlayIds?: string[];
  showLineLabels?: boolean;
  showDeviations?: boolean;
}

export default function SpectrumViewer({
  overlayIds = [],
  showLineLabels = true,
  showDeviations = true,
}: SpectrumViewerProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const residualChartRef = useRef<ChartJS<'line'>>(null);
  const [zoom, setZoom] = useState<{ min: number; max: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ wavelength: number; intensity: number } | null>(null);

  const {
    spectra,
    currentSpectrumId,
    visibleLineCategories,
    classificationResult,
    toggleLineCategory,
    comparisonMode,
    toggleShowResiduals,
    toggleShowDifferenceRegions,
    setDifferenceThreshold,
    manualTuning,
  } = useAppStore();

  const comparisonSpectra = useMemo<SpectrumData[]>(() => {
    if (comparisonMode.enabled && comparisonMode.selectedSpectrumIds.length >= 2) {
      return comparisonMode.selectedSpectrumIds
        .map((id) => spectra.find((s) => s.id === id))
        .filter((s): s is SpectrumData => s !== undefined);
    }
    return [];
  }, [comparisonMode, spectra]);

  const currentSpectrum = spectra.find((s) => s.id === currentSpectrumId) || null;
  const overlaySpectra = overlayIds
    .map((id) => spectra.find((s) => s.id === id))
    .filter((s): s is SpectrumData => s !== undefined);

  const visibleLines = SPECTRAL_LINES.filter((l) => visibleLineCategories[l.category]);

  const isComparisonActive = comparisonSpectra.length >= 2;

  const residualsData = useMemo(() => {
    if (!isComparisonActive || comparisonSpectra.length < 2) {
      return { residualPairs: [] as { residuals: ResidualPoint[]; label: string }[], regions: [] as DifferenceRegion[] };
    }
    const pairs: { residuals: ResidualPoint[]; label: string }[] = [];
    const allRegions: DifferenceRegion[] = [];
    for (let i = 0; i < comparisonSpectra.length; i++) {
      for (let j = i + 1; j < comparisonSpectra.length; j++) {
        const res = computeResidualsInterpolated(
          comparisonSpectra[i].points,
          comparisonSpectra[j].points
        );
        pairs.push({
          residuals: res,
          label: `${comparisonSpectra[i].name} − ${comparisonSpectra[j].name}`,
        });
        const ids: [string, string] = [comparisonSpectra[i].id, comparisonSpectra[j].id];
        const regions = findDifferenceRegions(res, comparisonMode.differenceThreshold, 10, ids);
        allRegions.push(...regions);
      }
    }
    return { residualPairs: pairs, regions: allRegions };
  }, [comparisonSpectra, isComparisonActive, comparisonMode.differenceThreshold]);

  const templateOverlayData = useMemo(() => {
    if (!manualTuning.enabled || !manualTuning.selectedTemplateLabel || !currentSpectrum) {
      return { points: [] as { wavelength: number; intensity: number }[], template: null as MKTemplate | null, deviationRegions: [] as DifferenceRegion[] };
    }
    const template = MK_TEMPLATES.find((t) => t.label === manualTuning.selectedTemplateLabel);
    if (!template) {
      return { points: [], template: null, deviationRegions: [] };
    }
    const templatePoints = generateTemplateSpectrumPoints(
      template,
      currentSpectrum.wavelengthMin,
      currentSpectrum.wavelengthMax,
      2,
      manualTuning.subtypeOffset,
      manualTuning.luminosityOffset,
      manualTuning.templateIntensityScale
    );
    const deviationRegions = manualTuning.showDeviationHighlight
      ? computeTemplateDeviationRegions(currentSpectrum.points, templatePoints, manualTuning.deviationThreshold)
      : [];
    return { points: templatePoints, template, deviationRegions };
  }, [manualTuning.enabled, manualTuning.selectedTemplateLabel, manualTuning.subtypeOffset, manualTuning.luminosityOffset, manualTuning.templateIntensityScale, manualTuning.showDeviationHighlight, manualTuning.deviationThreshold, currentSpectrum]);

  const resetZoom = useCallback(() => setZoom(null), []);

  const displaySpectra = useMemo(() => {
    if (isComparisonActive) {
      return comparisonSpectra;
    }
    const all: SpectrumData[] = [];
    if (currentSpectrum) all.push(currentSpectrum);
    overlaySpectra.forEach((s) => {
      if (!all.find((a) => a.id === s.id)) all.push(s);
    });
    return all;
  }, [isComparisonActive, comparisonSpectra, currentSpectrum, overlaySpectra]);

  const wlRange = useMemo(() => {
    if (displaySpectra.length > 0) {
      const mins = displaySpectra.map((s) => s.wavelengthMin);
      const maxs = displaySpectra.map((s) => s.wavelengthMax);
      return { min: Math.min(...mins), max: Math.max(...maxs) };
    }
    return { min: 3800, max: 7500 };
  }, [displaySpectra]);

  const buildChartData = useCallback(() => {
    if (displaySpectra.length === 0) {
      return { labels: [] as string[], datasets: [] };
    }

    const allWavelengths = new Set<number>();
    displaySpectra.forEach((s) => s.points.forEach((p) => allWavelengths.add(p.wavelength)));
    const sortedWavelengths = Array.from(allWavelengths).sort((a, b) => a - b);

    const wlToDataMap = (points: { wavelength: number; intensity: number }[]) => {
      const map = new Map<number, number>();
      points.forEach((p) => map.set(p.wavelength, p.intensity));
      return map;
    };

    const datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      borderWidth: number;
      borderDash?: number[];
      tension: number;
      pointRadius: number;
      pointHoverRadius: number;
      fill: boolean;
      spanGaps: boolean;
    }[] = displaySpectra.map((s, idx) => {
      const map = wlToDataMap(s.points);
      const data = sortedWavelengths.map((wl) => {
        const val = map.get(wl);
        return val !== undefined ? val : null as unknown as number;
      });
      return {
        label: s.name,
        data,
        borderColor: SPECTRUM_COLORS[idx % SPECTRUM_COLORS.length],
        backgroundColor: SPECTRUM_COLORS[idx % SPECTRUM_COLORS.length] + '15',
        borderWidth: isComparisonActive ? 1.5 : idx === 0 ? 1.8 : 1.2,
        tension: 0.15,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
        spanGaps: true,
      };
    });

    if (showDeviations && classificationResult && classificationResult.deviationRegions.length > 0) {
      classificationResult.deviationRegions.forEach((region) => {
        const regionData = sortedWavelengths.map((wl) =>
          wl >= region.start && wl <= region.end ? 1.05 : null as unknown as number
        );
        datasets.push({
          label: region.description,
          data: regionData,
          borderColor: 'transparent',
          backgroundColor: 'rgba(255, 99, 132, 0.15)',
          borderWidth: 0,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: true,
          spanGaps: false,
        });
      });
    }

    if (isComparisonActive && comparisonMode.showDifferenceRegions && residualsData.regions.length > 0) {
      residualsData.regions.forEach((region) => {
        const regionData = sortedWavelengths.map((wl) =>
          wl >= region.start && wl <= region.end ? 1.08 : null as unknown as number
        );
        datasets.push({
          label: `差异区域 ${region.start.toFixed(0)}–${region.end.toFixed(0)} Å (max Δ=${region.maxDiff.toFixed(3)})`,
          data: regionData,
          borderColor: 'transparent',
          backgroundColor: DIFF_REGION_COLOR,
          borderWidth: 0,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: true,
          spanGaps: false,
        });
      });
    }

    if (manualTuning.enabled && manualTuning.showTemplateOverlay && templateOverlayData.points.length > 0) {
      const templateMap = wlToDataMap(templateOverlayData.points);
      const templateData = sortedWavelengths.map((wl) => {
        const val = templateMap.get(wl);
        return val !== undefined ? val : null as unknown as number;
      });
      datasets.push({
        label: `模板 ${templateOverlayData.template?.label || ''}`,
        data: templateData,
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167, 139, 250, 0.08)',
        borderWidth: 2,
        borderDash: [6, 4],
        tension: 0.15,
        pointRadius: 0,
        pointHoverRadius: 3,
        fill: false,
        spanGaps: true,
      });
    }

    if (manualTuning.enabled && manualTuning.showDeviationHighlight && templateOverlayData.deviationRegions.length > 0) {
      templateOverlayData.deviationRegions.forEach((region) => {
        const regionData = sortedWavelengths.map((wl) =>
          wl >= region.start && wl <= region.end ? 1.12 : null as unknown as number
        );
        datasets.push({
          label: `模板偏差 ${region.start.toFixed(0)}–${region.end.toFixed(0)} Å (max Δ=${region.maxDiff.toFixed(3)})`,
          data: regionData,
          borderColor: 'transparent',
          backgroundColor: 'rgba(167, 139, 250, 0.12)',
          borderWidth: 0,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: true,
          spanGaps: false,
        });
      });
    }

    return { labels: sortedWavelengths.map((w) => w.toFixed(1)), datasets };
  }, [displaySpectra, classificationResult, showDeviations, isComparisonActive, comparisonMode.showDifferenceRegions, residualsData.regions, manualTuning.enabled, manualTuning.showTemplateOverlay, manualTuning.showDeviationHighlight, templateOverlayData]);

  const buildResidualChartData = useCallback(() => {
    if (residualsData.residualPairs.length === 0) {
      return { labels: [] as string[], datasets: [] };
    }

    const allWavelengths = new Set<number>();
    residualsData.residualPairs.forEach((pair) =>
      pair.residuals.forEach((r) => allWavelengths.add(r.wavelength))
    );
    const sortedWavelengths = Array.from(allWavelengths).sort((a, b) => a - b);

    const datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      borderWidth: number;
      borderDash?: number[];
      tension: number;
      pointRadius: number;
      pointHoverRadius: number;
      fill: boolean;
      spanGaps: boolean;
    }[] = residualsData.residualPairs.map((pair, idx) => {
      const resMap = new Map<number, number>();
      pair.residuals.forEach((r) => resMap.set(r.wavelength, r.diff));
      const data = sortedWavelengths.map((wl) => {
        const val = resMap.get(wl);
        return val !== undefined ? val : null as unknown as number;
      });
      return {
        label: pair.label,
        data,
        borderColor: SPECTRUM_COLORS[idx % SPECTRUM_COLORS.length],
        backgroundColor: SPECTRUM_COLORS[idx % SPECTRUM_COLORS.length] + '20',
        borderWidth: 1.2,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 3,
        fill: false,
        spanGaps: true,
      };
    });

    const zeroLineData = sortedWavelengths.map(() => 0);
    datasets.push({
      label: '零线',
      data: zeroLineData,
      borderColor: 'rgba(148, 163, 184, 0.4)',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [4, 4],
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      spanGaps: false,
    });

    return { labels: sortedWavelengths.map((w) => w.toFixed(1)), datasets };
  }, [residualsData.residualPairs]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest' as const,
      intersect: false,
      axis: 'x' as const,
    },
    animation: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 11 },
          boxWidth: 14,
          padding: 12,
          filter: (item: any) => !item.text.includes('差异区域') && !item.text.includes('异常') && !item.text.includes('模板偏差'),
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          title: (items: any) => `λ ${items[0]?.label || ''} Å`,
          label: (ctx: any) => {
            if (ctx.dataset && ctx.dataset.label && (ctx.dataset.label.includes('差异区域') || ctx.dataset.label.includes('异常') || ctx.dataset.label.includes('模板偏差'))) {
              return null;
            }
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
        min: zoom?.min,
        max: zoom?.max,
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          maxTicksLimit: 12,
          callback: (value: any) => value.toFixed(0) + ' Å',
        },
        grid: {
          color: 'rgba(71, 85, 105, 0.3)',
          drawBorder: false,
        },
        title: {
          display: true,
          text: '波长 (Å)',
          color: '#94a3b8',
          font: { size: 12, weight: 'bold' as const },
          padding: { top: 8 },
        },
      },
      y: {
        min: 0,
        max: 1.2,
        ticks: {
          color: '#64748b',
          font: { size: 11 },
        },
        grid: {
          color: 'rgba(71, 85, 105, 0.3)',
          drawBorder: false,
        },
        title: {
          display: true,
          text: '相对强度 (归一化)',
          color: '#94a3b8',
          font: { size: 12, weight: 'bold' as const },
        },
      },
    },
  };

  const residualChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest' as const,
      intersect: false,
      axis: 'x' as const,
    },
    animation: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 10 },
          boxWidth: 12,
          padding: 10,
          filter: (item: any) => item.text !== '零线',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 8,
        callbacks: {
          title: (items: any) => `λ ${items[0]?.label || ''} Å`,
          label: (ctx: any) => {
            if (ctx.dataset?.label === '零线') return null;
            const val = ctx.parsed?.y;
            return val !== null && val !== undefined
              ? `${ctx.dataset.label}: Δ=${val.toFixed(4)}`
              : null;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        min: zoom?.min,
        max: zoom?.max,
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          maxTicksLimit: 12,
          callback: (value: any) => value.toFixed(0) + ' Å',
        },
        grid: {
          color: 'rgba(71, 85, 105, 0.3)',
          drawBorder: false,
        },
        title: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: '#64748b',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(71, 85, 105, 0.3)',
          drawBorder: false,
        },
        title: {
          display: true,
          text: '残差 ΔI',
          color: '#94a3b8',
          font: { size: 11, weight: 'bold' as const },
        },
      },
    },
  };

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chart.canvas) return;
    const onMove = (evt: any) => {
      const points = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: false }, true);
      if (points.length > 0) {
        const first = points[0];
        const wl = Number(chart.data.labels?.[first.index]);
        const val = (chart.data.datasets[first.datasetIndex]?.data?.[first.index]) as number;
        if (!isNaN(wl) && !isNaN(val)) {
          setHoverInfo({ wavelength: wl, intensity: val });
        }
      }
    };
    const onLeave = () => setHoverInfo(null);
    const canvas = chart.canvas;
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    return () => {
      if (canvas) {
        canvas.removeEventListener('mousemove', onMove);
        canvas.removeEventListener('mouseleave', onLeave);
      }
    };
  }, [chartRef.current]);

  const handleZoomIn = () => {
    const span = wlRange.max - wlRange.min;
    setZoom({
      min: wlRange.min + span * 0.2,
      max: wlRange.max - span * 0.2,
    });
  };

  if (displaySpectra.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-slate-900/40 rounded-lg border border-slate-700">
        <div className="text-slate-500 text-lg">请导入或加载示例光谱数据</div>
        <div className="text-slate-600 text-sm mt-2">拖拽CSV文件或点击"加载示例数据"</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">
            <Crosshair className="w-3.5 h-3.5 inline mr-1" />
            {hoverInfo
              ? `λ ${hoverInfo.wavelength.toFixed(1)} Å : ${hoverInfo.intensity.toFixed(3)}`
              : '鼠标悬停查看光谱数据'}
          </span>
          {isComparisonActive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-900/40 text-cyan-300 text-[11px] border border-cyan-700/50">
              <GitCompare className="w-3 h-3" />
              对比模式 · {comparisonSpectra.length} 条光谱
            </span>
          )}
          {manualTuning.enabled && manualTuning.selectedTemplateLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-300 text-[11px] border border-violet-700/50">
              <Sliders className="w-3 h-3" />
              手动调优 · 模板 {manualTuning.selectedTemplateLabel}
              {manualTuning.subtypeOffset !== 0 && (
                <span className="text-violet-400/80 ml-1">子型 {manualTuning.subtypeOffset > 0 ? '+' : ''}{manualTuning.subtypeOffset}</span>
              )}
              {manualTuning.luminosityOffset !== 0 && (
                <span className="text-violet-400/80 ml-1">光度 {manualTuning.luminosityOffset > 0 ? '+' : ''}{manualTuning.luminosityOffset}</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomIn}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" /> 放大
          </button>
          <button
            onClick={resetZoom}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 重置
          </button>
        </div>
      </div>

      {isComparisonActive && (
        <div className="flex items-center gap-3 flex-wrap text-xs p-2 rounded-md bg-slate-800/50 border border-slate-700/60">
          <button
            onClick={toggleShowResiduals}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              comparisonMode.showResiduals
                ? 'bg-slate-700 text-slate-200'
                : 'bg-slate-800/50 text-slate-500 hover:text-slate-400'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            残差曲线
          </button>
          <button
            onClick={toggleShowDifferenceRegions}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              comparisonMode.showDifferenceRegions
                ? 'bg-slate-700 text-slate-200'
                : 'bg-slate-800/50 text-slate-500 hover:text-slate-400'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            差异高亮
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-slate-500">差异阈值</span>
            <input
              type="range"
              min="0.01"
              max="0.2"
              step="0.005"
              value={comparisonMode.differenceThreshold}
              onChange={(e) => setDifferenceThreshold(Number(e.target.value))}
              className="w-28 accent-cyan-500"
            />
            <span className="text-slate-400 font-mono w-12">
              {(comparisonMode.differenceThreshold * 100).toFixed(1)}%
            </span>
          </div>
          {residualsData.regions.length > 0 && (
            <span className="text-amber-400 text-[11px]">
              检测到 {residualsData.regions.length} 个差异区域
            </span>
          )}
        </div>
      )}

      {manualTuning.enabled && manualTuning.selectedTemplateLabel && (
        <div className="flex items-center gap-3 flex-wrap text-xs p-2 rounded-md bg-violet-900/20 border border-violet-800/40">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-800/40 text-violet-200 text-[11px]">
            <Sliders className="w-3 h-3" />
            手动调优控制
          </span>
          <button
            onClick={() => {
              const { setShowTemplateOverlay } = useAppStore.getState();
              setShowTemplateOverlay(!manualTuning.showTemplateOverlay);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              manualTuning.showTemplateOverlay
                ? 'bg-slate-700 text-slate-200'
                : 'bg-slate-800/50 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Eye className="w-3 h-3" />
            模板叠加
          </button>
          <button
            onClick={() => {
              const { setShowDeviationHighlight } = useAppStore.getState();
              setShowDeviationHighlight(!manualTuning.showDeviationHighlight);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              manualTuning.showDeviationHighlight
                ? 'bg-slate-700 text-slate-200'
                : 'bg-slate-800/50 text-slate-500 hover:text-slate-400'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            偏差高亮
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-slate-500">偏差阈值</span>
            <input
              type="range"
              min="0.01"
              max="0.2"
              step="0.005"
              value={manualTuning.deviationThreshold}
              onChange={(e) => {
                const { setTuningDeviationThreshold } = useAppStore.getState();
                setTuningDeviationThreshold(Number(e.target.value));
              }}
              className="w-28 accent-violet-500"
            />
            <span className="text-slate-400 font-mono w-12">
              {(manualTuning.deviationThreshold * 100).toFixed(1)}%
            </span>
          </div>
          {templateOverlayData.deviationRegions.length > 0 && (
            <span className="text-violet-400 text-[11px]">
              检测到 {templateOverlayData.deviationRegions.length} 个偏差区域
            </span>
          )}
        </div>
      )}

      <div className="relative h-96 bg-slate-900/40 rounded-lg border border-slate-700 p-3">
        <Line ref={chartRef} data={buildChartData()} options={chartOptions as any} />
        {showLineLabels && (
          <div className="absolute left-3 right-3 top-0 h-full pointer-events-none">
            {visibleLines.map((line) => {
              const dispMin = zoom?.min || wlRange.min;
              const dispMax = zoom?.max || wlRange.max;
              if (line.wavelength < dispMin || line.wavelength > dispMax) return null;
              const xPct = ((line.wavelength - dispMin) / (dispMax - dispMin)) * 100;
              const isHa = line.label === 'Hα';
              return (
                <div
                  key={line.label}
                  className="absolute top-0 bottom-0 flex flex-col items-center"
                  style={{ left: `${xPct}%`, transform: 'translateX(-50%)' }}
                >
                  <div
                    className="w-px h-full opacity-40"
                    style={{ backgroundColor: line.color }}
                  />
                  <span
                    className={`mt-1 px-1 py-0.5 rounded text-[10px] font-mono whitespace-nowrap ${
                      isHa ? 'bg-red-900/60 text-red-200' : 'bg-slate-800/80 text-slate-300'
                    }`}
                    style={{ color: isHa ? undefined : line.color }}
                  >
                    {line.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isComparisonActive && comparisonMode.showResiduals && residualsData.residualPairs.length > 0 && (
        <div className="relative h-44 bg-slate-900/40 rounded-lg border border-slate-700 p-3">
          <div className="absolute top-1 left-3 text-[10px] text-slate-500 z-10">
            残差曲线 (Residuals)
          </div>
          <Line ref={residualChartRef} data={buildResidualChartData()} options={residualChartOptions as any} />
        </div>
      )}

      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="text-slate-500">显示谱线:</span>
        {(['hydrogen', 'helium', 'metal'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => toggleLineCategory(cat)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              visibleLineCategories[cat]
                ? 'bg-slate-700 text-slate-200'
                : 'bg-slate-800/50 text-slate-500'
            }`}
          >
            {visibleLineCategories[cat] ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
            {cat === 'hydrogen' ? '氢线' : cat === 'helium' ? '氦线' : '金属线'}
          </button>
        ))}
      </div>
    </div>
  );
}
