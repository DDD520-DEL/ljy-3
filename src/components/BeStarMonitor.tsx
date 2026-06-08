import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAppStore } from '@/store/appStore';
import { measureEquivalentWidth } from '@/lib/spectralAnalysis';
import SpectrumViewer from './SpectrumViewer';
import { Eye, Plus, TrendingUp, Calendar, Layers, Activity } from 'lucide-react';
import type { BeStarObservation } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const genId = () => Math.random().toString(36).substring(2, 9);

export default function BeStarMonitor() {
  const {
    spectra,
    beObservations,
    selectedTargetName,
    setSelectedTarget,
    addBeObservation,
    currentSpectrumId,
  } = useAppStore();

  const [overlayIds, setOverlayIds] = useState<string[]>([]);

  const uniqueTargets = useMemo(() => {
    const set = new Set<string>();
    spectra.forEach((s) => set.add(s.targetName));
    beObservations.forEach((o) => set.add(o.targetName));
    return Array.from(set);
  }, [spectra, beObservations]);

  const targetObservations = useMemo(() => {
    if (!selectedTargetName) return [];
    return beObservations
      .filter((o) => o.targetName === selectedTargetName)
      .sort((a, b) => a.observationDate.localeCompare(b.observationDate));
  }, [beObservations, selectedTargetName]);

  const targetSpectra = useMemo(() => {
    if (!selectedTargetName) return [];
    return spectra.filter((s) => s.targetName === selectedTargetName);
  }, [spectra, selectedTargetName]);

  const timeSeriesData = useMemo(() => {
    const dates = targetObservations.map((o) => o.observationDate);
    return {
      labels: dates,
      datasets: [
        {
          label: 'Hα EW (Å)',
          data: targetObservations.map((o) => o.haEW),
          borderColor: '#00d4ff',
          backgroundColor: '#00d4ff30',
          borderWidth: 2,
          pointRadius: 5,
          pointBackgroundColor: '#00d4ff',
          tension: 0.25,
          fill: false,
        },
        {
          label: 'Hβ EW (Å)',
          data: targetObservations.map((o) => o.hbEW ?? null),
          borderColor: '#ff9f40',
          backgroundColor: '#ff9f4030',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#ff9f40',
          tension: 0.25,
          fill: false,
        },
      ],
    };
  }, [targetObservations]);

  const magSeriesData = useMemo(() => {
    const dates = targetObservations.map((o) => o.observationDate);
    return {
      labels: dates,
      datasets: [
        {
          label: 'V 星等',
          data: targetObservations.map((o) => o.vMagnitude ?? null),
          borderColor: '#7c5cff',
          backgroundColor: '#7c5cff30',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#7c5cff',
          tension: 0.25,
          fill: false,
        },
      ],
    };
  }, [targetObservations]);

  const toggleOverlay = (id: string) => {
    setOverlayIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const measureCurrent = () => {
    const current = spectra.find((s) => s.id === currentSpectrumId);
    if (!current) return;
    const haEW = measureEquivalentWidth(current.points, 6562.8);
    const hbEW = measureEquivalentWidth(current.points, 4861.3);
    const obs: BeStarObservation = {
      id: genId(),
      targetName: current.targetName,
      observationDate: current.observationDate,
      spectrumId: current.id,
      haEW: Number(haEW.toFixed(3)),
      hbEW: Number(hbEW.toFixed(3)),
      vMagnitude: undefined,
      notes: '自动测量',
    };
    addBeObservation(obs);
  };

  const stats = useMemo(() => {
    if (targetObservations.length === 0) return null;
    const haEWs = targetObservations.map((o) => o.haEW);
    return {
      count: targetObservations.length,
      haMin: Math.min(...haEWs),
      haMax: Math.max(...haEWs),
      haMean: haEWs.reduce((a, b) => a + b, 0) / haEWs.length,
      dateSpan: targetObservations.length > 1
        ? Math.ceil(
            (new Date(targetObservations[targetObservations.length - 1].observationDate).getTime() -
              new Date(targetObservations[0].observationDate).getTime()) /
              86400000
          )
        : 0,
    };
  }, [targetObservations]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Be 星发射线监测
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-slate-400">目标天体:</label>
            <select
              value={selectedTargetName}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="">-- 选择目标 --</option>
              {uniqueTargets.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              onClick={measureCurrent}
              disabled={!spectra.find((s) => s.id === currentSpectrumId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-700/60 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              从当前光谱测量
            </button>
          </div>
        </div>
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-center">
              <div className="text-[10px] text-slate-500">观测次数</div>
              <div className="text-sm font-mono text-slate-200">{stats.count}</div>
            </div>
            <div className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-center">
              <div className="text-[10px] text-slate-500">时间跨度</div>
              <div className="text-sm font-mono text-slate-200">{stats.dateSpan} 天</div>
            </div>
            <div className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-center">
              <div className="text-[10px] text-slate-500">Hα EW 范围</div>
              <div className="text-xs font-mono text-cyan-300">
                {stats.haMin.toFixed(1)} ~ {stats.haMax.toFixed(1)}
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-center">
              <div className="text-[10px] text-slate-500">Hα EW 平均</div>
              <div className="text-xs font-mono text-cyan-300">{stats.haMean.toFixed(2)} Å</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-700/60 space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-slate-300">Hα / Hβ 等值宽度时间序列</span>
          </div>
          <div className="h-48">
            {targetObservations.length > 0 ? (
              <Line
                data={timeSeriesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top' as const,
                      align: 'end' as const,
                      labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 },
                    },
                    tooltip: {
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      titleColor: '#e2e8f0',
                      bodyColor: '#cbd5e1',
                      borderColor: '#334155',
                      borderWidth: 1,
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45, minRotation: 0 },
                      grid: { color: 'rgba(71, 85, 105, 0.2)' },
                    },
                    y: {
                      ticks: { color: '#64748b', font: { size: 10 } },
                      grid: { color: 'rgba(71, 85, 105, 0.2)' },
                      title: { display: true, text: 'EW (Å)', color: '#94a3b8', font: { size: 10 } },
                    },
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                暂无观测数据
              </div>
            )}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-700/60 space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-medium text-slate-300">V 波段光变曲线</span>
          </div>
          <div className="h-48">
            {targetObservations.length > 0 && targetObservations.some((o) => o.vMagnitude !== undefined) ? (
              <Line
                data={magSeriesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      titleColor: '#e2e8f0',
                      bodyColor: '#cbd5e1',
                      borderColor: '#334155',
                      borderWidth: 1,
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45 },
                      grid: { color: 'rgba(71, 85, 105, 0.2)' },
                    },
                    y: {
                      reverse: true,
                      ticks: { color: '#64748b', font: { size: 10 } },
                      grid: { color: 'rgba(71, 85, 105, 0.2)' },
                      title: { display: true, text: 'V mag', color: '#94a3b8', font: { size: 10 } },
                    },
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                暂无测光数据
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-slate-300">目标光谱叠加对比</span>
          <span className="text-slate-500">（选择叠加显示）</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {targetSpectra.length > 0 ? (
            targetSpectra.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleOverlay(s.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                  overlayIds.includes(s.id)
                    ? 'bg-cyan-800/60 border border-cyan-600/60 text-cyan-100'
                    : 'bg-slate-800/60 border border-slate-600/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                {s.name}
                <span className="text-[10px] opacity-70 ml-1">
                  <Calendar className="w-2.5 h-2.5 inline mr-0.5" />
                  {s.observationDate}
                </span>
              </button>
            ))
          ) : (
            <span className="text-xs text-slate-500">该目标暂无光谱数据</span>
          )}
        </div>
        <SpectrumViewer overlayIds={overlayIds} />
      </div>

      {targetObservations.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-400">观测记录表</div>
          <div className="overflow-x-auto rounded-lg border border-slate-700/60">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium">日期</th>
                  <th className="px-3 py-2 text-right text-slate-400 font-medium">Hα EW (Å)</th>
                  <th className="px-3 py-2 text-right text-slate-400 font-medium">Hβ EW (Å)</th>
                  <th className="px-3 py-2 text-right text-slate-400 font-medium">V mag</th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium">备注</th>
                </tr>
              </thead>
              <tbody>
                {targetObservations.map((o) => (
                  <tr key={o.id} className="border-t border-slate-700/40 hover:bg-slate-800/30">
                    <td className="px-3 py-2 font-mono text-slate-300">{o.observationDate}</td>
                    <td
                      className={`px-3 py-2 text-right font-mono ${
                        o.haEW < -5 ? 'text-cyan-300' : 'text-slate-300'
                      }`}
                    >
                      {o.haEW.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      {o.hbEW ? o.hbEW.toFixed(2) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      {o.vMagnitude ? o.vMagnitude.toFixed(3) : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{o.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
