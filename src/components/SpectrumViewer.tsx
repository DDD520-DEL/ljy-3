import { useRef, useEffect, useCallback, useState } from 'react';
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
import { SPECTRAL_LINES } from '@/data/astronomy';
import { useAppStore } from '@/store/appStore';
import type { SpectrumData, ClassificationResult } from '@/types';
import { Crosshair, Eye, EyeOff, ZoomIn, RotateCcw } from 'lucide-react';

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
  const [zoom, setZoom] = useState<{ min: number; max: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ wavelength: number; intensity: number } | null>(null);

  const { spectra, currentSpectrumId, visibleLineCategories, classificationResult, toggleLineCategory } =
    useAppStore();

  const currentSpectrum = spectra.find((s) => s.id === currentSpectrumId) || null;
  const overlaySpectra = overlayIds
    .map((id) => spectra.find((s) => s.id === id))
    .filter((s): s is SpectrumData => s !== undefined);

  const visibleLines = SPECTRAL_LINES.filter((l) => visibleLineCategories[l.category]);

  const resetZoom = useCallback(() => setZoom(null), []);

  const buildChartData = useCallback(() => {
    const allSpectra: SpectrumData[] = [];
    if (currentSpectrum) allSpectra.push(currentSpectrum);
    overlaySpectra.forEach((s) => {
      if (!allSpectra.find((a) => a.id === s.id)) allSpectra.push(s);
    });

    if (allSpectra.length === 0) {
      return { labels: [] as string[], datasets: [] };
    }

    const allWavelengths = new Set<number>();
    allSpectra.forEach((s) => s.points.forEach((p) => allWavelengths.add(p.wavelength)));
    const sortedWavelengths = Array.from(allWavelengths).sort((a, b) => a - b);

    const wlToDataMap = (points: { wavelength: number; intensity: number }[]) => {
      const map = new Map<number, number>();
      points.forEach((p) => map.set(p.wavelength, p.intensity));
      return map;
    };

    const datasets = allSpectra.map((s, idx) => {
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
        borderWidth: idx === 0 ? 1.8 : 1.2,
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

    return { labels: sortedWavelengths.map((w) => w.toFixed(1)), datasets };
  }, [currentSpectrum, overlaySpectra, classificationResult, showDeviations]);

  const options = {
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
            if (ctx.dataset && ctx.dataset.label && ctx.dataset.label.includes('异常')) {
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

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
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
    chart.canvas.addEventListener('mousemove', onMove);
    chart.canvas.addEventListener('mouseleave', onLeave);
    return () => {
      chart.canvas.removeEventListener('mousemove', onMove);
      chart.canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [chartRef.current]);

  const wlRange = currentSpectrum
    ? { min: currentSpectrum.wavelengthMin, max: currentSpectrum.wavelengthMax }
    : { min: 3800, max: 7500 };

  const handleZoomIn = () => {
    if (currentSpectrum) {
      const span = wlRange.max - wlRange.min;
      setZoom({
        min: wlRange.min + span * 0.2,
        max: wlRange.max - span * 0.2,
      });
    }
  };

  if (!currentSpectrum) {
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

      <div className="relative h-96 bg-slate-900/40 rounded-lg border border-slate-700 p-3">
        <Line ref={chartRef} data={buildChartData()} options={options as any} />
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
