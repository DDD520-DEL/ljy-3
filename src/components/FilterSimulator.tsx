import { useState, useMemo, useCallback, useRef } from 'react';
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
import Papa from 'papaparse';
import { Upload, AlertCircle, CheckCircle2, X, Info, Layers } from 'lucide-react';
import { STANDARD_FILTERS, FILTER_SYSTEMS, getFiltersBySystem } from '@/data/filters';
import type { FilterData, FilterResponsePoint } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const CUSTOM_COLORS = [
  '#f472b6',
  '#a78bfa',
  '#38bdf8',
  '#4ade80',
  '#facc15',
  '#fb923c',
  '#f87171',
];

function computeCentralWavelength(points: FilterResponsePoint[]): number {
  if (points.length === 0) return 0;
  let sumWlT = 0;
  let sumT = 0;
  for (const p of points) {
    sumWlT += p.wavelength * p.transmission;
    sumT += p.transmission;
  }
  return sumT > 0 ? sumWlT / sumT : 0;
}

function computeFWHM(points: FilterResponsePoint[], centralWl: number): number {
  if (points.length < 2) return 0;
  const sorted = [...points].sort((a, b) => a.wavelength - b.wavelength);
  let maxT = 0;
  for (const p of sorted) {
    if (p.transmission > maxT) maxT = p.transmission;
  }
  if (maxT <= 0) return 0;
  const halfMax = maxT / 2;

  let leftWl = sorted[0].wavelength;
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (p1.wavelength <= centralWl && p2.wavelength <= centralWl) {
      if (p1.transmission <= halfMax && p2.transmission >= halfMax) {
        const t = (halfMax - p1.transmission) / (p2.transmission - p1.transmission);
        leftWl = p1.wavelength + t * (p2.wavelength - p1.wavelength);
        break;
      } else if (p2.transmission >= halfMax) {
        leftWl = p2.wavelength;
      }
    }
  }

  let rightWl = sorted[sorted.length - 1].wavelength;
  for (let i = sorted.length - 1; i > 0; i--) {
    const p1 = sorted[i - 1];
    const p2 = sorted[i];
    if (p1.wavelength >= centralWl && p2.wavelength >= centralWl) {
      if (p1.transmission >= halfMax && p2.transmission <= halfMax) {
        const t = (halfMax - p1.transmission) / (p2.transmission - p1.transmission);
        rightWl = p1.wavelength + t * (p2.wavelength - p1.wavelength);
        break;
      } else if (p1.transmission >= halfMax) {
        rightWl = p1.wavelength;
      }
    }
  }

  return rightWl - leftWl;
}

const genId = () => Math.random().toString(36).substring(2, 9);

export default function FilterSimulator() {
  const [selectedSystem, setSelectedSystem] = useState<string>('johnson_ubvri');
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>(['johnson_v', 'johnson_b', 'johnson_r']);
  const [customFilters, setCustomFilters] = useState<FilterData[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allFilters = useMemo(() => {
    return [...STANDARD_FILTERS, ...customFilters];
  }, [customFilters]);

  const selectedFilters = useMemo(() => {
    return allFilters.filter((f) => selectedFilterIds.includes(f.id));
  }, [allFilters, selectedFilterIds]);

  const systemFilters = useMemo(() => getFiltersBySystem(selectedSystem), [selectedSystem]);

  const toggleFilter = useCallback((filterId: string) => {
    setSelectedFilterIds((prev) => {
      if (prev.includes(filterId)) {
        return prev.filter((id) => id !== filterId);
      }
      return [...prev, filterId];
    });
  }, []);

  const selectAllInSystem = useCallback(() => {
    const systemFilterIds = systemFilters.map((f) => f.id);
    setSelectedFilterIds((prev) => {
      const set = new Set(prev);
      systemFilterIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  }, [systemFilters]);

  const clearSelection = useCallback(() => {
    setSelectedFilterIds([]);
  }, []);

  const removeCustomFilter = useCallback((filterId: string) => {
    setCustomFilters((prev) => prev.filter((f) => f.id !== filterId));
    setSelectedFilterIds((prev) => prev.filter((id) => id !== filterId));
  }, []);

  const processFilterCSV = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        try {
          const data = results.data as Array<Record<string, number>>;
          const points: FilterResponsePoint[] = [];

          for (const row of data) {
            const keys = Object.keys(row);
            const wlKey = keys.find((k) => /wav|lambda|angstrom|波长|wl/i.test(k)) || keys[0];
            const tKey = keys.find((k) => /trans|response|throughput|透射|响应|t\b|tr/i.test(k)) || keys[1];

            if (wlKey && tKey && row[wlKey] !== undefined && row[tKey] !== undefined) {
              const wl = Number(row[wlKey]);
              const t = Number(row[tKey]);
              if (!isNaN(wl) && !isNaN(t) && wl > 0) {
                const normalizedT = t > 1 ? t / 100 : t;
                points.push({ wavelength: wl, transmission: Math.max(0, Math.min(1, normalizedT)) });
              }
            }
          }

          if (points.length < 5) {
            setError('无法解析有效滤光片数据点（至少需要 5 个）');
            return;
          }

          points.sort((a, b) => a.wavelength - b.wavelength);

          const cw = computeCentralWavelength(points);
          const fwhm = computeFWHM(points, cw);
          const color = CUSTOM_COLORS[customFilters.length % CUSTOM_COLORS.length];

          const filterName = file.name.replace(/\.[^/.]+$/, '');
          const newFilter: FilterData = {
            id: `custom_${genId()}`,
            name: filterName,
            system: '自定义',
            description: `用户上传: ${file.name}`,
            color,
            points,
            centralWavelength: Math.round(cw),
            fwhm: Math.round(fwhm),
          };

          setCustomFilters((prev) => [...prev, newFilter]);
          setSelectedFilterIds((prev) => [...prev, newFilter.id]);
          setError(null);
          setSuccess(`已导入滤光片: ${filterName} (${points.length} 点, λc=${Math.round(cw)} Å)`);
          setTimeout(() => setSuccess(null), 4000);
        } catch (e) {
          setError('解析CSV文件时出错: ' + (e as Error).message);
        }
      },
      error: (err) => {
        setError('CSV解析错误: ' + err.message);
      },
    });
  }, [customFilters.length]);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('不支持的文件格式，请上传 .csv 文件');
      return;
    }
    processFilterCSV(file);
  }, [processFilterCSV]);

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

  const chartData = useMemo(() => {
    if (selectedFilters.length === 0) {
      return { labels: [] as string[], datasets: [] };
    }

    const allWavelengths = new Set<number>();
    selectedFilters.forEach((f) => f.points.forEach((p) => allWavelengths.add(p.wavelength)));
    const sortedWavelengths = Array.from(allWavelengths).sort((a, b) => a - b);

    const wlToDataMap = (points: FilterResponsePoint[]) => {
      const map = new Map<number, number>();
      points.forEach((p) => map.set(p.wavelength, p.transmission));
      return map;
    };

    const datasets = selectedFilters.map((filter) => {
      const map = wlToDataMap(filter.points);
      const data = sortedWavelengths.map((wl) => {
        const val = map.get(wl);
        return val !== undefined ? val : null as unknown as number;
      });
      return {
        label: `${filter.name} (${filter.system})`,
        data,
        borderColor: filter.color,
        backgroundColor: filter.color + '25',
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        spanGaps: true,
      };
    });

    return { labels: sortedWavelengths.map((w) => w.toFixed(0)), datasets };
  }, [selectedFilters]);

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
            const val = ctx.parsed?.y;
            return val !== null && val !== undefined
              ? `${ctx.dataset.label}: ${(val * 100).toFixed(1)}%`
              : null;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
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
        max: 1.05,
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (value: any) => (value * 100).toFixed(0) + '%',
        },
        grid: {
          color: 'rgba(71, 85, 105, 0.3)',
          drawBorder: false,
        },
        title: {
          display: true,
          text: '透射率',
          color: '#94a3b8',
          font: { size: 12, weight: 'bold' as const },
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <aside className="lg:col-span-4 space-y-4">
        <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
          <h2 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            测光系统
          </h2>
          <div className="space-y-2">
            {FILTER_SYSTEMS.map((system) => (
              <button
                key={system.id}
                onClick={() => setSelectedSystem(system.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedSystem === system.id
                    ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {system.name}
              </button>
            ))}
          </div>
        </section>

        <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-300">标准滤光片</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={selectAllInSystem}
                className="px-2 py-1 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                全选
              </button>
              <button
                onClick={clearSelection}
                className="px-2 py-1 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                清空
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {systemFilters.map((filter) => {
              const isSelected = selectedFilterIds.includes(filter.id);
              return (
                <button
                  key={filter.id}
                  onClick={() => toggleFilter(filter.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    isSelected
                      ? 'bg-slate-800 text-slate-200'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: filter.color, opacity: isSelected ? 1 : 0.4 }}
                  />
                  <span className="font-mono font-semibold text-sm w-8">{filter.name}</span>
                  <span className="flex-1 text-[11px] text-slate-500 truncate">
                    λc={filter.centralWavelength} Å
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {customFilters.length > 0 && (
          <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
            <h2 className="text-xs font-semibold text-slate-300 mb-3">自定义滤光片</h2>
            <div className="space-y-1.5">
              {customFilters.map((filter) => {
                const isSelected = selectedFilterIds.includes(filter.id);
                return (
                  <div
                    key={filter.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                      isSelected ? 'bg-slate-800' : ''
                    }`}
                  >
                    <button
                      onClick={() => toggleFilter(filter.id)}
                      className="flex-1 flex items-center gap-2.5 text-sm"
                    >
                      <span
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: filter.color, opacity: isSelected ? 1 : 0.4 }}
                      />
                      <span className="font-mono font-semibold text-sm text-slate-200 truncate">
                        {filter.name}
                      </span>
                    </button>
                    <button
                      onClick={() => removeCustomFilter(filter.id)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                      title="删除自定义滤光片"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
          <h2 className="text-xs font-semibold text-slate-300 mb-3">上传自定义滤光片</h2>
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
            <label className="flex flex-col items-center justify-center py-5 px-3 cursor-pointer">
              <Upload className="w-7 h-7 mb-2 text-slate-400" />
              <p className="text-sm font-medium text-slate-300">拖拽 CSV 到此处</p>
              <p className="text-[11px] text-slate-500 mt-1 text-center">
                两列：波长(Å)、透射率(0-1或%)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>
          <div className="mt-2 flex items-start gap-1.5 p-2 rounded bg-slate-800/30 text-[10px] text-slate-500">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              CSV 格式示例:
              <code className="block mt-1 px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                wavelength,transmission
                <br />
                4000,0.05
                <br />
                5000,0.95
              </code>
            </span>
          </div>
        </section>

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
      </aside>

      <div className="lg:col-span-8 space-y-4">
        <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
          <h2 className="text-xs font-semibold text-slate-300 mb-3">透射曲线</h2>
          {selectedFilters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 bg-slate-900/40 rounded-lg border border-slate-700">
              <div className="text-slate-500 text-lg">请选择要显示的滤光片</div>
              <div className="text-slate-600 text-sm mt-2">从左侧面板中选择一个或多个滤光片</div>
            </div>
          ) : (
            <div className="relative h-96 bg-slate-900/40 rounded-lg border border-slate-700 p-3">
              <Line data={chartData} options={chartOptions as any} />
            </div>
          )}
        </section>

        {selectedFilters.length > 0 && (
          <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
            <h2 className="text-xs font-semibold text-slate-300 mb-3">滤光片参数</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700/60">
                    <th className="text-left py-2 px-2 font-medium">滤光片</th>
                    <th className="text-left py-2 px-2 font-medium">测光系统</th>
                    <th className="text-right py-2 px-2 font-medium">中心波长 λc (Å)</th>
                    <th className="text-right py-2 px-2 font-medium">半高宽 FWHM (Å)</th>
                    <th className="text-right py-2 px-2 font-medium">带宽说明</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFilters.map((filter) => (
                    <tr key={filter.id} className="border-b border-slate-800/40 last:border-0">
                      <td className="py-2 px-2">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: filter.color }}
                          />
                          <span className="font-mono font-semibold text-slate-200">{filter.name}</span>
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-400">{filter.system}</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-300">
                        {filter.centralWavelength}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-300">{filter.fwhm}</td>
                      <td className="py-2 px-2 text-right text-slate-500">
                        {filter.fwhm < 700
                          ? '窄带'
                          : filter.fwhm < 1200
                          ? '中等带宽'
                          : '宽带'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
          <h2 className="text-xs font-semibold text-slate-300 mb-3">关于测光系统</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/40">
              <h3 className="text-sm font-semibold text-cyan-300 mb-1.5">Johnson/Bessel UBVRI</h3>
              <p className="text-[11px] leading-relaxed">
                经典的宽波段测光系统，广泛应用于恒星测光。U（紫外）、B（蓝）、V（可见光）是 Johnson 原始定义，R、I 为 Cousins 扩展版本，覆盖近紫外到近红外波段。
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/40">
              <h3 className="text-sm font-semibold text-emerald-300 mb-1.5">SDSS ugriz</h3>
              <p className="text-[11px] leading-relaxed">
                斯隆数字巡天（SDSS）使用的测光系统，覆盖 3000-11000 Å 波段。五个滤光片 u'g'r'i'z' 设计用于星系和类星体的大规模巡天观测。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
